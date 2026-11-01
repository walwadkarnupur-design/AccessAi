import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { MeetingChannel } from "../services/meetingChannel";
import LanguageSelector from "../components/LanguageSelector";
import MekoContextInspector from "../components/MekoContextInspector";
import MekoService from "../services/meko";

function SparkleIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="teacher-dash-sparkle" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0066ff" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
        fill="url(#teacher-dash-sparkle)"
      />
    </svg>
  );
}

// ── AccessAI Student Diagnostic & Telemetry Intelligence Datasets ──
const ACCESSAI_COHORT_METRICS = {
  healthIndex: 94.2,
  avgMastery: 87.4,
  captionReliance: 98.2,
  activeFlaggedIssues: 2,
  modalities: [
    {
      id: "deaf",
      label: "Deaf & Hard of Hearing",
      icon: "sign_language",
      count: 42,
      primaryMetricName: "Sign Recognition Precision",
      primaryMetricVal: "95.4%",
      retentionScore: 92,
      captionRate: "99.1%",
      avgHoldStabilization: "620ms",
      visualFatigue: "Low",
      color: "indigo"
    },
    {
      id: "blind",
      label: "Blind & Low Vision",
      icon: "visibility_off",
      count: 38,
      primaryMetricName: "Voice Command Fluency",
      primaryMetricVal: "92.8%",
      retentionScore: 89,
      captionRate: "N/A (Auditory)",
      avgHoldStabilization: "142 WPM",
      visualFatigue: "Zero (Screen Reader)",
      color: "blue"
    },
    {
      id: "motor",
      label: "Motor Impaired",
      icon: "accessible",
      count: 24,
      primaryMetricName: "Head-Tracking Precision",
      primaryMetricVal: "91.2%",
      retentionScore: 85,
      captionRate: "94.0%",
      avgHoldStabilization: "1.2s Dwell",
      visualFatigue: "Moderate",
      color: "teal"
    }
  ],
  interventionQueue: [
    {
      id: "int-1",
      studentName: "Aman Halkude",
      mode: "blind",
      topic: "Python Nested Loops & Indentation",
      severity: "Moderate",
      struggleTime: "18 mins on Lesson 3 quiz",
      aiRecommendation: "Offer acoustic tone cues for indentation depth and enable 0.8x speech rate."
    },
    {
      id: "int-2",
      studentName: "Vrusha Goyal",
      mode: "deaf",
      topic: "ASL Numbers 11-20 Rapid Finger Flicking",
      severity: "High",
      struggleTime: "4 consecutive failed recognition attempts",
      aiRecommendation: "Suggest slow-motion 0.5x 3D Avatar playback and palm orientation review."
    }
  ]
};

const DETAILED_STUDENT_PROFILES = {
  "active-student-session": {
    name: "Vrusha Goyal",
    mode: "deaf",
    streak: "8 Days 🔥",
    studyMinutes: 145,
    signAccuracyHeatmap: [
      { sign: "Open Palm (Hello)", accuracy: 98, status: "Mastered" },
      { sign: "Thumbs Up (Yes/Agree)", accuracy: 96, status: "Mastered" },
      { sign: "Closed Fist (No/Disagree)", accuracy: 95, status: "Mastered" },
      { sign: "Pointing Up (Question)", accuracy: 94, status: "Mastered" },
      { sign: "Victory (Peace)", accuracy: 96, status: "Mastered" },
      { sign: "ILY Sign (Thank You)", accuracy: 91, status: "Proficient" },
      { sign: "Numbers 1-10", accuracy: 88, status: "In Progress" },
      { sign: "Numbers 11-20", accuracy: 72, status: "Needs Practice" }
    ],
    accommodations: {
      captions: "Always On (High Contrast Cyan)",
      speed: "1.0x Normal",
      input: "Hands-Free Sign Camera + Text",
      language: "English / Hindi / ASL"
    },
    blockchainCerts: [
      { name: "ASL Alphabet & Syntax Mastery", hash: "0x89f...2d1", date: "Oct 28, 2026" },
      { name: "Inclusive Digital Collaboration", hash: "0x4b2...9a7", date: "Oct 30, 2026" }
    ],
    aiNotes: "Demonstrates exceptional palm orientation on conversational greetings. Hand jitter detected during rapid number changes—recommend 0.5x gesture replay."
  }
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "analytics" | "students" | "progress" | "rn" | "settings"
  const [selectedStudent, setSelectedStudent] = useState(null); // For Profile drawer
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Selected student for AccessAI Student Drilldown
  const [drilldownStudentKey, setDrilldownStudentKey] = useState("active-student-session");
  const [interventionToast, setInterventionToast] = useState(null);

  // ── RN (Realtime Network) State ──
  const [rnConnected, setRnConnected] = useState(false);
  const [rnMessages, setRnMessages] = useState([]);
  const [rnBroadcastText, setRnBroadcastText] = useState("");
  const [rnParticipants, setRnParticipants] = useState([]);
  const channelRef = useRef(null);

  // Fetch student records from Supabase / Local storage
  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    try {
      let fetchedList = [];

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .neq("role", "teacher");
        if (!error && Array.isArray(data) && data.length > 0) {
          fetchedList = data.map((p) => ({
            id: p.id,
            name: p.name || p.full_name || p.email?.split("@")[0] || "Registered Student",
            email: p.email || "student@accessai.edu",
            mode: p.disability_type || p.disabilityType || "deaf",
            enrolledCourses: p.enrolled_courses || 2,
            progress: p.progress || 0,
            assessmentScore: p.assessment_score || "Pending",
            lastActive: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Active today"
          }));
        }
      } catch (err) {}

      // Fallback demo students
      const demoDefaults = [
        {
          id: "active-student-session",
          name: "Vrusha Goyal",
          email: "goyalvrusha@gmail.com",
          mode: "deaf",
          enrolledCourses: 3,
          progress: 82,
          assessmentScore: "94%",
          lastActive: "Active now"
        },
        {
          id: "student-aman-blind",
          name: "Aman Halkude",
          email: "amanhalkude7750+blind@gmail.com",
          mode: "blind",
          enrolledCourses: 4,
          progress: 76,
          assessmentScore: "88%",
          lastActive: "Active today"
        },
        {
          id: "student-aarav-motor",
          name: "Aarav Patel",
          email: "aarav.patel@accessai.edu",
          mode: "motor",
          enrolledCourses: 2,
          progress: 68,
          assessmentScore: "85%",
          lastActive: "Active 2h ago"
        },
        {
          id: "student-priya-deaf",
          name: "Priya Sharma",
          email: "priya.sharma@accessai.edu",
          mode: "deaf",
          enrolledCourses: 3,
          progress: 90,
          assessmentScore: "96%",
          lastActive: "Active yesterday"
        }
      ];

      for (const d of demoDefaults) {
        if (!fetchedList.some((s) => s.name === d.name)) {
          fetchedList.push(d);
        }
      }

      setStudents(fetchedList);
    } catch (err) {
      console.warn("Could not fetch students:", err);
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Initialize Realtime Network
  useEffect(() => {
    const channel = new MeetingChannel("accessai-classroom-main", {
      id: user?.uid || user?.id || "teacher-host",
      name: user?.displayName || user?.user_metadata?.name || "Teacher / Host",
      mode: "teacher",
      role: "Teacher / Host"
    });

    channelRef.current = channel;
    setRnConnected(true);
    setRnParticipants(channel.getParticipants());

    const unsubscribe = channel.onMessage((incoming) => {
      setRnMessages((prev) => [...prev, incoming]);
    });

    return () => {
      unsubscribe();
      channel.destroy();
    };
  }, [user]);

  const handleSendBroadcast = (e) => {
    if (e) e.preventDefault();
    if (!rnBroadcastText.trim() || !channelRef.current) return;

    channelRef.current.sendTextMessage(rnBroadcastText.trim(), {
      senderMode: "teacher",
      senderName: user?.displayName || "Instructor",
      isTeacherAnnouncement: true
    });

    setRnBroadcastText("");
  };

  const handleSendIntervention = (item) => {
    if (channelRef.current) {
      channelRef.current.sendTextMessage(
        `[Personal Guidance for ${item.studentName}]: ${item.aiRecommendation}`,
        { senderMode: "teacher", isIntervention: true }
      );
    }
    // Feature 3: Persist pedagogical intervention in Meko so student agents recall it
    MekoService.writeMemory(
      "accessai-runtime",
      `[Teacher Intervention] For ${item.studentName} (${item.mode} mode) on ${item.topic}: ${item.aiRecommendation}`,
      "teacher_intervention"
    );
    setInterventionToast(`Intervention sent to ${item.studentName} & synchronized to Meko!`);
    setTimeout(() => setInterventionToast(null), 4000);
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  const teacherName = user?.displayName || user?.user_metadata?.name || "Prof. Ananya Rao";
  const teacherEmail = user?.email || "teacher@accessai.edu";
  const teacherSubject = user?.user_metadata?.subject || "Inclusive Digital Learning & Accessibility";

  const activeStudentProfile = DETAILED_STUDENT_PROFILES[drilldownStudentKey] || DETAILED_STUDENT_PROFILES["active-student-session"];

  return (
    <div className="h-screen max-h-screen w-full flex overflow-hidden bg-[#f7f9fb] text-[#191c1e] font-sans selection:bg-[#0866F5] selection:text-white">
      {/* ════════════════════════════════════════════════════════════════
          COLUMN 1: LEFT SIDEBAR NAVIGATION (240px wide, identical to student dashboards)
          ════════════════════════════════════════════════════════════════ */}
      <aside className="w-[240px] border-r border-[#E2EDF8] bg-white flex flex-col justify-between sticky top-0 h-screen z-40 flex-shrink-0 overflow-y-auto">
        <div className="p-3">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#0866F5] text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <SparkleIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col cursor-pointer min-w-0" onClick={() => navigate("/teacher")}>
              <span className="text-lg font-black text-[#10265C] tracking-tight leading-none truncate">AccessAI</span>
              <span className="text-[8px] font-black uppercase tracking-wider text-[#0866F5] mt-0.5 truncate">
                TEACHER & EDUCATOR STUDIO
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {[
              { id: "overview", label: "Overview & Studio", icon: "home" },
              { id: "analytics", label: "Student Analysis (AI)", icon: "monitoring" },
              { id: "students", label: "Student Roster", icon: "school" },
              { id: "progress", label: "Curriculum & Mastery", icon: "assessment" },
              { id: "meeting", label: "Live Meeting Room", icon: "video_camera_front" },
              { id: "rn", label: "Realtime Network (RN)", icon: "podcasts" },
              { id: "blockchain", label: "MST Credential Verifier", icon: "verified_user" }
            ].map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "meeting") {
                      navigate("/teacher/meeting/accessai-room-402");
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`w-full h-[38px] flex items-center gap-2.5 px-3 py-1 rounded-xl text-left text-xs font-semibold transition-all flex-shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#0866F5] text-white shadow-xs font-bold"
                      : "text-slate-700 hover:text-[#10265C] hover:bg-slate-100"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined !text-lg ${isSelected ? "text-white" : "text-[#0866F5]"}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Meeting Shortcut Banner */}
          <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Class Ready</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed mb-2.5">
              Broadcast teacher video & auto-transcribe speech to student captions.
            </p>
            <button
              onClick={() => navigate("/teacher/meeting/accessai-room-402")}
              className="w-full py-1.5 rounded-lg bg-[#10b981] hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined !text-sm">video_call</span>
              <span>Launch Studio</span>
            </button>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0866F5] to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                AR
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate leading-tight">{teacherName}</span>
                <span className="text-[10px] text-slate-500 truncate">{teacherEmail}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <span className="material-symbols-outlined !text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          COLUMN 2: MAIN SCROLLABLE WORKSPACE
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex justify-between items-center px-6 md:px-8 h-16 bg-white border-b border-slate-200/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-extrabold text-[#10265C] tracking-tight">
              {activeTab === "overview" && "Educator Overview & Classroom Hub"}
              {activeTab === "analytics" && "AccessAI Student Diagnostic & Cognitive Intelligence"}
              {activeTab === "students" && "Enrolled Student Roster & Accommodation Profiles"}
              {activeTab === "progress" && "Curriculum Modules & Assessment Mastery"}
              {activeTab === "rn" && "Classroom Realtime Network (RN) Broadcast"}
              {activeTab === "blockchain" && "MST Blockchain Credential Ledger"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
              Live Session Active
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {interventionToast && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-fadeIn">
                ✓ {interventionToast}
              </span>
            )}

            <button
              onClick={() => navigate("/teacher/meeting/accessai-room-402")}
              className="px-3.5 py-1.5 rounded-xl bg-[#10b981] hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined !text-base">video_call</span>
              <span className="hidden sm:inline">Start Live Meeting</span>
            </button>

            <LanguageSelector compact={true} />
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* ══════════════════════════════════════════════════════════════
              TAB: OVERVIEW
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Hero Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-7 md:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="relative z-10 max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0866F5]/30 text-sky-300 border border-[#0866F5]/50 text-[10px] font-bold tracking-wide uppercase">
                      Educator Studio
                    </span>
                    <span className="text-xs text-slate-300">• {teacherSubject}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    Welcome back, {teacherName}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    AccessAI unified instructor hub. Monitor multi-modal accessibility cohorts across Deaf (Sign/Captions), Blind (Voice), and Motor (Head-Tracking) modes, and broadcast real-time lessons.
                  </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 flex-wrap">
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className="px-4 py-2.5 rounded-xl bg-[#0866F5] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs md:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-lg">monitoring</span>
                    <span>Student Analytics</span>
                  </button>
                  <button
                    onClick={() => navigate("/teacher/meeting/accessai-room-402")}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 text-white font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-lg">video_call</span>
                    <span>Launch Live Meeting</span>
                  </button>
                </div>
              </div>

              {/* Top Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0866F5] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined !text-2xl">group</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cohort</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">{students.length} Students</h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#16a34a] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined !text-2xl">trending_up</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Progress</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                      {students.length > 0
                        ? `${Math.round(students.reduce((acc, s) => acc + (s.progress || 0), 0) / students.length)}%`
                        : "82%"}
                    </h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined !text-2xl">psychology</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Health Index</p>
                    <h3 className="text-2xl font-black text-purple-700 mt-0.5">94.2% Optimal</h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined !text-2xl">verified</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blockchain Ledger</p>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">MST Testnet Live</h3>
                  </div>
                </div>
              </div>

              {/* Overview 2-Col Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Recent Student Activity */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Enrolled Students Quick Review</h3>
                      <p className="text-xs text-slate-500">Current learners active in inclusive courses.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("students")}
                      className="text-xs font-bold text-[#0866F5] hover:underline cursor-pointer"
                    >
                      View Full Roster →
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {students.slice(0, 4).map((s) => (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0866F5] font-bold text-xs flex items-center justify-center">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">{s.name}</span>
                            <span className="text-[11px] text-slate-500">{s.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {s.mode === "deaf" ? "🤟 Deaf Mode" : s.mode === "blind" ? "🎙️ Blind Mode" : "🎯 Motor Mode"}
                          </span>
                          <span className="text-xs font-extrabold text-[#0866F5]">{s.progress}%</span>
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0866F5] hover:text-white text-[11px] font-bold text-slate-700 transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 1 Col: Quick RN Broadcast */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#0866F5] !text-xl">podcasts</span>
                      <h3 className="text-base font-bold text-slate-900">Instant Classroom Broadcast</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Send a high-priority announcement to all student devices across WebSockets and BroadcastChannel.
                    </p>

                    <form onSubmit={handleSendBroadcast} className="mt-3 flex flex-col gap-2.5">
                      <textarea
                        rows={3}
                        value={rnBroadcastText}
                        onChange={(e) => setRnBroadcastText(e.target.value)}
                        placeholder="Type class announcement..."
                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0866F5] text-xs font-medium resize-none outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!rnBroadcastText.trim()}
                        className="w-full py-2 rounded-xl bg-[#0866F5] hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                      >
                        Send Announcement
                      </button>
                    </form>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>RN Peers Active:</span>
                    <span className="font-bold text-emerald-600">{rnParticipants.length} Connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: ACCESSAI STUDENT ANALYSIS & DIAGNOSTICS SUITE
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === "analytics" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Header Info */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0866F5] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                      AccessAI Cognitive Engine
                    </span>
                    <span className="text-xs font-bold text-slate-500">• Multi-Modal Telemetry</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Student Cognitive Diagnostics & Friction Analysis
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time monitoring of sign recognition accuracy, auditory focus, and automated intervention detection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setInterventionToast("Exported PDF Diagnostic Report!");
                      setTimeout(() => setInterventionToast(null), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined !text-base">download</span>
                    <span>Export Analysis</span>
                  </button>
                </div>
              </div>

              {/* Modality Telemetry Cards (AccessAI 3-Way Multi-Modal Comparison) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {ACCESSAI_COHORT_METRICS.modalities.map((mod) => (
                  <div key={mod.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                            <span className="material-symbols-outlined !text-lg">{mod.icon}</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{mod.label}</h4>
                            <span className="text-[10px] text-slate-400">{mod.count} Active Learners</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          {mod.retentionScore}% Retention
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">{mod.primaryMetricName}:</span>
                          <span className="font-extrabold text-[#0866F5]">{mod.primaryMetricVal}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Hold / Dwell Pacing:</span>
                          <span className="font-bold text-slate-800">{mod.avgHoldStabilization}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">Fatigue Risk Index:</span>
                          <span className="font-bold text-emerald-600">{mod.visualFatigue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Captions Reliance:</span>
                      <span className="font-bold text-slate-700">{mod.captionRate}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-Time Intervention Queue (Actionable AI Triage) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 !text-xl">warning</span>
                    <h3 className="text-base font-bold text-slate-900">
                      AccessAI Active Friction & Intervention Queue ({ACCESSAI_COHORT_METRICS.interventionQueue.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">Automated choke-point detection</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACCESSAI_COHORT_METRICS.interventionQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>{item.studentName}</span>
                            <span className="text-[10px] font-normal text-slate-500">({item.mode} mode)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {item.severity} Friction
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800">{item.topic}</p>
                        <p className="text-[11px] text-amber-800 mt-0.5 font-medium">⚠️ {item.struggleTime}</p>
                        <p className="text-xs text-slate-600 mt-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                          <strong>AI Diagnosis:</strong> {item.aiRecommendation}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                        <button
                          onClick={() => handleSendIntervention(item)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0866F5] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined !text-sm">send</span>
                          <span>Send 1-Click Guidance</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Drill-Down Diagnostic Telemetry */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col gap-5">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Student Telemetry & Sign Heatmap Drill-Down</h3>
                    <p className="text-xs text-slate-500">Deep telemetry on hand articulation, voice pace, and blockchain awards.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Inspecting:</span>
                    <select
                      value={drilldownStudentKey}
                      onChange={(e) => setDrilldownStudentKey(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="active-student-session">Vrusha Goyal (Deaf Mode)</option>
                    </select>
                  </div>
                </div>

                {/* 2-Col Telemetry */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 Cols: Gesture Accuracy Matrix */}
                  <div className="lg:col-span-7 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Gesture Recognition Accuracy Heatmap
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {activeStudentProfile.signAccuracyHeatmap.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-center flex flex-col justify-between gap-1 ${
                            item.accuracy >= 95
                              ? "bg-emerald-50/60 border-emerald-200"
                              : item.accuracy >= 85
                              ? "bg-blue-50/60 border-blue-200"
                              : "bg-amber-50/60 border-amber-200"
                          }`}
                        >
                          <span className="text-[10px] text-slate-600 font-bold truncate">{item.sign}</span>
                          <span className="text-base font-black text-slate-900">{item.accuracy}%</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              item.accuracy >= 95 ? "text-emerald-700" : item.accuracy >= 85 ? "text-blue-700" : "text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 mt-1 leading-relaxed">
                      <strong>AI Educator Insight:</strong> {activeStudentProfile.aiNotes}
                    </div>
                  </div>

                  {/* Right 5 Cols: Accommodation & Credentials */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Learner Accommodations & Blockchain Proof
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between">
                        <span className="text-slate-500">Preferred Captions:</span>
                        <span className="font-bold text-slate-800">{activeStudentProfile.accommodations.captions}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between">
                        <span className="text-slate-500">Pacing / Voice Rate:</span>
                        <span className="font-bold text-slate-800">{activeStudentProfile.accommodations.speed}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between">
                        <span className="text-slate-500">Active Input Pipeline:</span>
                        <span className="font-bold text-slate-800">{activeStudentProfile.accommodations.input}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Anchored MST Blockchain Credentials:</span>
                      {activeStudentProfile.blockchainCerts.map((c, i) => (
                        <div key={i} className="p-2 rounded-lg bg-sky-50 border border-sky-100 flex justify-between items-center text-[10px]">
                          <span className="font-bold text-sky-900">{c.name}</span>
                          <span className="font-mono text-slate-500">{c.hash}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: STUDENTS (Roster Table)
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === "students" && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Enrolled Student Directory</h2>
                  <p className="text-xs text-slate-500">
                    Inspect student profiles, accommodation settings, and individual learning progress.
                  </p>
                </div>
                <button
                  onClick={fetchStudents}
                  disabled={isLoadingStudents}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <span className={`material-symbols-outlined !text-sm ${isLoadingStudents ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                  <span>Refresh List</span>
                </button>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-4">Accommodation Mode</th>
                        <th className="py-3.5 px-4">Courses</th>
                        <th className="py-3.5 px-4">Progress</th>
                        <th className="py-3.5 px-4">Assessment</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0866F5] font-bold flex items-center justify-center text-xs shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{student.name}</span>
                                <span className="text-xs text-slate-400">{student.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {student.mode === "deaf" ? (
                              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1">
                                <span>🤟</span> Deaf / Sign Mode
                              </span>
                            ) : student.mode === "blind" ? (
                              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0866F5] border border-blue-200 text-xs font-semibold inline-flex items-center gap-1">
                                <span>🎙️</span> Blind / Voice Mode
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold inline-flex items-center gap-1">
                                <span>🎯</span> Motor / Hands-Free
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-800">
                            {student.enrolledCourses} Enrolled
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#0866F5] h-full rounded-full transition-all"
                                  style={{ width: `${student.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{student.progress}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              {student.assessmentScore}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                            {student.lastActive}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0866F5] hover:text-white text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: PROGRESS & CURRICULUM
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === "progress" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#0866F5] !text-2xl">menu_book</span>
                  <h3 className="text-lg font-bold text-slate-900">Curriculum Modules & Competency</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Track how students across different accessibility accommodations perform on each unit.
                </p>

                <div className="space-y-4 mt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-800">1. Web Accessibility (WCAG 2.2 AAA Standards)</span>
                      <span className="text-xs font-bold text-emerald-600">84% Mastery</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#10b981] h-full rounded-full" style={{ width: "84%" }} />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Full Voice Reader & High Contrast compatibility verified.</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-800">2. Real-Time Sign Language Recognition (ISL / ASL)</span>
                      <span className="text-xs font-bold text-[#0866F5]">76% Mastery</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0866F5] h-full rounded-full" style={{ width: "76%" }} />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">3D Avatar visual feedback & camera gesture tracking active.</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-800">3. Hands-Free Head Tracking & Dwell Click Navigation</span>
                      <span className="text-xs font-bold text-amber-600">65% Mastery</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: "65%" }} />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Sensitivity calibration & adaptive click timing applied.</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#10b981] !text-2xl">verified_user</span>
                  <h3 className="text-lg font-bold text-slate-900">MST Blockchain Assessment Verification</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  When students complete practical assessments, certificates are cryptographically signed and anchored to the MST Blockchain smart contracts for tamper-proof verification.
                </p>

                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                    <span>Smart Contract Network:</span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-sky-200">MST Testnet (0x4a7...9f1)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                    <span>Tamper Protection:</span>
                    <span className="text-emerald-700 font-bold">SHA-256 Merkle Anchored</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                    <span>Public Verifier:</span>
                    <button
                      onClick={() => navigate("/verify")}
                      className="text-[#0866F5] hover:underline cursor-pointer font-bold text-xs"
                    >
                      Open MST Credential Verifier →
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Assessment Records Synced</span>
                  <span className="font-semibold text-slate-700">Live DB Connection</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: REALTIME NETWORK (RN)
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === "rn" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Video Studio Launch */}
              <div className="lg:col-span-3 bg-gradient-to-r from-emerald-900 to-slate-900 rounded-3xl p-6 md:p-7 border border-emerald-500/30 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <span className="material-symbols-outlined !text-3xl">video_camera_front</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white tracking-wide">
                        Accessible Video Classroom Studio
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                        WebRTC + Live Captions
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Host a real-time video lecture with WebRTC video streaming. Your live speech is automatically transcribed into captions on student screens.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/teacher/meeting/accessai-room-402")}
                  className="px-6 py-3 rounded-2xl bg-[#10b981] hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs md:text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined !text-lg">video_call</span>
                  <span>Launch Video Meeting</span>
                </button>
              </div>

              {/* RN Announcement Form */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center">
                      <span className="material-symbols-outlined !text-xl">broadcast_on_home</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Realtime Network (RN) Broadcast</h3>
                      <p className="text-xs text-slate-500">Instant synchronization with all active student tabs.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{rnConnected ? "RN Connected" : "Connecting..."}</span>
                  </span>
                </div>

                <form onSubmit={handleSendBroadcast} className="mt-2 flex flex-col gap-3">
                  <textarea
                    rows={3}
                    value={rnBroadcastText}
                    onChange={(e) => setRnBroadcastText(e.target.value)}
                    placeholder="Compose announcement to all students via RN..."
                    className="w-full p-4 rounded-2xl border border-slate-200 focus:border-[#0866F5] text-xs font-medium resize-none outline-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">BroadcastChannel + Supabase Realtime active</span>
                    <button
                      type="submit"
                      disabled={!rnBroadcastText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#0866F5] hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Broadcast via RN
                    </button>
                  </div>
                </form>

                {/* Message Log */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live RN Message Feed</h4>
                  {rnMessages.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No messages sent yet in this session.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {rnMessages.map((msg, idx) => (
                        <div key={msg.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[#0866F5]">{msg.senderName || "Teacher"}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostics Box */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3">RN Diagnostics</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between">
                      <span className="text-slate-500">Classroom Channel:</span>
                      <span className="font-mono font-bold text-slate-800">accessai-classroom-main</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between">
                      <span className="text-slate-500">Teacher Role:</span>
                      <span className="font-bold text-emerald-700">Host (isHost: true)</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between">
                      <span className="text-slate-500">Active RN Peers:</span>
                      <span className="font-bold text-slate-800">{rnParticipants.length} Connected</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/teacher/meeting/accessai-room-402")}
                  className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Enter Live Classroom
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: BLOCKCHAIN
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === "blockchain" && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col gap-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined !text-2xl">verified_user</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">MST Blockchain Credential Ledger</h2>
                  <p className="text-xs text-slate-500">Tamper-proof academic achievements verified on-chain.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col gap-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Contract Address:</span>
                  <span className="font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-800">
                    0x4a7E298d022B8C4F1A527f32489C82312d6E19f1
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Consensus Engine:</span>
                  <span className="font-bold text-emerald-600">MST Proof-of-Authority (PoA)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Total Credentials Minted:</span>
                  <span className="font-bold text-slate-900">128 On-Chain Verified Certificates</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => navigate("/verify")}
                  className="px-5 py-2.5 rounded-xl bg-[#0866F5] hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined !text-base">verified</span>
                  <span>Open Public MST Verifier Portal</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Meko Context Inspector ── */}
      <MekoContextInspector studentDatapackId="student-voice-memory" sharedDatapackId="course-python-shared" buildDatapackId="accessai-build" />

      {/* ── Student Profile Drawer ── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 md:p-8 animate-fadeIn relative">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#0866F5] font-extrabold text-xl flex items-center justify-center shrink-0">
                {selectedStudent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-500">{selectedStudent.email}</p>
                <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0866F5] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                  Mode: {selectedStudent.mode}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Active Course Progress:</span>
                <span className="text-sm font-extrabold text-[#0866F5]">{selectedStudent.progress}%</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Assessment Score:</span>
                <span className="text-sm font-extrabold text-emerald-600">{selectedStudent.assessmentScore}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Blockchain Credential:</span>
                <span className="font-semibold text-slate-800">MST Anchored ✓</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Last Activity:</span>
                <span className="font-semibold text-slate-700">{selectedStudent.lastActive}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
