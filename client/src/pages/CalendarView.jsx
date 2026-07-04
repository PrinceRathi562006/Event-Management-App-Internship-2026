import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEventEndDate(event) {
  return event.endDate || event.eventEndDate || event.finishDate || event.eventDate;
}

function isDateInEventRange(event, tileDate) {
  if (!event.eventDate) {
    return false;
  }

  const currentDate = startOfDay(tileDate).getTime();
  const startDate = startOfDay(event.eventDate).getTime();
  const endDate = startOfDay(getEventEndDate(event)).getTime();

  return currentDate >= startDate && currentDate <= Math.max(startDate, endDate);
}

function getEventTileClass(events, tileDate) {
  const hasEvent = events.some((event) => isDateInEventRange(event, tileDate));

  if (!hasEvent) {
    return null;
  }

  return startOfDay(tileDate).getTime() < startOfDay(new Date()).getTime() ? "event-day past-event-day" : "event-day";
}

function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api
      .get("/events/upcoming")
      .then((response) => {
        setEvents(response.data.events || []);
      })
      .catch(() => setEvents([]));
  }, []);

  const dayEvents = useMemo(
    () => events.filter((event) => isDateInEventRange(event, date)),
    [date, events]
  );

  return (
    <section className="section-content page-top">
      <Container>
        <SectionTitle title="Calendar" subtitle="Monthly view of upcoming campus events." />
        <div className="calendar-layout">
          <GlassCard className="calendar-card">
            <Calendar
              next2AriaLabel="Next Year"
              next2Label={<ChevronsRight size={18} />}
              nextAriaLabel="Next Month"
              nextLabel={<ChevronRight size={18} />}
              onChange={setDate}
              prev2AriaLabel="Previous Year"
              prev2Label={<ChevronsLeft size={18} />}
              prevAriaLabel="Previous Month"
              prevLabel={<ChevronLeft size={18} />}
              tileClassName={({ date: tileDate }) => getEventTileClass(events, tileDate)}
              value={date}
            />
          </GlassCard>
          <GlassCard className="info-panel">
            <h2>Events on {date.toLocaleDateString("en-IN")}</h2>
            {dayEvents.length ? (
              dayEvents.map((event) => (
                <Link className="calendar-event" key={event._id} to={`/events/${event._id}`}>
                  <strong>{event.title}</strong>
                  <span>{event.venue}</span>
                </Link>
              ))
            ) : (
              <p>No events scheduled for this date.</p>
            )}
          </GlassCard>
        </div>
      </Container>
    </section>
  );
}

export default CalendarView;
