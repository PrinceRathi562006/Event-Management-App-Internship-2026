const jwt = require("jsonwebtoken");

/**
 * Generate JWT Token
 * @param {String} userId - MongoDB User ID
 * @returns {String} JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    }
  );
};

/**
 * Generate JWT and send it in response
 * @param {Object} res
 * @param {Object} user
 * @param {String} message
 */
const sendTokenResponse = (res, user, message = "Success") => {
  const token = generateToken(user._id);

  // Hide password
  user.password = undefined;

  // Cookie Options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
  };

  res
    .cookie("token", token, cookieOptions)
    .status(200)
    .json({
      success: true,
      message,
      token,
      user,
    });
};

module.exports = {
  generateToken,
  sendTokenResponse,
};
