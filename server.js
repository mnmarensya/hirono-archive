import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { body, param, query, validationResult } from "express-validator";
import multer from "multer";

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// Hapus file gambar lama dari folder uploads (aman dipanggil untuk URL eksternal / kosong)
const removeUploaded = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  const file = path.join(uploadDir, path.basename(imageUrl));
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Validasi gagal", errors: errors.array() });
  next();
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  }
});
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg","image/png","image/webp"].includes(file.mimetype)) return cb(new Error("Format gambar harus JPG, PNG, atau WEBP."));
    cb(null, true);
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "Hirono Archive API" }));

app.get("/api/series", async (_req, res, next) => {
  try {
    const series = await prisma.series.findMany({ include: { _count: { select: { figures: true } } }, orderBy: [{ releaseYear: "asc" }, { name: "asc" }] });
    res.json(series);
  } catch (e) { next(e); }
});

app.get("/api/figures", [
  query("search").optional().isString(),
  query("seriesId").optional().isInt()
], handleValidation, async (req, res, next) => {
  try {
    const { search, seriesId } = req.query;
    const figures = await prisma.figure.findMany({
      where: {
        ...(search ? { name: { contains: String(search) } } : {}),
        ...(seriesId ? { seriesId: Number(seriesId) } : {})
      },
      include: { series: true },
      orderBy: { name: "asc" }
    });
    res.json(figures);
  } catch (e) { next(e); }
});

app.get("/api/figures/:id", param("id").isInt({ min: 1 }), handleValidation, async (req, res, next) => {
  try {
    const figure = await prisma.figure.findUnique({ where: { id: Number(req.params.id) }, include: { series: true } });
    if (!figure) return res.status(404).json({ message: "Figur tidak ditemukan." });
    res.json(figure);
  } catch (e) { next(e); }
});

const figureRules = [
  body("name").trim().notEmpty().withMessage("Nama figur wajib diisi."),
  body("seriesId").isInt({ min: 1 }).withMessage("Series wajib dipilih."),
  body("rarity").optional().isString(),
  body("description").optional().isString(),
  body("imageUrl").optional().isString()
];

app.post("/api/figures", figureRules, handleValidation, async (req, res, next) => {
  try {
    const figure = await prisma.figure.create({
      data: {
        name: req.body.name.trim(), seriesId: Number(req.body.seriesId),
        rarity: req.body.rarity || "Regular", description: req.body.description || "",
        imageUrl: req.body.imageUrl || ""
      }, include: { series: true }
    });
    res.status(201).json(figure);
  } catch (e) { next(e); }
});

app.put("/api/figures/:id", [
  param("id").isInt({ min: 1 }), ...figureRules
], handleValidation, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.figure.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Figur tidak ditemukan." });
    const newImage = req.body.imageUrl || "";
    if (existing.imageUrl && existing.imageUrl !== newImage) removeUploaded(existing.imageUrl);
    const figure = await prisma.figure.update({
      where: { id },
      data: { name: req.body.name.trim(), seriesId: Number(req.body.seriesId), rarity: req.body.rarity || "Regular", description: req.body.description || "", imageUrl: req.body.imageUrl || "" },
      include: { series: true }
    });
    res.json(figure);
  } catch (e) { next(e); }
});

app.delete("/api/figures/:id", param("id").isInt({ min: 1 }), handleValidation, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.figure.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Figur tidak ditemukan." });
    await prisma.figure.delete({ where: { id } });
    removeUploaded(existing.imageUrl);
    res.json({ message: "Figur berhasil dihapus." });
  } catch (e) { next(e); }
});

app.get("/api/collection", async (_req, res, next) => {
  try {
    const items = await prisma.collectionItem.findMany({ include: { figure: { include: { series: true } } }, orderBy: { updatedAt: "desc" } });
    res.json(items);
  } catch (e) { next(e); }
});
app.post("/api/collection", [
  body("figureId").isInt({ min: 1 }), body("quantity").optional().isInt({ min: 1 }),
  body("condition").optional().isString(), body("notes").optional().isString()
], handleValidation, async (req, res, next) => {
  try {
    const figureId = Number(req.body.figureId);
    const figure = await prisma.figure.findUnique({ where: { id: figureId } });
    if (!figure) return res.status(404).json({ message: "Figur tidak ditemukan." });
    const item = await prisma.collectionItem.upsert({
      where: { figureId },
      update: { quantity: Number(req.body.quantity || 1), condition: req.body.condition || "Belum diisi", notes: req.body.notes || "" },
      create: { figureId, quantity: Number(req.body.quantity || 1), condition: req.body.condition || "Belum diisi", notes: req.body.notes || "" },
      include: { figure: { include: { series: true } } }
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});
app.put("/api/collection/:id", [
  param("id").isInt({ min: 1 }), body("quantity").optional().isInt({ min: 1 }),
  body("condition").optional().isString(), body("notes").optional().isString()
], handleValidation, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.collectionItem.update({
      where: { id },
      data: { ...(req.body.quantity !== undefined ? { quantity: Number(req.body.quantity) } : {}), ...(req.body.condition !== undefined ? { condition: req.body.condition } : {}), ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}) },
      include: { figure: { include: { series: true } } }
    });
    res.json(item);
  } catch (e) { next(e); }
});
app.delete("/api/collection/:id", param("id").isInt({ min: 1 }), handleValidation, async (req, res, next) => {
  try {
    await prisma.collectionItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Item koleksi dihapus." });
  } catch (e) { next(e); }
});

app.post("/api/uploads/image", (req, res, next) => {
  imageUpload.single("image")(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || "Upload gagal." });
    if (!req.file) return res.status(400).json({ message: "Pilih file gambar." });
    res.status(201).json({ imageUrl: `/uploads/${req.file.filename}` });
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "P2025") return res.status(404).json({ message: "Data tidak ditemukan." });
  if (err.code === "P2002") return res.status(409).json({ message: "Data tersebut sudah ada." });
  if (err.code === "P2003") return res.status(400).json({ message: "Series atau figur tidak valid." });
  res.status(500).json({ message: "Terjadi kesalahan server.", detail: process.env.NODE_ENV === "development" ? err.message : undefined });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Hirono Archive API berjalan di http://localhost:${PORT}`));
