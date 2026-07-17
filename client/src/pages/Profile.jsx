import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Award, FileUp, Settings } from "lucide-react";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import Loader from "../components/ui/Loader";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";
import { getApiMessage } from "../utils/forms";

function ProfileLine({ label, value }) {
  return (
    <div className="profile-line">
      <span>{label}</span>
      <strong>{value || "Not added"}</strong>
    </div>
  );
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

const getAssetUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
  const apiRoot = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${apiRoot}${value}`;
};

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/profile")
      .then((response) => setUser(response.data.user || null))
      .catch((error) => toast.error(getApiMessage(error, "Profile failed to load")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <section className="section-content page-top">
        <Container>
          <GlassCard className="empty-state">
            <h1>Login required</h1>
            <Link className="primary-button" to="/login">
              Login
            </Link>
          </GlassCard>
        </Container>
      </section>
    );
  }

  const roleDetails =
    user.role === "organizer"
      ? [
          ["Department", user.department],
          ["Designation", user.designation],
          ["Approval", user.organizerStatus],
        ]
      : [
          ["Course", user.course],
          ["Branch", user.branch],
          ["Year", user.year],
          ["Semester", user.semester],
          ["Roll Number", user.rollNumber],
      ];
  const completionFields = ["profileImage", "bio", "college", "department", "phone"];
  const completed = completionFields.filter((field) => Boolean(user[field])).length;
  const completion = Math.round((completed / completionFields.length) * 100);

  return (
    <section className="section-content page-top scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="profile" />
      <Container>
        <div className="page-header">
          <SectionTitle title="Profile" subtitle="Read-only account overview." />
          <Link className="primary-button" to="/settings">
            <Settings size={18} /> Settings
          </Link>
        </div>

        <GlassCard className="profile-overview">
          <img alt={user.name} className="profile-avatar" src={user.profileImage} />
          <div className="profile-summary">
            <p className="eyebrow">{user.role}</p>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </GlassCard>

        <GlassCard className="dashboard-panel">
          <div className="profile-completion">
            <div>
              <span>{completion}%</span>
              <strong>Profile Completion</strong>
            </div>
            <progress max="100" value={completion} />
            <p>Upload photo, complete bio, add college, department, and phone to finish your profile.</p>
          </div>
          <div className="profile-detail-grid">
            <ProfileLine label="Name" value={user.name} />
            <ProfileLine label="Email" value={user.email} />
            <ProfileLine label="Phone" value={user.phone} />
            <ProfileLine label="College" value={user.college} />
            <ProfileLine label="Role" value={user.role} />
            <ProfileLine label="Gender" value={user.gender} />
            <ProfileLine label="Date of Birth" value={formatDisplayDate(user.dateOfBirth)} />
            {roleDetails.map(([label, value]) => (
              <ProfileLine key={label} label={label} value={value} />
            ))}
          </div>
        </GlassCard>

        <div className="dashboard-grid">
          <GlassCard className="dashboard-panel">
            <div className="panel-head">
              <h2>Resume Integration</h2>
              <FileUp size={22} />
            </div>
            <p>Upload your resume from Settings. Organizers and admins can open it from registration and user details.</p>
            {user.resumeUrl && (
              <div className="resume-link-row">
                <span>{user.resumeFileName || "Uploaded resume"}</span>
                <a className="secondary-button" href={getAssetUrl(user.resumeUrl)} rel="noreferrer" target="_blank">
                  View resume
                </a>
              </div>
            )}
            <Link className={user.resumeUrl ? "secondary-button" : "primary-button"} to="/settings">
              {user.resumeUrl ? "Update resume" : "Upload resume"}
            </Link>
          </GlassCard>
          <GlassCard className="dashboard-panel">
            <div className="panel-head">
              <h2>Achievements</h2>
              <Award size={22} />
            </div>
            <div className="badge-grid">
              {["First Event", "10 Events", "50 Events", "Volunteer", "Speaker", "Winner"].map((achievement) => (
                <span key={achievement}>{achievement}</span>
              ))}
            </div>
          </GlassCard>
        </div>
      </Container>
    </section>
  );
}

export default Profile;
