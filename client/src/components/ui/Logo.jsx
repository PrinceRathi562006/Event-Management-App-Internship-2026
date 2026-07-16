import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.jpeg";

function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark">
        <CalendarDays size={22} />
      </span>
      {/* <span>Event Organizer</span> */}
      <a href="/" className="logo">
      <img src={logo} alt="event organizer" /></a>
      
    </Link>
  );
}

export default Logo;
