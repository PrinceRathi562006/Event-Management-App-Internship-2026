/**
 * OTP Email Template
 * @param {String} name
 * @param {String} otp
 * @returns {String}
 */

const otpTemplate = (name, otp) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>OTP Verification</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="
background:#ffffff;
border-radius:10px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<tr>
<td
style="
background:#4F46E5;
padding:25px;
color:white;
font-size:28px;
font-weight:bold;
text-align:center;
">
Event Organizer
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2>Hello ${name},</h2>

<p style="font-size:16px;color:#555;">
Welcome to <b>Event Organizer - Campus Event Hub</b>.
</p>

<p style="font-size:16px;color:#555;">
Use the OTP below to verify your account.
</p>

<div
style="
margin:40px auto;
width:220px;
padding:18px;
background:#eef2ff;
border:2px dashed #4F46E5;
border-radius:8px;
text-align:center;
font-size:34px;
font-weight:bold;
letter-spacing:8px;
color:#4F46E5;
">
${otp}
</div>

<p style="color:#777;">
This OTP will expire in <b>5 minutes</b>.
</p>

<p style="color:#777;">
Do not share this OTP with anyone.
</p>

<br>

<p>
Thanks,
<br>
<b>Team Event Organizer</b>
</p>

</td>
</tr>

<tr>
<td
style="
background:#f3f4f6;
padding:20px;
text-align:center;
font-size:13px;
color:#888;
">
Copyright ${new Date().getFullYear()} Event Organizer. All rights reserved.
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

module.exports = otpTemplate;
