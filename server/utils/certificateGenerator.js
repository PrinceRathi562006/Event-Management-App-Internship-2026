const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const https = require("https");

const fetchImageBuffer = (url) =>
  new Promise((resolve) => {
    if (!url || !url.startsWith("https://")) {
      resolve(null);
      return;
    }

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          resolve(null);
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", () => resolve(null));
  });

const dataUrlToBuffer = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:.+;base64,(.+)$/);

  return match ? Buffer.from(match[1], "base64") : null;
};

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const writeCertificatePreview = ({
  certificateDir,
  certificateNumber,
  studentName,
  eventTitle,
  eventDate,
  organizerName,
  coordinatorName,
  qrCodeImage,
  verificationUrl,
}) => {
  const fileName = `${certificateNumber}.svg`;
  const filePath = path.join(certificateDir, fileName);
  const issuedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const eventDisplayDate = new Date(eventDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="48%" stop-color="#eef6ff"/>
      <stop offset="100%" stop-color="#fdf7ed"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="990" fill="url(#bg)"/>
  <rect x="48" y="48" width="1304" height="894" rx="28" fill="none" stroke="#1e293b" stroke-width="4"/>
  <rect x="74" y="74" width="1252" height="842" rx="22" fill="#ffffff" fill-opacity=".68" stroke="#94a3b8" stroke-width="1"/>
  <path d="M160 208 C350 78 580 108 700 198 C842 304 1046 236 1240 120" fill="none" stroke="url(#accent)" stroke-width="16" opacity=".14"/>
  <text x="700" y="158" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-weight="700" fill="#0f172a">Certificate of Participation</text>
  <text x="700" y="216" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#64748b">This certificate is proudly presented to</text>
  <text x="700" y="338" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#111827">${escapeXml(studentName)}</text>
  <line x1="350" y1="370" x2="1050" y2="370" stroke="url(#accent)" stroke-width="3"/>
  <text x="700" y="442" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="25" fill="#334155">For successfully participating in</text>
  <text x="700" y="515" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="#2563eb">${escapeXml(eventTitle)}</text>
  <text x="700" y="570" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#475569">Held on ${escapeXml(eventDisplayDate)}</text>
  <text x="162" y="748" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="800" fill="#0f172a">Certificate ID</text>
  <text x="162" y="784" font-family="Inter, Arial, sans-serif" font-size="20" fill="#475569">${escapeXml(certificateNumber)}</text>
  <text x="162" y="822" font-family="Inter, Arial, sans-serif" font-size="18" fill="#64748b">Issued ${escapeXml(issuedDate)}</text>
  <text x="690" y="778" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#0f172a">${escapeXml(coordinatorName || "Coordinator")}</text>
  <line x1="555" y1="798" x2="825" y2="798" stroke="#94a3b8" stroke-width="2"/>
  <text x="690" y="832" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="17" fill="#64748b">Coordinator</text>
  <text x="1090" y="778" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#0f172a">${escapeXml(organizerName)}</text>
  <line x1="955" y1="798" x2="1225" y2="798" stroke="#94a3b8" stroke-width="2"/>
  <text x="1090" y="832" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="17" fill="#64748b">Organizer</text>
  ${qrCodeImage ? `<image href="${qrCodeImage}" x="1120" y="620" width="132" height="132"/>` : ""}
  <text x="1186" y="770" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" fill="#64748b">Scan to verify</text>
  <text x="700" y="904" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="#64748b">${escapeXml(verificationUrl)}</text>
</svg>`;

  fs.writeFileSync(filePath, svg);

  return `/uploads/certificates/${fileName}`;
};

const generateCertificate = async ({
  studentName,
  eventTitle,
  eventDate,
  organizerName,
  coordinatorName,
  certificateNumber,
  signatureImage,
  partnerCompanies = [],
  qrCodeImage,
  verificationUrl,
  universityLogo,
  organizationLogo,
}) =>
  new Promise(async (resolve, reject) => {
    try {
      const certificateDir = path.join(__dirname, "../uploads/certificates");

      if (!fs.existsSync(certificateDir)) {
        fs.mkdirSync(certificateDir, {
          recursive: true,
        });
      }

      const fileName = `${certificateNumber}.pdf`;
      const filePath = path.join(certificateDir, fileName);
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 40,
      });
      const stream = fs.createWriteStream(filePath);
      const signatureBuffer = await fetchImageBuffer(signatureImage);
      const universityLogoBuffer = await fetchImageBuffer(universityLogo);
      const organizationLogoBuffer = await fetchImageBuffer(organizationLogo);
      const qrCodeBuffer = dataUrlToBuffer(qrCodeImage);

      doc.pipe(stream);

      doc.rect(0, 0, 842, 595).fill("#f8fafc");
      doc.circle(120, 85, 120).fillOpacity(0.12).fill("#38bdf8").fillOpacity(1);
      doc.circle(760, 500, 160).fillOpacity(0.12).fill("#7c3aed").fillOpacity(1);
      doc
        .roundedRect(28, 28, 786, 539, 18)
        .fillOpacity(0.82)
        .fillAndStroke("#ffffff", "#cbd5e1")
        .fillOpacity(1);
      doc.roundedRect(44, 44, 754, 507, 12).lineWidth(2).stroke("#1e293b");
      doc
        .moveTo(86, 112)
        .bezierCurveTo(270, 48, 520, 168, 746, 92)
        .lineWidth(8)
        .strokeOpacity(0.12)
        .stroke("#2563eb")
        .strokeOpacity(1);

      if (universityLogoBuffer) {
        doc.image(universityLogoBuffer, 76, 62, {
          fit: [74, 58],
          align: "center",
          valign: "center",
        });
      }

      if (organizationLogoBuffer) {
        doc.image(organizationLogoBuffer, 690, 62, {
          fit: [74, 58],
          align: "center",
          valign: "center",
        });
      }

      doc
        .font("Times-Bold")
        .fontSize(34)
        .fillColor("#0f172a")
        .text("CERTIFICATE OF PARTICIPATION", {
          align: "center",
        });

      doc.moveDown(0.8);

      doc
        .font("Helvetica")
        .fontSize(18)
        .fillColor("#64748b")
        .text("This certificate is proudly presented to", {
          align: "center",
        });

      doc.moveDown(1);

      doc
        .font("Times-Bold")
        .fontSize(34)
        .fillColor("#111827")
        .text(studentName, {
          align: "center",
          underline: true,
        });

      doc.moveDown(1);

      doc
        .font("Helvetica")
        .fontSize(18)
        .fillColor("#475569")
        .text("For successfully participating in", {
          align: "center",
        });

      doc.moveDown(0.5);

      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .fillColor("#2563eb")
        .text(eventTitle, {
          align: "center",
        });

      doc.moveDown(1);

      doc
        .font("Helvetica")
        .fontSize(16)
        .fillColor("#334155")
        .text(`Held on ${new Date(eventDate).toDateString()}`, {
          align: "center",
        });

      if (partnerCompanies.length) {
        doc
          .fontSize(13)
          .fillColor("#64748b")
          .text(`In association with: ${partnerCompanies.map((partner) => partner.name).join(", ")}`, 80, 380, {
            align: "center",
            width: 680,
          });
      }

      doc.fontSize(14).fillColor("#475569").text(`Certificate No : ${certificateNumber}`, 60, 430);

      if (qrCodeBuffer) {
        doc.image(qrCodeBuffer, 60, 452, {
          fit: [72, 72],
        });
        doc.fontSize(9).fillColor("#64748b").text("Scan to verify", 50, 526, {
          width: 92,
          align: "center",
        });
      }

      if (signatureBuffer) {
        doc.image(signatureBuffer, 625, 395, {
          fit: [130, 45],
          align: "center",
        });
      }

      if (coordinatorName) {
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#000").text(coordinatorName, 390, 430, {
          align: "center",
        });
        doc.font("Helvetica").fontSize(12).fillColor("#777").text("Coordinator", 390, 455, {
          align: "center",
        });
      }

      doc.font("Helvetica-Bold").fontSize(16).fillColor("#000").text(organizerName, 600, 430, {
        align: "center",
      });
      doc.font("Helvetica").fontSize(12).fillColor("#777").text("Organizer Signature", 600, 455, {
        align: "center",
      });

      doc.fontSize(10).fillColor("#888").text(verificationUrl || "Generated by Event Organizer - Campus Event Hub", 0, 540, {
        align: "center",
      });

      doc.end();

      stream.on("finish", () => {
        const imageUrl = writeCertificatePreview({
          certificateDir,
          certificateNumber,
          studentName,
          eventTitle,
          eventDate,
          organizerName,
          coordinatorName,
          qrCodeImage,
          verificationUrl,
        });

        resolve({
          pdfUrl: `/uploads/certificates/${fileName}`,
          imageUrl,
        });
      });

      stream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });

module.exports = generateCertificate;
