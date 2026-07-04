import { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import { setCredentials } from "../redux/authSlice";
import api from "../services/api";
import { getApiMessage } from "../utils/forms";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      dispatch(setCredentials({ user: response.data.user, token: response.data.token }));
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message?.toLowerCase().includes("verify")) {
        toast.error("Please verify your email first");
        navigate("/verify-email", { state: { email: form.email } });
        return;
      }

      toast.error(getApiMessage(error, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <Container>
        <GlassCard className="auth-card">
          <h1>Login</h1>
          <form onSubmit={handleSubmit}>
            <input
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Email"
              type="email"
              value={form.email}
            />
            <input
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Password"
              type="password"
              value={form.password}
            />
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p>
            New here? <Link to="/register">Create an account</Link>
          </p>
        </GlassCard>
      </Container>
    </section>
  );
}

export default Login;
