import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    uid: "student-blind-01",
    displayName: "Rohan Verma",
    email: "rohan.verma@accessai.edu",
    disabilityType: "blind"
  });

  const [disabilityType, setDisabilityType] = useState("blind");
  const [loading, setLoading] = useState(false);

  const loginDemoUser = (type = "blind", email = "", customName = "") => {
    setUser({
      uid: `student-${type}-01`,
      displayName: customName || (type === "blind" ? "Rohan Verma" : "Student"),
      email: email || `${type}@accessai.edu`,
      disabilityType: type
    });
    setDisabilityType(type);
  };

  const logout = () => {
    setUser(null);
    setDisabilityType(null);
  };

  return (
    <AuthContext.Provider value={{ user, disabilityType, loading, logout, loginDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
