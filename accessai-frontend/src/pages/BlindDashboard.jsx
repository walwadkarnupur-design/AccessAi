import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useVoiceAssistant } from "../hooks/useVoice";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "../components/LanguageSelector";
import MekoService from "../services/meko";
import MekoContextInspector from "../components/MekoContextInspector";

const COURSES = [
  {
    id: "course-1",
    title: "Introduction to Python Programming",
    description: "Learn Python variables, control flow, functions, and logic purely with voice.",
    category: "programming",
    duration: "1h 30m",
    lessons: [
      {
        id: "l1",
        title: "Variables and Data Types",
        content: "In Python, variables store data. You do not need to declare types. For example, x equals 5 or name equals Rohan.",
        summary: "Variables store numbers, strings, and booleans without type declarations."
      },
      {
        id: "l2",
        title: "Functions and the 'def' Keyword",
        content: "Functions are reusable blocks of code. You define them using the 'def' keyword followed by parentheses and a colon.",
        summary: "Use 'def' to create functions and indent the function body."
      }
    ],
    quiz: {
      question: "Which keyword is used to define a function in Python?",
      options: ["function", "def", "func", "define"],
      answer: "def",
      explanation: "In Python, 'def' stands for define and is required to create a function."
    }
  },
  {
    id: "course-2",
    title: "Web Accessibility & Screen Readers",
    description: "Master ARIA landmarks, semantic HTML, and live region announcements.",
    category: "accessibility",
    duration: "2h 00m",
    lessons: [
      {
        id: "l1",
        title: "Semantic HTML Elements",
        content: "Semantic tags like header, main, and nav give screen readers structured cues without extra code.",
        summary: "Use native HTML elements before resorting to custom ARIA attributes."
      }
    ],
    quiz: {
      question: "Which HTML tag is used for the main unique content of a webpage?",
      options: ["header", "div", "main", "section"],
      answer: "main",
      explanation: "The 'main' landmark represents the central content of the document."
    }
  }
];

export default function BlindDashboard() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const {
    speak,
    stop,
    agentState,
    registerContext,
    transcript,
    listening,
    setTranscript
  } = useVoiceAssistant();

  const [mekoEnabled, setMekoEnabled] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [quizActive, setQuizActive] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState("");
  const [recalledContextSummary, setRecalledContextSummary] = useState("");
  const [lastAction, setLastAction] = useState("");

  const studentDatapackId = `student-${user?.uid || "voice"}-memory`;
  const sharedDatapackId = "course-python-shared";

  // ── Meko Context Recall Before Reasoning (A1, A2 Requirement) ──
  const performMekoRecall = useCallback(() => {
    if (!mekoEnabled) {
      setRecalledContextSummary("Meko is OFF: Generic amnesic mode. No past history recalled.");
      return [];
    }

    const studentMems = MekoService.recallContext(studentDatapackId);
    const sharedMems = MekoService.recallContext(sharedDatapackId);

    const summaryParts = [];
    if (studentMems.length > 0) {
      summaryParts.push(`Recalled ${studentMems.length} private student memories.`);
    }
    if (sharedMems.length > 0) {
      summaryParts.push(`Recalled ${sharedMems.length} shared class mnemonics.`);
    }
    setRecalledContextSummary(summaryParts.join(" ") || "No prior memories found.");
    return { studentMems, sharedMems };
  }, [mekoEnabled, studentDatapackId, sharedDatapackId]);

  // Initial Meko Welcome
  useEffect(() => {
    const { studentMems, sharedMems } = performMekoRecall() || {};
    let greeting = `Welcome to AccessAI Voice Tutor, ${user?.displayName || "Student"}. `;

    if (mekoEnabled && studentMems && studentMems.length > 0) {
      greeting += `Meko Context Active: I remember you prefer deliberate syntax pacing. Say 'Start Lesson', 'Quiz', or 'Next Lesson' at any time.`;
    } else {
      greeting += `Say 'Start Lesson' or 'Take Quiz' to begin.`;
    }

    const timer = setTimeout(() => {
      speak(greeting);
    }, 800);
    return () => clearTimeout(timer);
  }, [mekoEnabled]);

  // ── Conversational Voice Commands Engine ──
  useEffect(() => {
    const unregister = registerContext("BLIND_DASHBOARD_VOICE_ROOT", (spokenText) => {
      setTranscript(spokenText);
      const text = spokenText.toLowerCase().trim();
      setLastAction(`Heard: "${spokenText}"`);

      // 1. Play / Start Lesson
      if (text.includes("start lesson") || text.includes("read lesson") || text.includes("play")) {
        const lesson = selectedCourse.lessons[currentLessonIdx];
        let speech = `Reading Lesson ${currentLessonIdx + 1}: ${lesson.title}. ${lesson.content}`;

        // Inject Meko shared mnemonic if Meko is ON
        if (mekoEnabled) {
          const shared = MekoService.recallContext(sharedDatapackId, "def");
          if (shared.length > 0) {
            speech += ` Here is a promoted tip from class: ${shared[0].text}`;
          }
        }
        speak(speech);
      }
      // 2. Next Lesson
      else if (text.includes("next lesson") || text.includes("next")) {
        if (currentLessonIdx < selectedCourse.lessons.length - 1) {
          setCurrentLessonIdx(prev => prev + 1);
          const nextLesson = selectedCourse.lessons[currentLessonIdx + 1];
          speak(`Switched to Lesson ${currentLessonIdx + 2}: ${nextLesson.title}. Say 'Start Lesson' to listen.`);
        } else {
          speak("You have reached the end of the lessons for this course. Say 'Take Quiz' to test your knowledge.");
        }
      }
      // 3. Repeat
      else if (text.includes("repeat") || text.includes("again")) {
        const lesson = selectedCourse.lessons[currentLessonIdx];
        speak(`Repeating ${lesson.title}: ${lesson.content}`);
      }
      // 4. Start Quiz
      else if (text.includes("quiz") || text.includes("test")) {
        setQuizActive(true);
        const q = selectedCourse.quiz;
        speak(`Quiz Question: ${q.question}. Options are: ${q.options.join(", ")}. Speak your answer.`);
      }
      // 5. Quiz Answers Handling
      else if (quizActive) {
        const q = selectedCourse.quiz;
        const answer = q.answer.toLowerCase();

        if (text.includes(answer)) {
          const successMsg = `Correct! ${q.explanation}. Outstanding work!`;
          setQuizFeedback("Correct! You mastered this question.");
          speak(successMsg);

          // Write successful mastery to Meko
          if (mekoEnabled) {
            MekoService.writeMemory(
              studentDatapackId,
              `Mastered quiz question on Python '${answer}' keyword with voice.`,
              "quiz_mastery"
            );
            performMekoRecall();
          }
          setQuizActive(false);
        } else if (text.includes("function") || text.includes("func") || text.includes("define")) {
          const feedback = `That was close, but incorrect. In Python, the keyword is specifically 'def'. Let me save this so we can review later.`;
          setQuizFeedback("Incorrect. Remember: In Python it is 'def'.");
          speak(feedback);

          // Write struggle to Meko
          if (mekoEnabled) {
            MekoService.writeMemory(
              studentDatapackId,
              `Struggled with Python keyword: answered '${spokenText}' instead of 'def'.`,
              "learning_misconception"
            );
            performMekoRecall();
          }
        }
      }
      // 6. Switch Course
      else if (text.includes("python")) {
        setSelectedCourse(COURSES[0]);
        setCurrentLessonIdx(0);
        speak("Selected Python Programming. Say 'Start Lesson' to listen.");
      } else if (text.includes("accessibility") || text.includes("web")) {
        setSelectedCourse(COURSES[1]);
        setCurrentLessonIdx(0);
        speak("Selected Web Accessibility Course. Say 'Start Lesson' to listen.");
      }
    }, true);

    return () => unregister();
  }, [registerContext, selectedCourse, currentLessonIdx, quizActive, mekoEnabled, performMekoRecall, speak, setTranscript]);

  const handleLessonAudio = (lesson) => {
    speak(`Lesson ${currentLessonIdx + 1}: ${lesson.title}. ${lesson.content}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans flex flex-col justify-between p-6 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xl shadow-lg">
            🎙️
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AccessAI <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono">Voice Mode</span>
            </h1>
            <p className="text-xs text-gray-400">Adaptive Audio Learning Powered by Meko Shared Context</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => setMekoEnabled(!mekoEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              mekoEnabled
                ? "bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900"
                : "bg-red-950/80 border-red-700 text-red-300 hover:bg-red-900"
            }`}
          >
            Meko Context: {mekoEnabled ? "ON (Adaptive)" : "OFF (Amnesic)"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="my-8 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Voice Status & Context Feedback */}
        <div className="md:col-span-1 bg-gray-900/70 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Voice Status</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              listening ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${listening ? "bg-emerald-400 animate-ping" : "bg-gray-500"}`} />
              {listening ? "Listening" : "Idle"}
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-gray-800/80 flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Live Voice Transcript</span>
            <p className="text-sm font-mono text-indigo-300 min-h-[40px]">
              {transcript || (listening ? "Say 'Start Lesson', 'Next', or 'Take Quiz'..." : "Voice inactive")}
            </p>
          </div>

          <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl flex flex-col gap-1">
            <span className="text-[10px] text-indigo-400 uppercase tracking-wide font-bold">Meko Active Context</span>
            <p className="text-xs text-gray-300 leading-relaxed">
              {recalledContextSummary}
            </p>
          </div>

          <div className="text-[11px] text-gray-400 flex flex-col gap-1 border-t border-gray-800 pt-3">
            <span className="font-semibold text-gray-300">Voice Navigation Shortcuts:</span>
            <span>• "Start Lesson" / "Play"</span>
            <span>• "Next Lesson" / "Repeat"</span>
            <span>• "Take Quiz"</span>
            <span>• "Stop" (Barge-in interrupt)</span>
          </div>
        </div>

        {/* Right Column: Active Course & Audio Lesson Player */}
        <div className="md:col-span-2 bg-gray-900/70 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Current Course</span>
                <h2 className="text-xl font-bold text-white">{selectedCourse.title}</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                Lesson {currentLessonIdx + 1} of {selectedCourse.lessons.length}
              </span>
            </div>

            {/* Current Lesson Box */}
            <div className="p-5 rounded-xl bg-gray-800/60 border border-gray-700/60 flex flex-col gap-3">
              <h3 className="text-lg font-semibold text-indigo-200">
                {selectedCourse.lessons[currentLessonIdx]?.title}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {selectedCourse.lessons[currentLessonIdx]?.content}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleLessonAudio(selectedCourse.lessons[currentLessonIdx])}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  🔊 Read Out Loud
                </button>
                <button
                  onClick={() => stop()}
                  className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold transition-all"
                >
                  ⏹ Stop Speaking
                </button>
              </div>
            </div>

            {/* Interactive Audio Quiz Card */}
            <div className="mt-6 p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-purple-400">Audio Quiz Section</span>
                <span className="text-xs text-gray-400">Speak answer or click</span>
              </div>
              <p className="text-sm font-semibold text-gray-200">
                {selectedCourse.quiz.question}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {selectedCourse.quiz.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (opt === selectedCourse.quiz.answer) {
                        setQuizFeedback("Correct! Mastered.");
                        speak(`Correct! ${selectedCourse.quiz.explanation}`);
                        if (mekoEnabled) {
                          MekoService.writeMemory(studentDatapackId, `Mastered Python keyword: ${opt}`, "quiz_mastery");
                          performMekoRecall();
                        }
                      } else {
                        setQuizFeedback(`Incorrect. Remember it is '${selectedCourse.quiz.answer}'.`);
                        speak(`That was incorrect. In Python, the keyword is def.`);
                        if (mekoEnabled) {
                          MekoService.writeMemory(studentDatapackId, `Selected wrong option: ${opt}`, "learning_misconception");
                          performMekoRecall();
                        }
                      }
                    }}
                    className="p-2 text-xs font-mono rounded-lg bg-gray-800 hover:bg-indigo-900/40 border border-gray-700 text-gray-300 hover:text-white transition-all text-center"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {quizFeedback && (
                <p className="text-xs font-semibold text-emerald-400 mt-2 bg-emerald-950/40 p-2 rounded border border-emerald-800">
                  {quizFeedback}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800 text-xs text-gray-400">
            <span>Student: <strong>{user?.displayName || "Rohan Verma"}</strong></span>
            <span>Switch course: Say <em>"Select Python"</em> or <em>"Select Web Accessibility"</em></span>
          </div>
        </div>
      </main>

      {/* Floating Meko Context Inspector (Requirement A4) */}
      <MekoContextInspector
        studentDatapackId={studentDatapackId}
        sharedDatapackId={sharedDatapackId}
        mekoEnabled={mekoEnabled}
        onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
      />

      <footer className="text-center text-xs text-gray-600 border-t border-gray-900 pt-4">
        AccessAI for hackCBS 9.0 • Powered by Meko Shared Context Layer • Track A
      </footer>
    </div>
  );
}
