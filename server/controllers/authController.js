const User = require("../models/User");
const OTP = require("../models/OTP");
const mongoose = require("mongoose");
const { generateOTP, generateOTPExpiry } = require("../utils/generateOTP");
const { sendTokenResponse } = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const otpTemplate = require("../templates/otpTemplate");
const resetPasswordTemplate = require("../templates/resetPasswordTemplate");
const { uploadFileToCloudinary, uploadToCloudinary } = require("../utils/cloudinaryUpload");

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const otpPlainText = ({ name = "User", otp, purpose = "account verification" }) =>
  `Hello ${name},\n\nYour Event Organizer OTP for ${purpose} is ${otp}.\n\nThis OTP expires in 5 minutes. Do not share it with anyone.\n\nTeam Event Organizer`;

const getDuplicateMatches = (user, { email, phone }) => {
  const matches = [];

  if (user.email === email) {
    matches.push({
      field: "email",
      label: "Email",
      value: user.email,
    });
  }

  if (user.phone === phone) {
    matches.push({
      field: "phone",
      label: "Phone",
      value: user.phone,
    });
  }

  return matches;
};

const findValidOtp = async ({ user, email, otp, purpose }) => {
  const otpDoc = await OTP.findOne({
    user: user._id,
    email,
    otp,
    purpose,
  });

  if (!otpDoc) {
    return { error: "Invalid OTP." };
  }

  if (otpDoc.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpDoc._id });
    return { error: "OTP has expired." };
  }

  return { otpDoc };
};

const createAndSendOtp = async ({ user, purpose, subject, html }) => {
  await OTP.deleteMany({ user: user._id, purpose });

  const otp = generateOTP();

  await OTP.create({
    user: user._id,
    email: user.email,
    otp,
    purpose,
    expiresAt: generateOTPExpiry(),
  });

  await sendEmail({
    to: user.email,
    subject,
    text: otpPlainText({
      name: user.name,
      otp,
      purpose: purpose === "FORGOT_PASSWORD" ? "password reset" : "account verification",
    }),
    html: html(otp),
  });
};

const createUserOtp = async ({ user, purpose }) => {
  await OTP.deleteMany({ user: user._id, purpose });

  const otp = generateOTP();

  await OTP.create({
    user: user._id,
    email: user.email,
    otp,
    purpose,
    expiresAt: generateOTPExpiry(),
  });

  return otp;
};

const createRegistrationOtp = async ({ email, registrationData }) => {
  await OTP.deleteMany({ email, purpose: "REGISTER" });

  const otp = generateOTP();

  await OTP.create({
    user: new mongoose.Types.ObjectId(),
    email,
    otp,
    purpose: "REGISTER",
    registrationData,
    expiresAt: generateOTPExpiry(),
  });

  return otp;
};

const sendRegistrationOtpEmail = (email, name, otp) =>
  sendEmail({
    to: email,
    subject: "Your Event Organizer OTP",
    text: otpPlainText({ name, otp, purpose: "account verification" }),
    html: otpTemplate(name, otp),
  });

const createAndSendRegistrationOtp = async ({ email, name, registrationData }) => {
  const otp = await createRegistrationOtp({ email, registrationData });
  await sendRegistrationOtpEmail(email, name, otp);
};

exports.registerUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      college,
      course,
      branch,
      year,
      semester,
      gender,
      dateOfBirth,
      rollNumber,
      department,
      designation,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const publicRole = ["student", "organizer"].includes(role) ? role : null;

    if (!publicRole) {
      return res.status(400).json({
        success: false,
        message: "Please select student or organizer.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone }],
    });

    if (existingUser) {
      const duplicateMatches = getDuplicateMatches(existingUser, {
        email: normalizedEmail,
        phone,
      });
      const matchedLabels = duplicateMatches.map((match) => match.label).join(" and ");

      if (!existingUser.isVerified && existingUser.email === normalizedEmail) {
        const otp = await createUserOtp({ user: existingUser, purpose: "REGISTER" });
        await sendRegistrationOtpEmail(existingUser.email, existingUser.name, otp);

        return res.status(200).json({
          success: true,
          message: `Account already exists with matching ${matchedLabels || "details"} but is not verified. OTP sent again.`,
          email: existingUser.email,
          duplicateMatches,
          existingAccount: {
            name: existingUser.name,
            role: existingUser.role,
            isVerified: existingUser.isVerified,
            organizerStatus: existingUser.organizerStatus,
          },
        });
      }

      return res.status(409).json({
        success: false,
        message: `User already exists with matching ${matchedLabels || "details"}.`,
        duplicateMatches,
        existingAccount: {
          name: existingUser.name,
          role: existingUser.role,
          isVerified: existingUser.isVerified,
          organizerStatus: existingUser.organizerStatus,
        },
      });
    }

    const pendingRegistration = await OTP.findOne({
      purpose: "REGISTER",
      $or: [
        { email: normalizedEmail },
        { "registrationData.phone": phone },
      ],
    });

    if (pendingRegistration) {
      const duplicateMatches = [];

      if (pendingRegistration.email === normalizedEmail) {
        duplicateMatches.push({
          field: "email",
          label: "Email",
          value: pendingRegistration.email,
        });
      }

      if (pendingRegistration.registrationData?.phone === phone) {
        duplicateMatches.push({
          field: "phone",
          label: "Phone",
          value: pendingRegistration.registrationData.phone,
        });
      }

      if (pendingRegistration.email === normalizedEmail) {
        await createAndSendRegistrationOtp({
          email: normalizedEmail,
          name,
          registrationData: {
            ...pendingRegistration.registrationData,
            name,
            email: normalizedEmail,
            phone,
            password,
            role: publicRole,
            college,
            course,
            branch,
            year,
            semester,
            gender,
            dateOfBirth,
            rollNumber,
            department,
            designation,
          },
        });

        return res.status(200).json({
          success: true,
          message: "Registration is pending verification. OTP sent again.",
          email: normalizedEmail,
          duplicateMatches,
        });
      }

      return res.status(409).json({
        success: false,
        message: "Registration is already pending with matching details.",
        duplicateMatches,
      });
    }

    let profileImage;
    let profileImagePublicId;

    if (req.file) {
      const uploadedImage = await uploadToCloudinary(
        req.file.path,
        "event-organizer/profile"
      );

      profileImage = uploadedImage.url;
      profileImagePublicId = uploadedImage.public_id;
    }

    const registrationData = {
      name,
      email: normalizedEmail,
      phone,
      password,
      role: publicRole,
      college,
      gender,
      dateOfBirth: dateOfBirth || null,
      organizerStatus: publicRole === "organizer" ? "Pending" : "Not Applicable",
      profileImage,
      profileImagePublicId,
    };

    if (publicRole === "organizer") {
      registrationData.department = department;
      registrationData.designation = designation;
    } else {
      registrationData.course = course;
      registrationData.branch = branch;
      registrationData.year = year;
      registrationData.semester = semester;
      registrationData.rollNumber = rollNumber;
    }

    await createAndSendRegistrationOtp({
      email: normalizedEmail,
      name,
      registrationData,
    });

    return res.status(201).json({
      success: true,
      message:
        publicRole === "organizer"
          ? "Organizer registration successful. Verify your email, then wait for admin approval."
          : "Registration successful. OTP sent to your email.",
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyRegistrationOTP = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(409).json({
          success: false,
          message: "Account already exists. Please login.",
        });
      }

      const result = await findValidOtp({
        user: existingUser,
        email,
        otp,
        purpose: "REGISTER",
      });

      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }

      existingUser.isVerified = true;
      existingUser.otpVerified = true;
      await existingUser.save();
      await OTP.deleteOne({ _id: result.otpDoc._id });

      existingUser.password = undefined;

      return res.status(200).json({
        success: true,
        message: "Email verified successfully. Please login.",
        user: existingUser,
      });
    }

    const otpDoc = await OTP.findOne({
      email,
      otp,
      purpose: "REGISTER",
    });

    if (!otpDoc) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    if (otpDoc.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ success: false, message: "OTP has expired." });
    }

    if (!otpDoc.registrationData) {
      return res.status(400).json({
        success: false,
        message: "Registration details expired. Please register again.",
      });
    }

    const duplicateUser = await User.findOne({
      $or: [
        { email },
        { phone: otpDoc.registrationData.phone },
      ],
    });

    if (duplicateUser) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(409).json({
        success: false,
        message: "Account already exists with matching details. Please login.",
      });
    }

    const user = await User.create({
      ...otpDoc.registrationData,
      isVerified: true,
      otpVerified: true,
    });

    await OTP.deleteOne({ _id: otpDoc._id });

    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    return sendTokenResponse(res, user, "Login successful.");
  } catch (error) {
    next(error);
  }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });

    if (!user) {
      const pendingRegistration = await OTP.findOne({
        email,
        purpose: "REGISTER",
      });

      if (!pendingRegistration?.registrationData) {
        return res.status(404).json({
          success: false,
          message: "Pending registration not found. Please register again.",
        });
      }

      const otp = await createRegistrationOtp({
        email,
        registrationData: pendingRegistration.registrationData,
      });
      await sendRegistrationOtpEmail(email, pendingRegistration.registrationData.name, otp);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified.",
      });
    }

    const otp = await createUserOtp({ user, purpose: "REGISTER" });
    await sendRegistrationOtpEmail(user.email, user.name, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmailHealth = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const verification = await sendEmail.verifyTransport();

    return res.status(verification.success ? 200 : 503).json({
      success: verification.success,
      ...sendEmail.getEmailStatus(),
      message: verification.message,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendEmailTest = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const to = normalizeEmail(req.body.to || req.user.email);

    await sendEmail({
      to,
      subject: "Event Organizer Email Test",
      text: "Email delivery test from Event Organizer backend.",
      html: "<p>Email delivery test from Event Organizer backend.</p>",
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent to ${to}.`,
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await createAndSendOtp({
      user,
      purpose: "FORGOT_PASSWORD",
      subject: "Reset Your Password",
      html: (otp) => resetPasswordTemplate({ name: user.name, otp }),
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyForgotPasswordOTP = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { error } = await findValidOtp({
      user,
      email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { error } = await findValidOtp({
      user,
      email,
      otp,
      purpose: "FORGOT_PASSWORD",
    });

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    user.password = password;
    await user.save();

    await OTP.deleteMany({
      user: user._id,
      purpose: "FORGOT_PASSWORD",
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      college,
      course,
      branch,
      year,
      semester,
      gender,
      dateOfBirth,
      rollNumber,
      department,
      designation,
      bio,
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.college = college || user.college;
    user.course = course || user.course;
    user.branch = branch || user.branch;
    user.department = department || user.department;
    user.designation = designation || user.designation;
    user.year = year || user.year;
    user.semester = semester || user.semester;
    user.gender = gender || user.gender;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.rollNumber = rollNumber || user.rollNumber;
    user.bio = bio || user.bio;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image.",
      });
    }

    const uploadedImage = await uploadToCloudinary(req.file.path, "event-organizer/profile");
    const user = await User.findById(req.user._id);

    user.profileImage = uploadedImage.url;
    user.profileImagePublicId = uploadedImage.public_id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully.",
      profileImage: uploadedImage.url,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume file.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const uploadedResume = await uploadFileToCloudinary(req.file.path, "event-organizer/resumes");

    user.resumeUrl = uploadedResume?.url || `/uploads/resumes/${req.file.filename}`;
    user.resumePublicId = uploadedResume?.public_id || "";
    user.resumeFileName = req.file.originalname;
    user.resumeMimeType = req.file.mimetype;
    user.resumeUploadedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};
