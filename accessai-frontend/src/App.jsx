import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { VoiceAssistantProvider } from "./context/VoiceAssistantContext";
import BlindDashboard from "./pages/BlindDashboard";

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <VoiceAssistantProvider>
          <BlindDashboard />
        </VoiceAssistantProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
