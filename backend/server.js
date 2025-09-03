import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/vault", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// Schema
const DocumentSchema = new mongoose.Schema({
  title: String,
  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now },
});
const Document = mongoose.model("Document", DocumentSchema);

// File storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Upload document API
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const doc = new Document({
    title: req.body.title,
    fileUrl: `/uploads/${req.file.filename}`,
  });
  await doc.save();
  res.json(doc);
});

// Fetch all documents
app.get("/api/documents", async (req, res) => {
  const docs = await Document.find().sort({ uploadedAt: -1 });
  res.json(docs);
});

// Serve static files
app.use("/uploads", express.static("uploads"));

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
