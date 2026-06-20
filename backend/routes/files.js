import express from "express";
import multer from "multer";
import fs from "fs";
import File from "../models/File.js";
import { authShield } from "../middleware/authShield.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post(
  "/upload",
  authShield,
  upload.array("files", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: "Missing binary stream resource payloads." });
      }

      const host = req.get("host");
      const protocol = req.protocol;
      const domainBaseUrl = `${protocol}://${host}`;

      const savePromises = req.files.map(async (file) => {
        let fileType = "document";
        const ext = file.originalname.split(".").pop().toLowerCase();
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
          fileType = "photos";
        if (["mp4", "mov", "avi"].includes(ext)) fileType = "videos";

        const newFile = new File({
          name: file.originalname,
          user: req.userId,
          fileUrl: `${domainBaseUrl}/uploads/${file.filename}`,
          fileType,
          extension: `.${ext}`,
          size: file.size,
        });

        return await newFile.save();
      });

      const savedFiles = await Promise.all(savePromises);

      res.status(201).json(savedFiles);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post("/snippet", authShield, async (req, res) => {
  try {
    const { name, content } = req.body;
    const safeContent = content || "";

    const newFile = new File({
      name: name || "New Workspace Block",
      user: req.userId,
      fileUrl: Buffer.from(safeContent).toString("base64"),
      fileType: "code",
      extension: ".txt",
      size: Buffer.byteLength(safeContent),
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Database save rejected", error: err.message });
  }
});

router.put("/snippet/:id", authShield, async (req, res) => {
  try {
    const { name, content } = req.body;
    const safeContent = content || "";

    const updatedFile = await File.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        name: name || "Untitled Block",
        fileUrl: Buffer.from(safeContent).toString("base64"),
        size: Buffer.byteLength(safeContent),
      },
      { returnDocument: "after" },
    );

    if (!updatedFile)
      return res.status(404).json({ message: "Target profile missing." });
    res.status(200).json(updatedFile);
  } catch (err) {
    res.status(500).json({ message: "Auto-save failed", error: err.message });
  }
});

router.get("/download/:id", authShield, async (req, res) => {
  try {
    console.log("➡️ Download request received for ID:", req.params.id);
    console.log("👤 Authenticated User ID:", req.userId);

    const file = await File.findOne({ _id: req.params.id, user: req.userId });

    if (!file) {
      return res.status(404).json({
        errorType: "DATABASE_RECORD_MISSING",
        message: `No file found in database matching ID ${req.params.id} for this user.`,
      });
    }

    const filename = file.fileUrl.split("/uploads/")[1];
    const filePath = `./uploads/${filename}`;

    console.log("📁 Attempting to locate physical file at:", filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        errorType: "PHYSICAL_FILE_MISSING",
        message: `Database entry found, but file is missing on disk at: ${filePath}`,
        fileDetails: file,
      });
    }

    return res.download(filePath, file.name);
  } catch (err) {
    return res
      .status(500)
      .json({ errorType: "SERVER_CRASH", message: err.message });
  }
});

router.get("/", authShield, async (req, res) => {
  try {
    const files = await File.find({ user: req.userId }).sort({ updatedAt: -1 });
    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authShield, async (req, res) => {
  try {
    const targetFile = await File.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!targetFile) {
      return res.status(404).json({ message: "Asset profile not found." });
    }

    if (
      targetFile.fileType !== "code" &&
      targetFile.fileUrl.includes("/uploads/")
    ) {
      const filename = targetFile.fileUrl.split("/uploads/")[1];
      const filePath = `./uploads/${filename}`;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Successfully deleted physical disk asset: ${filePath}`);
      }
    }

    await File.deleteOne({ _id: req.params.id, user: req.userId });
    res
      .status(200)
      .json({ message: "Asset completely purged from storage and database." });
  } catch (err) {
    res.status(500).json({
      message: "Error executing asset purge loop",
      error: err.message,
    });
  }
});

export default router;
