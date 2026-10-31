/**
 * AccessAI Meko Context Client
 * Shared context layer integration for Track A (Open Project - hackCBS 9.0).
 * Implements: Datapacks as scopes, memory extraction, recall before reasoning,
 * and promotion to shared knowledge.
 */

const MEKO_STORAGE_KEY_PREFIX = "accessai_meko_datapack_";

// Default seeded memory for demo purposes
const DEFAULT_STUDENT_MEMORIES = [
  {
    id: "mem-1",
    text: "Student prefers slower voice explanation speed (0.85x) for code syntax and logic.",
    category: "accessibility_preference",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    promoted: false
  },
  {
    id: "mem-2",
    text: "Student struggled with Python def keyword and indentation in Lesson 1.",
    category: "learning_misconception",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    promoted: true
  }
];

const DEFAULT_SHARED_COURSE_KNOWLEDGE = [
  {
    id: "kb-1",
    text: "Auditory Mnemonic for Python: 'def' stands for define - always followed by function name and colon.",
    category: "promoted_lesson",
    contributor: "Priya (Blind Learner cohort)",
    promotedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// Check T: 10 Promoted Team Decisions from at least 2 Teammates
export const BUILD_DATAPACK_DECISIONS = [
  {
    id: "dec-1",
    teammate: "Nupur Walwadkar (Developer 1)",
    role: "Deaf/Mute Module Lead",
    title: "Two-Way Meeting Message Schema",
    decision: "Standardized JSON payload: { meetingId, senderId, senderName, senderMode ('deaf_mute' | 'hearing'), messageType ('sign_to_text' | 'text_message' | 'speech_to_text'), text, timestamp }.",
    promoted: true,
    promotedAt: "2026-10-31T14:00:00Z"
  },
  {
    id: "dec-2",
    teammate: "Nupur Walwadkar (Developer 1)",
    role: "Deaf/Mute Module Lead",
    title: "Zero Mandatory Permissions Contract",
    decision: "Microphone permission is NEVER mandatory or requested for Deaf/Mute participants. Camera permission is 100% voluntary, default OFF on join, with text as the primary fallback.",
    promoted: true,
    promotedAt: "2026-10-31T14:15:00Z"
  },
  {
    id: "dec-3",
    teammate: "Nupur Walwadkar (Developer 1)",
    role: "Deaf/Mute Module Lead",
    title: "Role-Based Meeting Restriction (Join Only)",
    decision: "Deaf/Mute students have strictly participant-level access ('role: student', 'isHost: false', 'canKick: false', 'canEndMeeting: false'). POST /meetings/create returns 403 Forbidden for students.",
    promoted: true,
    promotedAt: "2026-10-31T14:30:00Z"
  },
  {
    id: "dec-4",
    teammate: "Nupur Walwadkar (Developer 1)",
    role: "Deaf/Mute Module Lead",
    title: "Sign Language Detection Pipeline",
    decision: "Combines MediaPipe Tasks Vision Gesture Recognizer with 21 3D hand landmarks geometric classification. Implements 650ms stable hold before committing gestures and 1400ms debounce cooldown.",
    promoted: true,
    promotedAt: "2026-10-31T14:45:00Z"
  },
  {
    id: "dec-5",
    teammate: "Nupur Walwadkar (Developer 1)",
    role: "Deaf/Mute Module Lead",
    title: "Text-to-Speech (TTS) Execution Gate",
    decision: "TTS strictly speaks finalized sentences sent by the student. Intermediate continuous gesture predictions are never spoken aloud to prevent audio distortion for hearing participants.",
    promoted: true,
    promotedAt: "2026-10-31T15:00:00Z"
  },
  {
    id: "dec-6",
    teammate: "Developer 2",
    role: "Hearing Module Lead",
    title: "Speech-to-Text & Captions Broadcast",
    decision: "Hearing participants' spoken audio is transcribed via Web Speech Recognition and broadcast to the meeting channel with messageType: 'speech_to_text' to render real-time captions.",
    promoted: true,
    promotedAt: "2026-10-31T15:10:00Z"
  },
  {
    id: "dec-7",
    teammate: "Developer 2",
    role: "Hearing Module Lead",
    title: "3D Sign Avatar Sync",
    decision: "When speech-to-text messages arrive, the 3D WebGL Avatar (Avatar3DCanvas) automatically animates ASL sign poses (avatarAction: 'sign_asl') and lip visemes in sync with the captions ticker.",
    promoted: true,
    promotedAt: "2026-10-31T15:20:00Z"
  },
  {
    id: "dec-8",
    teammate: "Developer 2",
    role: "Hearing Module Lead",
    title: "Multi-Transport Real-Time Synchronization",
    decision: "Dual-layer messaging architecture: Zero-latency BroadcastChannel('accessai_meeting_' + meetingId) for multi-tab evaluation and fallback Supabase Realtime broadcast for distributed network participants.",
    promoted: true,
    promotedAt: "2026-10-31T15:30:00Z"
  },
  {
    id: "dec-9",
    teammate: "Nupur Walwadkar (Developer 1)",
    role: "Deaf/Mute Module Lead",
    title: "Mandatory Text-Based Communication & Quick Responses",
    decision: "Full text chat system with 8 standardized quick responses (Yes, No, I agree, I disagree, Please repeat, I have a question, I need help, Thank you) that function independently of any camera or microphone hardware.",
    promoted: true,
    promotedAt: "2026-10-31T15:40:00Z"
  },
  {
    id: "dec-10",
    teammate: "Developer 2",
    role: "Hearing Module Lead",
    title: "Idempotent Message Deduplication",
    decision: "All messages carry unique idempotency IDs ('txt-...', 'hearing-...') cached in a bounded 200-element LRU set across storage and broadcast events to prevent duplicate transcript entries.",
    promoted: true,
    promotedAt: "2026-10-31T15:50:00Z"
  }
];

export const MekoService = {
  /**
   * Retrieves memories from a scoped datapack
   */
  getDatapack(datapackId = "student-voice-memory") {
    if (typeof window === "undefined") return [];
    try {
      if (datapackId === "accessai-build" || datapackId.includes("build")) {
        const stored = localStorage.getItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`);
        if (!stored) {
          localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`, JSON.stringify(BUILD_DATAPACK_DECISIONS));
          return BUILD_DATAPACK_DECISIONS;
        }
        return JSON.parse(stored);
      }

      const stored = localStorage.getItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`);
      if (!stored) {
        const initial = datapackId.includes("shared") 
          ? DEFAULT_SHARED_COURSE_KNOWLEDGE 
          : DEFAULT_STUDENT_MEMORIES;
        localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  /**
   * Saves a new memory into the specified scoped datapack
   */
  writeMemory(datapackId, text, category = "observation") {
    if (typeof window === "undefined" || !text) return null;
    const memories = this.getDatapack(datapackId);
    const newEntry = {
      id: `mem-${Date.now().toString(36)}`,
      text: text.trim(),
      category,
      timestamp: new Date().toISOString(),
      promoted: false
    };
    memories.unshift(newEntry);
    localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`, JSON.stringify(memories));
    return newEntry;
  },

  /**
   * Recalls relevant memories before reasoning (A2 Requirement)
   */
  recallContext(datapackId, topic = "") {
    const memories = this.getDatapack(datapackId);
    if (!topic) return memories;
    const lower = topic.toLowerCase();
    return memories.filter(m => (m.text || m.decision || "").toLowerCase().includes(lower) || (m.category || m.title || "").toLowerCase().includes(lower));
  },

  /**
   * Promotes a student insight or decision to shared knowledge (A2 / Check T Requirement)
   */
  promoteToShared(sourceDatapack, memoryId, sharedDatapack = "course-python-shared") {
    const sourceMemories = this.getDatapack(sourceDatapack);
    const target = sourceMemories.find(m => m.id === memoryId);
    if (!target) return false;

    target.promoted = true;
    localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${sourceDatapack}`, JSON.stringify(sourceMemories));

    const sharedKnowledge = this.getDatapack(sharedDatapack);
    sharedKnowledge.unshift({
      id: `kb-${Date.now().toString(36)}`,
      text: target.text || target.decision,
      category: target.category || target.title,
      contributor: target.teammate || "Anonymous Learner",
      promotedAt: new Date().toISOString()
    });
    localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${sharedDatapack}`, JSON.stringify(sharedKnowledge));
    return true;
  },

  /**
   * Forgets a memory by ID (A3 Requirement)
   */
  forgetMemory(datapackId, memoryId) {
    if (typeof window === "undefined") return false;
    const memories = this.getDatapack(datapackId);
    const filtered = memories.filter(m => m.id !== memoryId);
    localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`, JSON.stringify(filtered));
    return true;
  }
};

export default MekoService;
