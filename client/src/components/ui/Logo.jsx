import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark">
        <CalendarDays size={22} />
      </span>
      <span>Event Organizer</span>
    </Link>
  );
}

export default Logo;
