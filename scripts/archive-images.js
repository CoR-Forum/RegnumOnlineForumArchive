#!/usr/bin/env node
// Downloads all third-party images embedded in forum posts so they survive
// their original hosts going offline. Images that are already gone are
// fetched from the Wayback Machine instead.
//
// The run is resumable: every URL's outcome is stored in
// <IMAGE_ARCHIVE_DIR>/index.db and successful downloads are skipped next time.
//
// Usage: node scripts/archive-images.js [options]
//   --retry-failed     Retry URLs that failed in a previous run
//   --no-wayback       Do not fall back to the Wayback Machine
//   --concurrency N    Parallel downloads from original hosts (default 8)
//   --limit N          Only process N URLs (for testing)
//   --dry-run          Only report how many image URLs were found
//
// Environment: DB_PATH (forum database), IMAGE_ARCHIVE_DIR (output directory)

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { Parser } from 'htmlparser2';
import { IMAGE_ARCHIVE_DIR, IMAGE_ARCHIVE_INDEX, normalizeImageUrl } from '../src/utils/imageArchive.js';

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const options = {
  retryFailed: args.includes('--retry-failed'),
  wayback: !args.includes('--no-wayback'),
  dryRun: args.includes('--dry-run'),
  concurrency: argValue('--concurrency', 8),
  limit: argValue('--limit', Infinity)
};

const DB_PATH = process.env.DB_PATH || './regnumforum.db';
const TIMEOUT_MS = 30_000;
const MAX_BYTES = 25 * 1024 * 1024;
const USER_AGENT = 'Mozilla/5.0 (compatible; RegnumForumArchive/1.0; +https://github.com/CoR-Forum/RegnumOnlineForumArchive)';
// Wayback snapshot closest to the forum's heyday, "id_" returns the raw file
const WAYBACK_PREFIX = 'https://web.archive.org/web/2010id_/';
// The same image served for many different URLs of one host is almost
// certainly a "this image has been removed" placeholder (e.g. Photobucket)
const PLACEHOLDER_MIN_URLS = 10;
// Dead image hosts often redirect to a placeholder instead of returning 404
const PLACEHOLDER_REDIRECT = /(^|[\/_.-])(404|notfound|not[_-]found|removed|unavailable|deleted|lost|missing|placeholder|bandwidth|error)([\/_.-]|$)/i;

// ---------------------------------------------------------------------------
// SQLite helpers

function openDb(file, mode) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, mode, err => (err ? reject(err) : resolve(db)));
  });
}
const run = (db, sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }));
const all = (db, sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));

// ---------------------------------------------------------------------------
// Collect image URLs from all posts

async function collectImageUrls() {
  const forumDb = await openDb(DB_PATH, sqlite3.OPEN_READONLY);
  const urls = new Set();
  let posts = 0;

  const parser = new Parser({
    onopentag(name, attribs) {
      if (name !== 'img') return;
      const url = normalizeImageUrl(attribs.src);
      if (url) urls.add(url);
    }
  }, { decodeEntities: true });

  await new Promise((resolve, reject) => {
    forumDb.each(
      "SELECT message FROM posts WHERE message LIKE '%<img%'",
      (err, row) => {
        if (err) return reject(err);
        posts++;
        parser.write(row.message || '');
        parser.write('\n');
      },
      err => (err ? reject(err) : resolve())
    );
  });
  parser.end();
  forumDb.close();

  console.log(`Found ${urls.size} unique image URLs in ${posts} posts`);
  return urls;
}

// ---------------------------------------------------------------------------
// Downloading

// Detect the image type from the file's magic bytes; servers of that era
// often send wrong content types, and dead hosts return HTML error pages.
function detectImageType(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  const ascii = buf.subarray(0, 12).toString('latin1');
  if (hex.startsWith('ffd8ff')) return 'jpg';
  if (hex.startsWith('89504e470d0a1a0a')) return 'png';
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'gif';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
  if (ascii.startsWith('BM')) return 'bmp';
  if (hex.startsWith('00000100')) return 'ico';
  const head = buf.subarray(0, 1024).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return null;
}

async function readLimited(res) {
  const declared = Number(res.headers.get('content-length'));
  if (declared > MAX_BYTES) throw new Error(`too large (${declared} bytes)`);
  const chunks = [];
  let size = 0;
  for await (const chunk of res.body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error('too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Fetch a URL and return { buffer, ext } or throw with a readable reason
async function fetchImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'image/*,*/*;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) {
    res.body?.cancel().catch(() => {});
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  if (res.redirected && PLACEHOLDER_REDIRECT.test(new URL(res.url).pathname)) {
    res.body?.cancel().catch(() => {});
    throw new Error(`redirected to placeholder ${res.url}`);
  }
  const buffer = await readLimited(res);
  const ext = detectImageType(buffer);
  if (!ext) throw new Error(`not an image (${res.headers.get('content-type') || 'unknown type'})`);
  return { buffer, ext, status: res.status };
}

async function fetchFromOrigin(url) {
  try {
    return await fetchImage(url);
  } catch (err) {
    // Many old hosts have broken TLS; try plain http before giving up
    if (url.startsWith('https://') && !err.status) {
      return fetchImage('http://' + url.slice(8));
    }
    throw err;
  }
}

// The Wayback Machine rate limits aggressively, so requests are serialized
let waybackQueue = Promise.resolve();
function fetchFromWayback(url) {
  const attempt = async () => {
    for (let tries = 0; ; tries++) {
      try {
        return await fetchImage(WAYBACK_PREFIX + url);
      } catch (err) {
        if (err.status === 429 && tries < 3) {
          await new Promise(r => setTimeout(r, 30_000 * (tries + 1)));
          continue;
        }
        throw err;
      }
    }
  };
  const result = waybackQueue.then(attempt);
  waybackQueue = result.catch(() => {}).then(() => new Promise(r => setTimeout(r, 1000)));
  return result;
}

// Store under a content hash so identical images are only kept once
function saveImage(buffer, ext) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const file = `${hash.slice(0, 2)}/${hash}.${ext}`;
  const target = path.join(IMAGE_ARCHIVE_DIR, file);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, target);
  }
  return { file, hash };
}

async function archiveUrl(index, url, { skipOrigin = false } = {}) {
  const now = new Date().toISOString();
  const host = new URL(url).hostname;
  const errors = [];
  const sources = [];
  if (!skipOrigin) sources.push(['origin', () => fetchFromOrigin(url)]);
  if (options.wayback) sources.push(['wayback', () => fetchFromWayback(url)]);

  for (const [source, fetcher] of sources) {
    try {
      const { buffer, ext, status } = await fetcher();
      const { file, hash } = saveImage(buffer, ext);
      await run(index, `
        INSERT INTO images (url, host, status, source, file, sha256, bytes, http_status, error, attempts, updated_at)
        VALUES (?, ?, 'ok', ?, ?, ?, ?, ?, NULL, 1, ?)
        ON CONFLICT(url) DO UPDATE SET status = 'ok', source = excluded.source, file = excluded.file,
          sha256 = excluded.sha256, bytes = excluded.bytes, http_status = excluded.http_status,
          error = NULL, attempts = attempts + 1, updated_at = excluded.updated_at`,
        [url, host, source, file, hash, buffer.length, status, now]);
      return source;
    } catch (err) {
      errors.push(`${source}: ${err.cause?.code || err.message}`);
    }
  }

  await run(index, `
    INSERT INTO images (url, host, status, error, attempts, updated_at)
    VALUES (?, ?, 'failed', ?, 1, ?)
    ON CONFLICT(url) DO UPDATE SET status = 'failed', source = NULL, file = NULL, sha256 = NULL,
      bytes = NULL, error = excluded.error, attempts = attempts + 1, updated_at = excluded.updated_at`,
    [url, host, errors.join('; '), now]);
  return null;
}

async function runPool(items, concurrency, worker) {
  let next = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
      done++;
      if (done % 100 === 0 || done === items.length) {
        console.log(`  ${done}/${items.length}`);
      }
    }
  });
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------

async function openIndex() {
  fs.mkdirSync(IMAGE_ARCHIVE_DIR, { recursive: true });
  const index = await openDb(IMAGE_ARCHIVE_INDEX, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  await run(index, 'PRAGMA busy_timeout = 10000');
  await run(index, `
    CREATE TABLE IF NOT EXISTS images (
      url TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      status TEXT NOT NULL,        -- ok | failed | placeholder
      source TEXT,                 -- origin | wayback
      file TEXT,                   -- path relative to the archive directory
      sha256 TEXT,
      bytes INTEGER,
      http_status INTEGER,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`);
  await run(index, `
    CREATE TABLE IF NOT EXISTS placeholders (
      host TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      PRIMARY KEY (host, sha256)
    )`);
  await run(index, 'CREATE INDEX IF NOT EXISTS idx_images_host_sha ON images (host, sha256)');
  return index;
}

// Mark origin downloads that turned out to be a host's generic placeholder
// and try to get the real image from the Wayback Machine instead.
async function handlePlaceholders(index) {
  const groups = await all(index, `
    SELECT host, sha256, COUNT(*) AS urls FROM images
    WHERE status = 'ok' AND source = 'origin'
    GROUP BY host, sha256 HAVING COUNT(*) >= ?`, [PLACEHOLDER_MIN_URLS]);
  for (const { host, sha256, urls } of groups) {
    console.log(`Placeholder detected: ${host} served the same image for ${urls} URLs`);
    await run(index, 'INSERT OR IGNORE INTO placeholders (host, sha256) VALUES (?, ?)', [host, sha256]);
  }

  // Also catches new URLs matching placeholders found in earlier runs
  const rows = await all(index, `
    SELECT url FROM images i JOIN placeholders p ON p.host = i.host AND p.sha256 = i.sha256
    WHERE i.status = 'ok' AND i.source = 'origin'`);
  if (rows.length === 0) return;
  const urls = rows.map(r => r.url);
  await run(index, `UPDATE images SET status = 'placeholder'
    WHERE status = 'ok' AND source = 'origin' AND (host, sha256) IN (SELECT host, sha256 FROM placeholders)`);

  if (options.wayback) {
    console.log(`Retrying ${urls.length} placeholder images via the Wayback Machine...`);
    await runPool(urls, options.concurrency, async url => {
      if (!(await archiveUrl(index, url, { skipOrigin: true }))) {
        await run(index, "UPDATE images SET status = 'placeholder' WHERE url = ?", [url]);
      }
    });
  }
}

async function main() {
  console.log(`Forum database: ${path.resolve(DB_PATH)}`);
  console.log(`Image archive:  ${IMAGE_ARCHIVE_DIR}`);

  const urls = await collectImageUrls();
  if (options.dryRun) return;

  const index = await openIndex();
  const known = new Map((await all(index, 'SELECT url, status FROM images')).map(r => [r.url, r.status]));
  const todo = [...urls]
    .filter(url => {
      const status = known.get(url);
      if (!status) return true;
      return options.retryFailed && status !== 'ok';
    })
    .slice(0, options.limit);

  console.log(`${urls.size - todo.length} already processed, downloading ${todo.length}...`);

  const stats = { origin: 0, wayback: 0, failed: 0 };
  await runPool(todo, options.concurrency, async url => {
    const source = await archiveUrl(index, url);
    stats[source || 'failed']++;
  });

  await handlePlaceholders(index);

  const summary = await all(index, 'SELECT status, source, COUNT(*) AS n FROM images GROUP BY status, source');
  index.close();

  console.log(`\nThis run: ${stats.origin} from original host, ${stats.wayback} from Wayback Machine, ${stats.failed} failed`);
  console.log('Archive totals:');
  for (const { status, source, n } of summary) {
    console.log(`  ${status}${source ? ` (${source})` : ''}: ${n}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
