import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import Container from "../ui/Container";
import Logo from "../ui/Logo";
import api from "../../services/api";

function Footer() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [supportEmail, setSupportEmail] = useState("princerathi674@gmail.com");

  useEffect(() => {
    api
      .get("/support")
      .then((response) => setSupportEmail(response.data.supportEmail || "princerathi674@gmail.com"))
      .catch(() => setSupportEmail("princerathi674@gmail.com"));
  }, []);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitContact = (event) => {
    event.preventDefault();

    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill all contact fields");
      return;
    }

    const subject = encodeURIComponent(`Event Organizer contact from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\nReply to: ${form.email}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    toast.success("Opening your mail app");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <footer className="site-footer" id="contact">
      <Container className="footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>Campus event discovery, booking, check-in, feedback, and certificates in one focused MERN app.</p>
          <div className="footer-contact">
            <span>{supportEmail}</span>
            <span>Geeta University, Panipat</span>
          </div>
        </div>

        <div className="footer-links">
          <h3>Explore</h3>
          <Link to="/">Home</Link>
          <Link to="/events">Events</Link>
          <Link to="/calendar">Calendar</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>

        <div className="footer-links">
          <h3>Account</h3>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
          <Link to="/forgot-password">Forgot password</Link>
          <a href="#contact">Contact us</a>
        </div>

        <form className="footer-form" onSubmit={submitContact}>
          <h3>Contact Us</h3>
          <input onChange={(event) => update("name", event.target.value)} placeholder="Your name" value={form.name} />
          <input
            onChange={(event) => update("email", event.target.value)}
            placeholder="Email address"
            type="email"
            value={form.email}
          />
          <textarea
            onChange={(event) => update("message", event.target.value)}
            placeholder="How can we help?"
            rows="3"
            value={form.message}
          />
          <button className="primary-button" type="submit">
            Send message
          </button>
        </form>
      </Container>
    </footer>
  );
}

export default Footer;
