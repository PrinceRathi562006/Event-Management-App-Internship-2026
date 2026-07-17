/**
 * Event Reminder Email Template
 * @param {Object} data
 * @returns {String}
 */

const reminderTemplate = ({
  name,
  eventTitle,
  venue,
  eventDate,
  startTime,
  endTime,
}) => {
  return `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>Event Reminder</title>
</head>

<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="650" cellpadding="0" cellspacing="0"
style="
background:#fff;
border-radius:10px;
overflow:hidden;
box-shadow:0 10px 20px rgba(0,0,0,.08);
">

<tr>
<td
style="
background:#F59E0B;
padding:25px;
color:white;
font-size:28px;
font-weight:bold;
text-align:center;
">
⏰ Event Reminder
</td>
</tr>

<tr>
<td style="padding:35px;">

<h2>Hello ${name},</h2>

<p style="font-size:16px;color:#555;">
This is a reminder that your registered event is starting soon.
</p>

<table
width="100%"
cellpadding="10"
style="border-collapse:collapse;margin-top:20px;">

<tr>
<td><b>🎯 Event</b></td>
<td>${eventTitle}</td>
</tr>

<tr style="background:#f7f7f7;">
<td><b>📍 Venue</b></td>
<td>${venue}</td>
</tr>

<tr>
<td><b>📅 Date</b></td>
<td>${eventDate}</td>
</tr>

<tr style="background:#f7f7f7;">
<td><b>⏰ Time</b></td>
<td>${startTime} - ${endTime}</td>
</tr>

</table>

<div
style="
margin-top:35px;
padding:20px;
background:#FFF8E1;
border-left:5px solid #F59E0B;
">

<b>Before You Arrive</b>

<ul>
<li>Carry your College ID Card.</li>
<li>Carry your QR Ticket.</li>
<li>Reach at least 30 minutes early.</li>
<li>Follow event guidelines.</li>
</ul>

</div>

<p style="margin-top:30px;">
We look forward to seeing you!
</p>

<p>
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
color:#777;
">

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
};

module.exports = reminderTemplate;
