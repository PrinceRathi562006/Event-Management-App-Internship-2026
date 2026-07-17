const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../uploads/resumes");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const safeName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 42);
    const uniqueName = `${Date.now()}-${safeName || "resume"}${path.extname(file.originalname).toLowerCase()}`;

    cb(null, uniqueName);
  },
});

const allowedExtensions = /pdf|doc|docx|rtf|txt|odt/;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "text/rtf",
  "text/plain",
  "application/vnd.oasis.opendocument.text",
]);

const fileFilter = (req, file, cb) => {
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedMimeTypes.has(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }

  return cb(new Error("Only PDF, Word, RTF, TXT, and ODT resume files are allowed."), false);
};

module.exports = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});
