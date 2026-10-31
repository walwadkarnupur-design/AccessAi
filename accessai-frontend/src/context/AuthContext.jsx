import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import API from "../services/api";

const AuthContext = createContext();
const DEMO_AUTH_STORAGE_KEY = "accessai_demo_auth";

export const DEMO_MODE = true; // Set to true to bypass Firebase auth for development/demo

const makeDemoUser = (type, email = "", customName = "") => {
  let mockEmail = email;
  let mockName = customName;

  if (!mockName && typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("accessai_student_name") || window.sessionStorage.getItem("accessai_guest_name");
      if (stored && stored.trim() && !stored.includes("Aaradhya")) {
        mockName = stored.trim();
      }
    } catch (e) {}
  }

  if (!mockName) {
    if (type === "deaf") {
      mockEmail = email || "goyalvrusha@gmail.com";
      mockName = "Vrusha Goyal";
    } else if (type === "motor") {
      mockEmail = email || "amanhalkude7750@gmail.com";
      mockName = "Aman Halkude";
    } else if (type === "blind") {
      mockEmail = email || "amanhalkude7750+blind@gmail.com";
      mockName = "Aman Halkude";
    } else {
      mockName = "Vrusha Goyal";
    }
  }

  return {
    uid: `demo-uid-${type}`,
    email: mockEmail,
    displayName: mockName,
    emailVerified: true,
    getIdToken: async () => "demo-token-abcde"
  };
};

const getStoredDemoAuth = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    return null;
  }
};

const persistDemoAuth = (currentUser, currentDisabilityType) => {
  if (typeof window === "undefined") return;

  try {
    const payload = {
      user: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        emailVerified: currentUser.emailVerified
      } : null,
      disabilityType: currentDisabilityType || null
    };

    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // ignore storage errors in restricted environments
  }
};

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null);
  const [disabilityType, setDisabilityType] = useState(null);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      const storedAuth = getStoredDemoAuth();

      if (storedAuth && storedAuth.user && storedAuth.disabilityType) {
        setUser({ ...storedAuth.user, getIdToken: async () => "demo-token-abcde" });
        setDisabilityType(storedAuth.disabilityType);
      } else {
        let defaultName = "Vrusha Goyal";
        if (typeof window !== "undefined") {
          const s = window.localStorage.getItem("accessai_student_name");
          if (s && s.trim() && !s.includes("Aaradhya")) defaultName = s.trim();
        }
        setUser({
          uid: "demo-uid-default",
          email: "demo@accessai.com",
          displayName: defaultName,
          emailVerified: true,
          getIdToken: async () => "demo-token-abcde"
        });
        setDisabilityType(null);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const res = await API.get(`/users/${firebaseUser.uid}`);
          setDisabilityType(res.data.user.disabilityType);
        } catch (e) {
          console.error("Could not load user profile:", e);
        }
      } else {
        setUser(null);
        setDisabilityType(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      persistDemoAuth(user, disabilityType);
    }
  }, [user, disabilityType]);

  const loginDemoUser = (type, email = "", customName = "") => {
    const demoUser = makeDemoUser(type, email, customName);
    if (customName && typeof window !== "undefined") {
      window.localStorage.setItem("accessai_student_name", customName);
    }
    setUser(demoUser);
    setDisabilityType(type);
  };

  const loginGuestUser = (name = "Vrusha Goyal", type = "deaf") => {
    const cleanName = (name || "Vrusha Goyal").trim();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessai_student_name", cleanName);
      window.sessionStorage.setItem("accessai_guest_name", cleanName);
    }
    const guestUser = {
      uid: `guest-uid-${type}-${Date.now().toString(36)}`,
      email: `${cleanName.toLowerCase().replace(/\s+/g, "")}@guest.accessai.com`,
      displayName: cleanName,
      emailVerified: true,
      getIdToken: async () => "guest-token-accessai",
    };
    setUser(guestUser);
    setDisabilityType(type);
  };

  const updateUserName = (name) => {
    if (!name) return;
    const clean = name.trim();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessai_student_name", clean);
    }
    setUser((prev) => (prev ? { ...prev, displayName: clean } : prev));
  };

  const logout = async () => {
    setUser(null);
    setDisabilityType(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
      window.localStorage.removeItem("accessai_last_route");
    }
    if (!DEMO_MODE) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, disabilityType, loading, logout, loginDemoUser, loginGuestUser, updateUserName, DEMO_MODE }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);