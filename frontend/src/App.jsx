import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, FolderOpen, Terminal, LogOut } from "lucide-react";

import TextWorkspace from "./components/workspace/TextWorkspace";
import FilesSection from "./components/files/FilesSection";
import AuthGateway from "./components/auth/AuthGateway";

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
    return () => window.removeEventListener("popstate", syncPreviewFromURL);
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
    { id: "workspace", label: "Workspace Blocks", icon: LayoutGrid },
    { id: "files", label: "Files Vault", icon: FolderOpen },
  ];

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen bg-bg-base flex flex-col items-center justify-center font-mono space-y-4">
        <div className="flex items-center gap-2 text-accent-primary animate-pulse text-sm">
          <Terminal className="w-5 h-5 animate-spin duration-1000" />
          <span>// Establishing Secure Quantum Link...</span>
        </div>
        {/* Sleek Minimal Grid Skeleton Layout */}
        <div className="w-64 space-y-3 opacity-20">
          <div className="h-3 bg-white/20 rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-white/20 rounded-full w-full animate-pulse delay-75" />
          <div className="h-3 bg-white/20 rounded-full w-5/6 animate-pulse delay-150" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGateway onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-bg-base overflow-hidden relative">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-65 border-r border-white/[0.03] bg-bg-card/40 backdrop-blur-2xl p-6 flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider uppercase text-text-bright">
                MVault
              </h1>
              <p className="text-[10px] text-text-muted font-mono">
                Personal Storage
              </p>
            </div>
          </div>
          <nav className="space-y-1.5">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all relative z-10 cursor-pointer"
                  style={{
                    color: isActive
                      ? "var(--color-text-bright)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="premiumGlowTab"
                      className="absolute inset-0 bg-bg-surface border border-white/[0.04] rounded-xl -z-10 shadow-xl"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-accent-primary" : ""}`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400/80 rounded-xl hover:bg-red-500/5 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Lock Container</span>
        </button>
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex h-16 w-full items-center justify-between px-6 bg-bg-card/60 border-b border-white/[0.03] backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent-primary" />
          <span className="text-xs font-bold tracking-widest text-text-bright uppercase">
            MVault
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-red-400/80 rounded-xl"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* DISPLAY FRAME */}
      <div className="flex-1 flex flex-col h-full bg-bg-base overflow-hidden">
        <header className="hidden md:flex h-20 px-10 border-b border-white/[0.02] flex items-center shrink-0">
          <div className="text-sm font-medium tracking-wide text-text-bright capitalize">
            Workspace /{" "}
            <span className="text-text-muted">
              {currentTab === "workspace" ? "Text Blocks" : "Files Storage"}
            </span>
          </div>
        </header>
        <main className="flex-1 p-5 md:p-10 overflow-y-auto pb-24 md:pb-10">
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

      {/* MOBILE BOTTOM DOCK */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-bg-card/80 border-t border-white/[0.03] backdrop-blur-xl flex justify-around items-center px-4 z-20">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-3 relative cursor-pointer"
              style={{
                color: isActive
                  ? "var(--color-text-bright)"
                  : "var(--color-text-muted)",
              }}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-accent-primary" : ""}`}
              />
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobileGlowTab"
                  className="absolute -top-1 w-5 h-0.5 bg-accent-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
