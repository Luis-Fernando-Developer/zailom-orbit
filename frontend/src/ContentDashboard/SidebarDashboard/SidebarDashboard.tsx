import { LogOut, Orbit } from "lucide-react";
import { useState } from "react";
import MenuSidebar from "./MenuSidebar";
import { signOut } from "@/lib/api";

export default function SidebarDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Não foi possível sair da conta.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="h-full overflow-hidden">
      <aside className="sidebar-liquid-glass relative isolate flex flex-col overflow-hidden h-full w-18 max-w-32 rounded-lg p-1">
        <div className="loading-dash-logo flex items-center justify-center border-b-2 border-b-white/20 py-2">
          <span role="img" aria-label="Zailom Orbit">
            <Orbit size={22} strokeWidth={1.7} className="text-white" aria-hidden="true" />
          </span>
        </div>

        <MenuSidebar className="
                        min-h-0 flex-1 flex flex-col overflow-y-auto
                        dashboard-scrollbar
                      "
        />
        <div className="mt-auto flex flex-col items-center border-t border-white/15 py-3">
          {signOutError && <span className="max-w-28 px-1 text-center text-[10px] text-red-200" role="alert">{signOutError}</span>}
          <button
            aria-label="Sair da conta"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
            title="Sair da conta"
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>
  )
}
