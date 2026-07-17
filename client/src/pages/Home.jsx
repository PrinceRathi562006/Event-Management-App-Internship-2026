import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";
import Calendar from "react-calendar";
import { Link } from "react-router-dom";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
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

function getEventCountdown(value, now) {
  if (!value) {
    return "Date soon";
  }

  const distance = new Date(value).getTime() - now;

  if (distance <= 0) {
    return "Happening now";
  }

  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${Math.max(hours, 1)}h left`;
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
  const todayEventsCount = useMemo(
    () => events.filter((event) => sameDay(new Date(event.eventDate), new Date(now))).length,
    [events, now]
  );
  const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
  };
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <>
      <section className="hero-section hero-section-cinematic">
        <CinematicHeroBackground />
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
              <Link className="secondary-button hero-secondary-button" to="/register">
                Create account
              </Link>
            </div>
          </div>
        </Container>
      </section>

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

      <motion.section
        className="section-content home-upcoming-section"
        initial="hidden"
        variants={sectionVariants}
        viewport={{ once: true, amount: 0.18 }}
        whileInView="visible"
      >
        <Container>
          <div className="home-upcoming-orb home-upcoming-orb-one" />
          <div className="home-upcoming-orb home-upcoming-orb-two" />
          <div className="page-header home-upcoming-header">
            <div className="home-upcoming-title-block">
              <p className="home-upcoming-kicker">
                <Sparkles size={16} /> Campus discovery
              </p>
              <h2>Upcoming Events</h2>
              <span className="home-upcoming-title-line" />
              <p>Discover exciting events happening around your campus.</p>
            </div>

            <div className="home-upcoming-control-panel">
              <label className="search-box premium-search-box">
                <Search size={18} />
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, category, or venue"
                  value={query}
                />
                {query && (
                  <button aria-label="Clear search" onClick={() => setQuery("")} type="button">
                    <X size={16} />
                  </button>
                )}
              </label>
              <div className="home-event-counter-grid">
                <span><strong>{filteredEvents.length}</strong>Showing</span>
                <span><strong>{events.length}</strong>Total</span>
                <span><strong>{todayEventsCount}</strong>Today</span>
              </div>
            </div>
          </div>

          <div className="category-tabs home-category-tabs">
            {categories.map((item) => (
              <motion.button
                className={item === category ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                {item === "All" && <Sparkles size={14} />}
                {item}
              </motion.button>
            ))}
          </div>

          <motion.div className="upcoming-list" variants={listVariants}>
            {filteredEvents.length ? (
              filteredEvents.slice(0, 5).map((event, index) => (
                <motion.article
                  className={`upcoming-event-card${sameDay(new Date(event.eventDate), new Date(now)) ? " is-today" : ""}`}
                  key={event._id}
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.01 }}
                >
                  <Link className="upcoming-event-card-link" to={`/events/${event._id}`}>
                    <div className="event-card-accent" />
                    <div className="event-card-thumbnail">
                      {event.poster ? (
                        <img alt={event.title} src={event.poster} />
                      ) : (
                        <Sparkles size={24} />
                      )}
                    </div>
                    <div className="event-card-main">
                      <div className="event-card-badges">
                        {index === 0 && <span className="trending-badge"><Sparkles size={13} /> Trending</span>}
                        {event.featured && <span className="featured-ribbon">Featured</span>}
                        {sameDay(new Date(event.eventDate), new Date(now)) && <span className="today-badge">Today</span>}
                        <span className="event-category-badge">{event.category || "Campus"}</span>
                      </div>
                      <h3>{event.title}</h3>
                      <div className="event-card-meta">
                        <span><CalendarCheck size={16} /> {formatDate(event.eventDate)}</span>
                        <span><Clock size={16} /> {event.startTime || "Time TBA"}</span>
                        <span><MapPin size={16} /> {event.venue || "Venue TBA"}</span>
                        <span><Users size={16} /> {Math.max(Number(event.totalSeats || 0) - Number(event.availableSeats || 0), 0)} joined</span>
                      </div>
                    </div>
                    <div className="event-card-action">
                      <span className={event.isPaid ? "event-price price-paid" : "event-price price-free"}>
                        <Ticket size={15} /> {event.isPaid ? `Rs ${event.price}` : "FREE"}
                      </span>
                      <span className="premium-event-button">
                        Register <ArrowRight size={17} />
                      </span>
                      <small>{getEventCountdown(event.eventDate, now)}</small>
                    </div>
                  </Link>
                </motion.article>
              ))
            ) : (
              <motion.div className="premium-empty-state" variants={cardVariants}>
                <div className="premium-empty-illustration">
                  <Sparkles size={38} />
                </div>
                <h2>No events match your search</h2>
                <p>Try a different keyword or browse all campus events.</p>
                <button className="premium-event-button" onClick={() => { setCategory("All"); setQuery(""); }} type="button">
                  Reset filters <ArrowRight size={17} />
                </button>
              </motion.div>
            )}
          </motion.div>
        </Container>
      </motion.section>
    </>
  );
}

export default Home;
