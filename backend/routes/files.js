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

router.post("/upload", authShield, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Missing binary stream resource payload." });
    }

    let fileType = "document";
    const ext = req.file.originalname.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
      fileType = "photos";
    if (["mp4", "mov", "avi"].includes(ext)) fileType = "videos";

    const newFile = new File({
      name: req.file.originalname,
      user: req.userId,
      fileUrl: `http://localhost:5000/uploads/${req.file.filename}`,
      fileType,
      extension: `.${ext}`,
      size: req.file.size,
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
