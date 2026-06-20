import mongoose from "mongoose";

const workspaceBlockSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Untitled Block" },
    content: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model("WorkspaceBlock", workspaceBlockSchema);
