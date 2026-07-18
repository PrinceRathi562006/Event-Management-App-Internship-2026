const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const QRSession = require("../models/QRSession");
const { issueCertificatesForEvent } = require("./certificateService");

const COMPLETION_ALIASES = ["Completed", "Finished", "Ended"];

const getEventEndDate = (event) => {
  const expiresAt = new Date(event.eventDate);
  const timeMatch = String(event.endTime || "").match(/^(\d{1,2}):(\d{2})/);

  if (timeMatch) {
    expiresAt.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  } else {
    expiresAt.setHours(23, 59, 59, 999);
  }

  return expiresAt;
};

const shouldAutoComplete = (event, now = new Date()) =>
  event.status === "Approved" && getEventEndDate(event) < now;

const completeEvent = async ({ event, req = null, triggeredBy = null, note = "Event completed automatically." }) => {
  const wasCompleted = event.status === "Completed";

  event.status = "Completed";
  event.isPublished = true;
  event.approvalLogs.push({
    status: "Completed",
    by: triggeredBy,
    note,
  });
  await event.save();

  await QRSession.updateMany(
    { eventId: event._id },
    {
      $set: {
        isActive: false,
        status: "Disabled",
      },
    }
  );

  if (!wasCompleted) {
    const bookings = await Booking.find({
      event: event._id,
      bookingStatus: "Confirmed",
    }).select("user");

    if (bookings.length) {
      await Notification.insertMany(
        bookings.map((booking) => ({
          user: booking.user,
          event: event._id,
          title: "Event Completed",
          message: `${event.title} has been completed. Eligible certificates are being issued automatically.`,
          type: "EVENT",
          actionText: "View dashboard",
          actionUrl: "/dashboard",
        }))
      );
    }
  }

  const certificateSummary = await issueCertificatesForEvent({ event, req });

  return {
    event,
    certificateSummary,
  };
};

const completeExpiredEvents = async ({ now = new Date(), limit = 50 } = {}) => {
  const candidates = await Event.find({
    status: "Approved",
    eventDate: { $lte: now },
  })
    .sort({ eventDate: 1 })
    .limit(limit);
  const completed = [];

  for (const event of candidates) {
    if (shouldAutoComplete(event, now)) {
      completed.push(await completeEvent({ event }));
    }
  }

  return completed;
};

const startEventLifecycleWorker = () => {
  const intervalMs = Number(process.env.EVENT_LIFECYCLE_INTERVAL_MS || 15 * 60 * 1000);

  const run = () => {
    completeExpiredEvents().catch((error) => {
      console.error("Event lifecycle worker failed:", error.message);
    });
  };

  setTimeout(run, 5000);
  return setInterval(run, intervalMs);
};

module.exports = {
  COMPLETION_ALIASES,
  completeEvent,
  completeExpiredEvents,
  getEventEndDate,
  shouldAutoComplete,
  startEventLifecycleWorker,
};
