import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import API from "../services/api";

const AuthContext = createContext();
const DEMO_AUTH_STORAGE_KEY = "accessai_demo_auth";

export const DEMO_MODE = false; // Real Supabase Auth enabled by default

const makeDemoUser = (type, email = "", customName = "") => {
  let mockEmail = email;
  let mockName = customName;

  if (!mockName && typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("accessai_student_name") || window.sessionStorage.getItem("accessai_guest_name");
      if (stored && stored.trim() && !stored.includes("Aaradhya")) {
        mockName = stored.trim();
      }
    } catch (e) { }
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
    id: `demo-uid-${type}`,
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
        uid: currentUser.uid || currentUser.id,
        id: currentUser.uid || currentUser.id,
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.user_metadata?.name,
        emailVerified: true
      } : null,
      disabilityType: currentDisabilityType || null
    };
    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) { }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [disabilityType, setDisabilityType] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Supabase Auth state
  useEffect(() => {
    // 1. Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const sbUser = session.user;
        const profileName = sbUser.user_metadata?.name || sbUser.email.split("@")[0];
        const mode = sbUser.user_metadata?.disability_type || sbUser.user_metadata?.disabilityType || "deaf";
        
        setUser({
          uid: sbUser.id,
          id: sbUser.id,
          email: sbUser.email,
          displayName: profileName,
          user_metadata: sbUser.user_metadata,
          getIdToken: async () => session.access_token
        });
        setDisabilityType(mode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("accessai_student_name", profileName);
        }
      } else {
        // Fallback to stored local session if present
        const stored = getStoredDemoAuth();
        if (stored?.user && stored?.disabilityType) {
          setUser(stored.user);
          setDisabilityType(stored.disabilityType);
        }
      }
      setLoading(false);
    });

    // 2. Listen to Supabase Auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const sbUser = session.user;
        const profileName = sbUser.user_metadata?.name || sbUser.email.split("@")[0];
        const mode = sbUser.user_metadata?.disability_type || sbUser.user_metadata?.disabilityType || "deaf";

        setUser({
          uid: sbUser.id,
          id: sbUser.id,
          email: sbUser.email,
          displayName: profileName,
          user_metadata: sbUser.user_metadata,
          getIdToken: async () => session.access_token
        });
        setDisabilityType(mode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("accessai_student_name", profileName);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setDisabilityType(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Real Supabase Sign Up
  const signUp = async ({ email, password, name, disabilityType: mode, phone, age, gender }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name?.trim(),
            full_name: name?.trim(),
            disability_type: mode,
            disabilityType: mode,
            phone: phone?.trim(),
            age: age || null,
            gender: gender || null
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        const profileName = name || email.split("@")[0];
        const formattedUser = {
          uid: data.user.id,
          id: data.user.id,
          email: data.user.email,
          displayName: profileName,
          getIdToken: async () => data.session?.access_token || "supabase-session"
        };
        setUser(formattedUser);
        setDisabilityType(mode);
        persistDemoAuth(formattedUser, mode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("accessai_student_name", profileName);
        }
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Real Supabase Sign In
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        const profileName = data.user.user_metadata?.name || data.user.email.split("@")[0];
        const mode = data.user.user_metadata?.disability_type || data.user.user_metadata?.disabilityType || "deaf";
        const formattedUser = {
          uid: data.user.id,
          id: data.user.id,
          email: data.user.email,
          displayName: profileName,
          getIdToken: async () => data.session?.access_token || ""
        };
        setUser(formattedUser);
        setDisabilityType(mode);
        persistDemoAuth(formattedUser, mode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("accessai_student_name", profileName);
        }
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginDemoUser = (type, email = "", customName = "") => {
    const demoUser = makeDemoUser(type, email, customName);
    if (customName && typeof window !== "undefined") {
      window.localStorage.setItem("accessai_student_name", customName);
    }
    setUser(demoUser);
    setDisabilityType(type);
    persistDemoAuth(demoUser, type);
  };

  const loginGuestUser = (name = "Vrusha Goyal", type = "deaf") => {
    const cleanName = (name || "Vrusha Goyal").trim();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("accessai_student_name", cleanName);
      window.sessionStorage.setItem("accessai_guest_name", cleanName);
    }
    const guestUser = {
      uid: `guest-uid-${type}-${Date.now().toString(36)}`,
      id: `guest-uid-${type}-${Date.now().toString(36)}`,
      email: `${cleanName.toLowerCase().replace(/\s+/g, "")}@guest.accessai.com`,
      displayName: cleanName,
      emailVerified: true,
      getIdToken: async () => "guest-token-accessai",
    };
    setUser(guestUser);
    setDisabilityType(type);
    persistDemoAuth(guestUser, type);
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
    try {
      await supabase.auth.signOut();
    } catch (e) { }
  };

  return (
    <AuthContext.Provider value={{
      user,
      disabilityType,
      loading,
      logout,
      signUp,
      signIn,
      loginDemoUser,
      loginGuestUser,
      updateUserName,
      DEMO_MODE
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);