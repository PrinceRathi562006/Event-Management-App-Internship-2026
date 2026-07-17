import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import api from "../services/api";
import { compactPayload, getApiMessage } from "../utils/forms";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "student",
    college: "Geeta University",
    course: "",
    branch: "",
    year: "",
    semester: "",
    gender: "",
    dateOfBirth: "",
    rollNumber: "",
    department: "",
    designation: "",
    profileImage: null,
  });
  const [loading, setLoading] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setDuplicateInfo(null);

    try {
      const payload = new FormData();
      Object.entries(compactPayload(form)).forEach(([key, value]) => {
        if (key !== "profileImage") {
          payload.append(key, value);
        }
      });

      if (form.profileImage) {
        payload.append("profileImage", form.profileImage);
      }

      await api.post("/auth/register", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Registration created. Check your email for the OTP.");
      navigate("/verify-email", { state: { email: form.email } });
    } catch (error) {
      const duplicateMatches = error.response?.data?.duplicateMatches || [];
      const existingAccount = error.response?.data?.existingAccount;

      if (duplicateMatches.length) {
        setDuplicateInfo({
          message: error.response?.data?.message || "User already exists.",
          matches: duplicateMatches,
          account: existingAccount,
        });
      }

      toast.error(getApiMessage(error, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="signup" />
      <Container>
        <GlassCard className="auth-card">
          <h1>Create account</h1>
          <form onSubmit={handleSubmit}>
            <input onChange={(event) => update("name", event.target.value)} placeholder="Full name" value={form.name} />
            <input
              onChange={(event) => update("email", event.target.value)}
              placeholder="Email"
              type="email"
              value={form.email}
            />
            <input onChange={(event) => update("phone", event.target.value)} placeholder="Phone" value={form.phone} />
            <input
              onChange={(event) => update("college", event.target.value)}
              placeholder="College name"
              value={form.college}
            />
            <select onChange={(event) => update("gender", event.target.value)} value={form.gender}>
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <label className="input-label">
              Date of Birth
              <input onChange={(event) => update("dateOfBirth", event.target.value)} type="date" value={form.dateOfBirth} />
            </label>
            <div className="role-selector" aria-label="Account type">
              {[
                { label: "Student", value: "student" },
                { label: "Organizer", value: "organizer" },
              ].map((option) => (
                <button
                  className={form.role === option.value ? "role-option active" : "role-option"}
                  key={option.value}
                  onClick={() => update("role", option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {form.role === "student" ? (
              <>
                <input
                  onChange={(event) => update("rollNumber", event.target.value)}
                  placeholder="Roll number"
                  value={form.rollNumber}
                />
                <div className="form-grid">
                  <input
                    onChange={(event) => update("course", event.target.value)}
                    placeholder="Course"
                    value={form.course}
                  />
                  <input
                    onChange={(event) => update("branch", event.target.value)}
                    placeholder="Branch"
                    value={form.branch}
                  />
                </div>
                <div className="form-grid">
                  <select onChange={(event) => update("year", event.target.value)} value={form.year}>
                    <option value="">Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                  <select onChange={(event) => update("semester", event.target.value)} value={form.semester}>
                    <option value="">Semester</option>
                    {Array.from({ length: 10 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        Semester {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="form-grid">
                  <input
                    onChange={(event) => update("department", event.target.value)}
                    placeholder="Department"
                    value={form.department}
                  />
                  <input
                    onChange={(event) => update("designation", event.target.value)}
                    placeholder="Designation"
                    value={form.designation}
                  />
                </div>
                <p className="form-note">Organizer accounts stay pending until an admin approves them.</p>
              </>
            )}
            <label className="file-field">
              Profile picture
              <input
                accept="image/*"
                onChange={(event) => update("profileImage", event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <input
              onChange={(event) => update("password", event.target.value)}
              placeholder="Password"
              type="password"
              value={form.password}
            />
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
          {duplicateInfo && (
            <div className="duplicate-box">
              <strong>{duplicateInfo.message}</strong>
              {duplicateInfo.matches.map((match) => (
                <span key={match.field}>
                  {match.label}: {match.value}
                </span>
              ))}
              {duplicateInfo.account && (
                <small>
                  Existing account: {duplicateInfo.account.name} ({duplicateInfo.account.role})
                  {duplicateInfo.account.role === "organizer" ? ` / ${duplicateInfo.account.organizerStatus}` : ""}
                </small>
              )}
            </div>
          )}
          <p>
            Already registered? <Link to="/login">Login</Link>
          </p>
        </GlassCard>
      </Container>
    </section>
  );
}

export default Register;
