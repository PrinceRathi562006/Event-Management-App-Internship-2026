import { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import { logout } from "../redux/authSlice";
import api from "../services/api";

function VerifyEmail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: location.state?.email || "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/verify-registration-otp", form);
      dispatch(logout());
      toast.success("Email verified. Please login.");
      navigate("/login", { state: { email: form.email } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!form.email) {
      toast.error("Enter your email first");
      return;
    }

    setLoading(true);

    try {
      try {
        await api.post("/auth/resend-otp", { email: form.email });
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error;
        }

        await api.post("/auth/otp/resend", { email: form.email });
      }
      toast.success("OTP sent again");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <Container>
        <GlassCard className="auth-card">
          <p className="eyebrow">Email verification</p>
          <h1>Verify account</h1>
          <form onSubmit={verifyOtp}>
            <input
              onChange={(event) => update("email", event.target.value)}
              placeholder="Email"
              type="email"
              value={form.email}
            />
            <input
              onChange={(event) => update("otp", event.target.value)}
              placeholder="6 digit OTP"
              value={form.otp}
            />
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Verifying..." : "Verify and continue"}
            </button>
            <button className="secondary-button" disabled={loading} onClick={resendOtp} type="button">
              Resend OTP
            </button>
          </form>
          <p>
            Already verified? <Link to="/login">Login</Link>
          </p>
        </GlassCard>
      </Container>
    </section>
  );
}

export default VerifyEmail;
