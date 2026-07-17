import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import PasswordField from "../components/ui/PasswordField";
import api from "../services/api";

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [form, setForm] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email: form.email });
      toast.success("Reset OTP sent to your email");
      setStep("otp");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/verify-forgot-password-otp", {
        email: form.email,
        otp: form.otp,
      });
      toast.success("OTP verified");
      setStep("reset");
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        email: form.email,
        otp: form.otp,
        password: form.password,
      });
      toast.success("Password reset successfully");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <Container>
        <GlassCard className="auth-card">
          <p className="eyebrow">Account recovery</p>
          <h1>Reset password</h1>

          {step === "email" && (
            <form onSubmit={requestOtp}>
              <input
                onChange={(event) => update("email", event.target.value)}
                placeholder="Registered email"
                type="email"
                value={form.email}
              />
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              <input
                onChange={(event) => update("otp", event.target.value)}
                placeholder="6 digit OTP"
                value={form.otp}
              />
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button className="secondary-button" disabled={loading} onClick={requestOtp} type="button">
                Resend OTP
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={resetPassword}>
              <PasswordField
                autoComplete="new-password"
                onChange={(event) => update("password", event.target.value)}
                placeholder="New password"
                value={form.password}
              />
              <PasswordField
                autoComplete="new-password"
                onChange={(event) => update("confirmPassword", event.target.value)}
                placeholder="Confirm new password"
                value={form.confirmPassword}
              />
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          <p>
            Remembered it? <Link to="/login">Back to login</Link>
          </p>
        </GlassCard>
      </Container>
    </section>
  );
}

export default ForgotPassword;
