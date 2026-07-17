import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, Clock, IndianRupee, MapPin, Ticket, UserPlus } from "lucide-react";
import {
  AttendeeCounter,
  BadgeGallery,
  CountdownBlocks,
  DiscussionForum,
  EventGallery,
  EventTimeline,
  FeedbackAnalytics,
  SeatPicker,
  SocialActions,
} from "../components/features/EventExperience";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import Loader from "../components/ui/Loader";
import { logout } from "../redux/authSlice";
import api from "../services/api";
import { getApiMessage } from "../utils/forms";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getCountdown(value, now) {
  const distance = new Date(value).getTime() - now;

  if (distance <= 0) {
    return "Event started";
  }

  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  return `${days}d ${hours}h remaining`;
}

function includesUser(items = [], userId) {
  return items.some((item) => item?._id === userId || item === userId);
}

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function canManageEvent(event, user) {
  if (!event || !user) {
    return false;
  }

  return (
    user.role === "admin" ||
    event.organizer?._id === user._id ||
    event.organizer === user._id ||
    includesUser(event.assignedOrganizers, user._id) ||
    includesUser(event.organizerCoordinators, user._id) ||
    includesUser(event.studentCoordinators, user._id)
  );
}

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [feedback, setFeedback] = useState({ rating: "5", review: "" });
  const [selectedSeat, setSelectedSeat] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;

    api
      .get(`/events/${id}`)
      .then((response) => {
        if (mounted) {
          setEvent(response.data.event);
        }
      })
      .catch(() => {
        if (mounted) {
          setEvent(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const eventEnded = useMemo(() => {
    if (!event?.eventDate) {
      return false;
    }

    const eventEndDate = new Date(event.eventDate);
    eventEndDate.setHours(23, 59, 59, 999);

    return eventEndDate.getTime() < now;
  }, [event, now]);

  const seatSelectionEnabled = event?.seatSelectionEnabled !== false;

  const startPayment = async (booking) => {
    const razorpayReady = await loadRazorpayCheckout();

    if (!razorpayReady) {
      toast.error("Razorpay checkout could not load. Check your internet connection or browser blockers.");
      return;
    }

    const orderResponse = await api.post("/payments/create-order", { bookingId: booking._id });
    const order = orderResponse.data.order;
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || orderResponse.data.keyId;

    if (!razorpayKey) {
      toast.error("Razorpay public key is missing.");
      return;
    }

    const checkout = new window.Razorpay({
      key: razorpayKey,
      amount: order.amount,
      currency: order.currency,
      name: "Event Organizer",
      description: event.title,
      order_id: order.id,
      handler: async (paymentResponse) => {
        try {
          const verifyResponse = await api.post("/payments/verify", paymentResponse);
          toast.success("Payment completed");
          setTicket((current) => verifyResponse.data.booking || { ...current, paymentStatus: "Paid", isPaid: true });
        } catch (error) {
          toast.error(getApiMessage(error, "Payment verification failed"));
        }
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
        contact: user?.phone || "",
      },
      modal: {
        ondismiss: () => {
          toast("Payment window closed");
        },
      },
      theme: {
        color: "#2563eb",
      },
    });

    checkout.on("payment.failed", async (response) => {
      const reason = response?.error?.description || response?.error?.reason || "Payment failed";

      try {
        await api.post("/payments/failure", {
          razorpay_order_id: order.id,
          reason,
        });
      } catch {
        // Failure logging should not block the user from retrying payment.
      }

      toast.error(reason);
      setTicket((current) => ({ ...current, paymentStatus: "Failed" }));
    });

    checkout.open();
  };

  const bookEvent = async () => {
    if (!user || !token) {
      toast.error("Please login before registering for an event.");
      navigate("/login");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(`/bookings/${event._id}`, {
        seatNumber: seatSelectionEnabled ? selectedSeat : "",
      });
      const booking = response.data.booking;
      setTicket(booking);

      if (event.isPaid) {
        toast.success("Seat reserved. Opening payment.");
        await startPayment(booking);
      } else {
        toast.success("Registration confirmed");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
        toast.error("Your session expired. Please login again.");
        navigate("/login");
        return;
      }

      toast.error(getApiMessage(error, "Registration failed"));
    } finally {
      setSaving(false);
    }
  };

  const joinWaitlist = async () => {
    if (!user || !token) {
      toast.error("Please login before joining the waitlist.");
      navigate("/login");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(`/bookings/${event._id}`, { joinWaitlist: true });
      setTicket(response.data.booking);
      toast.success("You joined the waitlist. You will be notified when a seat opens.");
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
        toast.error("Your session expired. Please login again.");
        navigate("/login");
        return;
      }

      toast.error(getApiMessage(error, "Could not join waitlist"));
    } finally {
      setSaving(false);
    }
  };

  const submitFeedback = async (submitEvent) => {
    submitEvent.preventDefault();

    if (!eventEnded) {
      toast.error("Feedback can be submitted after the event ends.");
      return;
    }

    setSaving(true);

    try {
      await api.post(`/events/${event._id}/feedback`, feedback);
      toast.success("Feedback submitted");
      setFeedback({ rating: "5", review: "" });
    } catch (error) {
      toast.error(getApiMessage(error, "Feedback failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!event) {
    return (
      <section className="section-content">
        <Container>
          <GlassCard className="empty-state">Event not found.</GlassCard>
        </Container>
      </section>
    );
  }

  return (
    <section className="section-content page-top">
      <Container>
        <div className="detail-grid">
          {event.poster ? (
            <img alt={event.title} className="detail-poster" src={event.poster} />
          ) : (
            <GlassCard className="detail-poster-placeholder">Poster will appear after the organizer uploads it.</GlassCard>
          )}
          <div className="detail-copy">
            <p className="eyebrow">{event.category}</p>
            <h1>{event.title}</h1>
            <p>{event.description || "Description will appear after the organizer adds it."}</p>
            <div className="detail-meta">
              <span>
                <MapPin size={16} /> {event.venue}
              </span>
              <span>
                <CalendarDays size={16} /> {formatDate(event.eventDate)}
              </span>
              <span>
                <Clock size={16} /> {event.startTime} {event.endTime ? `- ${event.endTime}` : ""}
              </span>
              <span>
                <CalendarDays size={16} /> Register by {formatDate(event.registrationDeadline)}
              </span>
              <span>
                <IndianRupee size={16} /> {event.isPaid ? event.price : "Free"}
              </span>
            </div>
            <strong className="countdown">{getCountdown(event.eventDate, now)}</strong>
            <CountdownBlocks eventDate={event.eventDate} now={now} />
            {Number(event.availableSeats || 0) > 0 ? (
              <button className="primary-button" disabled={saving} onClick={bookEvent} type="button">
                <Ticket size={18} /> {!user || !token ? "Login to register" : saving ? "Registering..." : "Register for event"}
              </button>
            ) : (
              <button className="primary-button" disabled={saving} onClick={joinWaitlist} type="button">
                <UserPlus size={18} /> {!user || !token ? "Login to join waitlist" : saving ? "Joining..." : "Join Waitlist"}
              </button>
            )}
            {canManageEvent(event, user) && (
              <Link className="secondary-button" to={`/events/${event._id}/settings`}>
                Manage Event
              </Link>
            )}
          </div>
        </div>

        {ticket && (
          <GlassCard className="ticket-panel">
            <div>
              <p className="eyebrow">
                {ticket.bookingStatus === "Waiting"
                  ? "Waitlist joined"
                  : ticket.paymentStatus === "Pending"
                  ? "Payment pending"
                  : "Registration confirmed"}
              </p>
              <h2>{ticket.paymentStatus === "Pending" ? "Complete payment" : ticket.ticketNumber}</h2>
              <p>
                {ticket.bookingStatus === "Waiting"
                  ? "Seat Available notifications will unlock registration automatically when someone cancels."
                  : ticket.paymentStatus === "Pending"
                  ? "Your seat is reserved temporarily. Complete Razorpay payment to generate your QR ticket."
                  : "Download or show this QR ticket at check-in."}
              </p>
              {ticket.seatNumber && <p>Seat: {ticket.seatNumber}</p>}
            </div>
            {ticket.qrCode && <img alt="QR ticket" src={ticket.qrCode} />}
            {ticket.qrCode && (
              <a className="secondary-button" download={`${ticket.ticketNumber || "event-organizer-ticket"}.png`} href={ticket.qrCode}>
                Download QR
              </a>
            )}
            {ticket.paymentStatus === "Pending" && (
              <button className="primary-button" disabled={saving} onClick={() => startPayment(ticket)} type="button">
                Pay now
              </button>
            )}
            <Link className="secondary-button" to={`/certificates/${ticket._id}`}>
              Certificate page
            </Link>
          </GlassCard>
        )}

        <div className="experience-grid">
          {seatSelectionEnabled && (
            <SeatPicker availableSeats={event.availableSeats} onSelectSeat={setSelectedSeat} selectedSeat={selectedSeat} />
          )}
          <AttendeeCounter event={event} />
          <EventTimeline event={event} />
          <BadgeGallery badges={event.badges?.length ? event.badges : undefined} />
          <SocialActions event={event} />
          <FeedbackAnalytics event={event} />
          <EventGallery event={event} />
          <DiscussionForum event={event} />
        </div>

        <div className="info-grid">
          <GlassCard className="info-panel">
            <h2>Speaker Profiles</h2>
            {event.speakers?.length ? (
              <div className="speaker-profile-list">
                {event.speakers.map((speaker) => (
                  <article key={speaker.name}>
                    {speaker.image && <img alt={speaker.name} src={speaker.image} />}
                    <div>
                      <strong>{speaker.name}</strong>
                      <span>{[speaker.designation, speaker.company].filter(Boolean).join(" / ")}</span>
                      {speaker.linkedin && <a href={speaker.linkedin} rel="noreferrer" target="_blank">LinkedIn</a>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>Speaker details will appear after the organizer adds them.</p>
            )}
          </GlassCard>
          <GlassCard className="info-panel">
            <h2>Venue map</h2>
            <div className="map-box">{event.location || event.venue}</div>
          </GlassCard>
          <GlassCard className="info-panel">
            <h2>Feedback</h2>
            {!eventEnded && <p>Feedback opens after the event end date.</p>}
            <form onSubmit={submitFeedback}>
              <select onChange={(item) => setFeedback({ ...feedback, rating: item.target.value })} value={feedback.rating}>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
              <textarea
                onChange={(item) => setFeedback({ ...feedback, review: item.target.value })}
                placeholder="Share your review after attending"
                value={feedback.review}
              />
              <button className="primary-button" disabled={saving || !eventEnded} type="submit">
                {eventEnded ? "Submit feedback" : "Feedback locked"}
              </button>
            </form>
          </GlassCard>
        </div>
      </Container>
    </section>
  );
}

export default EventDetail;
