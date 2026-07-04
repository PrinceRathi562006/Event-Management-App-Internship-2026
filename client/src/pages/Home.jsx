import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import Calendar from "react-calendar";
import { Link } from "react-router-dom";
import hero from "../assets/images/hero.jpg";
import { CountdownBlocks } from "../components/features/EventExperience";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function sameDay(first, second) {
  return first.toDateString() === second.toDateString();
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEventTileClass(events, tileDate) {
  const hasEvent = events.some((event) => sameDay(new Date(event.eventDate), tileDate));

  if (!hasEvent) {
    return null;
  }

  return startOfDay(tileDate).getTime() < startOfDay(new Date()).getTime() ? "event-day past-event-day" : "event-day";
}

function Home() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    api
      .get("/events/upcoming")
      .then((response) => {
        setEvents(response.data.events || []);
      })
      .catch(() => setEvents([]));

    api
      .get("/events/featured")
      .then((response) => {
        setFeatured(response.data.events || []);
      })
      .catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const categories = useMemo(() => ["All", ...new Set(events.map((event) => event.category).filter(Boolean))], [events]);

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (category === "All" || event.category === category) &&
          [event.title, event.category, event.venue].join(" ").toLowerCase().includes(query.toLowerCase())
      ),
    [category, events, query]
  );

  const selectedDateEvents = useMemo(
    () => events.filter((event) => sameDay(new Date(event.eventDate), date)),
    [date, events]
  );
  const nextEvent = filteredEvents[0] || featured[0] || events[0];

  return (
    <>
      <section className="home-calendar-section">
        <Container>
          <div className="calendar-layout home-calendar-layout">
            <GlassCard className="calendar-card">
              <Calendar
                next2AriaLabel="Go to next year"
                next2Label={<ChevronsRight size={18} />}
                nextAriaLabel="Go to next month"
                nextLabel={<ChevronRight size={18} />}
                onChange={setDate}
                prev2AriaLabel="Go to previous year"
                prev2Label={<ChevronsLeft size={18} />}
                prevAriaLabel="Go to previous month"
                prevLabel={<ChevronLeft size={18} />}
                tileClassName={({ date: tileDate }) => getEventTileClass(events, tileDate)}
                value={date}
              />
            </GlassCard>
            <GlassCard className="info-panel">
              <SectionTitle title="Event Calendar" subtitle="Monthly view with event days highlighted." />
              <h3>{date.toLocaleDateString("en-IN")}</h3>
              {selectedDateEvents.length ? (
                selectedDateEvents.slice(0, 4).map((event) => (
                  <Link className="calendar-event" key={event._id} to={`/events/${event._id}`}>
                    <strong>{event.title}</strong>
                    <span>{event.venue}</span>
                  </Link>
                ))
              ) : (
                <p>No events scheduled for this date.</p>
              )}
              <Link className="secondary-button" to="/calendar">
                Open full calendar
              </Link>
            </GlassCard>
          </div>
        </Container>
      </section>

      <section className="hero-section">
        <Container className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Geeta University Campus Hub</p>
            <h1>Event Organizer</h1>
            <p>
              Discover campus events, reserve seats, manage attendance, collect feedback, and issue certificates
              through one focused event management system.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" to="/events">
                Browse events <ArrowRight size={18} />
              </Link>
              <Link className="secondary-button" to="/register">
                Create account
              </Link>
            </div>
          </div>
          <img alt="Campus event" className="hero-image" src={hero} />
        </Container>
      </section>

      {nextEvent && (
        <section className="section-content countdown-home-band">
          <Container>
            <GlassCard className="home-countdown-card">
              <div>
                <p className="eyebrow">Starts In</p>
                <h2>{nextEvent.title}</h2>
                <span>{formatDate(nextEvent.eventDate)} at {nextEvent.venue}</span>
              </div>
              <CountdownBlocks eventDate={nextEvent.eventDate} now={now} />
              <Link className="primary-button" to={`/events/${nextEvent._id}`}>
                View event
              </Link>
            </GlassCard>
          </Container>
        </section>
      )}

      <section className="section-content">
        <Container>
          <SectionTitle
            eyebrow="What it handles"
            title="A complete campus event workflow"
            subtitle="Students, organizers, and admins get the tools they need without bouncing between systems."
          />
          <div className="feature-grid">
            <article>
              <CalendarCheck />
              <h3>Event Publishing</h3>
              <p>Create events with seats, dates, poster images, categories, and approval status.</p>
            </article>
            <article>
              <Ticket />
              <h3>Bookings</h3>
              <p>Reserve seats, generate QR tickets, track payment state, and manage cancellations.</p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Admin Control</h3>
              <p>Review events, monitor dashboards, broadcast notifications, and protect role-based access.</p>
            </article>
          </div>
        </Container>
      </section>

      <section className="section-content muted-section">
        <Container>
          <SectionTitle title="Featured events" subtitle="Highlighted approved campus events." />
          <div className="event-grid">
            {featured.length ? (
              featured.slice(0, 3).map((event) => (
                <Link className="event-card" key={event._id} to={`/events/${event._id}`}>
                  {event.poster && <img alt={event.title} src={event.poster} />}
                  <div>
                    <span>{event.category}</span>
                    <h3>{event.title}</h3>
                    <p>{event.venue}</p>
                  </div>
                </Link>
              ))
            ) : (
              <GlassCard className="empty-state">
                <h2>No featured events</h2>
                <p>Featured events will appear after approval.</p>
              </GlassCard>
            )}
          </div>
        </Container>
      </section>

      <section className="section-content">
        <Container>
          <div className="page-header">
            <SectionTitle title="Upcoming list" subtitle="Search and filter approved campus events by category." />
            <label className="search-box">
              <Search size={18} />
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or venue" value={query} />
            </label>
          </div>

          <div className="category-tabs">
            {categories.map((item) => (
              <button
                className={item === category ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="upcoming-list">
            {filteredEvents.length ? (
              filteredEvents.slice(0, 5).map((event) => (
                <Link className="list-row" key={event._id} to={`/events/${event._id}`}>
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      {formatDate(event.eventDate)} at {event.startTime}
                    </span>
                    <small>
                      <MapPin size={14} /> {event.venue}
                    </small>
                  </div>
                  <span className="event-price">{event.isPaid ? `Rs ${event.price}` : "Free"}</span>
                </Link>
              ))
            ) : (
              <GlassCard className="empty-state">
                <h2>No upcoming events</h2>
                <p>Approved upcoming events will appear here.</p>
              </GlassCard>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

export default Home;
