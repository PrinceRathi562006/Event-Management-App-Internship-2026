import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Download, Wand2 } from "lucide-react";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
import Container from "../components/ui/Container";
import FileUploadField from "../components/ui/FileUploadField";
import GlassCard from "../components/ui/GlassCard";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";
import {
  BADGE_OPTIONS,
  EVENT_CATEGORIES,
  createPosterSvg,
  downloadSvg,
  generateAIEventCopy,
} from "../utils/eventFeatures";
import { getApiMessage } from "../utils/forms";

const emptyEvent = {
  title: "",
  category: "Workshop",
  theme: "",
  description: "",
  agenda: "",
  learningOutcomes: "",
  requirements: "",
  timeline: "09:00 | Registration\n10:00 | Opening\n11:00 | Workshop\n13:00 | Lunch\n15:00 | Quiz\n17:00 | Closing",
  venue: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  totalSeats: "",
  seatSelectionEnabled: true,
  price: "",
  isPaid: "false",
  registrationDeadline: "",
  featured: false,
  partnerCompanies: [""],
  badges: ["Organizer", "Volunteer", "Top Participant"],
};

const emptySpeaker = {
  image: "",
  name: "",
  designation: "",
  company: "",
  bio: "",
  linkedin: "",
  twitter: "",
};

function CreateEvent() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState(emptyEvent);
  const [bannerImage, setBannerImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [certificateSignature, setCertificateSignature] = useState(null);
  const [speakers, setSpeakers] = useState([{ ...emptySpeaker }]);
  const [coordinatorSearch, setCoordinatorSearch] = useState({ type: "student", q: "" });
  const [coordinatorResults, setCoordinatorResults] = useState([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState({ students: [], organizers: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!coordinatorSearch.q.trim() || !["organizer", "admin"].includes(user?.role)) {
      return;
    }

    const timer = window.setTimeout(() => {
      api
        .get("/events/coordinators/search", {
          params: { type: coordinatorSearch.type, q: coordinatorSearch.q },
        })
        .then((response) => setCoordinatorResults(response.data.users || []))
        .catch(() => setCoordinatorResults([]));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [coordinatorSearch.q, coordinatorSearch.type, user?.role]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const generateDescription = () => {
    const copy = generateAIEventCopy(form);

    setForm((current) => ({
      ...current,
      description: copy.description,
      agenda: copy.agenda.join("\n"),
      learningOutcomes: copy.learningOutcomes.join("\n"),
      requirements: copy.requirements.join("\n"),
    }));
    toast.success("AI event content generated");
  };

  const toggleBadge = (badge) => {
    setForm((current) => ({
      ...current,
      badges: current.badges.includes(badge)
        ? current.badges.filter((item) => item !== badge)
        : [...current.badges, badge],
    }));
  };

  const downloadPoster = () => {
    const svg = createPosterSvg({
      title: form.title,
      date: form.eventDate,
      venue: form.venue,
      theme: form.theme,
      category: form.category,
    });

    downloadSvg(svg, `${form.title || "event"}-poster.svg`);
  };

  const updatePartnerCompany = (index, value) => {
    setForm((current) => ({
      ...current,
      partnerCompanies: current.partnerCompanies.map((company, companyIndex) => (companyIndex === index ? value : company)),
    }));
  };

  const addPartnerCompany = () => {
    setForm((current) => ({
      ...current,
      partnerCompanies: [...current.partnerCompanies, ""],
    }));
  };

  const removePartnerCompany = (index) => {
    setForm((current) => ({
      ...current,
      partnerCompanies: current.partnerCompanies.filter((_, companyIndex) => companyIndex !== index),
    }));
  };

  const updateSpeaker = (index, field, value) => {
    setSpeakers((current) => current.map((speaker, speakerIndex) => (speakerIndex === index ? { ...speaker, [field]: value } : speaker)));
  };

  const addCoordinator = (candidate) => {
    const key = candidate.role === "student" ? "students" : "organizers";

    setSelectedCoordinators((current) => {
      if (current[key].some((item) => item._id === candidate._id)) {
        return current;
      }

      return { ...current, [key]: [...current[key], candidate] };
    });
  };

  const removeCoordinator = (key, id) => {
    setSelectedCoordinators((current) => ({
      ...current,
      [key]: current[key].filter((item) => item._id !== id),
    }));
  };

  const removeGalleryFile = (_, index) => {
    setGalleryImages((current) => current.filter((__, itemIndex) => itemIndex !== index));
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (["isPaid", "price", "partnerCompanies", "badges", "timeline"].includes(key)) {
          return;
        }

        payload.append(key, key === "partnerCompanies" ? JSON.stringify(value.filter((company) => company.trim()).map((name) => ({ name }))) : value);
      });
      payload.append("isPaid", form.isPaid === "true");
      payload.append("price", form.isPaid === "true" ? form.price : 0);
      payload.append(
        "partnerCompanies",
        JSON.stringify(form.partnerCompanies.filter((company) => company.trim()).map((name) => ({ name })))
      );
      payload.append("badges", JSON.stringify(form.badges));
      payload.append(
        "timeline",
        JSON.stringify(
          form.timeline
            .split("\n")
            .map((line) => {
              const [time, title, description] = line.split("|").map((item) => item?.trim());
              return { time, title, description };
            })
            .filter((item) => item.time && item.title)
        )
      );
      payload.append("speakers", JSON.stringify(speakers.filter((speaker) => speaker.name.trim())));
      payload.append(
        "coordinatorRequests",
        JSON.stringify({
          students: selectedCoordinators.students.map((item) => item._id),
          organizers: selectedCoordinators.organizers.map((item) => item._id),
        })
      );

      if (bannerImage) {
        payload.append("bannerImage", bannerImage);
      }

      if (certificateSignature) {
        payload.append("certificateSignature", certificateSignature);
      }

      galleryImages.forEach((image) => payload.append("galleryImages", image));

      const response = await api.post("/events", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(response.data.message || "Event submitted");
      navigate("/dashboard");
    } catch (error) {
      toast.error(getApiMessage(error, "Event creation failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!user || !["organizer", "admin"].includes(user.role)) {
    return (
      <section className="section-content page-top">
        <Container>
          <GlassCard className="empty-state">
            <h1>Organizer access required</h1>
          </GlassCard>
        </Container>
      </section>
    );
  }

  if (user.role === "organizer" && user.organizerStatus !== "Approved") {
    return (
      <section className="section-content page-top">
        <Container>
          <GlassCard className="empty-state">
            <h1>Approval pending</h1>
            <p>Your organizer tools unlock after admin approval.</p>
          </GlassCard>
        </Container>
      </section>
    );
  }

  return (
    <section className="section-content page-top scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="registration" />
      <Container>
        <SectionTitle title="Create Event" subtitle="Submit a complete event for approval and publishing." />
        <GlassCard className="dashboard-panel">
          <form className="dense-form" onSubmit={submitEvent}>
            <div className="form-grid">
              <input onChange={(event) => update("title", event.target.value)} placeholder="Title" value={form.title} />
              <select onChange={(event) => update("category", event.target.value)} value={form.category}>
                {EVENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <input onChange={(event) => update("theme", event.target.value)} placeholder="Theme, for poster and event mood" value={form.theme} />
            <div className="ai-generator-panel">
              <div>
                <h2>AI Event Description Generator</h2>
                <p>Creates description, agenda, learning outcomes, and requirements from the title and event basics.</p>
              </div>
              <button className="primary-button" onClick={generateDescription} type="button">
                <Wand2 size={18} /> Generate Description with AI
              </button>
            </div>
            <textarea onChange={(event) => update("description", event.target.value)} placeholder="Description" value={form.description} />
            <div className="form-grid">
              <textarea onChange={(event) => update("agenda", event.target.value)} placeholder="Agenda, one item per line" value={form.agenda} />
              <textarea onChange={(event) => update("learningOutcomes", event.target.value)} placeholder="Learning outcomes, one per line" value={form.learningOutcomes} />
            </div>
            <textarea onChange={(event) => update("requirements", event.target.value)} placeholder="Requirements, one per line" value={form.requirements} />
            <textarea onChange={(event) => update("timeline", event.target.value)} placeholder="Timeline format: 09:00 | Registration" value={form.timeline} />
            <div className="poster-generator-panel">
              <div className="event-poster-preview">
                <span>{form.theme || form.category}</span>
                <strong>{form.title || "Event Title"}</strong>
                <small>{form.eventDate || "Event date"} / {form.venue || "Venue"}</small>
              </div>
              <div>
                <h2>AI Poster Generator</h2>
                <p>Creates a ready-to-download poster from title, date, venue, and theme.</p>
                <button className="secondary-button" onClick={downloadPoster} type="button">
                  <Download size={18} /> Download Poster
                </button>
              </div>
            </div>
            <FileUploadField
              files={bannerImage ? [bannerImage] : []}
              label="Banner image"
              onChange={setBannerImage}
              onRemoveFile={() => setBannerImage(null)}
            />
            <FileUploadField
              files={galleryImages}
              label="Gallery images"
              multiple
              onChange={setGalleryImages}
              onRemoveFile={removeGalleryFile}
            />
            <input onChange={(event) => update("venue", event.target.value)} placeholder="Venue" value={form.venue} />
            <div className="form-grid">
              <label className="input-label">
                Event date
                <input onChange={(event) => update("eventDate", event.target.value)} type="date" value={form.eventDate} />
              </label>
              <label className="input-label">
                Last date of registration
                <input onChange={(event) => update("registrationDeadline", event.target.value)} type="date" value={form.registrationDeadline} />
              </label>
            </div>
            <div className="form-grid">
              <input onChange={(event) => update("startTime", event.target.value)} type="time" value={form.startTime} />
              <input onChange={(event) => update("endTime", event.target.value)} type="time" value={form.endTime} />
            </div>
            <div className="form-grid">
              <input onChange={(event) => update("totalSeats", event.target.value)} placeholder="Capacity" type="number" value={form.totalSeats} />
              <select onChange={(event) => update("isPaid", event.target.value)} value={form.isPaid}>
                <option value="false">Free</option>
                <option value="true">Paid</option>
              </select>
            </div>
            <label className="check-field">
              <input checked={form.seatSelectionEnabled} onChange={(event) => update("seatSelectionEnabled", event.target.checked)} type="checkbox" />
              Enable choose seat for this event
            </label>
            {form.isPaid === "true" && (
              <input min="0" onChange={(event) => update("price", event.target.value)} placeholder="Exact booking fee in INR" step="1" type="number" value={form.price} />
            )}
            <label className="check-field">
              <input checked={form.featured} onChange={(event) => update("featured", event.target.checked)} type="checkbox" />
              Featured Event
            </label>
            <div className="badge-selector">
              <h2>Digital Badges</h2>
              <div>
                {BADGE_OPTIONS.map((badge) => (
                  <label key={badge}>
                    <input checked={form.badges.includes(badge)} onChange={() => toggleBadge(badge)} type="checkbox" />
                    {badge}
                  </label>
                ))}
              </div>
            </div>

            <div className="certificate-branding-panel">
              <h2>Certificate Branding</h2>
              <FileUploadField
                files={certificateSignature ? [certificateSignature] : []}
                label="Organizer signature image"
                onChange={setCertificateSignature}
                onRemoveFile={() => setCertificateSignature(null)}
              />
              <div className="partner-company-list">
                {form.partnerCompanies.map((company, index) => (
                  <div className="form-grid" key={index}>
                    <input
                      onChange={(event) => updatePartnerCompany(index, event.target.value)}
                      placeholder="Partner company name"
                      value={company}
                    />
                    <button className="secondary-button" onClick={() => removePartnerCompany(index)} type="button">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button className="secondary-button" onClick={addPartnerCompany} type="button">
                Add partner company
              </button>
            </div>

            <div className="coordinator-panel">
              <div className="panel-head">
                <div>
                  <h2>Coordinator Requests</h2>
                  <p>Selected users receive a request and join only after accepting.</p>
                </div>
              </div>
              <div className="form-grid">
                <select
                  onChange={(event) => {
                    setCoordinatorSearch({ type: event.target.value, q: "" });
                    setCoordinatorResults([]);
                  }}
                  value={coordinatorSearch.type}
                >
                  <option value="student">Student Coordinator</option>
                  <option value="organizer">Organizer Coordinator</option>
                </select>
                <input
                  onChange={(event) => {
                    const q = event.target.value;
                    setCoordinatorSearch((current) => ({ ...current, q }));
                    if (!q.trim()) {
                      setCoordinatorResults([]);
                    }
                  }}
                  placeholder={coordinatorSearch.type === "student" ? "Search roll number, email, or name" : "Search organizer email, name, or department"}
                  value={coordinatorSearch.q}
                />
              </div>
              {coordinatorResults.length > 0 && (
                <div className="candidate-list">
                  {coordinatorResults.map((candidate) => (
                    <button key={candidate._id} onClick={() => addCoordinator(candidate)} type="button">
                      <strong>{candidate.name}</strong>
                      <span>
                        {candidate.email}
                        {candidate.rollNumber ? ` / ${candidate.rollNumber}` : ""}
                        {candidate.department ? ` / ${candidate.department}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="coordinator-selected">
                {[
                  ["students", "Student Coordinators"],
                  ["organizers", "Organizer Coordinators"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <h3>{label}</h3>
                    {selectedCoordinators[key].length ? (
                      selectedCoordinators[key].map((item) => (
                        <span className="selected-chip" key={item._id}>
                          {item.name}
                          <button onClick={() => removeCoordinator(key, item._id)} type="button">
                            Remove
                          </button>
                        </span>
                      ))
                    ) : (
                      <p>No {label.toLowerCase()} selected.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="speaker-stack">
              <h2>Speakers</h2>
              {speakers.map((speaker, index) => (
                <div className="speaker-editor" key={index}>
                  <div className="form-grid">
                    <input onChange={(event) => updateSpeaker(index, "name", event.target.value)} placeholder="Name" value={speaker.name} />
                    <input onChange={(event) => updateSpeaker(index, "designation", event.target.value)} placeholder="Designation" value={speaker.designation} />
                  </div>
                  <div className="form-grid">
                    <input onChange={(event) => updateSpeaker(index, "company", event.target.value)} placeholder="Company" value={speaker.company} />
                    <input onChange={(event) => updateSpeaker(index, "image", event.target.value)} placeholder="Image URL" value={speaker.image} />
                  </div>
                  <textarea onChange={(event) => updateSpeaker(index, "bio", event.target.value)} placeholder="Bio" value={speaker.bio} />
                  <div className="form-grid">
                    <input onChange={(event) => updateSpeaker(index, "linkedin", event.target.value)} placeholder="LinkedIn" value={speaker.linkedin} />
                    <input onChange={(event) => updateSpeaker(index, "twitter", event.target.value)} placeholder="Twitter" value={speaker.twitter} />
                  </div>
                </div>
              ))}
              <button className="secondary-button" onClick={() => setSpeakers((current) => [...current, { ...emptySpeaker }])} type="button">
                Add speaker
              </button>
            </div>

            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Submitting..." : "Create Event"}
            </button>
          </form>
        </GlassCard>
      </Container>
    </section>
  );
}

export default CreateEvent;
