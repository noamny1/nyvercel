const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "avi", "mkv", "wmv", "mpg", "mpeg", "flv", "3gp", "ogv", "m3u8", "ts", "qt"]);
const VIEW_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
};

export const VIEW_FILE_LIMIT = 4 * 1024 * 1024;

export function fileExtension(name: string) {
  const clean = name.split(/[/\\]/).pop() || "";
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
}

function looksLikeVideo(buf: Buffer) {
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp") return true;
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "AVI ") return true;
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true;
  return false;
}

function magicMatches(ext: string, buf: Buffer) {
  if (ext === "pdf") return buf.subarray(0, 4).toString("ascii") === "%PDF";
  if (ext === "png") return buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (ext === "jpg" || ext === "jpeg") return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === "gif") return buf.subarray(0, 4).toString("ascii") === "GIF8";
  if (ext === "webp") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  if (ext === "txt") return !buf.includes(0);
  return false;
}

export function viewFileError(file: File, head: Buffer) {
  const ext = fileExtension(file.name);
  if (file.type.startsWith("video/") || VIDEO_EXT.has(ext) || looksLikeVideo(head)) {
    return "אי אפשר להעלות סרטון או סרט. הברקוד מיועד לצפייה בקובץ, לא להעברת סרטים.";
  }
  const mime = VIEW_EXT[ext];
  if (!mime || !magicMatches(ext, head)) {
    return "אפשר להעלות רק קובץ שאפשר לראות על המסך: תמונה, PDF או טקסט. לא קבצים להורדה, כדי שהאתר לא ישמש להעברת קבצים.";
  }
  if (file.size > VIEW_FILE_LIMIT) return "הקובץ גדול מ־4 מגה. בחרו קובץ קטן יותר לצפייה.";
  return "";
}

export function viewMime(name: string) {
  return VIEW_EXT[fileExtension(name)] || "";
}

export function safeFileTitle(name: string) {
  const base = (name.split(/[/\\]/).pop() || "קובץ").replace(/[\u0000-\u001f]/g, "").trim();
  return base.slice(0, 80) || "קובץ";
}
