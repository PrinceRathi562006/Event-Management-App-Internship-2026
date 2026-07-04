const cloudinary = require("../config/cloudinary");
const fs = require("fs");
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
  deleteFromCloudinary,
  replaceImage,
};
