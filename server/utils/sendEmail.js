const nodemailer = require("nodemailer");

const clean = (value = "") => String(value || "").trim();
const cleanSecret = (value = "") => clean(value).replace(/\s+/g, "");
const maskEmail = (value = "") => {
  const email = clean(value);
  const atIndex = email.indexOf("@");

  if (!email) return "";
  if (atIndex <= 1) return `***${atIndex >= 0 ? email.slice(atIndex) : ""}`;

  return `${email.slice(0, 2)}***${atIndex >= 0 ? email.slice(atIndex) : ""}`;
};

const emailUser = clean(process.env.EMAIL_USER || process.env.SMTP_USER);
const emailPass = cleanSecret(process.env.EMAIL_PASS || process.env.SMTP_PASS);
const smtpHost = clean(process.env.SMTP_HOST);
const smtpPort = Number(process.env.SMTP_PORT || 587);
const emailService = clean(process.env.EMAIL_SERVICE || "gmail");
const smtpSecure =
  String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
  smtpPort === 465;
const emailConfigured = Boolean(emailUser && emailPass);
const emailHost = smtpHost || (emailService === "gmail" ? "smtp.gmail.com" : emailService);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: emailHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: !smtpSecure,
      family: 4,

      auth: {
        user: emailUser,
        pass: emailPass,
      },

      tls: {
        servername: emailHost,
        rejectUnauthorized: true,
      },

      logger: process.env.NODE_ENV !== "production",
      debug: process.env.NODE_ENV !== "production",
    })
  : null;

console.log("SMTP CONFIG:", {
  host: emailHost,
  port: smtpPort,
  secure: smtpSecure,
  family: 4,
  user: maskEmail(emailUser),
  configured: emailConfigured,
});

if (transporter) {
  console.log("Email service configured");
} else {
  console.warn(
    "Email credentials missing. Emails will be logged in development mode.",
  );
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
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timed out after ${Math.round(ms / 1000)} seconds`,
          ),
        ),
      ms,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const sendEmail = async ({
  to,
  subject,
  html,
  text = "",
  attachments = [],
}) => {
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
        replyTo: emailUser,
        to,
        subject,
        text,
        html,
        attachments,
        headers: {
          "X-Application": "Event Organizer",
        },
      }),
      Number(process.env.EMAIL_TIMEOUT_MS || 12000),
      "Email send",
    );

    console.log("Email sent", {
      to: maskEmail(to),
      subject,
      accepted: info.accepted?.map(maskEmail) || [],
      rejected: info.rejected?.map(maskEmail) || [],
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  } catch (error) {
    console.error("Email Error:", error.message);

    if (transporter || process.env.NODE_ENV === "production") {
      const emailError = new Error("Unable to connect to the email server.");
      emailError.statusCode = 503;
      throw emailError;
    }

    return {
      success: false,
      messageId: "dev-email-failed",
      error: error.message,
    };
  }
};

sendEmail.getEmailStatus = () => {
  return {
    configured: emailConfigured,
    user: maskEmail(emailUser),
    provider: smtpHost || emailService,
    timeoutMs: Number(process.env.EMAIL_TIMEOUT_MS || 12000),
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
    await withTimeout(
      transporter.verify(),
      Number(process.env.EMAIL_TIMEOUT_MS || 12000),
      "Email verification",
    );
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
