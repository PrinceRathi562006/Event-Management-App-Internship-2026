const fs = require("fs");
const multer = require("multer");
const path = require("path");

const uploadPath = path.join(__dirname, "../uploads/chat");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const allowedExtensions = /jpg|jpeg|png|webp|gif|pdf|doc|docx|txt|csv|xls|xlsx|ppt|pptx|zip/;

const fileFilter = (req, file, cb) => {
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  if (extName) {
    return cb(null, true);
  }

  return cb(new Error("Unsupported chat attachment type."), false);
};

module.exports = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter,
});
