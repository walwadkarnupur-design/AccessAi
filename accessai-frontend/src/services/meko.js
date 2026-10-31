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

export const MekoService = {
  /**
   * Retrieves memories from a scoped datapack
   */
  getDatapack(datapackId = "student-voice-memory") {
    if (typeof window === "undefined") return [];
    try {
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
    return memories.filter(m => m.text.toLowerCase().includes(lower) || m.category.toLowerCase().includes(lower));
  },

  /**
   * Promotes a student insight to the shared course knowledge base (A2 Requirement)
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
      text: target.text,
      category: "promoted_lesson",
      contributor: "Student Voice Cohort",
      promotedAt: new Date().toISOString()
    });
    localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${sharedDatapack}`, JSON.stringify(sharedKnowledge));
    return true;
  },

  /**
   * Deletes a remembered context item (A4 Requirement: User can correct or forget)
   */
  forgetMemory(datapackId, memoryId) {
    if (typeof window === "undefined") return;
    const memories = this.getDatapack(datapackId);
    const filtered = memories.filter(m => m.id !== memoryId);
    localStorage.setItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`, JSON.stringify(filtered));
    return filtered;
  },

  /**
   * Resets datapack to initial defaults
   */
  resetDatapack(datapackId) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${MEKO_STORAGE_KEY_PREFIX}${datapackId}`);
  }
};

export default MekoService;
