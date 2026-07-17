import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Mail,
  Menu,
  QrCode,
  ShieldCheck,
  Ticket,
  User,
  UserCog,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ProfessionalQRScanner from "../components/features/ProfessionalQRScanner";
import Container from "../components/ui/Container";
import GlassCard from "../components/ui/GlassCard";
import Loader from "../components/ui/Loader";
import SectionTitle from "../components/ui/SectionTitle";
import api from "../services/api";
import { getSocket } from "../services/socketClient";
import { downloadCsv } from "../utils/eventFeatures";
import { getApiMessage } from "../utils/forms";

function StatCard({ icon: Icon, label, value }) {
  return (
    <GlassCard className="stat-card">
      <Icon />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </GlassCard>
  );
}

function DashboardSidebar({ activeSection, collapsed, items, onSelect, onToggle }) {
  return (
    <aside className={`dashboard-sidebar${collapsed ? " is-collapsed" : ""}`} aria-label="Dashboard sections">
      <div className="dashboard-sidebar-head">
        <span>{collapsed ? "Menu" : "Workspace"}</span>
        <button aria-label={collapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"} onClick={onToggle} type="button">
          <Menu size={18} />
        </button>
      </div>
      <nav className="dashboard-sidebar-nav">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            aria-current={activeSection === id ? "page" : undefined}
            className={activeSection === id ? "active" : ""}
            key={id}
            onClick={() => onSelect(id)}
            title={collapsed ? label : undefined}
            type="button"
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DashboardSection({ active, children }) {
  if (!active) {
    return null;
  }

  return <div className="dashboard-section-view">{children}</div>;
}

const chartColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

const getAssetUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
  const apiRoot = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${apiRoot}${value}`;
};

function EmptyChart({ label }) {
  return <div className="chart-empty">{label}</div>;
}

function EventAnalyticsCharts({ analytics }) {
  const registrations = (analytics?.registrationsOverTime || []).reduce(
    (state, item, index, source) => {
      const registrationsCount = Number(item.count || 0);
      const cumulative = state.cumulative + registrationsCount;
      const previous = index > 0 ? Number(source[index - 1].count || 0) : registrationsCount;

      return {
        cumulative,
        items: [
          ...state.items,
          {
            date: item._id,
            registrations: registrationsCount,
            cumulative,
            change: registrationsCount - previous,
          },
        ],
      };
    },
    { cumulative: 0, items: [] }
  ).items;
  const attendance = Number(analytics?.attendance || 0);
  const totalRegistrations = Number(analytics?.totalRegistrations || 0);
  const peakDay = registrations.reduce((peak, item) => (item.registrations > peak.registrations ? item : peak), {
    date: "No data",
    registrations: 0,
  });
  const averagePerActiveDay = registrations.length ? Math.round(totalRegistrations / registrations.length) : 0;
  const recentRegistrations = registrations.slice(-7).reduce((total, item) => total + item.registrations, 0);
  const attendanceSplit = [
    { name: "Present", value: attendance },
    { name: "Absent", value: Math.max(totalRegistrations - attendance, 0) },
  ].filter((item) => item.value > 0);

  return (
    <div className="analytics-charts">
      <div className="chart-panel analytics-trend-panel">
        <div className="chart-panel-head">
          <div>
            <h3>Registration Trend Analysis</h3>
            <p>Daily registrations, cumulative growth, and short-term momentum.</p>
          </div>
        </div>
        <div className="analytics-insights">
          <strong>{totalRegistrations}<span>Total</span></strong>
          <strong>{peakDay.registrations}<span>Peak day</span></strong>
          <strong>{averagePerActiveDay}<span>Avg/day</span></strong>
          <strong>{recentRegistrations}<span>Last 7 days</span></strong>
        </div>
        {registrations.length ? (
          <ResponsiveContainer height={260} width="100%">
            <ComposedChart data={registrations} margin={{ top: 12, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="registrations" fill="#93c5fd" name="Daily" radius={[6, 6, 0, 0]} />
              <Line dataKey="cumulative" name="Cumulative" stroke="#2563eb" strokeWidth={3} type="monotone" />
              <Line dataKey="change" name="Daily Change" stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No registration data yet." />
        )}
      </div>
      <div className="chart-panel">
        <h3>Attendance Split</h3>
        {attendanceSplit.length ? (
          <ResponsiveContainer height={220} width="100%">
            <PieChart>
              <Pie data={attendanceSplit} dataKey="value" innerRadius={54} nameKey="name" outerRadius={82} paddingAngle={4}>
                {attendanceSplit.map((entry, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No attendance data yet." />
        )}
      </div>
    </div>
  );
}

function PlatformAnalyticsCharts({ dashboard }) {
  const userData = [
    { name: "Students", value: dashboard.totalStudents || 0 },
    { name: "Organizers", value: dashboard.totalOrganizers || 0 },
  ];
  const activityData = [
    { name: "Events", value: dashboard.totalEvents || 0 },
    { name: "Bookings", value: dashboard.totalBookings || 0 },
    { name: "Attendance", value: dashboard.attendance || 0 },
    { name: "Certificates", value: dashboard.certificates || 0 },
  ];

  return (
    <div className="analytics-charts">
      <div className="chart-panel">
        <h3>User Mix</h3>
        <ResponsiveContainer height={220} width="100%">
          <PieChart>
            <Pie data={userData} dataKey="value" innerRadius={54} nameKey="name" outerRadius={82} paddingAngle={4}>
              {userData.map((entry, index) => (
                <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-panel">
        <h3>Platform Activity</h3>
        <ResponsiveContainer height={220} width="100%">
          <BarChart data={activityData} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#16a34a" name="Count" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AttendanceHeatmap() {
  const months = [
    ["January", 34],
    ["February", 82],
    ["March", 58],
    ["April", 76],
    ["May", 43],
    ["June", 91],
  ];

  return (
    <GlassCard className="dashboard-panel">
      <h2>Attendance Heatmap</h2>
      <div className="heatmap-list">
        {months.map(([month, value]) => (
          <div key={month}>
            <span>{month}</span>
            <strong style={{ width: `${value}%` }}>{value}%</strong>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function OperationsPanel({ events = [], registrations = [] }) {
  const [volunteers, setVolunteers] = useState([]);
  const selectedEvent = events[0] || {};
  const scanRows = registrations.slice(0, 5).map((registration) => ({
    time: registration.checkedInAt ? new Date(registration.checkedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Not checked in",
    name: registration.user?.name || "Participant",
    status: registration.attendanceStatus || (registration.checkedInAt ? "Checked In" : "Not checked in"),
  }));

  const exportRows = [
    ["Name", "Ticket", "Payment", "Attendance"],
    ...registrations.map((registration) => [
      registration.user?.name || "Participant",
      registration.ticketNumber,
      registration.paymentStatus,
      registration.attendanceStatus,
    ]),
  ];

  const updateVolunteer = (id, field, value) => {
    setVolunteers((current) => current.map((volunteer) => (volunteer.id === id ? { ...volunteer, [field]: value } : volunteer)));
  };

  const addVolunteer = () => {
    setVolunteers((current) => [
      ...current,
      { id: Date.now(), name: "", duty: "", status: "Active" },
    ]);
  };

  const removeVolunteer = (id) => {
    setVolunteers((current) => current.filter((volunteer) => volunteer.id !== id));
  };
  const filledVolunteers = volunteers.filter((volunteer) => volunteer.name || volunteer.duty);

  return (
    <>
      <GlassCard className="dashboard-panel volunteer-management-panel">
        <div className="panel-head">
          <h2>Volunteer Management</h2>
          <div className="row-actions">
            <button className="secondary-button volunteer-add-button" onClick={addVolunteer} type="button">
              Add Volunteer
            </button>
            <UserCog size={22} />
          </div>
        </div>
        <div className="volunteer-editor-list">
          {volunteers.length ? (
            volunteers.map((volunteer) => (
              <div className="volunteer-editor-row" key={volunteer.id}>
                <input
                  aria-label="Volunteer name"
                  onChange={(event) => updateVolunteer(volunteer.id, "name", event.target.value)}
                  placeholder="Volunteer name"
                  value={volunteer.name}
                />
                <input
                  aria-label="Volunteer duty"
                  onChange={(event) => updateVolunteer(volunteer.id, "duty", event.target.value)}
                  placeholder="Duty"
                  value={volunteer.duty}
                />
                <select
                  aria-label="Volunteer status"
                  onChange={(event) => updateVolunteer(volunteer.id, "status", event.target.value)}
                  value={volunteer.status}
                >
                  <option value="Active">Active</option>
                  <option value="Standby">Standby</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
                <button className="secondary-button" onClick={() => removeVolunteer(volunteer.id)} type="button">
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="volunteer-empty">No volunteers added yet.</p>
          )}
        </div>
        {filledVolunteers.length > 0 && (
          <div className="volunteer-summary">
            {filledVolunteers.map((volunteer) => (
              <span key={volunteer.id}>
                {volunteer.name || "Unnamed volunteer"}: {volunteer.duty || "Duty not set"} / {volunteer.status}
              </span>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="dashboard-panel">
        <h2>QR Scanner History</h2>
        {scanRows.length ? (
          scanRows.map((scan) => (
            <div className="list-row" key={`${scan.time}-${scan.name}`}>
              <div>
                <strong>{scan.time}</strong>
                <span>{scan.name}</span>
              </div>
              <span className="status-pill status-approved">{scan.status}</span>
            </div>
          ))
        ) : (
          <p>No scan history yet.</p>
        )}
      </GlassCard>

      <GlassCard className="dashboard-panel">
        <div className="panel-head">
          <h2>Reports and Exports</h2>
          <FileText size={22} />
        </div>
        <div className="profile-lines">
          <span>Revenue: Rs {selectedEvent.revenue || 0}</span>
          <span>Attendance: {selectedEvent.totalAttendance || 0}</span>
          <span>Feedback: {selectedEvent.averageRating || 0}/5</span>
          <span>Certificates Issued: {registrations.filter((item) => item.certificateIssued).length}</span>
          <span>Cancelled events trigger Refund Initiated status for paid bookings.</span>
        </div>
        <div className="row-actions">
          <button className="secondary-button" onClick={() => downloadCsv("attendance-export.csv", exportRows)} type="button">
            <Download size={16} /> CSV Export
          </button>
          <button className="secondary-button" onClick={() => window.print()} type="button">
            <FileText size={16} /> Completion Report
          </button>
        </div>
      </GlassCard>

      <GlassCard className="dashboard-panel">
        <div className="panel-head">
          <h2>Email Templates and Reminders</h2>
          <Mail size={22} />
        </div>
        <div className="badge-grid">
          {["Registration", "Payment", "Reminder", "Certificate", "Cancellation"].map((template) => (
            <span key={template}>{template}</span>
          ))}
        </div>
        <p>Reminder schedule: 7 days, 1 day, 2 hours, and 30 minutes before event.</p>
      </GlassCard>
    </>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-IN");
}

function detailValue(value) {
  return value || "Not added";
}

function getEventTimingLabel(event) {
  if (!event?.eventDate) {
    return "Date not set";
  }

  const eventDate = new Date(event.eventDate);
  const today = new Date();
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  if (event.status === "Completed" || eventDay < todayDay) {
    return "Past Event";
  }

  if (eventDay === todayDay) {
    return "Present Event";
  }

  return "Upcoming Event";
}

function StudentRosterButton({ registration, selected, onSelect }) {
  const student = registration.user || {};

  return (
    <button
      className={`student-roster-button${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(registration._id)}
      type="button"
    >
      <strong>{student.name || "Student"}</strong>
      <span>{student.rollNumber || "Roll number not added"}</span>
      <small>{student.email || "Email not added"}</small>
    </button>
  );
}

function SeatEditForm({ registration, onUpdateSeat, saving }) {
  const [seatNumber, setSeatNumber] = useState(registration.seatNumber || "");

  return (
    <form className="seat-edit-form" onSubmit={(event) => {
      event.preventDefault();
      onUpdateSeat(registration._id, seatNumber);
    }}>
      <label>
        Seat number
        <input onChange={(event) => setSeatNumber(event.target.value)} placeholder="A1, B4, VIP-2" value={seatNumber} />
      </label>
      <div className="row-actions">
        <button className="secondary-button" disabled={saving || !registration.seatNumber} onClick={() => {
          setSeatNumber("");
          onUpdateSeat(registration._id, "");
        }} type="button">
          Remove seat
        </button>
        <button className="primary-button" disabled={saving} type="submit">
          Save seat
        </button>
      </div>
    </form>
  );
}

function RegistrationDetails({ registration, onUpdateSeat, saving }) {
  if (!registration) {
    return null;
  }

  const student = registration.user || {};

  const studentDetails = [
    ["Name", student.name],
    ["Roll number", student.rollNumber],
    ["Email", student.email],
    ["Phone", student.phone],
    ["College", student.college],
    ["Course", student.course],
    ["Branch", student.branch],
    ["Department", student.department],
    ["Designation", student.designation],
    ["Year", student.year],
    ["Semester", student.semester],
    ["Gender", student.gender],
    ["Date of Birth", formatDate(student.dateOfBirth)],
    ["Bio", student.bio],
  ];

  const bookingDetails = [
    ["Ticket number", registration.ticketNumber],
    ["Booking ID", registration.bookingId],
    ["Payment status", registration.paymentStatus],
    ["Payment method", registration.paymentMethod],
    ["Amount", registration.amount !== undefined ? `Rs ${registration.amount}` : ""],
    ["Seat", registration.seatNumber],
    ["Attendance", registration.attendanceStatus],
    ["Checked in", formatDateTime(registration.checkedInAt)],
    ["Certificate", registration.certificateIssued ? "Issued" : "Not issued"],
    ["Booking status", registration.bookingStatus],
    ["Registered", formatDateTime(registration.createdAt)],
  ];

  return (
    <div className="registration-detail">
      <div className="registration-detail-head">
        {student.profileImage && <img alt={student.name || "Student"} src={student.profileImage} />}
        <div>
          <h3>{student.name || "Student details"}</h3>
          <span>{registration.attendanceStatus || "Not Marked"}</span>
        </div>
        {student.resumeUrl && (
          <a className="secondary-button" href={getAssetUrl(student.resumeUrl)} rel="noreferrer" target="_blank">
            Resume
          </a>
        )}
      </div>
      <div className="detail-grid compact-detail-grid">
        <div>
          <h4>Student Details</h4>
          {studentDetails.map(([label, value]) => (
            <p key={label}>
              <span>{label}</span>
              <strong>{detailValue(value)}</strong>
            </p>
          ))}
        </div>
        <div>
          <h4>Booking Details</h4>
          {bookingDetails.map(([label, value]) => (
            <p key={label}>
              <span>{label}</span>
              <strong>{detailValue(value)}</strong>
            </p>
          ))}
          <SeatEditForm
            key={`${registration._id}-${registration.seatNumber || "none"}`}
            onUpdateSeat={onUpdateSeat}
            registration={registration}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}

function AttendanceRoster({ registrations, selectedRegistrationId, onSelectRegistration, eventOptions, selectedEventId, onSelectEvent, onUpdateSeat, saving }) {
  const presentRegistrations = registrations.filter((registration) => registration.attendanceStatus === "Present");
  const absentRegistrations = registrations.filter((registration) => registration.attendanceStatus !== "Present");
  const selectedRegistration = registrations.find((registration) => registration._id === selectedRegistrationId);

  const groups = [
    { label: "Present Students", items: presentRegistrations },
    { label: "Absent Students", items: absentRegistrations },
  ];

  return (
    <GlassCard className="dashboard-panel wide-panel attendance-roster">
      <div className="panel-head">
        <div>
          <h2>Attendance Roster</h2>
          <p>Present and absent students for the selected event.</p>
        </div>
        {eventOptions.length > 0 && (
          <select onChange={(event) => onSelectEvent(event.target.value)} value={selectedEventId}>
            {eventOptions.map((event) => (
              <option key={event._id} value={event._id}>{event.title}</option>
            ))}
          </select>
        )}
      </div>

      {registrations.length ? (
        <>
          <div className="attendance-summary-row">
            <strong>{registrations.length}<span>Total Registered</span></strong>
            <strong>{presentRegistrations.length}<span>Present Students</span></strong>
            <strong>{absentRegistrations.length}<span>Absent Students</span></strong>
          </div>
          <div className="attendance-columns">
            {groups.map((group) => (
              <div className="attendance-list" key={group.label}>
                <h3>{group.label} ({group.items.length})</h3>
                {group.items.length ? (
                  group.items.map((registration) => (
                    <StudentRosterButton
                      key={registration._id}
                      onSelect={onSelectRegistration}
                      registration={registration}
                      selected={registration._id === selectedRegistrationId}
                    />
                  ))
                ) : (
                  <p>No students in this list.</p>
                )}
              </div>
            ))}
          </div>
          <RegistrationDetails onUpdateSeat={onUpdateSeat} registration={selectedRegistration} saving={saving} />
        </>
      ) : (
        <p>No registrations for the selected event yet.</p>
      )}
    </GlassCard>
  );
}

function CoordinatorRequestsPanel({ requests, saving, onRespond }) {
  return (
    <GlassCard className="dashboard-panel wide-panel coordinator-request-panel">
      <h2>Coordinator Requests</h2>
      {requests.length ? (
        requests.map((request) => (
          <div className="list-row" key={request._id}>
            <div>
              <strong>{request.event?.title || "Event"}</strong>
              <span>{request.coordinatorType === "student" ? "Student Coordinator" : "Organizer Coordinator"}</span>
              <small>Requested by {request.requestedBy?.name || "Organizer"}</small>
            </div>
            <div className="row-actions">
              <button className="secondary-button" disabled={saving} onClick={() => onRespond(request._id, "Rejected")} type="button">
                Reject
              </button>
              <button className="primary-button" disabled={saving} onClick={() => onRespond(request._id, "Accepted")} type="button">
                Accept
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>No pending coordinator requests.</p>
      )}
    </GlassCard>
  );
}

function NotificationPanel({ notifications, selectedNotificationId, onSelect }) {
  const selectedNotification =
    notifications.find((notification) => notification._id === selectedNotificationId) || notifications[0];

  return (
    <GlassCard className="dashboard-panel notifications-panel">
      <h2>Notifications</h2>
      {notifications.length ? (
        <>
          <div className="notification-list">
            {notifications.slice(0, 8).map((notification) => (
              <button
                className={`notification-row${notification._id === selectedNotification?._id ? " is-selected" : ""}`}
                key={notification._id}
                onClick={() => onSelect(notification)}
                type="button"
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
              </button>
            ))}
          </div>
          {selectedNotification && (
            <div className="notification-detail">
              <p className="eyebrow">{selectedNotification.type}</p>
              <h3>{selectedNotification.title}</h3>
              <p>{selectedNotification.message}</p>
              {selectedNotification.event && (
                <div className="profile-lines">
                  <span>Event: {selectedNotification.event.title}</span>
                  <span>Date: {formatDate(selectedNotification.event.eventDate)}</span>
                  <span>Venue: {selectedNotification.event.venue || "Not added"}</span>
                  <span>Status: {selectedNotification.event.status}</span>
                </div>
              )}
              <div className="row-actions">
                {selectedNotification.event?._id && (
                  <Link className="primary-button" to={`/events/${selectedNotification.event._id}`}>
                    View event
                  </Link>
                )}
                {selectedNotification.actionUrl && (
                  <Link className="secondary-button" to={selectedNotification.actionUrl}>
                    {selectedNotification.actionText || "Open"}
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <p>No notifications yet.</p>
      )}
    </GlassCard>
  );
}

function Dashboard({ adminOnly = false }) {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || "student";
  const [dashboard, setDashboard] = useState({});
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState("");
  const [events, setEvents] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [coordinatorRequests, setCoordinatorRequests] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRegistrationId, setSelectedRegistrationId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [dashboardSidebarCollapsed, setDashboardSidebarCollapsed] = useState(false);
  const [activeDashboardSection, setActiveDashboardSection] = useState("requests");
  const hasCoordinatorAccess =
    role === "student" && (events.length > 0 || Number(dashboard.coordinatorEvents || 0) > 0);

  const stats = useMemo(() => {
    if (role === "organizer") {
      return [
        { label: "My Events", value: dashboard.totalEvents || 0, icon: CalendarDays },
        { label: "Published", value: dashboard.publishedEvents || 0, icon: CheckCircle2 },
        { label: "Pending", value: dashboard.pendingEvents || 0, icon: ShieldCheck },
      ];
    }

    if (role === "admin") {
      return [
        { label: "Users", value: dashboard.totalUsers || 0, icon: UsersRound },
        { label: "Events", value: dashboard.totalEvents || 0, icon: CalendarDays },
        { label: "Bookings", value: dashboard.totalBookings || 0, icon: Ticket },
        { label: "Organizers", value: dashboard.totalOrganizers || 0, icon: ShieldCheck },
      ];
    }

    const studentStats = [
      { label: "Upcoming", value: dashboard.upcomingEvents || 0, icon: CalendarDays },
      { label: "My Events", value: dashboard.myBookings || 0, icon: Ticket },
      { label: "Certificates", value: dashboard.certificates || 0, icon: ShieldCheck },
      { label: "Cancelled", value: dashboard.cancelledBookings || 0, icon: UsersRound },
    ];

    if (hasCoordinatorAccess) {
      studentStats.splice(2, 0, {
        label: "Coordinator Events",
        value: dashboard.coordinatorEvents || events.length || 0,
        icon: UserCog,
      });
    }

    return studentStats;
  }, [dashboard, events.length, hasCoordinatorAccess, role]);

  const dashboardSections = useMemo(() => {
    if (role === "admin") {
      return [
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "operations", label: "Operations", icon: ClipboardList },
        { id: "approvals", label: "Approve Events", icon: ShieldCheck },
        { id: "attendance", label: "Attendance", icon: UsersRound },
        { id: "scanner", label: "QR Scanner", icon: QrCode },
        { id: "users", label: "Manage Users", icon: UserCog },
        { id: "notifications", label: "Notifications", icon: Bell },
      ];
    }

    if (role === "organizer") {
      return [
        { id: "requests", label: "Coordinator Requests", icon: ClipboardList },
        { id: "workspace", label: "Workspace", icon: CalendarDays },
        { id: "events", label: "My Events", icon: Ticket },
        { id: "attendance", label: "Attendance", icon: UsersRound },
        { id: "scanner", label: "QR Scanner", icon: QrCode },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "operations", label: "Operations", icon: UserCog },
        { id: "certificates", label: "Certificates", icon: Award },
        { id: "notifications", label: "Notifications", icon: Bell },
      ];
    }

    const studentSections = [
      { id: "requests", label: "Coordinator Requests", icon: ClipboardList },
      { id: "my-events", label: "My Events", icon: Ticket },
      { id: "profile", label: "Profile Details", icon: User },
      { id: "notifications", label: "Notifications", icon: Bell },
    ];

    if (hasCoordinatorAccess) {
      studentSections.splice(
        2,
        0,
        { id: "coordinator-events", label: "Coordinator Events", icon: CalendarDays },
        { id: "attendance", label: "Attendance", icon: UsersRound },
        { id: "scanner", label: "QR Scanner", icon: QrCode },
        { id: "certificates", label: "Certificates", icon: Award },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "operations", label: "Operations", icon: UserCog }
      );
    }

    return studentSections;
  }, [hasCoordinatorAccess, role]);

  const refresh = useCallback(async () => {
    if (role === "organizer" && user?.organizerStatus !== "Approved") {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const dashboardPath = role === "admin" ? "admin" : role;
      const requests = [api.get(`/dashboard/${dashboardPath}`), api.get("/notifications")];

      if (role === "student") {
        requests.push(api.get("/bookings/my-bookings"));
        requests.push(api.get("/events/organizer/my-events"));
      }

      if (role === "organizer") {
        requests.push(api.get("/events/organizer/my-events"));
      }

      if (role === "admin") {
        requests.push(api.get("/events/admin/all"));
        requests.push(api.get("/admin/users"));
      }

      requests.push(api.get("/events/coordinator-requests/my"));

      const responses = await Promise.all(requests);
      const dashboardResponse = responses[0];
      const notificationResponse = responses[1];
      const bookingResponse = role === "student" ? responses[2] : null;
      const listResponse = role === "student" ? responses[3] : responses[2];
      const usersResponse = role === "admin" ? responses[3] : null;
      const coordinatorResponse = responses[responses.length - 1];

      setDashboard(dashboardResponse.data.dashboard || {});
      setNotifications(notificationResponse.data.notifications || []);
      setCoordinatorRequests(coordinatorResponse.data.requests || []);

      if (role === "student") {
        const coordinatorEvents = listResponse.data.events || [];
        setBookings(bookingResponse.data.bookings || []);
        setEvents(coordinatorEvents);
        setSelectedEventId((current) =>
          coordinatorEvents.some((event) => event._id === current) ? current : coordinatorEvents[0]?._id || ""
        );
      }

      if (role === "organizer") {
        const myEvents = listResponse.data.events || [];
        setEvents(myEvents);
        setSelectedEventId((current) =>
          myEvents.some((event) => event._id === current) ? current : myEvents[0]?._id || ""
        );
      }

      if (role === "admin") {
        const allEvents = listResponse.data.events || [];
        setAdminEvents(allEvents);
        setSelectedEventId((current) =>
          allEvents.some((event) => event._id === current) ? current : allEvents[0]?._id || ""
        );
        setUsers(usersResponse.data.users || []);
      }
    } catch (error) {
      toast.error(getApiMessage(error, "Dashboard failed to load"));
    } finally {
      setLoading(false);
    }
  }, [role, user?.organizerStatus]);

  useEffect(() => {
    if (user && (!adminOnly || role === "admin")) {
      queueMicrotask(refresh);
    }
  }, [adminOnly, role, user, refresh]);

  const loadEventWorkspace = useCallback(async () => {
    if (!selectedEventId || !["student", "organizer", "admin"].includes(role)) {
      return;
    }

    try {
      const [analyticsResponse, registrationsResponse] = await Promise.all([
        api.get(`/organizer/analytics/${selectedEventId}`),
        api.get(`/organizer/events/${selectedEventId}/registrations`),
      ]);

      const nextRegistrations = registrationsResponse.data.registrations || [];
      setAnalytics(analyticsResponse.data.analytics);
      setRegistrations(nextRegistrations);
      setSelectedRegistrationId((current) =>
        nextRegistrations.some((registration) => registration._id === current) ? current : ""
      );
    } catch {
      setAnalytics(null);
      setRegistrations([]);
      setSelectedRegistrationId("");
    }
  }, [selectedEventId, role]);

  useEffect(() => {
    queueMicrotask(loadEventWorkspace);
  }, [loadEventWorkspace]);

  useEffect(() => {
    if (!selectedEventId || !["student", "organizer", "admin"].includes(role)) {
      return undefined;
    }

    let activeSocket;
    let mounted = true;

    getSocket()
      .then((socket) => {
        if (!mounted) {
          return;
        }

        activeSocket = socket;
        activeSocket.emit("join-event", selectedEventId);
        activeSocket.on("attendance:update", loadEventWorkspace);
      })
      .catch(() => {});

    return () => {
      mounted = false;

      if (activeSocket) {
        activeSocket.off("attendance:update", loadEventWorkspace);
      }
    };
  }, [loadEventWorkspace, role, selectedEventId]);

  const generateCertificate = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await api.post(`/certificates/${bookingId.trim()}/generate`);
      toast.success("Certificate generated");
      setBookingId("");
    } catch (error) {
      toast.error(getApiMessage(error, "Certificate generation failed"));
    } finally {
      setSaving(false);
    }
  };

  const updateRegistrationSeat = async (registrationId, seatNumber) => {
    if (!selectedEventId || !registrationId) {
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch(`/organizer/events/${selectedEventId}/registrations/${registrationId}/seat`, {
        seatNumber,
      });
      const updatedRegistration = response.data.registration;

      setRegistrations((current) =>
        current.map((registration) => (registration._id === updatedRegistration._id ? updatedRegistration : registration))
      );
      toast.success(response.data.message || "Seat updated");
    } catch (error) {
      toast.error(getApiMessage(error, "Seat update failed"));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (eventId, status) => {
    setSaving(true);

    try {
      await api.patch(`/events/${eventId}/status`, { status });
      toast.success(`Event ${status.toLowerCase()}`);
      await refresh();
    } catch (error) {
      toast.error(getApiMessage(error, "Status update failed"));
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (userId, payload) => {
    setSaving(true);

    try {
      const response = await api.patch(`/admin/users/${userId}`, payload);
      setUsers((current) => current.map((item) => (item._id === userId ? response.data.user : item)));
      toast.success("User updated");
    } catch (error) {
      toast.error(getApiMessage(error, "User update failed"));
    } finally {
      setSaving(false);
    }
  };

  const respondCoordinatorRequest = async (requestId, status) => {
    setSaving(true);

    try {
      await api.patch(`/events/coordinator-requests/${requestId}`, { status });
      setCoordinatorRequests((current) => current.filter((request) => request._id !== requestId));
      toast.success(`Request ${status.toLowerCase()}`);
      await refresh();
    } catch (error) {
      toast.error(getApiMessage(error, "Request update failed"));
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (item) => {
    const confirmed = window.confirm(`Remove ${item.name}? This deletes the account and the user must register again.`);

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      await api.delete(`/admin/users/${item._id}`);
      toast.success("User removed");
      await refresh();
    } catch (error) {
      toast.error(getApiMessage(error, "User removal failed"));
    } finally {
      setSaving(false);
    }
  };

  const openNotification = async (notification) => {
    setSelectedNotificationId(notification._id);

    if (notification.isRead) {
      return;
    }

    setNotifications((current) =>
      current.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item))
    );

    try {
      await api.patch(`/notifications/${notification._id}/read`);
    } catch {
      // Keep the UI responsive even if the read receipt fails.
    }
  };

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

  if (adminOnly && role !== "admin") {
    return (
      <section className="section-content page-top">
        <Container>
          <GlassCard className="empty-state">
            <h1>Admin access required</h1>
            <Link className="primary-button" to="/dashboard">
              Go to dashboard
            </Link>
          </GlassCard>
        </Container>
      </section>
    );
  }

  if (loading) {
    return <Loader />;
  }

  if (role === "organizer" && user.organizerStatus !== "Approved") {
    return (
      <section className="section-content page-top">
        <Container>
          <SectionTitle title="Organizer Approval Pending" subtitle="You can log in, but organizer features stay disabled until admin approval." />
          <GlassCard className="empty-state">
            <h1>Pending Approval</h1>
            <p>Admin approval is required before you can create events, scan QR tickets, or view organizer analytics.</p>
          </GlassCard>
        </Container>
      </section>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter((booking) => new Date(booking.event?.eventDate || 0) >= now);
  const pastBookings = bookings.filter((booking) => new Date(booking.event?.eventDate || 0) < now);
  const activeSection = dashboardSections.some((item) => item.id === activeDashboardSection)
    ? activeDashboardSection
    : dashboardSections[0]?.id;
  const displayName = user.name || "User";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <section className="section-content page-top dashboard-page">
      <Container className="dashboard-container">
        <SectionTitle
          title={displayName}
          subtitle={
            adminOnly
              ? "Admin dashboard for users, approvals, and platform activity."
              : `${roleLabel} dashboard for Campus Event Hub.`
          }
        />

        <div className="stats-grid">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className={`dashboard-workspace${dashboardSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
          <DashboardSidebar
            activeSection={activeSection}
            collapsed={dashboardSidebarCollapsed}
            items={dashboardSections}
            onSelect={setActiveDashboardSection}
            onToggle={() => setDashboardSidebarCollapsed((current) => !current)}
          />

          <div className="dashboard-grid dashboard-content-grid">
          {role === "student" && (
            <>
              <DashboardSection active={activeSection === "requests"}>
                <CoordinatorRequestsPanel
                  onRespond={respondCoordinatorRequest}
                  requests={coordinatorRequests}
                  saving={saving}
                />
              </DashboardSection>

              <DashboardSection active={activeSection === "my-events"}>
                <GlassCard className="dashboard-panel wide-panel">
                  <h2>My Events</h2>
                  {bookings.length ? (
                    <>
                      <h3>Upcoming</h3>
                      {(upcomingBookings.length ? upcomingBookings : []).map((booking) => (
                        <div className="list-row" key={booking._id}>
                          <div>
                            <strong>{booking.event?.title || "Event"}</strong>
                            <span>{booking.ticketNumber}</span>
                            <small>{booking.paymentStatus} / {booking.attendanceStatus}</small>
                          </div>
                          {booking.qrCode && <img alt="QR ticket" className="mini-qr" src={booking.qrCode} />}
                          <div className="row-actions">
                            {booking.event?._id && (
                              <Link className="secondary-button" to={`/events/${booking.event._id}`}>
                                View event
                              </Link>
                            )}
                            <Link className="secondary-button" to={`/certificates/${booking._id}`}>
                              Certificate
                            </Link>
                          </div>
                        </div>
                      ))}
                      {!upcomingBookings.length && <p>No upcoming registrations.</p>}
                      <h3>Past</h3>
                      {(pastBookings.length ? pastBookings : []).map((booking) => (
                        <div className="list-row" key={booking._id}>
                          <div>
                            <strong>{booking.event?.title || "Event"}</strong>
                            <span>{booking.ticketNumber}</span>
                            <small>{booking.paymentStatus} / {booking.attendanceStatus}</small>
                          </div>
                          <div className="row-actions">
                            {booking.event?._id && (
                              <Link className="secondary-button" to={`/events/${booking.event._id}`}>
                                View event
                              </Link>
                            )}
                            <Link className="secondary-button" to={`/certificates/${booking._id}`}>
                              Certificate
                            </Link>
                          </div>
                        </div>
                      ))}
                      {!pastBookings.length && <p>No past registrations.</p>}
                    </>
                  ) : (
                    <p>No registrations yet.</p>
                  )}
                </GlassCard>
              </DashboardSection>

              {events.length > 0 && (
                <>
                  <DashboardSection active={activeSection === "coordinator-events"}>
                    <GlassCard className="dashboard-panel wide-panel">
                      <h2>Coordinator Events</h2>
                      {events.map((event) => (
                        <div className="list-row" key={event._id}>
                          <div>
                            <strong>{event.title}</strong>
                            <span>{event.status} / {event.isPublished ? "Published" : "Not published"}</span>
                            <small>{getEventTimingLabel(event)}</small>
                          </div>
                          <div className="row-actions">
                            <Link className="secondary-button" to={`/events/${event._id}`}>
                              View event
                            </Link>
                            <button className="secondary-button" onClick={() => setSelectedEventId(event._id)} type="button">
                              View attendance
                            </button>
                            <Link className="primary-button" to={`/events/${event._id}/settings`}>
                              Event Settings
                            </Link>
                          </div>
                        </div>
                      ))}
                    </GlassCard>
                  </DashboardSection>

                  <DashboardSection active={activeSection === "attendance"}>
                    <AttendanceRoster
                      eventOptions={events}
                      onSelectEvent={setSelectedEventId}
                      onSelectRegistration={setSelectedRegistrationId}
                      onUpdateSeat={updateRegistrationSeat}
                      registrations={registrations}
                      saving={saving}
                      selectedEventId={selectedEventId}
                      selectedRegistrationId={selectedRegistrationId}
                    />
                  </DashboardSection>

                  <DashboardSection active={activeSection === "scanner"}>
                    <GlassCard className="dashboard-panel wide-panel scanner-dashboard-panel">
                      <ProfessionalQRScanner
                        eventId={selectedEventId}
                        onMarked={loadEventWorkspace}
                      />
                    </GlassCard>
                  </DashboardSection>

                  <DashboardSection active={activeSection === "certificates"}>
                    <GlassCard className="dashboard-panel compact-action-panel">
                      <h2>Coordinator Certificates</h2>
                      <form className="action-form" onSubmit={generateCertificate}>
                        <input onChange={(event) => setBookingId(event.target.value)} placeholder="Booking ID" value={bookingId} />
                        <button className="secondary-button" disabled={saving} type="submit">
                          Generate certificate
                        </button>
                      </form>
                    </GlassCard>
                  </DashboardSection>

                  <DashboardSection active={activeSection === "analytics"}>
                    <GlassCard className="dashboard-panel">
                      <h2>Coordinator Analytics</h2>
                      <select onChange={(event) => setSelectedEventId(event.target.value)} value={selectedEventId}>
                        {events.map((event) => (
                          <option key={event._id} value={event._id}>{event.title}</option>
                        ))}
                      </select>
                      <div className="analytics-counters">
                        <strong>{analytics?.totalRegistrations || 0} registrations</strong>
                        <strong>{analytics?.attendanceRate || 0}% attendance</strong>
                        <strong>Rs {analytics?.revenue || 0}</strong>
                      </div>
                      <EventAnalyticsCharts analytics={analytics} />
                    </GlassCard>
                  </DashboardSection>

                  <DashboardSection active={activeSection === "operations"}>
                    <OperationsPanel events={events} registrations={registrations} />
                  </DashboardSection>
                </>
              )}

              <DashboardSection active={activeSection === "profile"}>
                <GlassCard className="dashboard-panel">
                  <h2>Profile Details</h2>
                  <div className="profile-lines">
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                    <span>{user.college || "Geeta University"}</span>
                    <span>{formatDate(user.dateOfBirth) || "Date of birth not added"}</span>
                    <span>{user.rollNumber || "Roll number not added"}</span>
                    <span>{user.branch || "Branch not added"}</span>
                  </div>
                  <Link className="primary-button" to="/profile">
                    View profile
                  </Link>
                </GlassCard>
              </DashboardSection>
            </>
          )}

          {role === "organizer" && (
            <>
              <DashboardSection active={activeSection === "requests"}>
                <CoordinatorRequestsPanel
                  onRespond={respondCoordinatorRequest}
                  requests={coordinatorRequests}
                  saving={saving}
                />
              </DashboardSection>

              <DashboardSection active={activeSection === "workspace"}>
                {user.organizerStatus !== "Approved" ? (
                  <GlassCard className="empty-state wide-panel">
                    <h2>Organizer approval pending</h2>
                    <p>Your organizer tools unlock after an admin approves your account.</p>
                  </GlassCard>
                ) : (
                  <GlassCard className="dashboard-panel wide-panel">
                    <div className="panel-head">
                      <div>
                        <h2>{displayName}'s Workspace</h2>
                        <p>Create events, manage assigned events, scan QR tickets, and review analytics.</p>
                      </div>
                      <Link className="primary-button" to="/events/create">
                        + Create Event
                      </Link>
                    </div>
                  </GlassCard>
                )}
              </DashboardSection>

              <DashboardSection active={activeSection === "events"}>
                <GlassCard className="dashboard-panel wide-panel">
                  <h2>My Events List</h2>
                  {events.length ? (
                    events.map((event) => (
                      <div className="list-row" key={event._id}>
                        <div>
                          <strong>{event.title}</strong>
                          <span>{event.status} / {event.isPublished ? "Published" : "Not published"}</span>
                          <small>{getEventTimingLabel(event)} / {event.availableSeats} of {event.totalSeats} seats available</small>
                        </div>
                        <div className="row-actions">
                          <Link className="secondary-button" to={`/events/${event._id}`}>
                            View event
                          </Link>
                          <button className="secondary-button" onClick={() => setSelectedEventId(event._id)} type="button">
                            View registrations
                          </button>
                          <Link className="primary-button" to={`/events/${event._id}/settings`}>
                            Event Settings
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No organizer events yet.</p>
                  )}
                </GlassCard>
              </DashboardSection>

              <DashboardSection active={activeSection === "attendance"}>
                <AttendanceRoster
                  eventOptions={events}
                  onSelectEvent={setSelectedEventId}
                  onSelectRegistration={setSelectedRegistrationId}
                  onUpdateSeat={updateRegistrationSeat}
                  registrations={registrations}
                  saving={saving}
                  selectedEventId={selectedEventId}
                  selectedRegistrationId={selectedRegistrationId}
                />
              </DashboardSection>

              <DashboardSection active={activeSection === "scanner"}>
                <GlassCard className="dashboard-panel wide-panel scanner-dashboard-panel">
                  <ProfessionalQRScanner
                    eventId={selectedEventId}
                    onMarked={loadEventWorkspace}
                  />
                </GlassCard>
              </DashboardSection>

              <DashboardSection active={activeSection === "analytics"}>
                <GlassCard className="dashboard-panel">
                  <h2>Event Analytics</h2>
                  <select onChange={(event) => setSelectedEventId(event.target.value)} value={selectedEventId}>
                    {events.map((event) => (
                      <option key={event._id} value={event._id}>{event.title}</option>
                    ))}
                  </select>
                  <div className="analytics-counters">
                    <strong>{analytics?.totalRegistrations || 0} registrations</strong>
                    <strong>{analytics?.attendanceRate || 0}% attendance</strong>
                    <strong>Rs {analytics?.revenue || 0}</strong>
                  </div>
                  <EventAnalyticsCharts analytics={analytics} />
                </GlassCard>
              </DashboardSection>

              <DashboardSection active={activeSection === "operations"}>
                <OperationsPanel events={events} registrations={registrations} />
              </DashboardSection>

              <DashboardSection active={activeSection === "certificates"}>
                <GlassCard className="dashboard-panel compact-action-panel">
                  <h2>Certificates</h2>
                  <form className="action-form" onSubmit={generateCertificate}>
                    <input onChange={(event) => setBookingId(event.target.value)} placeholder="Booking ID" value={bookingId} />
                    <button className="secondary-button" disabled={saving} type="submit">
                      Generate certificate
                    </button>
                  </form>
                </GlassCard>
              </DashboardSection>
            </>
          )}

          {role === "admin" && (
            <>
              <DashboardSection active={activeSection === "analytics"}>
                <GlassCard className="dashboard-panel wide-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Platform Analytics</h2>
                      <p>Admin-wide snapshot of users, approvals, revenue, attendance, and bookings.</p>
                    </div>
                    <Link className="primary-button" to="/events/create">
                      + Create Event
                    </Link>
                  </div>
                  <div className="analytics-counters">
                    <strong>{dashboard.totalUsers || 0} users</strong>
                    <strong>{dashboard.totalStudents || 0} students</strong>
                    <strong>{dashboard.totalOrganizers || 0} organizers</strong>
                    <strong>{dashboard.pendingOrganizers || 0} pending organizers</strong>
                    <strong>{dashboard.totalBookings || 0} bookings</strong>
                    <strong>Rs {dashboard.revenue || 0}</strong>
                  </div>
                  <PlatformAnalyticsCharts dashboard={dashboard} />
                </GlassCard>
              </DashboardSection>

              <DashboardSection active={activeSection === "operations"}>
                <AttendanceHeatmap />
                <OperationsPanel events={adminEvents} registrations={registrations} />
              </DashboardSection>

              <DashboardSection active={activeSection === "approvals"}>
                <GlassCard className="dashboard-panel wide-panel">
                  <h2>Approve Events</h2>
                  {adminEvents.length ? (
                    adminEvents.map((event) => (
                      <div className="list-row" key={event._id}>
                        <div>
                          <strong>{event.title}</strong>
                          <span>{event.status} by {event.organizer?.name || "Organizer"}</span>
                          <small>{getEventTimingLabel(event)} / {event.isPublished ? "Published" : "Not published"}</small>
                        </div>
                        {event.status === "Pending" ? (
                          <div className="row-actions">
                            <Link className="secondary-button" to={`/events/${event._id}`}>
                              View event
                            </Link>
                            <Link className="secondary-button" to={`/events/${event._id}/settings`}>
                              Event Settings
                            </Link>
                            <button
                              className="secondary-button"
                              disabled={saving}
                              onClick={() => updateStatus(event._id, "Rejected")}
                              type="button"
                            >
                              Reject
                            </button>
                            <button
                              className="primary-button"
                              disabled={saving}
                              onClick={() => updateStatus(event._id, "Approved")}
                              type="button"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <div className="row-actions">
                            <Link className="secondary-button" to={`/events/${event._id}`}>
                              View event
                            </Link>
                            <Link className="secondary-button" to={`/events/${event._id}/settings`}>
                              Event Settings
                            </Link>
                            <span className={`status-pill status-${event.status.toLowerCase()}`}>{event.status}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No events submitted yet.</p>
                  )}
                </GlassCard>
              </DashboardSection>

              <DashboardSection active={activeSection === "attendance"}>
                <AttendanceRoster
                  eventOptions={adminEvents}
                  onSelectEvent={setSelectedEventId}
                  onSelectRegistration={setSelectedRegistrationId}
                  onUpdateSeat={updateRegistrationSeat}
                  registrations={registrations}
                  saving={saving}
                  selectedEventId={selectedEventId}
                  selectedRegistrationId={selectedRegistrationId}
                />
              </DashboardSection>

              <DashboardSection active={activeSection === "scanner"}>
                <GlassCard className="dashboard-panel wide-panel">
                  <ProfessionalQRScanner
                    eventId={selectedEventId}
                    onMarked={loadEventWorkspace}
                  />
                </GlassCard>
              </DashboardSection>

              <DashboardSection active={activeSection === "users"}>
                <GlassCard className="dashboard-panel wide-panel">
                  <h2>Manage Users</h2>
                  {users.map((item) => (
                    <div className="list-row" key={item._id}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.email}</span>
                        <small>
                          {item.role} / {item.isBlocked ? "Blocked" : "Active"}
                          {item.role === "organizer" ? ` / ${item.organizerStatus || "Pending"}` : ""}
                        </small>
                        {item.resumeUrl && (
                          <a className="inline-link" href={getAssetUrl(item.resumeUrl)} rel="noreferrer" target="_blank">
                            {item.resumeFileName || "View resume"}
                          </a>
                        )}
                      </div>
                      <div className="row-actions">
                        <select
                          onChange={(event) => updateUser(item._id, { role: event.target.value })}
                          value={item.role}
                        >
                          <option value="student">Student</option>
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          className={item.isBlocked ? "primary-button" : "secondary-button"}
                          disabled={saving}
                          onClick={() => updateUser(item._id, { isBlocked: !item.isBlocked })}
                          type="button"
                        >
                          {item.isBlocked ? "Unblock" : "Block"}
                        </button>
                        {item.role === "organizer" && item.organizerStatus !== "Approved" && (
                          <button
                            className="primary-button"
                            disabled={saving}
                            onClick={() => updateUser(item._id, { organizerStatus: "Approved" })}
                            type="button"
                          >
                            Approve
                          </button>
                        )}
                        {item.role === "organizer" && item.organizerStatus !== "Rejected" && (
                          <button
                            className="secondary-button"
                            disabled={saving}
                            onClick={() => updateUser(item._id, { organizerStatus: "Rejected" })}
                            type="button"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          className="danger-button"
                          disabled={saving || item._id === user._id}
                          onClick={() => removeUser(item)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </DashboardSection>
            </>
          )}

          <DashboardSection active={activeSection === "notifications"}>
            <NotificationPanel
              notifications={notifications}
              onSelect={openNotification}
              selectedNotificationId={selectedNotificationId}
            />
          </DashboardSection>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default Dashboard;
