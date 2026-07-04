const formatMoney = (amount = 0) => `Rs ${Number(amount || 0).toFixed(2)}`;

const bookingTemplate = ({
  name,
  eventTitle,
  venue,
  eventDate,
  startTime,
  endTime,
  ticketNumber,
  paymentStatus,
  amount,
  qrCodeCid = "ticket-qr",
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Event Registration Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#172033;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 28px rgba(20,30,55,.10);">
          <tr>
            <td style="background:#2563eb;color:#ffffff;padding:26px;text-align:center;font-size:26px;font-weight:bold;">
              Event Registration Confirmed
            </td>
          </tr>
          <tr>
            <td style="padding:34px;">
              <h2 style="margin:0 0 12px;">Hello ${name},</h2>
              <p style="font-size:16px;line-height:1.6;color:#4b5563;margin:0 0 22px;">
                Your registration for <strong>${eventTitle}</strong> is confirmed. Keep this email and QR ticket ready for check-in.
              </p>

              <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;margin-top:20px;font-size:15px;">
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Event</strong></td><td style="border-bottom:1px solid #eef2f7;">${eventTitle}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Venue</strong></td><td style="border-bottom:1px solid #eef2f7;">${venue}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Date</strong></td><td style="border-bottom:1px solid #eef2f7;">${eventDate}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Time</strong></td><td style="border-bottom:1px solid #eef2f7;">${startTime} - ${endTime}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Booking ID</strong></td><td style="border-bottom:1px solid #eef2f7;">${ticketNumber}</td></tr>
                <tr><td style="border-bottom:1px solid #eef2f7;"><strong>Payment Status</strong></td><td style="border-bottom:1px solid #eef2f7;">${paymentStatus}</td></tr>
                <tr><td><strong>Amount</strong></td><td>${formatMoney(amount)}</td></tr>
              </table>

              <div style="text-align:center;margin-top:34px;padding:24px;background:#f8fbff;border:1px solid #dbeafe;border-radius:12px;">
                <h3 style="margin:0 0 14px;color:#1e3a8a;">Your QR Ticket</h3>
                <img src="cid:${qrCodeCid}" alt="QR ticket" width="190" style="display:block;margin:0 auto 12px;" />
                <p style="margin:0;color:#64748b;font-size:14px;">The same QR ticket is attached to this email as a PNG image.</p>
              </div>

              <div style="margin-top:28px;padding:18px;background:#fff7ed;border-left:4px solid #f97316;color:#7c2d12;">
                <strong>Check-in instructions</strong>
                <p style="margin:8px 0 0;line-height:1.5;">Arrive before the start time, carry your college ID, and show the attached QR ticket at entry.</p>
              </div>

              <p style="margin-top:30px;color:#4b5563;">Thank you,<br /><strong>Team Event Organizer</strong></p>
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

module.exports = bookingTemplate;
