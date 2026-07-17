import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Camera, CheckCircle2, Flashlight, Keyboard, QrCode, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import api from "../../services/api";
import { getApiMessage } from "../../utils/forms";

const scannerRegionId = "professional-attendance-scanner";

function canUseCameraHere() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.isSecureContext || ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function getPreferredCameraId(devices, currentCameraId, preferredCameraId) {
  if (typeof preferredCameraId === "string" && preferredCameraId) {
    return preferredCameraId;
  }

  if (currentCameraId) {
    return currentCameraId;
  }

  return (
    devices.find((device) => /back|rear|environment|wide/i.test(device.label || ""))?.id ||
    devices[0]?.id ||
    ""
  );
}

function playTone(type) {
  try {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = type === "success" ? 880 : 220;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
  } catch {
    // Sound feedback is optional and should never block scanning.
  }
}

function statusTone(result) {
  if (result === "Success") return "success";
  return "error";
}

function ScannerResultPanel({ preview, onClose, onMark, saving }) {
  if (!preview) {
    return null;
  }

  const participant = preview.participant || {};
  const attendance = preview.attendance || {};

  return (
    <div className={`attendance-preview ${attendance.alreadyMarked ? "is-warning" : "is-success"}`}>
      <div className="attendance-preview-head">
        {participant.photo ? <img alt={participant.name || "Participant"} src={participant.photo} /> : <QrCode />}
        <div>
          <span>{attendance.alreadyMarked ? "Attendance Already Marked" : "Attendance Found"}</span>
          <h3>{participant.name || "Participant"}</h3>
        </div>
      </div>
      <div className="attendance-preview-grid">
        <p><span>Registration</span><strong>{participant.registrationNumber || "Not added"}</strong></p>
        <p><span>Department</span><strong>{participant.department || "Not added"}</strong></p>
        <p><span>Course</span><strong>{participant.course || "Not added"}</strong></p>
        <p><span>Email</span><strong>{participant.email || "Not added"}</strong></p>
        <p><span>Already Marked</span><strong>{attendance.alreadyMarked ? "Yes" : "No"}</strong></p>
        <p><span>Status</span><strong>{attendance.status || "Not Marked"}</strong></p>
      </div>
      <div className="row-actions">
        <button className="primary-button" disabled={saving || attendance.alreadyMarked} onClick={() => onMark("Present")} type="button">
          <CheckCircle2 size={16} /> Present
        </button>
        <button className="secondary-button" disabled={saving || attendance.alreadyMarked} onClick={() => onMark("Absent")} type="button">
          <XCircle size={16} /> Absent
        </button>
        <button className="secondary-button" disabled={saving} onClick={onClose} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ProfessionalQRScanner({ eventId, disabled = false, onMarked }) {
  const html5QrCodeRef = useRef(null);
  const scanLockRef = useRef(false);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [lastRawCode, setLastRawCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanState, setScanState] = useState("idle");
  const [history, setHistory] = useState([]);
  const [torchOn, setTorchOn] = useState(false);

  const scannerConfig = useMemo(
    () => ({
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    }),
    []
  );

  const addHistory = useCallback((entry) => {
    setHistory((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        ...entry,
      },
      ...current,
    ].slice(0, 6));
  }, []);

  const stopCamera = useCallback(async () => {
    const scanner = html5QrCodeRef.current;

    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }

      await scanner.clear();
    } catch {
      // Camera teardown can fail if permissions are revoked mid-stream.
    } finally {
      setCameraOn(false);
      setTorchOn(false);
      html5QrCodeRef.current = null;
    }
  }, []);

  const scanCode = useCallback(
    async (rawCode) => {
      if (!rawCode || scanLockRef.current || saving || disabled || !eventId) {
        return;
      }

      scanLockRef.current = true;
      setSaving(true);
      setScanState("scanning");

      try {
        const response = await api.post("/attendance/scan", {
          rawCode,
          eventId,
        });

        setPreview(response.data);
        setLastRawCode(rawCode);
        setScanState("success");
        addHistory({
          result: "Ready",
          name: response.data.participant?.name || "Participant",
          status: response.data.attendance?.status || "Not Marked",
        });
        playTone("success");
        await stopCamera();
      } catch (error) {
        const message = getApiMessage(error, "QR scan failed");
        setScanState("error");
        addHistory({
          result: error.response?.data?.result || "Error",
          name: message,
          status: "Blocked",
        });
        playTone(statusTone(error.response?.data?.result));
        toast.error(message);
      } finally {
        scanLockRef.current = false;
        setSaving(false);
      }
    },
    [addHistory, disabled, eventId, saving, stopCamera]
  );

  const startCamera = useCallback(async (preferredCameraId = "") => {
    if (disabled || !eventId || cameraOn) {
      return;
    }

    if (!canUseCameraHere()) {
      setScanState("error");
      toast.error("Camera scanning needs HTTPS or localhost on this device.");
      return;
    }

    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      const selectedCameraId = getPreferredCameraId(devices, cameraId, preferredCameraId);

      if (!selectedCameraId) {
        toast.error("No camera found. Use manual code entry.");
        return;
      }

      const scanner = new Html5Qrcode(scannerRegionId, false);
      html5QrCodeRef.current = scanner;
      setCameraOn(true);
      setScanState("scanning");

      await scanner.start(
        selectedCameraId,
        scannerConfig,
        (decodedText) => {
          if (decodedText) {
            scanCode(decodedText);
          }
        },
        () => {}
      );
      setCameraId(selectedCameraId);
    } catch (error) {
      setCameraOn(false);
      setScanState("error");
      toast.error(error?.message || "Camera could not start.");
    }
  }, [cameraId, cameraOn, disabled, eventId, scanCode, scannerConfig]);

  const switchCamera = async () => {
    if (!cameras.length) {
      return;
    }

    const currentIndex = Math.max(cameras.findIndex((camera) => camera.id === cameraId), 0);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];

    await stopCamera();
    setCameraId(nextCamera.id);
    window.setTimeout(() => startCamera(nextCamera.id), 150);
  };

  const toggleTorch = async () => {
    const scanner = html5QrCodeRef.current;

    if (!scanner?.isScanning) {
      return;
    }

    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((current) => !current);
    } catch {
      toast.error("Torch is not available on this camera.");
    }
  };

  const submitManualCode = (event) => {
    event.preventDefault();
    scanCode(manualCode.trim());
  };

  const markAttendance = async (status) => {
    if (!lastRawCode) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/attendance/mark", {
        rawCode: lastRawCode,
        eventId,
        status,
      });

      setPreview(response.data);
      setManualCode("");
      setLastRawCode("");
      setScanState("success");
      addHistory({
        result: "Marked",
        name: response.data.participant?.name || "Participant",
        status,
      });
      playTone("success");
      toast.success(`${status} attendance marked`);

      if (onMarked) {
        onMarked(response.data);
      }
    } catch (error) {
      const message = getApiMessage(error, "Attendance mark failed");
      setScanState("error");
      addHistory({
        result: error.response?.data?.result || "Error",
        name: message,
        status: "Failed",
      });
      playTone("error");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => {
    stopCamera();
  }, [stopCamera]);

  return (
    <div className={`professional-scanner scanner-${scanState}`}>
      <div className="scanner-head">
        <div>
          <span className="eyebrow">Secure QR Attendance</span>
          <h2>Professional Scanner</h2>
          <p>Scan a participant QR, review the identity match, then mark Present or Absent.</p>
        </div>
        <span className={`scanner-live-pill ${cameraOn ? "active" : ""}`}>
          {cameraOn ? "Camera live" : "Camera idle"}
        </span>
      </div>

      <div className="scanner-grid">
        <div className="scanner-camera-panel">
          <div className="scanner-frame">
            <div id={scannerRegionId} />
            {!cameraOn && (
              <div className="scanner-placeholder">
                <QrCode size={52} />
                <strong>{eventId ? "Ready to scan" : "Select an event first"}</strong>
                <span>Camera preview appears here</span>
              </div>
            )}
            <span className="scanner-line" />
          </div>
          <div className="scanner-toolbar">
            <button className="primary-button" disabled={disabled || !eventId || cameraOn} onClick={() => startCamera()} type="button">
              <Camera size={16} /> Start
            </button>
            <button className="secondary-button" disabled={!cameraOn} onClick={stopCamera} type="button">
              Stop
            </button>
            <button className="secondary-button" disabled={!cameraOn || cameras.length < 2} onClick={switchCamera} type="button">
              <RefreshCw size={16} /> Switch
            </button>
            <button className="secondary-button" disabled={!cameraOn} onClick={toggleTorch} type="button">
              <Flashlight size={16} /> {torchOn ? "Torch On" : "Torch"}
            </button>
          </div>
          <form className="manual-scan-form" onSubmit={submitManualCode}>
            <label className="scan-box">
              <Keyboard size={18} />
              <input
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Manual QR token, booking ID, or ticket number"
                value={manualCode}
              />
            </label>
            <button className="secondary-button" disabled={saving || !manualCode.trim() || !eventId} type="submit">
              Verify
            </button>
          </form>
        </div>

        <div className="scanner-side-panel">
          <ScannerResultPanel
            onClose={() => {
              setPreview(null);
              setLastRawCode("");
              setScanState("idle");
            }}
            onMark={markAttendance}
            preview={preview}
            saving={saving}
          />
          {!preview && (
            <div className="scanner-empty-result">
              <ShieldAlert size={34} />
              <h3>No active scan</h3>
              <p>Validated participant details will appear here before attendance is saved.</p>
            </div>
          )}
          <div className="recent-scans">
            <h3>Recent Scan History</h3>
            {history.length ? (
              history.map((item) => (
                <div className="recent-scan-row" key={item.id}>
                  <span>{item.time}</span>
                  <strong>{item.name}</strong>
                  <small>{item.result} / {item.status}</small>
                </div>
              ))
            ) : (
              <p>No scans yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalQRScanner;
