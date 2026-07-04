import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Heart, IndianRupee, MapPin, Navigation, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import Loader from "../components/ui/Loader";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";
import { EVENT_CATEGORIES } from "../utils/eventFeatures";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function Events() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem("event_wishlist") || "[]"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    api
      .get("/events")
      .then((response) => {
        if (mounted) {
          setEvents(response.data.events || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setEvents([]);
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
  }, []);

  const categories = ["All", ...new Set([...EVENT_CATEGORIES, ...events.map((event) => event.category).filter(Boolean)])];
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const searchText = [
          event.title,
          event.category,
          event.venue,
          event.organizer?.name,
          event.eventDate,
          event.startTime,
        ]
          .join(" ")
          .toLowerCase();
        const nearbyMatch = !nearbyOnly || /auditorium|lab|campus|hall|theatre|university/i.test(event.venue || "");

        return (category === "All" || event.category === category) && searchText.includes(query.toLowerCase()) && nearbyMatch;
      }),
    [category, events, nearbyOnly, query]
  );

  const toggleWishlist = (eventId) => {
    const next = wishlist.includes(eventId) ? wishlist.filter((id) => id !== eventId) : [...wishlist, eventId];
    setWishlist(next);
    localStorage.setItem("event_wishlist", JSON.stringify(next));
  };

  return (
    <section className="section-content page-top">
      <Container>
        <div className="page-header">
          <SectionTitle title="Events" subtitle="Find upcoming approved and published campus events." />
          <label className="search-box">
            <Search size={18} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, organizer, venue, date, category" value={query} />
          </label>
        </div>

        <div className="smart-filter-row">
          <button className={nearbyOnly ? "active" : ""} onClick={() => setNearbyOnly((current) => !current)} type="button">
            <Navigation size={16} /> Events Near You
          </button>
          <span>{wishlist.length} saved events</span>
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

        {loading ? (
          <Loader />
        ) : (
          <div className="event-grid">
            {filteredEvents.length ? (
              filteredEvents.map((event) => (
                <article className="event-card event-card-large event-card-actions" key={event._id}>
                  <button
                    aria-label="Save event"
                    className={`wishlist-button${wishlist.includes(event._id) ? " active" : ""}`}
                    onClick={() => toggleWishlist(event._id)}
                    type="button"
                  >
                    <Heart size={18} />
                  </button>
                  <Link to={`/events/${event._id}`}>
                    {event.poster && <img alt={event.title} src={event.poster} />}
                    <div>
                      <span>{event.category}</span>
                      <h3>{event.title}</h3>
                      <p>
                        <MapPin size={16} /> {event.venue}
                      </p>
                      <p>
                        <CalendarDays size={16} /> {formatDate(event.eventDate)} at {event.startTime}
                      </p>
                      <p>
                        <IndianRupee size={16} /> {event.isPaid ? event.price : "Free"} / {event.availableSeats} seats
                      </p>
                    </div>
                  </Link>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h2>No events found</h2>
                <p>Approved and published events will appear here.</p>
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}

export default Events;
