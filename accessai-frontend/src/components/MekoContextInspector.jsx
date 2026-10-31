import React, { useState, useEffect } from "react";
import MekoService from "../services/meko";

export default function MekoContextInspector({ 
  studentDatapackId = "student-voice-memory",
  sharedDatapackId = "course-python-shared",
  buildDatapackId = "accessai-build",
  mekoEnabled = true,
  onToggleMeko
}) {
  const [studentMemories, setStudentMemories] = useState([]);
  const [sharedKnowledge, setSharedKnowledge] = useState([]);
  const [buildDecisions, setBuildDecisions] = useState([]);
  const [activeTab, setActiveTab] = useState("build"); // Default to build decisions
  const [isOpen, setIsOpen] = useState(false);

  const refreshContext = () => {
    setStudentMemories(MekoService.getDatapack(studentDatapackId));
    setSharedKnowledge(MekoService.getDatapack(sharedDatapackId));
    setBuildDecisions(MekoService.getDatapack(buildDatapackId));
  };

  useEffect(() => {
    refreshContext();
  }, [studentDatapackId, sharedDatapackId, buildDatapackId, mekoEnabled]);

  const handleForget = (id) => {
    MekoService.forgetMemory(studentDatapackId, id);
    refreshContext();
  };

  const handlePromote = (id) => {
    MekoService.promoteToShared(studentDatapackId, id, sharedDatapackId);
    refreshContext();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold shadow-lg transition-all ${
            mekoEnabled 
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30" 
              : "bg-gray-700 hover:bg-gray-800 text-gray-300"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Meko Context Layer</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/20 font-mono">
            {mekoEnabled ? "ON" : "OFF"}
          </span>
        </button>
      ) : (
        <div className="w-[420px] max-w-[95vw] bg-gray-900 border border-gray-700 text-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-800/80 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-indigo-400">MEKO CONTEXT LAYER</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold">
                Check T Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleMeko}
                title="Toggle Meko to see how agent behaves with memory ON vs OFF"
                className={`text-xs px-2 py-1 rounded font-bold transition-all ${
                  mekoEnabled ? "bg-emerald-600 text-white" : "bg-red-600/80 text-white"
                }`}
              >
                Meko: {mekoEnabled ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white text-lg leading-none p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Subheader / 3 Tabs */}
          <div className="grid grid-cols-3 text-xs border-b border-gray-800 bg-gray-900/50">
            <button
              onClick={() => setActiveTab("build")}
              className={`py-2 text-center font-bold transition-all ${
                activeTab === "build"
                  ? "border-b-2 border-indigo-500 text-indigo-400 bg-gray-800/40"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Build Decisions ({buildDecisions.length})
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`py-2 text-center font-medium transition-all ${
                activeTab === "student"
                  ? "border-b-2 border-indigo-500 text-indigo-400 bg-gray-800/40"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Student ({studentMemories.length})
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`py-2 text-center font-medium transition-all ${
                activeTab === "shared"
                  ? "border-b-2 border-indigo-500 text-indigo-400 bg-gray-800/40"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Shared ({sharedKnowledge.length})
            </button>
          </div>

          {/* Body */}
          <div className="p-3 max-h-80 overflow-y-auto space-y-2.5 text-xs custom-scrollbar">
            {!mekoEnabled ? (
              <div className="p-4 text-center text-gray-400 italic">
                Meko is currently <strong>OFF</strong>.<br />
                The system is running in amnesic mode without shared team context.
              </div>
            ) : activeTab === "build" ? (
              buildDecisions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No build decisions loaded.</div>
              ) : (
                buildDecisions.map((dec) => (
                  <div key={dec.id} className="p-2.5 rounded-lg bg-gray-800/90 border border-indigo-500/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-indigo-300">{dec.title}</span>
                      <span className="px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                        Promoted
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-medium">
                      👤 {dec.teammate}
                    </span>
                    <p className="text-gray-200 leading-relaxed text-[11px]">{dec.decision}</p>
                  </div>
                ))
              )
            ) : activeTab === "student" ? (
              studentMemories.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No memories extracted yet.</div>
              ) : (
                studentMemories.map((m) => (
                  <div key={m.id} className="p-2.5 rounded-lg bg-gray-800 border border-gray-700/60 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="uppercase font-semibold tracking-wider text-indigo-400">
                        {m.category}
                      </span>
                      {m.promoted && (
                        <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1 rounded">
                          Promoted
                        </span>
                      )}
                    </div>
                    <p className="text-gray-200 leading-relaxed">{m.text}</p>
                    <div className="flex justify-end gap-2 pt-1 border-t border-gray-700/40">
                      {!m.promoted && (
                        <button
                          onClick={() => handlePromote(m.id)}
                          className="text-[11px] text-indigo-300 hover:text-indigo-200 hover:underline"
                        >
                          Promote
                        </button>
                      )}
                      <button
                        onClick={() => handleForget(m.id)}
                        className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
                      >
                        Forget
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              sharedKnowledge.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No shared canon yet.</div>
              ) : (
                sharedKnowledge.map((kb) => (
                  <div key={kb.id} className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/50 flex flex-col gap-1">
                    <span className="text-[10px] text-indigo-400 uppercase font-semibold">
                      Contributed by: {kb.contributor}
                    </span>
                    <p className="text-gray-200 leading-relaxed">{kb.text}</p>
                  </div>
                ))
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-950 border-t border-gray-800 text-[10px] text-gray-500 flex justify-between items-center">
            <span>
              Datapack: <code>{activeTab === "build" ? buildDatapackId : activeTab === "student" ? studentDatapackId : sharedDatapackId}</code>
            </span>
            <button onClick={refreshContext} className="hover:text-gray-300 font-semibold">Refresh</button>
          </div>
        </div>
      )}
    </div>
  );
}
