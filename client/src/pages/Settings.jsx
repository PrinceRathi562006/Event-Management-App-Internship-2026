import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import Loader from "../components/ui/Loader";
import SectionTitle from "../components/ui/SectionTitle";
import { setCredentials } from "../redux/authSlice";
import api from "../services/api";
import { compactPayload, getApiMessage } from "../utils/forms";

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

const getAssetUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
  const apiRoot = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${apiRoot}${value}`;
};

function Settings() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/auth/profile")
      .then((response) => {
        const nextUser = response.data.user || {};
        setUser(nextUser);
        setForm({
          name: nextUser.name || "",
          phone: nextUser.phone || "",
          college: nextUser.college || "",
          course: nextUser.course || "",
          branch: nextUser.branch || "",
          department: nextUser.department || "",
          designation: nextUser.designation || "",
          year: nextUser.year || "",
          semester: nextUser.semester || "",
          gender: nextUser.gender || "",
          dateOfBirth: formatDateInput(nextUser.dateOfBirth),
          rollNumber: nextUser.rollNumber || "",
          bio: nextUser.bio || "",
        });
      })
      .catch((error) => toast.error(getApiMessage(error, "Settings failed to load")))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      let response = await api.put("/auth/profile", compactPayload(form));

      if (profileImage) {
        const imagePayload = new FormData();
        imagePayload.append("profileImage", profileImage);
        const imageResponse = await api.put("/auth/profile/image", imagePayload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        response = {
          data: {
            user: {
              ...response.data.user,
              profileImage: imageResponse.data.profileImage,
            },
          },
        };
      }

      if (resumeFile) {
        const resumePayload = new FormData();
        resumePayload.append("resume", resumeFile);
        const resumeResponse = await api.put("/auth/profile/resume", resumePayload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        response = {
          data: {
            user: {
              ...response.data.user,
              ...resumeResponse.data.user,
            },
          },
        };
      }

      dispatch(setCredentials({ user: response.data.user, token }));
      setUser(response.data.user);
      setProfileImage(null);
      setResumeFile(null);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(getApiMessage(error, "Settings update failed"));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await api.put("/auth/change-password", passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error(getApiMessage(error, "Password change failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <section className="section-content page-top">
      <Container>
        <SectionTitle title="Settings" subtitle="Edit account details, profile image, and password." />

        <div className="dashboard-grid">
          <GlassCard className="dashboard-panel wide-panel">
            <form className="dense-form" onSubmit={saveProfile}>
              <div className="settings-head">
                <img alt={user?.name || "Profile"} className="profile-avatar" src={user?.profileImage} />
                <label className="file-field">
                  Profile picture
                  <input accept="image/*" onChange={(event) => setProfileImage(event.target.files?.[0] || null)} type="file" />
                </label>
                <label className="file-field">
                  Resume
                  <input
                    accept=".pdf,.doc,.docx,.rtf,.txt,.odt"
                    onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                    type="file"
                  />
                </label>
              </div>
              {user?.resumeUrl && (
                <div className="resume-link-row">
                  <span>{user.resumeFileName || "Uploaded resume"}</span>
                  <a className="secondary-button" href={getAssetUrl(user.resumeUrl)} rel="noreferrer" target="_blank">
                    View resume
                  </a>
                </div>
              )}

              <div className="form-grid">
                <input onChange={(event) => update("name", event.target.value)} placeholder="Name" value={form.name} />
                <input onChange={(event) => update("phone", event.target.value)} placeholder="Phone" value={form.phone} />
              </div>
              <input onChange={(event) => update("college", event.target.value)} placeholder="College" value={form.college} />
              <div className="form-grid">
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
              </div>

              {user?.role === "organizer" ? (
                <div className="form-grid">
                  <input onChange={(event) => update("department", event.target.value)} placeholder="Department" value={form.department} />
                  <input onChange={(event) => update("designation", event.target.value)} placeholder="Designation" value={form.designation} />
                </div>
              ) : (
                <>
                  <div className="form-grid">
                    <input onChange={(event) => update("course", event.target.value)} placeholder="Course" value={form.course} />
                    <input onChange={(event) => update("branch", event.target.value)} placeholder="Branch" value={form.branch} />
                  </div>
                  <div className="form-grid">
                    <select onChange={(event) => update("year", event.target.value)} value={form.year}>
                      <option value="">Year</option>
                      {[1, 2, 3, 4, 5].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
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
                  <input onChange={(event) => update("rollNumber", event.target.value)} placeholder="Roll number" value={form.rollNumber} />
                </>
              )}

              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save settings"}
              </button>
            </form>
          </GlassCard>

          <GlassCard className="dashboard-panel">
            <h2>Password</h2>
            <form className="dense-form" onSubmit={changePassword}>
              <input
                onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                placeholder="Current password"
                type="password"
                value={passwords.currentPassword}
              />
              <input
                onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                placeholder="New password"
                type="password"
                value={passwords.newPassword}
              />
              <button className="secondary-button" disabled={saving} type="submit">
                Change password
              </button>
            </form>
          </GlassCard>
        </div>
      </Container>
    </section>
  );
}

export default Settings;
