import express from "express";
import WorkspaceBlock from "../models/WorkspaceBlock.js";
import { authShield } from "../middleware/authShield.js";

const router = express.Router();

// 1. FETCH ALL BLOCKS
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

// 2. CREATE NEW BLANK BLOCK
router.post("/", authShield, async (req, res) => {
  try {
    const newBlock = new WorkspaceBlock({
      title: "Untitled Block",
      content: "",
      user: req.userId, // Injected securely via the authShield middleware
    });
    const savedBlock = await newBlock.save();
    res.status(201).json(savedBlock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. AUTO-SAVE HANDLER (Uses the updated standard syntax)
router.put("/:id", authShield, async (req, res) => {
  try {
    const { title, content } = req.body;
    const updatedBlock = await WorkspaceBlock.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { title, content },
      { returnDocument: "after" }, // Replaces deprecated new:true format cleanly
    );
    if (!updatedBlock)
      return res.status(404).json({ message: "Block not found" });
    res.status(200).json(updatedBlock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. DELETE BLOCK
router.delete("/:id", authShield, async (req, res) => {
  try {
    await WorkspaceBlock.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    res.status(200).json({ message: "Deleted block successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
