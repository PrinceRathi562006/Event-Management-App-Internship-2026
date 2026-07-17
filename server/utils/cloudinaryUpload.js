const cloudinary = require("../config/cloudinary");
const fs = require("fs");

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

/**
 * ==========================================
 * Upload Image to Cloudinary
 * ==========================================
 */

const uploadToCloudinary = async (
  filePath,
  folder = "event-organizer"
) => {
  try {
    if (!isCloudinaryConfigured()) {
      throw new Error("Cloudinary is not configured.");
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url,
    };
  } catch (error) {
    // Delete local file if upload fails
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw new Error(error.message);
  }
};

const uploadFileToCloudinary = async (
  filePath,
  folder = "event-organizer/files"
) => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url,
      resource_type: result.resource_type,
    };
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw new Error(error.message);
  }
};

/**
 * ==========================================
 * Delete Image
 * ==========================================
 */

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId);

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 * ==========================================
 * Replace Existing Image
 * ==========================================
 */

const replaceImage = async (
  oldPublicId,
  newFilePath,
  folder = "event-organizer"
) => {
  try {
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId);
    }

    return await uploadToCloudinary(
      newFilePath,
      folder
    );
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  uploadToCloudinary,
  uploadFileToCloudinary,
  deleteFromCloudinary,
  replaceImage,
  isCloudinaryConfigured,
};
