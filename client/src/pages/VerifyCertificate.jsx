import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
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

function formatDisplayDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function VerifyCertificate() {
  const { certificateId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/certificates/verify/${certificateId}`)
      .then((response) => setResult(response.data))
      .catch((error) => setResult(error.response?.data || { verified: false, message: "Invalid Certificate" }))
      .finally(() => setLoading(false));
  }, [certificateId]);

  if (loading) {
    return <Loader />;
  }

  const certificate = result?.certificate;

  return (
    <section className="section-content page-top scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="certificate" />
      <Container>
        <GlassCard className={`certificate-verify-card ${result?.verified ? "is-verified" : "is-invalid"}`}>
          <div className="certificate-verify-status">
            {result?.verified ? <ShieldCheck size={34} /> : <AlertTriangle size={34} />}
            <div>
              <p className="eyebrow">Certificate Verification</p>
              <h1>{result?.verified ? "Verified" : "Invalid Certificate"}</h1>
            </div>
          </div>

          {certificate ? (
            <>
              {certificate.imageUrl && (
                <img alt="Verified certificate preview" className="certificate-hero-image" src={getAssetUrl(certificate.imageUrl)} />
              )}
              <div className="certificate-detail-list">
                <span>Student<strong>{certificate.user?.name || certificate.metadata?.studentName}</strong></span>
                <span>Event<strong>{certificate.event?.title || certificate.metadata?.eventName}</strong></span>
                <span>Issued<strong>{formatDisplayDate(certificate.issuedDate)}</strong></span>
                <span>Certificate ID<strong>{certificate.certificateId}</strong></span>
              </div>
              <div className="row-actions certificate-actions">
                <a className="primary-button" href={getAssetUrl(certificate.pdfUrl)} rel="noreferrer" target="_blank">
                  <Download size={18} /> Download PDF
                </a>
                {certificate.imageUrl && (
                  <a className="secondary-button" href={getAssetUrl(certificate.imageUrl)} rel="noreferrer" target="_blank">
                    Download Image
                  </a>
                )}
              </div>
            </>
          ) : (
            <p>This certificate ID was not found or has been revoked.</p>
          )}

          <Link className="secondary-button" to="/events">
            Browse events
          </Link>
        </GlassCard>
      </Container>
    </section>
  );
}

export default VerifyCertificate;
