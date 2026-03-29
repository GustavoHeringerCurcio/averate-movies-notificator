import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'ratings-cache.json');

const INITIAL_STORE = {
  version: 1,
  monthKey: '',
  requestsUsed: 0,
  lastRefreshAt: null,
  ratingsByImdbId: {},
};

function getMonthKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function normalizeStore(rawStore) {
  const safe = rawStore && typeof rawStore === 'object' ? rawStore : {};

  return {
    version: 1,
    monthKey: typeof safe.monthKey === 'string' ? safe.monthKey : getMonthKey(),
    requestsUsed: Number.isFinite(Number(safe.requestsUsed)) ? Number(safe.requestsUsed) : 0,
    lastRefreshAt: safe.lastRefreshAt || null,
    ratingsByImdbId:
      safe.ratingsByImdbId && typeof safe.ratingsByImdbId === 'object'
        ? safe.ratingsByImdbId
        : {},
  };
}

async function ensureStorePath() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(INITIAL_STORE, null, 2), 'utf8');
  }
}

export async function readRatingsStore() {
  await ensureStorePath();
  const content = await fs.readFile(STORE_PATH, 'utf8');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = INITIAL_STORE;
  }

  return normalizeStore(parsed);
}

export async function writeRatingsStore(store) {
  await ensureStorePath();
  const normalized = normalizeStore(store);
  await fs.writeFile(STORE_PATH, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

export function resetMonthlyQuotaIfNeeded(store, now = new Date()) {
  const monthKey = getMonthKey(now);

  if (store.monthKey === monthKey) {
    return store;
  }

  return {
    ...store,
    monthKey,
    requestsUsed: 0,
  };
}
