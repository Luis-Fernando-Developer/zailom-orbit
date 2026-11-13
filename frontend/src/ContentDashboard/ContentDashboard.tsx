

import LoadingDash from "@/LoadingDashboard/LoadingDash";
import { useEffect, useState } from "react";
import EffectCardScale from "./CardBackgroundScale/EffectCardScale";
import AuthScreen from "./AuthScreen";
import { ApiError, getCurrentUser } from "@/lib/api";

export default function ContentDashboard() {
  const [showLoading, setShowLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated" | "error">("checking");
  const [authError, setAuthError] = useState("");

  async function checkSession() {
    setAuthStatus("checking");
    setAuthError("");
    try {
      await getCurrentUser();
      setAuthStatus("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthStatus("unauthenticated");
        return;
      }
      setAuthError(
        error instanceof Error ? error.message : "Não foi possível verificar sua sessão.",
      );
      setAuthStatus("error");
    }
  }

  useEffect(() => {
    void checkSession();
  }, []);

  function handleAuthenticated() {
    setAuthStatus("authenticated");
  }

  function handleSignedOut() {
    setAuthStatus("unauthenticated");
  }

  return (
    <div className="flex h-svh min-h-0 w-full overflow-hidden p-0">
      {!showLoading && (
        <div className="content-dashboard h-full min-h-0 w-full overflow-hidden p-0">
          <div className="relative h-full w-full">
            <LoadingDash onComplete={() => setShowLoading(true)} />
          </div>
        </div>
      )}

      {showLoading && authStatus === "authenticated" && (
        <div className="w-full p-8">
          <EffectCardScale onSignOut={handleSignedOut} />
        </div>
      )}

      {showLoading && authStatus === "unauthenticated" && (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      )}

      {showLoading && authStatus === "checking" && (
        <main className="auth-shell">
          <p role="status">Verificando sua sessão...</p>
        </main>
      )}

      {showLoading && authStatus === "error" && (
        <main className="auth-shell">
          <section className="auth-card" role="alert">
            <h1>Não foi possível conectar</h1>
            <p className="auth-description">{authError}</p>
            <button className="auth-submit" onClick={() => void checkSession()} type="button">
              Tentar novamente
            </button>
          </section>
        </main>
      )}
    </div>
  )
}
