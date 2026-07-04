const nodemailer = require("nodemailer");

const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.error("Email configuration error:", error.message);
    } else {
      console.log("Email service connected successfully");
    }
  });
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

    const info = await transporter.sendMail({
      from: `"Event Organizer" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });

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

module.exports = sendEmail;
