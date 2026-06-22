import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, FolderOpen, LogOut } from "lucide-react";

import TextWorkspace from "./components/workspace/TextWorkspace";
import FilesSection from "./components/files/FilesSection";
import AuthGateway from "./components/auth/AuthGateway";

const ModernLogo = () => (
  <div className="relative w-9 h-9 flex items-center justify-center group shrink-0">
    <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary to-emerald-400 rounded-xl blur-[6px] opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
    <div className="w-9 h-9 rounded-xl bg-bg-surface border border-white/[0.08] flex items-center justify-center relative overflow-hidden shadow-inner">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 text-accent-primary relative z-10 drop-shadow-[0_0_8px_rgba(var(--color-accent-primary-rgb),0.5)]"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4px_4px]" />
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [currentTab, setCurrentTab] = useState(() => {
    const hasCheckedIn = sessionStorage.getItem("mvault_session_active");
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab");

    if (!hasCheckedIn) {
      sessionStorage.setItem("mvault_session_active", "true");
      return "workspace";
    }

    return tabFromUrl || "workspace";
  });

  useEffect(() => {
    const token = localStorage.getItem("mvault_token");
    if (token) setIsAuthenticated(true);
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const syncTabFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get("tab") || "workspace";
      setCurrentTab(tabFromUrl);
    };

    const params = new URLSearchParams(window.location.search);
    if (!params.has("tab") && currentTab === "workspace") {
      urlSync("workspace", true);
    }

    window.addEventListener("popstate", syncTabFromURL);
    return () => window.removeEventListener("popstate", syncTabFromURL);
  }, [isAuthenticated]);

  const urlSync = (tabId, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    url.searchParams.delete("note");
    url.searchParams.set("tab", tabId);

    if (replace) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }
  };

  const handleTabChange = (tabId) => {
    if (currentTab === tabId) return;
    setCurrentTab(tabId);
    urlSync(tabId, false);
  };

  const handleLogout = () => {
    localStorage.removeItem("mvault_token");
    sessionStorage.removeItem("mvault_session_active");
    const url = new URL(window.location.origin);
    window.history.replaceState({}, "", url);
    setCurrentTab("workspace");
    setIsAuthenticated(false);
  };

  const navItems = [
    { id: "workspace", label: "Workspace", icon: LayoutGrid },
    { id: "files", label: "Vault", icon: FolderOpen },
  ];

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen bg-bg-base flex items-center justify-center font-mono text-sm text-text-muted">
        <span>// Loading Secured Workspace...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGateway onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-base overflow-hidden relative">
      <header className="w-full h-18 border-b border-white/[0.03] bg-bg-card/40 backdrop-blur-2xl px-4 sm:px-6 md:px-10 flex items-center justify-between shrink-0 z-30 relative">
        <div className="flex items-center gap-3">
          <ModernLogo />
          <div>
            <h1 className="text-sm font-black tracking-[0.15em] uppercase text-text-bright bg-gradient-to-r from-text-bright via-text-bright to-white/40 bg-clip-text text-transparent">
              MVault
            </h1>
            <p className="text-[9px] text-text-muted font-mono tracking-wider uppercase opacity-60 hidden xs:block">
              Secure Storage Core
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="flex items-center bg-bg-base/60 p-1 border border-white/[0.04] rounded-xl shadow-inner relative">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all relative z-10 cursor-pointer whitespace-nowrap"
                  style={{
                    color: isActive
                      ? "var(--color-text-bright)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="premiumGlowTab"
                      className="absolute inset-0 bg-bg-surface border border-white/[0.05] rounded-lg -z-10 shadow-md"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    className={`w-3.5 h-3.5 ${isActive ? "text-accent-primary" : "opacity-80"}`}
                  />
                  <span className="hidden xxs:inline text-[11px] sm:text-xs">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="h-5 w-[1px] bg-white/[0.06] hidden xxs:block" />

          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-2 text-red-400/70 hover:text-red-400 rounded-xl hover:bg-red-500/5 transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-medium shrink-0 border border-transparent hover:border-red-500/10"
            title="Lock Container"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 md:px-10 py-2 sm:py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="h-full"
          >
            {currentTab === "workspace" && <TextWorkspace />}
            {currentTab === "files" && <FilesSection />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
