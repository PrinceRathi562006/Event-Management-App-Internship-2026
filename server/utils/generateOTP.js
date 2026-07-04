/**
 * Generate Numeric OTP
 * Default Length = 6
 */

const generateOTP = (length = 6) => {
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }

  return otp;
};

/**
 * Generate Expiry Time
 * Default = 5 Minutes
 */

const generateOTPExpiry = (minutes = 5) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = {
  generateOTP,
  generateOTPExpiry,
};