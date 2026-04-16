import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKEND_DIR = __dirname;
export const PORT = Number.parseInt(process.env.PORT || "5000", 10);
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
export const UPLOAD_DIR = path.join(BACKEND_DIR, "storage", "uploads");
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
