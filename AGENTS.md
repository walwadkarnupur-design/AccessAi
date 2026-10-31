# Team Protocol: Meko Build & Coding Agents

This project is built for the **hackCBS 9.0 Meko Challenge** (Track A: Open Project).

## 1. The One Rule: Coding Agents on Meko
Every teammate's coding agent (Claude Code, Cursor, Copilot) connects to our shared team build datapack.

- **Shared Team Datapack**: `accessai-build`
- **Protocol**:
  1. **Recall before every task**: Query `accessai-build` for existing schemas, API contracts, and decisions.
  2. **Summarize after every task**: Log a concise summary of components implemented or changed.
  3. **Promote decisions**: Any schema, interface, or architecture decision that other agents and teammates must follow is promoted to shared knowledge.
  4. **Privacy**: Never store secrets, API keys, or private user credentials in the build datapack.

## 2. Check T Compliance
Our build datapack records promoted decisions from team coding agents across the build process:
- Architecture: Modality-driven context separation (Voice / Sign / Motor).
- Meko Memory: Dual-layer memory architecture (private student datapack vs. shared course datapack).
- Voice Engine: Hands-free conversational speech recognition with barge-in interruption.

## 3. Product Runtime Datapacks
At runtime, AccessAI agents use separate, scoped product datapacks:
- `student-<uid>-voice`: Remembers user speech speed, language comfort, past quiz struggles.
- `course-<id>-knowledge`: Shared verified mnemonics and explanations promoted across students.
