import express from "express";
import { v2 as cloudinary } from "cloudinary";
import WorkspaceBlock from "../models/WorkspaceBlock.js";
import { authShield } from "../middleware/authShield.js";

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get("/", authShield, async (req, res) => {
  try {
    const blocks = await WorkspaceBlock.find({ user: req.userId }).sort({
      updatedAt: -1,
    });
    res.status(200).json(blocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authShield, async (req, res) => {
  try {
    const newBlock = new WorkspaceBlock({
      title: "Untitled Block",
      content: "",
      user: req.userId,
    });
    const savedBlock = await newBlock.save();
    res.status(201).json(savedBlock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", authShield, async (req, res) => {
  try {
    const { title, content } = req.body;

    const existingBlock = await WorkspaceBlock.findOne({
      _id: req.params.id,
      user: req.userId,
    });
    if (!existingBlock)
      return res.status(404).json({ message: "Workspace block not found" });

    const extractPublicIds = (text) => {
      if (!text) return [];
      const regex = /\/upload\/(?:v\d+\/)?([^\s\)]+)/g;
      const ids = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        const cleanId = match[1].split(".")[0];
        ids.push(cleanId);
      }
      return ids;
    };

    const oldIds = extractPublicIds(existingBlock.content);
    const newIds = extractPublicIds(content);
    const orphanedIds = oldIds.filter(
      (id) => !newIds.includes(id) && id.includes("mvault_vault_storage"),
    );

    if (orphanedIds.length > 0) {
      console.log(`🧹 Purging orphaned assets from Cloudinary:`, orphanedIds);

      const purgePromises = orphanedIds.map((publicId) =>
        cloudinary.uploader
          .destroy(publicId)
          .catch((err) =>
            console.error(
              `⚠️ Failed to destroy asset ${publicId}:`,
              err.message,
            ),
          ),
      );

      await Promise.all(purgePromises);
    }

    existingBlock.title = title;
    existingBlock.content = content;
    await existingBlock.save();

    res.status(200).json(existingBlock);
  } catch (err) {
    console.error("❌ Auto-save purge pipeline failed:", err.message);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authShield, async (req, res) => {
  try {
    const deletedBlock = await WorkspaceBlock.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!deletedBlock) {
      return res
        .status(404)
        .json({ message: "Block not found or unauthorized." });
    }

    res.status(200).json({ message: "Deleted block successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
