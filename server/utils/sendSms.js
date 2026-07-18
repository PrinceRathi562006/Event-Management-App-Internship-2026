const https = require("https");
const { URLSearchParams } = require("url");

const normalizePhone = (phone = "") => {
  const value = String(phone || "").trim();

  if (!value) return "";
  if (value.startsWith("+")) return value;

  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return "";
};

const getSmsStatus = () => {
  const configured = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );

  return {
    configured,
    provider: "twilio",
    from: process.env.TWILIO_FROM_NUMBER || "",
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
  };
};

const sendSms = ({ to, message }) =>
  new Promise((resolve, reject) => {
    const phone = normalizePhone(to);
    const status = getSmsStatus();

    if (!phone || !message) {
      resolve({ success: false, skipped: true, reason: "Missing phone or message." });
      return;
    }

    if (!status.configured || process.env.SMS_DISABLED === "true") {
      resolve({ success: false, skipped: true, reason: "SMS provider is not configured." });
      return;
    }

    const body = new URLSearchParams({
      To: phone,
      Body: String(message).slice(0, 1500),
    });

    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      body.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    } else {
      body.set("From", process.env.TWILIO_FROM_NUMBER);
    }

    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const request = https.request(
      {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body.toString()),
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const payload = Buffer.concat(chunks).toString("utf8");

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ success: true, skipped: false, payload });
            return;
          }

          reject(new Error(`SMS provider responded with ${response.statusCode}: ${payload}`));
        });
      }
    );

    request.on("error", reject);
    request.write(body.toString());
    request.end();
  });

sendSms.getSmsStatus = getSmsStatus;
sendSms.normalizePhone = normalizePhone;

module.exports = sendSms;
