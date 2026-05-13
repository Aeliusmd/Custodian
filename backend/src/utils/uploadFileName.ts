import path from "path";

/** Safe basename for stored objects (no path segments, limited charset). */
export const sanitizeStoredFileName = (name: string): string => {
  const base = path.basename(name).replace(/[^\w.\-()\s[\]]+/g, "_").replace(/\s+/g, " ").trim();
  const clipped = base.slice(0, 180);
  return clipped.length > 0 ? clipped : "document.bin";
};
