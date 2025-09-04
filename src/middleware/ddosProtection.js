import logger from '../config/logger.js';

// In-memory store for request counts per IP
const ipStats = new Map();
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 1000; // 1 second window for burst checks
const THRESHOLD_PER_SECOND = 10; // >10 req/sec considered aggressive
const SUSTAIN_DURATION_MS = 30 * 1000; // must sustain 30 seconds to trigger block

function getNow() { return Date.now(); }

export function ddosProtection(req, res, next) {
  // Test bypass: only allowed in non-production and when explicitly asked
  if (process.env.NODE_ENV !== 'production' && req.headers['x-test-bypass-ddos'] === 'true') {
    return next();
  }

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = getNow();

  let record = ipStats.get(ip);
  if (!record) {
    record = {
      blockedUntil: 0,
      windows: [], // { start, count }
      firstAggressiveAt: null,
      aggressive: false,
      blockHistory: [],
      strikes: 0,
    };
    ipStats.set(ip, record);
  }

  // If currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    const remainingMs = record.blockedUntil - now;
    const remainingMin = Math.ceil(remainingMs / 60000);
    logger.warn('🚫 DDoS: IP bị khóa', { ip, remainingMs, remainingMin, path: req.originalUrl, method: req.method });
    return res.status(429).json({
      status: 'error',
      message: 'IP của bạn đã bị tạm khóa do hoạt động bất thường. Vui lòng thử lại sau 15 phút',
      data: { remainingMs, remainingMin }
    });
  }

  // Slide window of 1s buckets
  const currentWindowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const lastWindow = record.windows[record.windows.length - 1];
  if (!lastWindow || lastWindow.start !== currentWindowStart) {
    // keep only last 35 buckets (a bit > 30s)
    record.windows.push({ start: currentWindowStart, count: 0 });
    while (record.windows.length > 40) record.windows.shift();
  }
  record.windows[record.windows.length - 1].count++;

  // Determine aggressive behavior: > THRESHOLD_PER_SECOND in the last bucket
  const recentBucket = record.windows[record.windows.length - 1];
  const isAggressiveNow = recentBucket.count > THRESHOLD_PER_SECOND;

  if (isAggressiveNow) {
    if (!record.firstAggressiveAt) record.firstAggressiveAt = now;
  } else {
    // reset if a calm second occurs
    record.firstAggressiveAt = null;
  }

  // If aggressive sustained >= 30s -> block
  if (record.firstAggressiveAt && now - record.firstAggressiveAt >= SUSTAIN_DURATION_MS) {
    const penaltyMultiplier = Math.min(1 + record.strikes * 0.5, 3); // progressive penalty up to 3x
    const blockMs = Math.floor(BLOCK_DURATION_MS * penaltyMultiplier);
    record.blockedUntil = now + blockMs;
    record.strikes += 1;
    record.blockHistory.push({ at: now, durationMs: blockMs });
    logger.warn('🛡️ DDoS: Khóa IP do lưu lượng bất thường', { ip, blockMs, strikes: record.strikes, path: req.originalUrl });

    return res.status(429).json({
      status: 'error',
      message: 'IP của bạn đã bị tạm khóa do hoạt động bất thường. Vui lòng thử lại sau 15 phút',
      data: { blockMs, strikes: record.strikes }
    });
  }

  next();
}

// Optional: cleanup job to remove old windows
setInterval(() => {
  const now = getNow();
  for (const [ip, rec] of ipStats.entries()) {
    rec.windows = rec.windows.filter(w => now - w.start <= 60 * 1000);
    if (!rec.blockedUntil && rec.windows.length === 0 && rec.strikes === 0) {
      ipStats.delete(ip);
    }
  }
}, 60 * 1000);

