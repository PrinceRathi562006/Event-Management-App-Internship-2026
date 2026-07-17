import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import Loader from "../components/ui/Loader";
import api from "../services/api";

const getAssetUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
  const apiRoot = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${apiRoot}${value}`;
};

function CertificatePage() {
  const { bookingId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/certificates/${bookingId}`)
      .then((response) => setCertificate(response.data))
      .catch(() => setCertificate(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return <Loader />;
  }

  return (
    <section className="section-content page-top scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="certificate" />
      <Container>
        <GlassCard className="certificate-preview">
          <p className="eyebrow">Certificate</p>
          <h1>{certificate?.booking?.user?.name || "Certificate not issued yet"}</h1>
          <p>{certificate?.booking?.event?.title || "Attendance must be marked before certificate generation."}</p>
          {certificate?.certificateUrl ? (
            <a className="primary-button" href={getAssetUrl(certificate.certificateUrl)} rel="noreferrer" target="_blank">
              Download certificate
            </a>
          ) : (
            <Link className="secondary-button" to="/dashboard">
              Back to dashboard
            </Link>
          )}
        </GlassCard>
      </Container>
    </section>
  );
}

export default CertificatePage;
