import fs from "fs";
import path from "path";
import multer from "multer";
import ApiError from "../utils/ApiError.js";

// File uploads (for example vehicle documents). Not wired to any route yet.
//   router.post("/:id/documents", upload.array("documents", 5), controller.addDocuments);
const folder = path.resolve("uploads");
fs.mkdirSync(folder, { recursive: true });

const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

export default multer({
  storage: multer.diskStorage({
    destination: folder,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(ApiError.badRequest("Only PDF, JPG or PNG files are allowed.")),
});
