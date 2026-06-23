import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  X,
  Copy,
  Check,
  CloudCheck,
  CloudLightning,
  FileText,
  Eye,
  Code,
} from "lucide-react";
import { marked } from "marked";
import API from "../../api";

export default function TextWorkspace() {
  const [blocks, setBlocks] = useState([]);
  const [activeBlock, setActiveBlock] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [syncStatus, setSyncStatus] = useState("Synced");
  const [copiedId, setCopiedId] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [maximizedImgUrl, setMaximizedImgUrl] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);

  const typingTimer = useRef(null);
  const textareaRef = useRef(null);

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
          if (!activeBlock || activeBlock._id !== foundBlock._id) {
            setActiveBlock(foundBlock);
            setTitle(foundBlock.title);
            setContent(foundBlock.content);
          }
          setSyncStatus("Synced");
          return;
        }
      }
      setActiveBlock(null);
    };

    syncActiveBlockFromURL();

    window.addEventListener("popstate", syncActiveBlockFromURL);
    return () => window.removeEventListener("popstate", syncActiveBlockFromURL);
  }, [blocks, activeBlock]); // 🚀 Add activeBlock to dependencies so tracking stays accurate

  const loadWorkspaceBlocks = async () => {
    try {
      const res = await API.get("/notes");
      setBlocks(res.data);
    } catch (err) {
      console.error("❌ FRONTEND FETCH ERROR:", err.message);
    }
  };

  const handleCreateBlock = async () => {
    try {
      const res = await API.post("/notes");
      setBlocks([res.data, ...blocks]);
      handleOpenBlock(res.data);
    } catch (err) {
      console.error("❌ FRONTEND CREATION ERROR:", err.message);
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
    setIsPreviewMode(false);
    setZoomScale(1);
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
    setZoomScale(1);
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

        setActiveBlock(res.data);
        setSyncStatus("Synced");
      } catch (err) {
        setSyncStatus("Error");
      }
    }, 800);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/notes/${id}`);
      setBlocks(blocks.filter((b) => b._id !== id));
      if (activeBlock?._id === id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("note");
        window.history.replaceState({}, "", url);
        setActiveBlock(null);
      }
    } catch (err) {
      console.error("❌ TEXT BLOCK DELETE ERROR:", err.message);
    }
  };

  const handleCopy = (txt, id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        setSyncStatus("Saving");

        const formData = new FormData();
        formData.append("files", file);

        try {
          const res = await API.post(
            "/files/upload?origin=workspace",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          const uploadedFileUrl = res.data[0]?.fileUrl;
          if (!uploadedFileUrl) throw new Error("Url missing.");

          const imageMarkdown = `\n![Uploaded Image](${uploadedFileUrl})\n`;
          const textarea = textareaRef.current;
          const startPos = textarea.selectionStart;
          const endPos = textarea.selectionEnd;

          const newContent =
            content.substring(0, startPos) +
            imageMarkdown +
            content.substring(endPos, content.length);

          setContent(newContent);
          triggerAutoSave(title, newContent);
        } catch (err) {
          setSyncStatus("Error");
        }
      }
    }
  };

  const renderMarkdownHTML = () => {
    const renderer = new marked.Renderer();

    renderer.link = ({ href, title, text }) => {
      const cleanTitle = title ? `title="${title}"` : "";
      // 🚀 THE FIX: Force target="_blank" and secure rel attributes onto every generated anchor
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${cleanTitle}>${text}</a>`;
    };

    const rawHtml = marked.parse(content, {
      renderer: renderer,
      breaks: true,
      gfm: true,
    });

    return { __html: rawHtml };
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-text-muted">
          // Workspace Nodes: {blocks.length}
        </span>
        <button
          onClick={handleCreateBlock}
          className="px-5 py-3 bg-bg-surface border border-white/[0.04] text-accent-primary text-xs font-medium rounded-xl cursor-pointer hover:bg-bg-hover transition-all"
        >
          + Create Block
        </button>
      </div>

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
            <button
              onClick={(e) => handleDelete(b._id, e)}
              className="p-2 text-text-muted hover:text-red-400 rounded-lg transition-opacity md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {activeBlock && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl bg-bg-card border border-white/[0.05] rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col h-[88vh]">
            <div className="flex justify-between items-center border-b border-white/[0.02] pb-3 shrink-0 gap-4">
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

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-colors cursor-pointer ${
                    isPreviewMode
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-white/5 border-white/5 text-text-muted hover:text-white"
                  }`}
                >
                  {isPreviewMode ? (
                    <Code className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>{isPreviewMode ? "Edit Script" : "Live Preview"}</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted bg-bg-base px-3 py-1.5 rounded-xl border border-white/[0.04]">
                  <span
                    className={
                      syncStatus === "Saving"
                        ? "text-yellow-400 animate-pulse"
                        : "text-accent-primary"
                    }
                  >
                    ● {syncStatus}
                  </span>
                </div>

                <X
                  className="w-6 h-6 text-text-muted hover:text-white cursor-pointer"
                  onClick={handleCloseBlock}
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative rounded-2xl border border-white/[0.01]">
              {!isPreviewMode ? (
                <div className="w-full h-full bg-bg-base/40 p-6">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onPaste={handlePaste}
                    onChange={(e) => {
                      setContent(e.target.value);
                      triggerAutoSave(title, e.target.value);
                    }}
                    placeholder="// Drop text or screenshots here... Use 'Live Preview' to view links and images."
                    className="w-full h-full bg-transparent text-sm font-mono text-text-bright/80 leading-relaxed outline-none resize-none border-none focus:ring-0 custom-scrollbar pr-5 text-justify"
                  />
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    if (e.target.tagName === "IMG") {
                      setMaximizedImgUrl(e.target.src);
                      setZoomScale(1);
                    }
                  }}
                  className="w-full h-full bg-bg-base/20 p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none"
                >
                  {content.trim() === "" ? (
                    <p className="text-xs text-text-muted font-mono">
                      // No text data strings written to execute previews...
                    </p>
                  ) : (
                    <div
                      className="text-sm font-sans text-text-bright/90 space-y-4 markdown-preview-layer text-justify"
                      dangerouslySetInnerHTML={renderMarkdownHTML()}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {maximizedImgUrl && (
        <div
          onClick={() => {
            setMaximizedImgUrl(null);
            setZoomScale(1);
          }}
          className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[60] flex flex-col p-4 md:p-12 animate-fadeIn"
        >
          <button
            onClick={() => {
              setMaximizedImgUrl(null);
              setZoomScale(1);
            }}
            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/5 z-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className={`w-full h-full relative p-4 overflow-auto custom-scrollbar flex justify-center ${
              zoomScale > 1 ? "items-start" : "items-center"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={maximizedImgUrl}
              alt="Maximized focus preview"
              onWheel={(e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 0.25 : -0.25;
                setZoomScale((prevScale) =>
                  Math.max(1, Math.min(prevScale + zoomFactor, 4)),
                );
              }}
              className={`rounded-xl border border-white/5 shadow-2xl select-none transition-all duration-150 ease-out shrink-0 ${
                zoomScale > 1 ? "my-16" : "my-0"
              }`}
              style={{
                width: zoomScale > 1 ? `${zoomScale * 50}%` : "auto",
                maxWidth: zoomScale > 1 ? "none" : "100%",
                maxHeight: zoomScale > 1 ? "none" : "78vh",
                objectFit: "contain",
                cursor: zoomScale > 1 ? "zoom-out" : "zoom-in",
              }}
              onClick={() => {
                if (zoomScale > 1) setZoomScale(1);
                else setZoomScale(2);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
