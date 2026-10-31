/**
 * AccessAI Two-Way Accessible Meeting Communication Service
 * Coordinated with Developer 2 (Hearing / Abled Participant Side)
 * 
 * Flow:
 * - Deaf/Mute User -> Sign Language -> Text -> Meeting Broadcast -> Speech (TTS)
 * - Hearing User   -> Speech -> Text -> Meeting Broadcast -> Live Captions
 */

import { supabase } from "./supabase";

const STORAGE_PREFIX = "accessai_meeting_msg_";

export class MeetingChannel {
  constructor(meetingId = "accessai-room-101", currentUser = null) {
    this.meetingId = meetingId;
    this.currentUser = currentUser || {
      id: `deaf-user-${Date.now().toString(36)}`,
      name: "Deaf Participant",
      mode: "deaf_mute"
    };
    this.subscribers = new Set();
    this.participantSubscribers = new Set();
    this.seenMessageIds = new Set();
    this.broadcastChannel = null;
    this.supabaseChannel = null;

    this.participants = [
      {
        id: this.currentUser.id,
        name: this.currentUser.name,
        mode: "deaf_mute",
        role: "Deaf/Mute Signer",
        status: "connected",
        isSelf: true
      },
      {
        id: "partner-hearing-01",
        name: "Abled Participant",
        mode: "hearing",
        role: "Hearing/Speaker",
        status: "connected",
        isSelf: false
      },
      {
        id: "ai-interpreter-relay",
        name: "AccessAI Relay Bot",
        mode: "ai_relay",
        role: "Two-Way AI Interpreter",
        status: "active",
        isSelf: false
      }
    ];

    this._initChannel();
  }

  _initChannel() {
    // 1. Browser BroadcastChannel for instant zero-latency multi-tab sync
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel(`accessai_meeting_${this.meetingId}`);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data) {
            this._handleIncoming(event.data);
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel error:", err);
      }
    }

    // 2. Storage event fallback for cross-tab sync
    if (typeof window !== "undefined") {
      this.storageHandler = (event) => {
        if (event.key && event.key.startsWith(STORAGE_PREFIX)) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.meetingId === this.meetingId) {
              this._handleIncoming(data);
            }
          } catch (e) {}
        }
      };
      window.addEventListener("storage", this.storageHandler);
    }

    // 3. Supabase Realtime broadcast channel (if Supabase configured)
    try {
      if (supabase && supabase.channel) {
        this.supabaseChannel = supabase
          .channel(`meeting:${this.meetingId}`)
          .on("broadcast", { event: "message" }, (payload) => {
            if (payload && payload.payload) {
              this._handleIncoming(payload.payload);
            }
          })
          .subscribe();
      }
    } catch (e) {
      console.warn("Supabase realtime channel skipped:", e);
    }
  }

  _handleIncoming(msg) {
    if (!msg || !msg.messageType) return;
    const key = msg.id || `${msg.timestamp}_${msg.senderId}_${msg.text}`;
    if (this.seenMessageIds.has(key)) return;
    this.seenMessageIds.add(key);
    if (this.seenMessageIds.size > 200) {
      const first = this.seenMessageIds.values().next().value;
      this.seenMessageIds.delete(first);
    }
    this.subscribers.forEach((callback) => {
      try {
        callback(msg);
      } catch (err) {
        console.error("Error in meeting message subscriber:", err);
      }
    });
  }

  /**
   * Broadcasts a sign-to-text message from the Deaf/Mute user
   */
  /**
   * Broadcasts a typed text message from the Deaf/Mute student (No camera or mic needed)
   */
  sendTextMessage(text, extra = {}) {
    if (!text || !text.trim()) return null;

    const message = {
      id: 'txt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      meetingId: this.meetingId,
      senderId: this.currentUser.id || this.currentUser.uid,
      senderName: this.currentUser.displayName || this.currentUser.name || 'Deaf Student',
      senderMode: 'deaf_mute',
      messageType: 'text_message',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      ...extra
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PREFIX + Date.now(), JSON.stringify(message));
      } catch (e) {}
    }

    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'message',
          payload: message
        });
      } catch (e) {}
    }

    this._handleIncoming(message);
    return message;
  }

  sendSignMessage(text, confidence = 0.95, extra = {}) {
    if (!text || !text.trim()) return null;

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      meetingId: this.meetingId,
      senderId: this.currentUser.id || this.currentUser.uid,
      senderName: this.currentUser.displayName || this.currentUser.name || "Deaf Participant",
      senderMode: "deaf_mute",
      messageType: "sign_to_text",
      text: text.trim(),
      confidence: Math.round(confidence * 100) / 100,
      timestamp: new Date().toISOString(),
      ...extra
    };

    // 1. Broadcast locally
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {}
    }

    // 2. Storage event for cross-window fallback
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${Date.now()}`, JSON.stringify(message));
      } catch (e) {}
    }

    // 3. Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: "broadcast",
          event: "message",
          payload: message
        });
      } catch (e) {}
    }

    // Deliver to local subscribers
    this._handleIncoming(message);
    return message;
  }

  /**
   * Simulates an incoming message from Developer 2 (Hearing Participant)
   * Essential for live demonstration & testing speech-to-text reception!
   */
  simulateHearingResponse(text = "Hello! I can hear your sign language clearly.") {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      meetingId: this.meetingId,
      senderId: "partner-hearing-01",
      senderName: "Abled Participant",
      senderMode: "hearing",
      messageType: "speech_to_text",
      text,
      confidence: 0.98,
      timestamp: new Date().toISOString()
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {}
    }

    this._handleIncoming(message);
    return message;
  }

  onMessage(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getParticipants() {
    return [...this.participants];
  }

  destroy() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (e) {}
    }
    if (this.storageHandler && typeof window !== "undefined") {
      window.removeEventListener("storage", this.storageHandler);
    }
    if (this.supabaseChannel && supabase && supabase.removeChannel) {
      try {
        supabase.removeChannel(this.supabaseChannel);
      } catch (e) {}
    }
    this.subscribers.clear();
  }
}

export default MeetingChannel;

