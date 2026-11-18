import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const LEVELS = [0.05, 0.25, 0.5, 0.75, 0.95];
const Z = [-1.645, -0.674, 0, 0.674, 1.645];
const HOUR_MS = 3_600_000;
const MIN_RATIOS = 8;
const FLOOR = 1;
const CEILING = 1_000_000_000;
const DEFAULT_SPREAD_K = 0.6;
const DEFAULT_SHIFT = 0.04;

function tuningNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const SPREAD_K = tuningNumber('GTA_SPREAD_K', DEFAULT_SPREAD_K);
const SHIFT = tuningNumber('GTA_SHIFT', DEFAULT_SHIFT);

function round2(value) {
  return Math.round(value * 100) / 100;
}

function quantile(sorted, tau) {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * tau;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] + weight * (sorted[upper] - sorted[lower]);
}

function elapsedRows(comparable) {
  const start = Date.parse(comparable.day_start);
  const rows = new Map();
  if (!Number.isFinite(start) || !Array.isArray(comparable.hourly)) return { start, rows };
  for (const row of comparable.hourly) {
    const at = Date.parse(row.from);
    const viewers = row.viewers;
    if (Number.isFinite(at) && typeof viewers === 'number' && Number.isFinite(viewers)) {
      rows.set(at, viewers);
    }
  }
  return { start, rows };
}

function baselineRow(p, hour) {
  const width = 0.15 * Math.sqrt(hour - 1);
  return Z.map((z) => p * Math.exp(z * width));
}

function empiricalRow(p, hour, comparables) {
  const ratios = [];
  for (const comparable of comparables) {
    const { start, rows } = elapsedRows(comparable);
    if (!Number.isFinite(start)) continue;
    const first = rows.get(start);
    const later = rows.get(start + (hour - 1) * HOUR_MS);
    if (typeof first !== 'number' || typeof later !== 'number') continue;
    if (!(first > 0) || !(later > 0)) continue;
    const ratio = Math.log(later / first);
    if (Number.isFinite(ratio)) ratios.push(ratio);
  }
  if (ratios.length < MIN_RATIOS) return baselineRow(p, hour);
  ratios.sort((a, b) => a - b);
  const logs = LEVELS.map((tau) => quantile(ratios, tau));
  const mid = quantile(ratios, 0.5);
  return logs.map((logq) => p * Math.exp(SHIFT + mid + SPREAD_K * (logq - mid)));
}

function clean(values) {
  const out = [];
  for (const raw of values) {
    let value = Number.isFinite(raw) ? raw : FLOOR;
    value = Math.min(CEILING, Math.max(FLOOR, value));
    if (out.length > 0 && value < out[out.length - 1]) value = out[out.length - 1];
    out.push(value);
  }
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.min(CEILING, Math.max(FLOOR, round2(out[i])));
    if (i > 0 && out[i] < out[i - 1]) out[i] = out[i - 1];
  }
  return out;
}

function forecastCase(caseData) {
  const known = Array.isArray(caseData.known)
    ? caseData.known.find((row) => row && row.hour === 1 && typeof row.viewers === 'number')
    : undefined;
  if (!known || !Number.isFinite(known.viewers)) throw new Error('no hour-1 print');
  const p = Math.max(FLOOR, known.viewers);
  const comparables = Array.isArray(caseData.comparables) ? caseData.comparables : [];
  const hours = [];
  for (let hour = 2; hour <= 24; hour++) {
    hours.push({ hour, q: clean(empiricalRow(p, hour, comparables)) });
  }
  return `${JSON.stringify({ hours })}\n`;
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const files = readdirSync(INPUT_DIR).filter((name) => name.endsWith('.in')).sort();
for (const file of files) {
  const id = file.slice(0, -3);
  try {
    const caseData = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8'));
    writeFileSync(join(OUTPUT_DIR, `${id}.out`), forecastCase(caseData));
  } catch (error) {
    process.stderr.write(`${file}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
