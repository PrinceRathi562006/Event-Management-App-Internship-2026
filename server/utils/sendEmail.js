const nodemailer = require("nodemailer");

const clean = (value = "") => String(value || "").trim();
const cleanSecret = (value = "") => clean(value).replace(/\s+/g, "");

const emailUser = clean(process.env.EMAIL_USER || process.env.SMTP_USER);
const emailPass = cleanSecret(process.env.EMAIL_PASS || process.env.SMTP_PASS);
const smtpHost = clean(process.env.SMTP_HOST);
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || smtpPort === 465;
const emailConfigured = Boolean(emailUser && emailPass);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      ...(smtpHost
        ? {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
          }
        : {
            service: process.env.EMAIL_SERVICE || "gmail",
          }),
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    })
  : null;

if (transporter) {
  console.log("Email service configured");
} else {
  console.warn("Email credentials missing. Emails will be logged in development mode.");
}

const getAttachmentSummary = (attachments = []) =>
  attachments.map((attachment) => ({
    filename: attachment.filename,
    contentType: attachment.contentType,
    cid: attachment.cid,
    path: attachment.path,
    hasContent: Boolean(attachment.content),
  }));

const withTimeout = (promise, ms, label) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const sendEmail = async ({ to, subject, html, text = "", attachments = [] }) => {
  try {
    if (!transporter) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Email service is not configured");
      }

      console.log("[DEV EMAIL]", {
        to,
        subject,
        text,
        html,
        attachments: getAttachmentSummary(attachments),
      });
      return {
        success: true,
        messageId: "dev-email-skipped",
      };
    }

    const info = await withTimeout(
      transporter.sendMail({
        from: `"Event Organizer" <${emailUser}>`,
        to,
        subject,
        text,
        html,
        attachments,
      }),
      Number(process.env.EMAIL_TIMEOUT_MS || 12000),
      "Email send"
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Email Error:", error.message);

    if (process.env.NODE_ENV === "production") {
      throw new Error("Unable to send email");
    }

    return {
      success: false,
      messageId: "dev-email-failed",
      error: error.message,
    };
  }
};

sendEmail.getEmailStatus = () => {
  const atIndex = emailUser.indexOf("@");

  return {
    configured: emailConfigured,
    user: emailUser ? `${emailUser.slice(0, 2)}***${atIndex >= 0 ? emailUser.slice(atIndex) : ""}` : "",
    provider: smtpHost || process.env.EMAIL_SERVICE || "gmail",
  };
};

sendEmail.verifyTransport = async () => {
  if (!transporter) {
    return {
      success: false,
      message: "Email service is not configured.",
    };
  }

  try {
    await withTimeout(transporter.verify(), Number(process.env.EMAIL_TIMEOUT_MS || 12000), "Email verification");
    return {
      success: true,
      message: "Email service connected successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = sendEmail;
