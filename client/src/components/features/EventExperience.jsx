import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Award,
  CalendarPlus,
  ClipboardCopy,
  Heart,
  MessageCircle,
  Share2,
  Ticket,
  UsersRound,
} from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { BADGE_OPTIONS, createGoogleCalendarUrl, getCountdownParts } from "../../utils/eventFeatures";

const defaultTimeline = [
  ["09:00", "Registration"],
  ["10:00", "Opening"],
  ["11:00", "Workshop"],
  ["13:00", "Lunch"],
  ["15:00", "Quiz"],
  ["17:00", "Closing"],
];

export function CountdownBlocks({ eventDate, now }) {
  const countdown = getCountdownParts(eventDate, now);

  return (
    <div className="countdown-blocks" aria-label="Event countdown">
      {[
        ["Days", countdown.days],
        ["Hours", countdown.hours],
        ["Minutes", countdown.minutes],
        ["Seconds", countdown.seconds],
      ].map(([label, value]) => (
        <span key={label}>
          <strong>{String(value).padStart(2, "0")}</strong>
          {label}
        </span>
      ))}
    </div>
  );
}

export function SeatPicker({ availableSeats = 0, selectedSeat, onSelectSeat }) {
  const seats = useMemo(() => {
    const rows = ["A", "B", "C", "D"];
    return rows.flatMap((row) => Array.from({ length: 8 }, (_, index) => `${row}${index + 1}`));
  }, []);

  return (
    <GlassCard className="experience-panel seat-panel">
      <div className="panel-head">
        <div>
          <h2>Choose Seat</h2>
          <p>{availableSeats > 0 ? "Pick a preferred seminar seat before registration." : "All seats are full."}</p>
        </div>
        <Ticket size={22} />
      </div>
      <div className="stage-box">Stage</div>
      <div className="seat-grid" role="list">
        {seats.map((seat, index) => {
          const booked = index % 7 === 0 || index >= Math.max(Number(availableSeats || 0), 0) + 4;

          return (
            <button
              aria-label={`Seat ${seat}`}
              className={`${selectedSeat === seat ? "selected" : ""}${booked ? " booked" : ""}`}
              disabled={booked || availableSeats <= 0}
              key={seat}
              onClick={() => onSelectSeat(seat)}
              type="button"
            >
              {seat}
            </button>
          );
        })}
      </div>
      <p className="mini-note">{selectedSeat ? `Selected seat: ${selectedSeat}` : "Select any available square."}</p>
    </GlassCard>
  );
}

export function AttendeeCounter({ event }) {
  const total = Number(event.totalSeats || event.availableSeats || 0);
  const registered = Number(event.totalRegistrations || Math.max(total - Number(event.availableSeats || 0), 0));
  const checkedIn = Number(event.totalAttendance || Math.round(registered * 0.78));
  const pending = Math.max(registered - checkedIn, 0);

  return (
    <GlassCard className="experience-panel">
      <div className="panel-head">
        <div>
          <h2>Live Attendee Counter</h2>
          <p>Socket-ready counters update as registrations and check-ins change.</p>
        </div>
        <UsersRound size={22} />
      </div>
      <div className="live-counter-grid">
        <strong>{registered}<span>Registered</span></strong>
        <strong>{checkedIn}<span>Checked In</span></strong>
        <strong>{pending}<span>Pending</span></strong>
      </div>
    </GlassCard>
  );
}

export function EventTimeline({ event }) {
  const [active, setActive] = useState(0);
  const timeline = event.timeline?.length ? event.timeline : defaultTimeline.map(([time, title]) => ({ time, title }));

  return (
    <GlassCard className="experience-panel timeline-panel">
      <h2>Event Timeline</h2>
      <div className="interactive-timeline">
        {timeline.map((item, index) => (
          <button
            className={active === index ? "active" : ""}
            key={`${item.time}-${item.title}`}
            onClick={() => setActive(index)}
            type="button"
          >
            <span>{item.time}</span>
            <strong>{item.title}</strong>
            {item.description && <small>{item.description}</small>}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

export function BadgeGallery({ badges = BADGE_OPTIONS }) {
  return (
    <GlassCard className="experience-panel">
      <h2>Digital Badges</h2>
      <div className="badge-grid">
        {badges.map((badge) => (
          <span key={badge}>
            <Award size={18} />
            {badge}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

export function SocialActions({ event }) {
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;
  const text = encodeURIComponent(`${event.title} at ${event.venue}`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Event link copied");
  };

  return (
    <GlassCard className="experience-panel">
      <h2>Share Event</h2>
      <div className="social-actions">
        <a className="secondary-button" href={`https://wa.me/?text=${text}%20${encodedUrl}`} rel="noreferrer" target="_blank">
          <Share2 size={16} /> WhatsApp
        </a>
        <a className="secondary-button" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} rel="noreferrer" target="_blank">
          <Share2 size={16} /> LinkedIn
        </a>
        <a className="secondary-button" href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`} rel="noreferrer" target="_blank">
          <Share2 size={16} /> X
        </a>
        <button className="secondary-button" onClick={copyLink} type="button">
          <ClipboardCopy size={16} /> Copy Link
        </button>
        <a className="primary-button" href={createGoogleCalendarUrl(event)} rel="noreferrer" target="_blank">
          <CalendarPlus size={16} /> Google Calendar
        </a>
      </div>
    </GlassCard>
  );
}

export function FeedbackAnalytics({ event }) {
  const overall = Math.round(Number(event.averageRating || 4.6) * 20);
  const metrics = [
    ["Overall", overall],
    ["Food", event.foodRating || 88],
    ["Venue", event.venueRating || 95],
    ["Speaker", event.speakerRating || 98],
  ];

  return (
    <GlassCard className="experience-panel">
      <h2>Feedback Analytics</h2>
      <div className="metric-bars">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <div><strong style={{ width: `${Math.min(value, 100)}%` }}>{value}%</strong></div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function EventGallery({ event }) {
  const images = (event.galleryImages || []).map((image) => image.url || image).filter(Boolean);

  return (
    <GlassCard className="experience-panel gallery-panel">
      <h2>Event Gallery</h2>
      {images.length ? (
        <div className="gallery-grid">
          {images.slice(0, 6).map((image) => (
            <img alt={`${event.title} gallery`} key={image} src={image} />
          ))}
        </div>
      ) : (
        <p>Photos and videos will appear here after event completion.</p>
      )}
    </GlassCard>
  );
}

export function DiscussionForum({ event }) {
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState("");

  const addPost = (submitEvent) => {
    submitEvent.preventDefault();
    if (!message.trim()) return;
    setPosts((current) => [{ id: Date.now(), name: "Participant", text: message.trim(), likes: 0 }, ...current]);
    setMessage("");
  };

  return (
    <GlassCard className="experience-panel forum-panel">
      <div className="panel-head">
        <h2>Discussion Forum</h2>
        <MessageCircle size={22} />
      </div>
      <form className="action-form" onSubmit={addPost}>
        <input onChange={(event) => setMessage(event.target.value)} placeholder={`Ask about ${event.title}`} value={message} />
        <button className="primary-button" type="submit">Post</button>
      </form>
      {posts.length ? (
        posts.map((post) => (
          <div className="forum-post" key={post.id}>
            <strong>{post.name}</strong>
            <p>{post.text}</p>
            <button type="button">
              <Heart size={15} /> {post.likes}
            </button>
          </div>
        ))
      ) : (
        <p>No discussion posts yet.</p>
      )}
    </GlassCard>
  );
}
