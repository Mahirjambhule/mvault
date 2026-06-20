import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  X,
  Copy,
  Check,
  CloudCheck,
  CloudLightning,
  FileText,
} from "lucide-react";
import API from "../../api";

export default function TextWorkspace() {
  const [blocks, setBlocks] = useState([]);
  const [activeBlock, setActiveBlock] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [syncStatus, setSyncStatus] = useState("Synced");
  const [copiedId, setCopiedId] = useState(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    loadWorkspaceBlocks();
  }, []);

  useEffect(() => {
    const syncActiveBlockFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      const noteIdFromUrl = params.get("note");

      if (noteIdFromUrl && blocks.length > 0) {
        const foundBlock = blocks.find((b) => b._id === noteIdFromUrl);
        if (foundBlock) {
          setActiveBlock(foundBlock);
          setTitle(foundBlock.title);
          setContent(foundBlock.content);
          setSyncStatus("Synced");
          return;
        }
      }
      setActiveBlock(null);
    };

    syncActiveBlockFromURL();

    window.addEventListener("popstate", syncActiveBlockFromURL);
    return () => window.removeEventListener("popstate", syncActiveBlockFromURL);
  }, [blocks]);

  const loadWorkspaceBlocks = async () => {
    try {
      const res = await API.get("/notes");
      setBlocks(res.data);
    } catch (err) {
      console.error(
        "❌ FRONTEND FETCH ERROR:",
        err.response?.data || err.message,
      );
    }
  };

  const handleCreateBlock = async () => {
    try {
      const res = await API.post("/notes");
      setBlocks([res.data, ...blocks]);
      handleOpenBlock(res.data);
    } catch (err) {
      console.error(
        "❌ FRONTEND CREATION ERROR:",
        err.response?.data || err.message,
      );
    }
  };

  const handleOpenBlock = (block) => {
    const url = new URL(window.location.href);
    const isAlreadyOpen = url.searchParams.get("note") === block._id;

    url.searchParams.set("note", block._id);

    if (isAlreadyOpen) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }

    setActiveBlock(block);
    setTitle(block.title);
    setContent(block.content);
    setSyncStatus("Synced");
  };

  const handleCloseBlock = () => {
    const url = new URL(window.location.href);

    if (url.searchParams.has("note")) {
      window.history.back();
    } else {
      url.searchParams.delete("note");
      window.history.replaceState({}, "", url);
      setActiveBlock(null);
    }
  };

  const triggerAutoSave = (updatedTitle, updatedContent) => {
    setSyncStatus("Saving");
    if (typingTimer.current) clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(async () => {
      try {
        const res = await API.put(`/notes/${activeBlock._id}`, {
          title: updatedTitle,
          content: updatedContent,
        });

        setBlocks((prev) => {
          const remainingBlocks = prev.filter((b) => b._id !== activeBlock._id);
          return [res.data, ...remainingBlocks];
        });

        setSyncStatus("Synced");
      } catch (err) {
        console.error(
          "❌ FRONTEND AUTO-SAVE ERROR:",
          err.response?.data || err.message,
        );
        setSyncStatus("Error");
      }
    }, 800);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/files/notes/${id}`);
      setBlocks(blocks.filter((b) => b._id !== id));
      if (activeBlock?._id === id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("note");
        window.history.pushState({}, "", url);
        setActiveBlock(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (txt, id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-text-muted">
          // Text Workspace Nodes: {blocks.length}
        </span>
        <button
          onClick={handleCreateBlock}
          className="px-5 py-3 bg-bg-surface border border-white/[0.04] text-accent-primary text-xs font-medium rounded-xl cursor-pointer hover:bg-bg-hover transition-all"
        >
          + Create Block
        </button>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {blocks.map((b) => (
          <div
            key={b._id}
            onClick={() => handleOpenBlock(b)}
            className="p-6 bg-bg-card/40 border border-white/[0.03] rounded-2xl flex items-center justify-between group hover:bg-bg-card transition-all duration-300 min-h-[90px] cursor-pointer hover:border-accent-primary/20"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-bg-base border border-white/5 flex items-center justify-center text-accent-primary shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-text-bright truncate">
                  {b.title || "Untitled Block"}
                </p>
                <p className="text-[10px] font-mono text-text-muted truncate max-w-[240px]">
                  {b.content || "Empty content payload"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button
                onClick={(e) => handleDelete(b._id, e)}
                className="p-2 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-500/5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeBlock && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-bg-card border border-white/[0.05] rounded-3xl p-8 space-y-5 shadow-2xl flex flex-col h-[86vh]">
            <div className="flex justify-between items-center border-b border-white/[0.02] pb-4 shrink-0 gap-4">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    triggerAutoSave(e.target.value, content);
                  }}
                  placeholder="Untitled Block"
                  className="bg-transparent text-base font-bold text-text-bright outline-none w-full border-none focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted bg-bg-base px-3 py-1.5 rounded-xl border border-white/[0.04]">
                  {syncStatus === "Saving" ? (
                    <CloudLightning className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                  ) : (
                    <CloudCheck className="w-3.5 h-3.5 text-accent-primary" />
                  )}
                  <span>{syncStatus}</span>
                </div>

                <button
                  onClick={(e) => handleCopy(content, activeBlock._id, e)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-text-muted hover:text-white cursor-pointer transition-all"
                >
                  {copiedId === activeBlock._id ? (
                    <Check className="w-4 h-4 text-accent-mint" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <X
                  className="w-6 h-6 text-text-muted hover:text-white cursor-pointer transition-transform hover:scale-105"
                  onClick={handleCloseBlock}
                />
              </div>
            </div>

            <div className="flex-1 bg-bg-base/40 border border-white/[0.01] rounded-2xl p-6 overflow-hidden">
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  triggerAutoSave(title, e.target.value);
                }}
                placeholder="// Start writing your source scripts or logging notes here..."
                className="w-full h-full bg-transparent text-sm font-mono text-text-bright/80 leading-relaxed outline-none resize-none border-none focus:ring-0 custom-scrollbar"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
