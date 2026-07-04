/**
 * Reset Password OTP Email Template
 * @param {Object} data
 * @returns {String}
 */

const resetPasswordTemplate = ({
  name,
  otp,
}) => {
  return `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>Reset Password</title>
</head>

<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="650" cellpadding="0" cellspacing="0"
style="
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 10px 25px rgba(0,0,0,.08);
">

<!-- Header -->
<tr>
<td
style="
background:#EF4444;
padding:25px;
text-align:center;
color:white;
font-size:28px;
font-weight:bold;
">
🔒 Password Reset Request
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:40px;">

<h2>Hello ${name},</h2>

<p style="font-size:16px;color:#555;">
We received a request to reset your password.
</p>

<p style="font-size:16px;color:#555;">
Use the OTP below to continue.
</p>

<div
style="
margin:35px auto;
width:220px;
padding:18px;
background:#FEE2E2;
border:2px dashed #EF4444;
border-radius:8px;
text-align:center;
font-size:34px;
font-weight:bold;
letter-spacing:8px;
color:#EF4444;
">
${otp}
</div>

<p style="color:#666;">
This OTP is valid for <b>5 minutes</b>.
</p>

<p style="color:#666;">
If you did not request this password reset, you can safely ignore this email.
Your password will remain unchanged.
</p>

<div
style="
margin-top:35px;
padding:20px;
background:#FEF2F2;
border-left:5px solid #EF4444;
">

<b>Security Tips</b>

<ul>
<li>Never share your OTP with anyone.</li>
<li>Event Organizer will never ask for your password.</li>
<li>Always use a strong password.</li>
<li>Enable Two-Factor Authentication when available.</li>
</ul>

</div>

<br>

<p>
Regards,
</p>

<p>
<b>Team Event Organizer</b>
</p>

</td>
</tr>

<!-- Footer -->
<tr>
<td
style="
background:#f3f4f6;
padding:20px;
text-align:center;
font-size:13px;
color:#777;
">
© ${new Date().getFullYear()} Event Organizer | Campus Event Hub
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};

module.exports = resetPasswordTemplate;
