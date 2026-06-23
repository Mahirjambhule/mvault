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
  const [zoomScale, setZoomScale] = useState(1);
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
      const res = await API.post("/files/upload?origin=vault", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles((prevFiles) => [...res.data, ...prevFiles]);
      setUploading(false);
    } catch (err) {
      console.error("❌ FILE UPLOAD ERROR:", err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await API.delete(`/files/${id}`);
      setFiles(files.filter((f) => f._id !== id));
      if (previewFile?._id === id) {
        handleClosePreview();
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
      try {
        const token = localStorage.getItem("mvault_token");
        const baseUrl = API.defaults.baseURL || "http://localhost:5000/api";
        const fallbackUrl = `${baseUrl}/files/download/${fileId}?token=${token}`;
        window.open(fallbackUrl, "_self");
      } catch (fallbackErr) {
        alert("Unable to process download stream.");
      }
    }
  };

  const handleOpenPreview = (file) => {
    const url = new URL(window.location.href);
    url.searchParams.set("preview", file._id);
    window.history.pushState({}, "", url);

    setPreviewFile(file);
    setZoomScale(1);
  };

  const handleClosePreview = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    window.history.replaceState({}, "", url);
    setPreviewFile(null);
    setZoomScale(1);
  };

  const isPdfFile = (file) => {
    if (!file) return false;
    return (
      file.name?.toLowerCase().endsWith(".pdf") ||
      file.fileUrl?.toLowerCase().includes(".pdf")
    );
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
            onClick={() => handleOpenPreview(f)}
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
                  {f.size ? (f.size / 1024 / 1024).toFixed(2) : "0.00"} MB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(f._id, e)}
              className="p-2 text-text-muted hover:text-red-400 rounded-lg transition-opacity md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {previewFile && (
        <div
          onClick={() => {
            if (previewFile.fileType === "photos") handleClosePreview();
          }}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col p-4 animate-fadeIn"
        >
          <div className="absolute top-4 inset-x-4 flex justify-between items-center z-50 pointer-events-none">
            <span className="text-xs font-mono text-text-muted bg-bg-card/70 px-3 py-1.5 border border-white/5 rounded-xl truncate max-w-[40%] pointer-events-auto">
              {previewFile.name}
            </span>
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onClick={(e) =>
                  handleDownload(e, previewFile._id, previewFile.name)
                }
                className="p-2.5 bg-white/5 text-white rounded-xl text-xs flex items-center gap-1.5 hover:bg-white/10 cursor-pointer border border-white/5"
              >
                <Download className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={handleClosePreview}
                className="p-2.5 bg-white/5 text-text-muted hover:text-white rounded-xl cursor-pointer border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`w-full max-w-7xl h-[85vh] mx-auto mt-16 relative p-2 overflow-auto custom-scrollbar flex justify-center ${
              zoomScale > 1 ? "items-start" : "items-center"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {previewFile.fileType === "photos" && (
              <img
                src={previewFile.fileUrl}
                alt={previewFile.name}
                onWheel={(e) => {
                  e.preventDefault();
                  const factor = e.deltaY < 0 ? 0.25 : -0.25;
                  setZoomScale((prev) =>
                    Math.max(1, Math.min(prev + factor, 4)),
                  );
                }}
                className={`rounded-xl shadow-2xl select-none transition-all duration-150 ease-out shrink-0 ${
                  zoomScale > 1 ? "my-16" : "my-0"
                }`}
                style={{
                  width: zoomScale > 1 ? `${zoomScale * 50}%` : "auto",
                  maxWidth: zoomScale > 1 ? "none" : "100%",
                  maxHeight: zoomScale > 1 ? "none" : "72vh",
                  objectFit: "contain",
                  cursor: zoomScale > 1 ? "zoom-out" : "zoom-in",
                }}
                onClick={() => {
                  if (zoomScale > 1) setZoomScale(1);
                  else setZoomScale(2);
                }}
              />
            )}

            {previewFile.fileType === "videos" && (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  src={previewFile.fileUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[72vh] rounded-xl shadow-2xl"
                />
              </div>
            )}
            {(previewFile.fileType === "document" ||
              isPdfFile(previewFile)) && (
              <div className="w-full h-full flex items-center justify-center relative z-10">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.fileUrl)}&embedded=true`}
                  title={previewFile.name}
                  className="w-[92vw] md:w-[80vw] h-[74vh] bg-[#1E222B] rounded-2xl shadow-2xl border border-white/5"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
