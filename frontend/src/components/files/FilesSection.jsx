import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Image,
  Film,
  Upload,
  Download,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import API from "../../api";

export default function FilesSection() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadVaultFiles();
  }, []);

  const loadVaultFiles = async () => {
    try {
      const res = await API.get("/files");
      setFiles(res.data.filter((f) => f.fileType !== "code"));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([res.data, ...files]);
      setUploading(false);
    } catch (err) {
      console.error(
        "❌ FILE UPLOAD PIPELINE ERROR:",
        err.response?.data || err.message,
      );
      setUploading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await API.delete(`/files/${id}`);
      setFiles(files.filter((f) => f._id !== id));
      if (previewFile?._id === id) setPreviewFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadToSystem = async (url, name, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center gap-4">
        <span className="text-xs font-mono text-text-muted">
          // Elements: {files.length}
        </span>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4.5 py-3 bg-text-bright text-bg-base text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 shrink-0"
        >
          <Upload className="w-7 h-4" /> {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {files.map((f) => (
          <div
            key={f._id}
            onClick={() => {
              setPreviewFile(f);
              setZoomLevel(1);
            }}
            className="p-6 bg-bg-card/40 border border-white/[0.03] rounded-2xl flex items-center justify-between group hover:bg-bg-card transition-all duration-300 min-h-[95px] cursor-pointer hover:border-accent-primary/20"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-bg-base flex items-center justify-center text-text-muted shrink-0">
                {f.fileType === "photos" ? (
                  <Image className="w-5 h-5" />
                ) : f.fileType === "videos" ? (
                  <Film className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-text-bright truncate">
                  {f.name}
                </p>
                <p className="text-xs text-text-muted/50">
                  {(f.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={(e) => downloadToSystem(f.fileUrl, f.name, e)}
                className="p-2 text-text-muted hover:text-accent-mint rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleDelete(f._id, e)}
                className="p-2 text-text-muted hover:text-red-400 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewFile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none">
          <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
            <span className="text-xs font-mono text-text-muted bg-bg-card/60 px-3 py-1.5 border border-white/5 rounded-xl truncate max-w-[50%]">
              {previewFile.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) =>
                  downloadToSystem(previewFile.fileUrl, previewFile.name, e)
                }
                className="p-2.5 bg-white/5 text-white rounded-xl text-xs flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2.5 bg-white/5 text-text-muted hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full max-w-4xl max-h-[75vh] flex items-center justify-center overflow-auto p-4 custom-scrollbar">
            {previewFile.fileType === "photos" && (
              <img
                src={previewFile.fileUrl}
                alt={previewFile.name}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl transition-transform duration-200 ease-out origin-center"
              />
            )}
            {previewFile.fileType === "videos" && (
              <video
                src={previewFile.fileUrl}
                controls
                autoPlay
                className="max-w-full max-h-[65vh] rounded-xl shadow-2xl"
              />
            )}
            {previewFile.fileType === "document" && (
              <iframe
                src={previewFile.fileUrl}
                title={previewFile.name}
                className="w-[90vw] md:w-[75vw] h-[78vh] bg-white rounded-xl shadow-2xl border-none"
              />
            )}
          </div>

          {previewFile.fileType === "photos" && (
            <div className="absolute bottom-6 flex items-center gap-4 bg-bg-card/80 px-5 py-2.5 rounded-2xl border border-white/5 backdrop-blur-xl">
              <button
                onClick={() =>
                  setZoomLevel((prev) => Math.max(0.5, prev - 0.25))
                }
                className="p-1 text-text-muted hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.25"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-24 accent-accent-primary bg-bg-base h-1 rounded-full cursor-pointer appearance-none"
              />
              <button
                onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                className="p-1 text-text-muted hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-text-muted w-10 text-right">
                {(zoomLevel * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
