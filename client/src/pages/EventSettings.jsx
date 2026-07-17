import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
import Container from "../components/ui/Container";
import FileUploadField from "../components/ui/FileUploadField";
import GlassCard from "../components/ui/GlassCard";
import Loader from "../components/ui/Loader";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";
import { getApiMessage } from "../utils/forms";

function formatDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function includesUser(items = [], userId) {
  return items.some((item) => item?._id === userId || item === userId);
}

function canManageEventSettings(event, user) {
  if (!event || !user) {
    return false;
  }

  return (
    user.role === "admin" ||
    event.organizer?._id === user._id ||
    event.organizer === user._id ||
    includesUser(event.assignedOrganizers, user._id) ||
    includesUser(event.organizerCoordinators, user._id) ||
    includesUser(event.studentCoordinators, user._id)
  );
}

function EventSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [certificateSignature, setCertificateSignature] = useState(null);
  const [removePoster, setRemovePoster] = useState(false);
  const [removeSignature, setRemoveSignature] = useState(false);
  const [removedGalleryIds, setRemovedGalleryIds] = useState([]);
  const [coordinatorSearch, setCoordinatorSearch] = useState({ type: "student", q: "" });
  const [coordinatorResults, setCoordinatorResults] = useState([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState({ students: [], organizers: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/events/${id}`)
      .then((response) => {
        const event = response.data.event;
        setEventInfo(event);
        setRemovePoster(false);
        setRemoveSignature(false);
        setRemovedGalleryIds([]);
        setBannerImage(null);
        setGalleryImages([]);
        setCertificateSignature(null);
        setForm({
          title: event.title || "",
          description: event.description || "",
          venue: event.venue || "",
          eventDate: formatDateInput(event.eventDate),
          registrationDeadline: formatDateInput(event.registrationDeadline),
          startTime: event.startTime || "",
          endTime: event.endTime || "",
          totalSeats: event.totalSeats || "",
          seatSelectionEnabled: event.seatSelectionEnabled !== false,
          price: event.price || "",
          isPaid: event.isPaid ? "true" : "false",
          featured: Boolean(event.featured),
          speakers: event.speakers?.length ? event.speakers : [],
          partnerCompanies: event.partnerCompanies?.length ? event.partnerCompanies.map((partner) => partner.name) : [""],
        });
      })
      .catch((error) => toast.error(getApiMessage(error, "Event failed to load")));
  }, [id]);

  useEffect(() => {
    if (!coordinatorSearch.q.trim()) {
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
  }, [coordinatorSearch.q, coordinatorSearch.type]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

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

  const addCoordinator = (candidate) => {
    const key = candidate.role === "student" ? "students" : "organizers";

    setSelectedCoordinators((current) => {
      if (current[key].some((item) => item._id === candidate._id)) {
        return current;
      }

      return { ...current, [key]: [...current[key], candidate] };
    });
  };

  const removeCoordinator = (key, userId) => {
    setSelectedCoordinators((current) => ({
      ...current,
      [key]: current[key].filter((item) => item._id !== userId),
    }));
  };

  const removeGalleryFile = (_, index) => {
    setGalleryImages((current) => current.filter((__, itemIndex) => itemIndex !== index));
  };

  const currentPosterFiles = eventInfo?.poster && !removePoster
    ? [{ id: eventInfo.posterPublicId || eventInfo.poster, name: "Current banner image", url: eventInfo.poster }]
    : [];
  const currentSignatureFiles = eventInfo?.certificateSignature && !removeSignature
    ? [
        {
          id: eventInfo.certificateSignaturePublicId || eventInfo.certificateSignature,
          name: "Current signature image",
          url: eventInfo.certificateSignature,
        },
      ]
    : [];
  const currentGalleryFiles = (eventInfo?.galleryImages || [])
    .map((image, index) => ({
      id: image.publicId || image._id || image.url || `gallery-${index}`,
      name: `Gallery image ${index + 1}`,
      url: image.url,
    }))
    .filter((image) => !removedGalleryIds.includes(String(image.id)));

  const sendCoordinatorRequests = async () => {
    setSaving(true);

    try {
      await api.post(`/events/${id}/coordinator-requests`, {
        students: selectedCoordinators.students.map((item) => item._id),
        organizers: selectedCoordinators.organizers.map((item) => item._id),
      });
      setSelectedCoordinators({ students: [], organizers: [] });
      setCoordinatorResults([]);
      setCoordinatorSearch((current) => ({ ...current, q: "" }));
      toast.success("Coordinator requests sent");
    } catch (error) {
      toast.error(getApiMessage(error, "Coordinator request failed"));
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const hasFiles = Boolean(bannerImage) || Boolean(certificateSignature) || galleryImages.length > 0;
      const cleanPayload = {
        ...form,
        isPaid: form.isPaid === "true",
        price: form.isPaid === "true" ? form.price : 0,
        speakers: form.speakers.filter((speaker) => speaker?.name?.trim()),
        partnerCompanies: form.partnerCompanies.filter((company) => company.trim()).map((name) => ({ name })),
        removePoster,
        removeCertificateSignature: removeSignature,
        removeGalleryImages: removedGalleryIds,
      };

      if (hasFiles) {
        const payload = new FormData();
        Object.entries(cleanPayload).forEach(([key, value]) => {
          payload.append(
            key,
            ["speakers", "partnerCompanies", "removeGalleryImages"].includes(key) ? JSON.stringify(value) : value
          );
        });

        if (bannerImage) {
          payload.append("bannerImage", bannerImage);
        }

        if (certificateSignature) {
          payload.append("certificateSignature", certificateSignature);
        }

        galleryImages.forEach((image) => payload.append("galleryImages", image));

        await api.put(`/events/${id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.put(`/events/${id}`, cleanPayload);
      }
      toast.success("Event settings saved");
      navigate("/dashboard");
    } catch (error) {
      toast.error(getApiMessage(error, "Event update failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <section className="section-content page-top">
        <Container>
          <GlassCard className="empty-state">
            <h1>Access denied</h1>
          </GlassCard>
        </Container>
      </section>
    );
  }

  if (!form) {
    return <Loader />;
  }

  if (!canManageEventSettings(eventInfo, user)) {
    return (
      <section className="section-content page-top">
        <Container>
          <GlassCard className="empty-state">
            <h1>Access denied</h1>
          </GlassCard>
        </Container>
      </section>
    );
  }

  return (
    <section className="section-content page-top scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="registration" />
      <Container>
        <SectionTitle title="Event Settings" subtitle="Update banner, details, timing, capacity, price, speakers, gallery, and featured status." />
        <GlassCard className="dashboard-panel">
          <form className="dense-form" onSubmit={saveEvent}>
            <input onChange={(event) => update("title", event.target.value)} placeholder="Title" value={form.title} />
            <textarea onChange={(event) => update("description", event.target.value)} placeholder="Description" value={form.description} />
            <FileUploadField
              currentFiles={currentPosterFiles}
              files={bannerImage ? [bannerImage] : []}
              label="Banner image"
              onChange={(file) => {
                setBannerImage(file);
                if (file) {
                  setRemovePoster(false);
                }
              }}
              onRemoveCurrent={() => setRemovePoster(true)}
              onRemoveFile={() => setBannerImage(null)}
            />
            <FileUploadField
              currentFiles={currentGalleryFiles}
              files={galleryImages}
              label="Gallery images"
              multiple
              onChange={setGalleryImages}
              onRemoveCurrent={(file) => setRemovedGalleryIds((current) => [...current, String(file.id)])}
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
            <div className="certificate-branding-panel">
              <h2>Certificate Branding</h2>
              {eventInfo?.certificateSignature && !removeSignature && (
                <img alt="Current organizer signature" className="signature-preview" src={eventInfo.certificateSignature} />
              )}
              <FileUploadField
                currentFiles={currentSignatureFiles}
                files={certificateSignature ? [certificateSignature] : []}
                label="Organizer signature image"
                onChange={(file) => {
                  setCertificateSignature(file);
                  if (file) {
                    setRemoveSignature(false);
                  }
                }}
                onRemoveCurrent={() => setRemoveSignature(true)}
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
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save Event Settings"}
            </button>
          </form>
        </GlassCard>

        <GlassCard className="dashboard-panel">
          <h2>Coordinators</h2>
          <div className="coordinator-selected">
            <div>
              <h3>Current Student Coordinators</h3>
              {eventInfo?.studentCoordinators?.length ? (
                eventInfo.studentCoordinators.map((item) => (
                  <span className="selected-chip" key={item._id}>
                    {item.name} {item.rollNumber ? `(${item.rollNumber})` : ""}
                  </span>
                ))
              ) : (
                <p>No student coordinators yet.</p>
              )}
            </div>
            <div>
              <h3>Current Organizer Coordinators</h3>
              {eventInfo?.organizerCoordinators?.length ? (
                eventInfo.organizerCoordinators.map((item) => (
                  <span className="selected-chip" key={item._id}>
                    {item.name}
                  </span>
                ))
              ) : (
                <p>No organizer coordinators yet.</p>
              )}
            </div>
          </div>

          <div className="coordinator-panel">
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
                  <h3>Selected {label}</h3>
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
            <button className="primary-button" disabled={saving} onClick={sendCoordinatorRequests} type="button">
              Send Coordinator Requests
            </button>
          </div>
        </GlassCard>
      </Container>
    </section>
  );
}

export default EventSettings;
