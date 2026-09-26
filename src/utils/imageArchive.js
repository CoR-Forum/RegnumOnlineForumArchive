import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directory holding downloaded third-party images plus their index (index.db)
export const IMAGE_ARCHIVE_DIR = path.resolve(
  process.env.IMAGE_ARCHIVE_DIR || path.join(__dirname, '../../archived-images')
);
export const IMAGE_ARCHIVE_INDEX = path.join(IMAGE_ARCHIVE_DIR, 'index.db');
export const IMAGE_ARCHIVE_URL_PREFIX = '/archived-images/';

const RELOAD_INTERVAL_MS = 5 * 60 * 1000;

// Normalize an <img src> value into the key used by the archive index.
// Returns null for anything that is not an absolute http(s) URL.
export function normalizeImageUrl(src) {
  if (!src) return null;
  let url = String(src).trim();
  if (url.startsWith('//')) url = 'http:' + url;
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// url -> relative file path of the local copy
let imageMap = new Map();
let loadedMtime = 0;
let loading = false;

function loadImageMap() {
  if (loading) return;

  let mtime;
  try {
    mtime = fs.statSync(IMAGE_ARCHIVE_INDEX).mtimeMs;
  } catch {
    return; // No archive yet
  }
  if (mtime === loadedMtime) return;

  loading = true;
  const db = new sqlite3.Database(IMAGE_ARCHIVE_INDEX, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      loading = false;
      console.warn('Could not open image archive index:', err.message);
      return;
    }
    db.all("SELECT url, file FROM images WHERE status = 'ok'", (err, rows) => {
      db.close();
      loading = false;
      if (err) {
        console.warn('Could not read image archive index:', err.message);
        return;
      }
      imageMap = new Map(rows.map(row => [row.url, row.file]));
      loadedMtime = mtime;
      console.log(`🖼️  Loaded ${imageMap.size} archived images`);
    });
  });
}

export function initImageArchive() {
  loadImageMap();
  // Pick up images downloaded while the server is running
  setInterval(loadImageMap, RELOAD_INTERVAL_MS).unref();
}

// Returns the local URL for an archived image, or null if it is not archived
export function getArchivedImageUrl(src) {
  const url = normalizeImageUrl(src);
  if (!url) return null;
  const file = imageMap.get(url);
  return file ? IMAGE_ARCHIVE_URL_PREFIX + file : null;
}
