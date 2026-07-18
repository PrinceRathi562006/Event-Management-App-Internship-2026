const certificateTemplate = ({
  name,
  eventTitle,
  eventDate,
  certificateUrl,
  certificateNumber,
  bookingId,
  verificationUrl,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Certificate Issued</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#172033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 28px rgba(20,30,55,.10);">
          <tr>
            <td style="background:#059669;color:#ffffff;padding:26px;text-align:center;font-size:26px;font-weight:bold;">
              Certificate Issued
            </td>
          </tr>
          <tr>
            <td style="padding:34px;">
              <h2 style="margin:0 0 12px;">Hello ${name},</h2>
              <p style="font-size:16px;line-height:1.6;color:#4b5563;margin:0 0 22px;">
                Your participation certificate for <strong>${eventTitle}</strong> has been approved and generated.
              </p>

              <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;margin-top:20px;font-size:15px;">
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Event</strong></td><td style="border-bottom:1px solid #eef2f7;">${eventTitle}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Date</strong></td><td style="border-bottom:1px solid #eef2f7;">${eventDate}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Certificate ID</strong></td><td style="border-bottom:1px solid #eef2f7;">${certificateNumber}</td></tr>
                <tr><td><strong>Booking ID</strong></td><td>${bookingId}</td></tr>
              </table>

              <div style="text-align:center;margin-top:34px;">
                <a href="${certificateUrl}" target="_blank" style="background:#059669;color:#ffffff;padding:15px 26px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">
                  Download Certificate
                </a>
                <p style="margin:14px 0 0;color:#64748b;font-size:14px;">A PDF copy is attached to this email.</p>
                ${
                  verificationUrl
                    ? `<p style="margin:12px 0 0;color:#64748b;font-size:14px;">Verify certificate: <a href="${verificationUrl}" target="_blank" style="color:#2563eb;">${verificationUrl}</a></p>`
                    : ""
                }
              </div>

              <p style="margin-top:30px;color:#4b5563;">Best wishes,<br /><strong>Team Event Organizer</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#f3f4f6;padding:18px;text-align:center;font-size:13px;color:#6b7280;">
              Copyright ${new Date().getFullYear()} Event Organizer
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

module.exports = certificateTemplate;
