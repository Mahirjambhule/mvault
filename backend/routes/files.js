import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import * as dotenv from "dotenv";
import File from "../models/File.js";
import { authShield } from "../middleware/authShield.js";

dotenv.config();
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/download/:id", authShield, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.userId });
    if (!file)
      return res.status(404).json({ message: "File profile missing." });

    const response = await axios({
      url: file.fileUrl,
      method: "GET",
      responseType: "stream",
    });

    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    response.data.pipe(res);
  } catch (err) {
    console.error("❌ Cloudinary stream pipe crash:", err.message);
    res
      .status(500)
      .json({ message: "Failed to pull file stream from cloud core." });
  }
});

router.post("/upload", authShield, upload.array("files"), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: "No payload buffers submitted." });
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", folder: "mvault_vault_storage" },
          async (error, result) => {
            if (error) return reject(error);

            let calculatedType = "document";
            if (file.mimetype.startsWith("image/")) calculatedType = "photos";
            if (file.mimetype.startsWith("video/")) calculatedType = "videos";

            const filePayload = {
              name: file.originalname,
              fileUrl: result.secure_url,
              fileType: calculatedType,
              size: file.size,
              user: req.userId,
            };

            if (req.query.origin !== "workspace") {
              const newFile = new File(filePayload);
              await newFile.save();
              resolve(newFile);
            } else {
              resolve(filePayload);
            }
          },
        );
        stream.end(file.buffer);
      });
    });

    const savedFiles = await Promise.all(uploadPromises);
    res.status(201).json(savedFiles);
  } catch (err) {
    console.error("❌ Cloudinary upload route failure:", err.message);
    res.status(500).json({ message: err.message });
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
    const file = await File.findOne({ _id: req.params.id, user: req.userId });
    if (!file)
      return res
        .status(404)
        .json({ message: "Asset node not found or unauthorized." });

    try {
      const matches = file.fileUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (matches) {
        const publicId = matches[1];

        let resourceType = "image";
        if (file.fileType === "videos") {
          resourceType = "video";
        } else if (
          file.fileType === "document" ||
          file.name?.toLowerCase().endsWith(".pdf")
        ) {
          resourceType = "raw";
        }

        console.log(
          `🧹 Purging ${resourceType} from Cloudinary. Public ID: ${publicId}`,
        );

        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
        });
      }
    } catch (cloudErr) {
      console.error("⚠️ Cloudinary asset bypass:", cloudErr.message);
    }

    await File.deleteOne({ _id: req.params.id, user: req.userId });

    res
      .status(200)
      .json({ message: "Asset purged completely from cloud and database." });
  } catch (err) {
    console.error("❌ Complete asset deletion process failed:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
