const QRCode = require("qrcode");

const encodeQRData = (data) => {
  if (typeof data === "string") {
    return data;
  }

  if (data?.type === "EVENT_ATTENDANCE" && data.token) {
    return data.token;
  }

  if (data?.type === "CERTIFICATE_VERIFICATION" && data.verificationUrl) {
    return data.verificationUrl;
  }

  return JSON.stringify(data);
};

const generateQRCode = async (data) => {
  try {
    const qrData = encodeQRData(data);

    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "M",
      type: "image/png",
      margin: 2,
      width: 300,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrCode;
  } catch (error) {
    throw new Error("QR Code generation failed.");
  }
};

/**
 * Generate QR Code Buffer
 * Useful for PDFs or email attachments
 */
const generateQRBuffer = async (data) => {
  try {
    const qrData = encodeQRData(data);

    return await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: "M",
      type: "png",
      width: 300,
    });
  } catch (error) {
    throw new Error("QR Buffer generation failed.");
  }
};

/**
 * Generate QR Code File
 */
const generateQRFile = async (data, filePath) => {
  try {
    const qrData = encodeQRData(data);

    await QRCode.toFile(filePath, qrData, {
      width: 300,
      margin: 2,
    });

    return filePath;
  } catch (error) {
    throw new Error("QR File generation failed.");
  }
};

module.exports = {
  encodeQRData,
  generateQRCode,
  generateQRBuffer,
  generateQRFile,
};
