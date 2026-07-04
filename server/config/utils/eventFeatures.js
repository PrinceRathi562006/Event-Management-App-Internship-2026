export const EVENT_CATEGORIES = [
  "Workshop",
  "Hackathon",
  "Sports",
  "Seminar",
  "Cultural",
  "Technical",
  "Placement",
  "Fest",
  "Competition",
  "Conference",
  "Other",
];

export const BADGE_OPTIONS = ["Speaker", "Volunteer", "Winner", "Organizer", "Top Participant"];

export function generateAIEventCopy({ title, category, venue, startTime }) {
  const eventName = title?.trim() || "Campus Event";
  const eventCategory = category || "Workshop";
  const place = venue?.trim() || "campus venue";
  const time = startTime || "scheduled time";

  return {
    description: `${eventName} is a focused ${eventCategory.toLowerCase()} designed for students who want practical exposure, peer learning, and hands-on participation. The session will be hosted at ${place} with guided activities, live interaction, and clear takeaways for every attendee.`,
    agenda: [
      `${time} - Registration and welcome`,
      "Opening talk and event orientation",
      "Main session with practical demonstrations",
      "Team activity, quiz, or guided practice",
      "Feedback, certificates, and closing",
    ],
    learningOutcomes: [
      `Understand the core ideas behind ${eventName}`,
      "Apply concepts through a practical campus activity",
      "Collaborate with peers and mentors",
      "Leave with resources, certificate eligibility, and next steps",
    ],
    requirements: [
      "Valid student ID",
      "Laptop or notebook if required by the session",
      "QR ticket generated after registration",
      "Arrive 15 minutes before the event starts",
    ],
  };
}

export function getCountdownParts(value, now = Date.now()) {
  const distance = new Date(value).getTime() - now;

  if (!value || Number.isNaN(distance) || distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
  }

  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance % 86400000) / 3600000),
    minutes: Math.floor((distance % 3600000) / 60000),
    seconds: Math.floor((distance % 60000) / 1000),
    started: false,
  };
}

export function createGoogleCalendarUrl(event) {
  const start = toCalendarDate(event.eventDate, event.startTime);
  const end = toCalendarDate(event.eventDate, event.endTime || event.startTime, event.endTime ? 0 : 2);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Campus Event",
    dates: `${start}/${end}`,
    details: event.description || "Registered through Event Organizer.",
    location: event.venue || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createPosterSvg({ title, date, venue, theme, category }) {
  const safeTitle = escapeXml(title || "Campus Event");
  const safeVenue = escapeXml(venue || "Venue to be announced");
  const safeDate = escapeXml(date || "Date to be announced");
  const safeTheme = escapeXml(theme || category || "Campus Experience");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="48%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="68" y="68" width="944" height="1214" rx="34" fill="rgba(255,255,255,0.92)"/>
  <text x="108" y="160" fill="#0f172a" font-family="Arial, sans-serif" font-size="38" font-weight="700">${safeTheme}</text>
  <text x="108" y="375" fill="#111827" font-family="Arial, sans-serif" font-size="92" font-weight="800">${safeTitle}</text>
  <rect x="108" y="805" width="864" height="3" fill="#2563eb"/>
  <text x="108" y="900" fill="#334155" font-family="Arial, sans-serif" font-size="48" font-weight="700">${safeDate}</text>
  <text x="108" y="980" fill="#334155" font-family="Arial, sans-serif" font-size="44">${safeVenue}</text>
  <text x="108" y="1180" fill="#2563eb" font-family="Arial, sans-serif" font-size="42" font-weight="700">Register on Event Organizer</text>
</svg>`;
}

export function downloadSvg(svg, filename) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCalendarDate(date, time, addHours = 0) {
  const fallback = new Date(date || Date.now());
  const [hour = fallback.getHours(), minute = fallback.getMinutes()] = String(time || "")
    .replace(/\s?(AM|PM)$/i, "")
    .split(":")
    .map(Number);
  const isPm = /PM$/i.test(String(time));
  const adjustedHour = Number.isFinite(hour) ? (isPm && hour < 12 ? hour + 12 : hour) : fallback.getHours();
  fallback.setHours(adjustedHour + addHours, Number.isFinite(minute) ? minute : 0, 0, 0);

  return fallback.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
