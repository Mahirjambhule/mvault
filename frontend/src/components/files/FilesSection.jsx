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

  useEffect(() => {
    const syncPreviewFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      const fileIdFromUrl = params.get("preview");

      if (fileIdFromUrl && files.length > 0) {
        const foundFile = files.find((f) => f._id === fileIdFromUrl);
        if (foundFile) {
          setPreviewFile(foundFile);
          return;
        }
      }
      setPreviewFile(null);
    };

    syncPreviewFromURL();

    window.addEventListener("popstate", syncPreviewFromURL);
    return () => window.removeEventListener("popstate", syncPreviewFromURL);
  }, [files]);

  const loadVaultFiles = async () => {
    try {
      const res = await API.get("/files");
      setFiles(res.data.filter((f) => f.fileType !== "code"));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await API.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles((prevFiles) => [...res.data, ...prevFiles]);
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
      if (previewFile?._id === id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("preview");
        window.history.replaceState({}, "", url);
        setPreviewFile(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (e, fileId, fileName) => {
    e.stopPropagation();

    try {
      const response = await API.get(`/files/download/${fileId}`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if (err.response && err.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const errorJson = JSON.parse(reader.result);
          console.error("❌ BACKEND DIAGNOSTIC ERROR:", errorJson);
        };
        reader.readAsText(err.response.data);
      } else {
        console.error(
          "❌ SYSTEM DOWNLOAD ERROR:",
          err.response?.data || err.message,
        );
      }
    }
  };

  const handleOpenPreview = (file) => {
    const url = new URL(window.location.href);
    const isAlreadyOpen = url.searchParams.get("preview") === file._id;

    url.searchParams.set("preview", file._id);

    if (isAlreadyOpen) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }

    setPreviewFile(file);
    setZoomLevel(1);
  };

  const handleClosePreview = () => {
    const url = new URL(window.location.href);

    if (url.searchParams.has("preview")) {
      window.history.back();
    } else {
      url.searchParams.delete("preview");
      window.history.replaceState({}, "", url);
      setPreviewFile(null);
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
          id="file-upload"
          className="hidden"
          multiple
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-5 py-3 bg-accent-primary text-bg-base text-xs font-semibold rounded-xl hover:bg-opacity-90 transition-all cursor-pointer"
        >
          {uploading ? "Uploading..." : "+ Upload Files"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((f) => (
          <div
            key={f._id}
            onClick={() => handleOpenPreview(f)} // ⚡ FIXED
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
                  handleDownload(e, previewFile._id, previewFile.name)
                }
                className="p-2.5 bg-white/5 text-white rounded-xl text-xs flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={handleClosePreview}
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
