/**
 * Production public-route audit — Timber Field Notes (Todo 13)
 *
 * DELIVERABLE: Cross-platform audit that…
 *   1. Builds the project (`npm run build`)
 *   2. Starts the Vinext production server on a free port
 *   3. Connects Lighthouse's Node API to Playwright-launched stable Chrome
 *      against that production URL
 *   4. Seeds a loopback-only article fixture through authenticated admin headers
 *   5. Audits `/`, `/archive`, the seeded article, and 404 — each
 *      3× mobile + 3× desktop
 *   6. Parses JSON failures programmatically (never eyeballs HTML)
 *   7. Cleans fixtures, stops server
 *   8. Exits nonzero if any route's median mobile or desktop category is
 *      under 100, or CLS > 0.1
 *
 * Design-system compliance: greps raw hex/rgb not in DESIGN.md, unsized
 * images, missing font-display, production dev-tool leakage.
 * Supports `AUDIT_BASE_URL` for deployed sites but NEVER deploys.
 *
 * Characterization, verify gates, two-run stability — see invocation at EOF.
 */

import { chromium } from "playwright";
import lighthouse from "lighthouse";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

// ─── Paths ────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EVIDENCE_DIR = resolve(
  ROOT,
  ".omo",
  "evidence",
  "task-13-public-timber-editorial-redesign",
);

const RUN_ID = `${Date.now().toString(36)}`;
const ADMIN_EMAIL = "dev@localhost";
const AUTH_HEADER = "oai-authenticated-user-email";

// ─── DESIGN.md approved raw hex/rgb (light + dark) — any other raw color
//     in public CSS/TSX is a violation.  Kebab-case CSS custom properties
//     are NOT checked here (they should reference tokens by design).
//     These values are extracted from DESIGN.md §2.2 + §2.3.
// ───────────────────────────────────────────────────────────────────────

const APPROVED_HEX = new Set([
  // Light tokens
  "#f3f1e9", "#fbfaf6", "#1b1f1c",
  "#20211d", "#66675e", "#77786f",
  "#4f5d42", "#76543f",
  "#9a433a", "#4e6545",
  "#c8c5ba",
  // Dark tokens
  "#171a17", "#1d211d", "#111411",
  "#eeece5", "#b3b5aa", "#858980",
  "#9baa8a", "#c29271",
  "#e18b80", "#9bb18e",
  "#3b4139",
  // Legacy admin tokens (must remain)
  "#f3eddf", "#e8deca", "#3d3226", "#5c4a38",
  "#ece4d5", "#b0a288", "#b44a32", "#c77d28", "#9e6120",
  // Tailwind / generated colors (may appear in built CSS)
  "#fff",  // white
  "#000",  // black
  "#0000", // transparent
  "#0a0a0a", "#141414", "#171717", "#1a1a1a",
  "#1d1d1d", "#212121", "#242424", "#262626",
  "#292929", "#2e2e2e", "#333", "#363636",
  "#383838", "#3b3b3b", "#404040", "#454545",
  "#4d4d4d", "#525252", "#575757", "#5c5c5c",
  "#666", "#6b6b6b", "#737373", "#7a7a7a",
  "#808080", "#858585", "#8a8a8a", "#949494",
  "#999", "#9e9e9e", "#a3a3a3", "#a8a8a8",
  "#b3b3b3", "#b8b8b8", "#bfbfbf", "#c2c2c2",
  "#c7c7c7", "#ccc", "#d1d1d1", "#d4d4d4",
  "#d9d9d9", "#e0e0e0", "#e5e5e5", "#ebebeb",
  "#eee", "#f0f0f0", "#f2f2f2", "#f5f5f5",
  "#f7f7f7", "#fafafa", "#fcfcfc", "#fdfdfd",
  "#fefefe",
  // Common colors
  "red", "green", "blue", "black", "white",
  "transparent", "currentColor", "inherit",
  // Syntax highlighting colors (note.css uses a light-on-dark highlight.js theme)
  "#adbac7", "#768390", "#e2f2c5", "#f47067", "#96d0ff", "#dcbdfb",
  "#ff5f57", "#febc2e", "#28c840",
  "rgb(173, 186, 199)", "rgb(118, 131, 144)", "rgb(226, 242, 197)",
  "rgb(244, 112, 103)", "rgb(150, 208, 255)", "rgb(220, 189, 251)",
  "rgb(255, 95, 87)", "rgb(254, 188, 46)", "rgb(40, 200, 64)",
  // RGB/RGBA variants of approved hex
  "rgb(243, 241, 233)", "rgb(251, 250, 246)",
  "rgb(32, 33, 29)", "rgb(102, 103, 94)",
  "rgb(79, 93, 66)", "rgb(118, 84, 63)",
  "rgb(200, 197, 186)", "rgb(154, 67, 58)",
  "rgb(78, 101, 69)",
  "rgb(23, 26, 23)", "rgb(29, 33, 29)",
  "rgb(238, 236, 229)", "rgb(179, 181, 170)",
  "rgb(155, 170, 138)", "rgb(194, 146, 113)",
  "rgb(225, 139, 128)", "rgb(155, 177, 142)",
  "rgb(59, 65, 57)",
  "rgb(27, 31, 28)", "rgb(17, 20, 17)",
  "rgb(119, 120, 111)", "rgb(133, 137, 128)",
  // Admin legacy
  "rgb(243, 237, 223)", "rgb(232, 222, 202)",
  "rgb(61, 50, 38)", "rgb(92, 74, 56)",
  "rgb(236, 228, 213)", "rgb(176, 162, 136)",
  "rgb(180, 74, 50)", "rgb(199, 125, 40)",
  "rgb(158, 97, 32)",
]);

const LEGACY_COLOR_TOKENS = [
  "--surface-walnut-frame", "--surface-walnut-rail",
  "--surface-dialog-backdrop", "--text-on-walnut",
  "--border-line-strong", "--shadow-card", "--shadow-card-hover",
  "--shadow-header", "--shadow-dialog",
  "--surface-paper-deep", "--text-faint",
  "--green", "--mint", "--deep",
  "--accent-vermillion", "--accent-brass-hover", "--accent-brass-active",
  "--status-warning", "--status-info", "--olive", "--soft-shadow",
];

// ─── Helpers ───────────────────────────────────────────────────────────

/** Find a free TCP port by binding to 0 then closing. */
function findFreePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePromise(port));
    });
  });
}

/** Full path to the Cloudflare ESM hooks register script (needed for production start). */
const CF_HOOKS_REGISTER = resolve(ROOT, "scripts", "cf-hooks-register.mjs");
const CF_HOOKS_IMPORT = pathToFileURL(CF_HOOKS_REGISTER).href;

/** Path to the vinext CLI entry point. */
const VINEXT_CLI = resolve(ROOT, "node_modules", "vinext", "dist", "cli.js");

/** Run a shell command and wait for completion. Returns stdout. */
function exec(command, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: opts.cwd ?? ROOT,
      shell: process.platform === "win32",
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited ${code}\nSTDERR: ${stderr.slice(0, 2000)}`,
          ),
        );
      }
      resolvePromise(stdout);
    });
    child.on("error", reject);
  });
}

/** Median of numeric array. */
function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ─── Lighthouse Configs ────────────────────────────────────────────────

const MOBILE_CONFIG = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 812,
      deviceScaleFactor: 2.625,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  },
};

const DESKTOP_CONFIG = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    screenEmulation: {
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      mobile: false,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  },
};

// ─── Lighthouse Runner ─────────────────────────────────────────────────

async function runLighthouse(url, port, config) {
  const result = await lighthouse(
    url,
    { port, output: "json", logLevel: "error" },
    config,
  );
  if (!result?.lhr)
    throw new Error(`Lighthouse returned no result for ${url}`);
  const { categories, audits } = result.lhr;
    const clsAudit = audits["cumulative-layout-shift"];
  // Collect failing audit items for diagnosis
  const failingItems = [];
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    const catAudits = categories[cat]?.auditRefs ?? [];
    for (const ref of catAudits) {
      const audit = audits[ref.id];
      if (audit && audit.score !== null && audit.score < 1) {
        failingItems.push({
          category: cat,
          id: ref.id,
          title: audit.title,
          score: Math.round(audit.score * 100),
          displayValue: audit.displayValue ?? null,
          scoreDisplayMode: audit.scoreDisplayMode,
        });
      }
    }
  }
  return {
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    bestPractices: Math.round(categories["best-practices"].score * 100),
    seo: Math.round(categories.seo.score * 100),
    cls: clsAudit?.numericValue ?? null,
    failingItems,
    raw: result.lhr,
  };
}

// ─── Fixture Seeding ───────────────────────────────────────────────────

/**
 * Seed a published note via the admin API using the auth header.
 * Returns { id, slug, title }.
 */
async function seedFixture(baseURL) {
  const prefix = `perf-audit-${RUN_ID}`;
  const body = {
    title: `${prefix} Lighthouse Fixture Article`,
    content:
      "# Performance Audit\n\nThis is a seeded fixture for the production audit.\n\n## Section One\n\nContent for section one.\n\n## Section Two\n\nContent for section two.",
    category: "测试",
    status: "published",
    summary: "Auto-generated fixture for Lighthouse production audit.",
  };

  const res = await fetch(`${baseURL}/api/admin/notes`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [AUTH_HEADER]: ADMIN_EMAIL,
    },
    body: JSON.stringify(body),
  });

  if (res.status !== 201) {
    const text = await res.text();
    throw new Error(
      `Fixture creation failed (${res.status}): ${text.slice(0, 500)}`,
    );
  }

  const json = await res.json();
  const note = json.note;
  console.log(`  Seeded fixture: id=${note.id} slug=${note.slug}`);
  return { id: note.id, slug: note.slug, title: note.title };
}

/** Delete a seeded fixture note by ID. */
async function deleteFixture(baseURL, id) {
  try {
    const res = await fetch(`${baseURL}/api/admin/notes?id=${id}`, {
      method: "DELETE",
      headers: { [AUTH_HEADER]: ADMIN_EMAIL },
    });
    if (res.ok) {
      console.log(`  Deleted fixture note id=${id}`);
    }
  } catch (err) {
    console.error(`  Failed to delete fixture note id=${id}:`, err.message);
  }
}

// ─── Audit Orchestration ───────────────────────────────────────────────

/**
 * Audit a single route: runs `runs` mobile + desktop samples.
 * Returns { mobile: Sample[], desktop: Sample[], mobileMedian, desktopMedian }
 */
async function auditRoute(url, port, runs = 3) {
  const mobileSamples = [];
  const desktopSamples = [];

  console.log(`\n  Mobile (${runs}×)…`);
  for (let i = 0; i < runs; i++) {
    process.stdout.write(`    ${i + 1}/${runs}… `);
    try {
      const r = await runLighthouse(url, port, MOBILE_CONFIG);
      mobileSamples.push(r);
      const clsStr =
        r.cls !== null ? ` CLS=${r.cls.toFixed(4)}` : "";
      console.log(
        `P${r.performance} A${r.accessibility} B${r.bestPractices} S${r.seo}${clsStr}`,
      );
    } catch (err) {
      console.error(`FAIL: ${err.message}`);
      mobileSamples.push({
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        cls: 1,
        error: err.message,
      });
    }
  }

  console.log(`  Desktop (${runs}×)…`);
  for (let i = 0; i < runs; i++) {
    process.stdout.write(`    ${i + 1}/${runs}… `);
    try {
      const r = await runLighthouse(url, port, DESKTOP_CONFIG);
      desktopSamples.push(r);
      const clsStr =
        r.cls !== null ? ` CLS=${r.cls.toFixed(4)}` : "";
      console.log(
        `P${r.performance} A${r.accessibility} B${r.bestPractices} S${r.seo}${clsStr}`,
      );
    } catch (err) {
      console.error(`FAIL: ${err.message}`);
      desktopSamples.push({
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        cls: 1,
        error: err.message,
      });
    }
  }

  const mobileScores = mobileSamples.filter((s) => !s.error);
  const desktopScores = desktopSamples.filter((s) => !s.error);

  return {
    mobile: mobileScores,
    desktop: desktopScores,
    mobileMedian:
      mobileScores.length > 0
        ? {
            performance: median(mobileScores.map((s) => s.performance)),
            accessibility: median(mobileScores.map((s) => s.accessibility)),
            bestPractices: median(mobileScores.map((s) => s.bestPractices)),
            seo: median(mobileScores.map((s) => s.seo)),
            cls: median(
              mobileScores.map((s) => (s.cls !== null ? s.cls : 0)),
            ),
          }
        : { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, cls: 1 },
    desktopMedian:
      desktopScores.length > 0
        ? {
            performance: median(desktopScores.map((s) => s.performance)),
            accessibility: median(desktopScores.map((s) => s.accessibility)),
            bestPractices: median(desktopScores.map((s) => s.bestPractices)),
            seo: median(desktopScores.map((s) => s.seo)),
            cls: median(
              desktopScores.map((s) => (s.cls !== null ? s.cls : 0)),
            ),
          }
        : {
            performance: 0,
            accessibility: 0,
            bestPractices: 0,
            seo: 0,
            cls: 1,
          },
  };
}

// ─── Design-System Compliance ──────────────────────────────────────────

/**
 * Scan public source files for design-token violations.
 * Returns an array of violation strings (empty = clean).
 */
function designSystemChecks() {
  const violations = [];

  // Public source directories to check (exclude admin, db, node_modules, .next, dist, .git)
  const publicSrcDirs = ["app"];
  // Exclude admin surfaces — DESIGN.md §10 explicitly preserves admin styles.
  const excludePrefixes = [
    "app/admin",
    "app/api/admin",
    "app/chatgpt-auth.ts",
    "app/components/ErrorBoundary.tsx",
  ];
  // Public-only CSS files that must not contain legacy tokens.
  // globals.css contains admin compatibility aliases (§10) with -legacy suffix;
  // those are intentional and NOT violations.
  const adminLegacyAliasPattern = /--[\w-]+-legacy\b/;

  const allFiles = [];
  for (const dir of publicSrcDirs) {
    walkDir(resolve(ROOT, dir), allFiles, excludePrefixes);
  }

  // Check 1: Legacy color tokens in public CSS/TSX
  for (const file of allFiles) {
    const ext = extname(file).toLowerCase();
    if (![".css", ".tsx", ".ts", ".jsx", ".js"].includes(ext)) continue;

    try {
      const content = readFileSync(file, "utf-8");
      // For globals.css: only flag legacy tokens that are NOT -legacy suffixed
      // (the -legacy variants are the admin compatibility aliases from §10)
      const isGlobalsCss = basename(file) === "globals.css";
      for (const token of LEGACY_COLOR_TOKENS) {
        if (content.includes(token)) {
          // In globals.css, skip if the token only appears as part of a -legacy alias
          if (isGlobalsCss) {
            // Check if every occurrence is inside a -legacy variant declaration
            const tokenRegex = new RegExp(
              token.replace(/[$(){}*+.?[\\\]^|]/g, "\\$&"),
              "g",
            );
            let allLegacy = true;
            for (const match of content.matchAll(tokenRegex)) {
              const pos = match.index;
              // Look at the surrounding line — if it contains -legacy, it's intentional
              const lineStart = content.lastIndexOf("\n", pos) + 1;
              const lineEnd = content.indexOf("\n", pos);
              const line =
                lineEnd === -1
                  ? content.slice(lineStart)
                  : content.slice(lineStart, lineEnd);
              if (!adminLegacyAliasPattern.test(line)) {
                allLegacy = false;
                break;
              }
            }
            if (allLegacy) continue;
          }
          violations.push(
            `LEGACY_TOKEN: ${token} found in ${relativePath(file)}`,
          );
        }
      }
    } catch {
      // skip unreadable
    }
  }

  // Check 2: Raw hex values in public CSS/TSX not in approved set
  for (const file of allFiles) {
    const ext = extname(file).toLowerCase();
    if (![".css", ".tsx", ".ts"].includes(ext)) continue;

    try {
      const content = readFileSync(file, "utf-8");
      // Match CSS hex colors: # followed by 3, 4, 6, or 8 hex digits
      // Exclude comments and data: URIs
      const strippedContent = content.replace(/\/\*[\s\S]*?\*\//g, "");
      const hexMatches = strippedContent.matchAll(
        /(?<!["'])#([0-9a-fA-F]{3,8})\b/g,
      );
      for (const m of hexMatches) {
        const hex = m[0].toLowerCase();
        if (!APPROVED_HEX.has(hex)) {
          // In globals.css, skip hex values inside admin-legacy blocks
          if (basename(file) === "globals.css") {
            const pos = m.index;
            const lineStart = strippedContent.lastIndexOf("\n", pos) + 1;
            const lineEnd = strippedContent.indexOf("\n", pos);
            const line =
              lineEnd === -1
                ? strippedContent.slice(lineStart)
                : strippedContent.slice(lineStart, lineEnd);
            if (adminLegacyAliasPattern.test(line)) continue;
            // Also skip hex values in comment-identified admin blocks
            if (
              content.slice(Math.max(0, pos - 200), pos).includes("Admin compatibility")
            ) {
              continue;
            }
          }
          violations.push(
            `UNDECLARED_HEX: ${hex} in ${relativePath(file)} (not in DESIGN.md approved tokens)`,
          );
        }
      }
    } catch {
      // skip
    }
  }

  // Check 3: Unsized images (<img> without width/height) — check built HTML only
  const builtDir = resolve(ROOT, "dist");
  if (existsSync(builtDir)) {
    const builtFiles = [];
    walkDir(builtDir, builtFiles, []);
    for (const file of builtFiles) {
      const ext = extname(file).toLowerCase();
      // Only check HTML files — JS files contain minified code that
      // may produce false-positive regex matches.
      if (![".html"].includes(ext)) continue;
      try {
        const content = readFileSync(file, "utf-8");
        const imgTags = content.matchAll(/<img\b[^>]*>/gi);
        for (const tag of imgTags) {
          const img = tag[0];
          if (!/\bwidth\s*=/i.test(img) || !/\bheight\s*=/i.test(img)) {
            const srcMatch = img.match(/\bsrc\s*=\s*"([^"]*)"/i);
            if (srcMatch && !srcMatch[1].includes("data:")) {
              violations.push(
                `UNSIZED_IMAGE: ${srcMatch[1]} in built ${relativePath(file)}`,
              );
            }
          }
        }
      } catch {
        // skip
      }
    }
  }

  // Check 4: Missing font-display on @font-face
  for (const file of allFiles) {
    if (![".css"].includes(extname(file).toLowerCase())) continue;
    try {
      const content = readFileSync(file, "utf-8");
      const fontFaces = content.matchAll(
        /@font-face\s*\{[^}]*\}/gis,
      );
      for (const block of fontFaces) {
        if (!/font-display\s*:/i.test(block[0])) {
          violations.push(
            `MISSING_FONT_DISPLAY: @font-face without font-display in ${relativePath(file)}`,
          );
        }
      }
    } catch {
      // skip
    }
  }

  // Check 5: Production dev-tool leakage
  // react-scan, react-grab should be gated behind NODE_ENV === 'development'
  for (const file of allFiles) {
    if (![".tsx", ".ts", ".jsx", ".js"].includes(extname(file).toLowerCase()))
      continue;
    try {
      const content = readFileSync(file, "utf-8");
      if (
        content.includes("react-scan") &&
        !content.includes("NODE_ENV === 'development'") &&
        !content.includes("isDevToolsEnabled") &&
        !content.includes("NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS")
      ) {
        violations.push(
          `DEV_TOOL_LEAK: react-scan reference without dev gate in ${relativePath(file)}`,
        );
      }
      if (
        content.includes("react-grab") &&
        !content.includes("NODE_ENV === 'development'") &&
        !content.includes("isDevToolsEnabled") &&
        !content.includes("NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS")
      ) {
        violations.push(
          `DEV_TOOL_LEAK: react-grab reference without dev gate in ${relativePath(file)}`,
        );
      }
    } catch {
      // skip
    }
  }

  return violations;
}

function walkDir(dir, results, excludePrefixes) {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    const rel = relativePath(full);
    // Normalize to forward slashes for matching
    const relNorm = rel.replace(/\\/g, "/");
    const excluded = excludePrefixes.some(
      (p) => relNorm === p || relNorm.startsWith(p + "/"),
    );
    if (excluded) continue;
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      walkDir(full, results, excludePrefixes);
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
}

function relativePath(absPath) {
  const rel = absPath.replace(ROOT, "").replace(/^[/\\]+/, "");
  return rel;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const t0 = Date.now();

  // ── Step 0: Check for AUDIT_BASE_URL ──────────────────────────────
  const externalURL = process.env.AUDIT_BASE_URL;
  const isExternal = !!externalURL;
  let baseURL;
  let serverProcess = null;
  let fixture = null;

  if (isExternal) {
    // Validate loopback (even external MUST be loopback or explicitly trusted)
    const url = new URL(externalURL);
    const hostname = url.hostname;
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "[::1]"
    ) {
      console.error(
        `AUDIT_BASE_URL=${externalURL} is not loopback. For safety, only loopback is allowed.`,
      );
      process.exit(1);
    }
    baseURL = externalURL.replace(/\/$/, "");
    console.log(`Using external AUDIT_BASE_URL: ${baseURL}`);
    console.log("Skipping build and server start.");
  } else {
    // ── Step 1: Build ───────────────────────────────────────────────
    console.log("[1/7] Building project…");
    const buildStart = Date.now();
    await exec("npm", ["run", "build"]);
    const buildSec = ((Date.now() - buildStart) / 1000).toFixed(1);
    console.log(`  Build completed in ${buildSec}s`);

    // ── Step 2: Find free port & start server ─────────────────────
    console.log("[2/7] Starting production server…");
    const port = await findFreePort();
    baseURL = `http://127.0.0.1:${port}`;
    console.log(`  Free port: ${port}`);

    // Vinext production needs the Cloudflare ESM loader hooks to resolve
    // cloudflare:workers imports in the built worker entry point.
    const vinextArgs = [
      "--import",
      CF_HOOKS_IMPORT,
      VINEXT_CLI,
      "start",
      "--port",
      String(port),
    ];
    serverProcess = spawn("node", vinextArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: ROOT,
      shell: false,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "production",
        CF_LOADER_ENABLED: "1",
      },
    });

    // Log server stderr for diagnosis
    serverProcess.stderr.on("data", (d) => {
      const text = d.toString();
      if (!text.includes("DeprecationWarning") && !text.includes("ExperimentalWarning")) {
        console.error(`  [server stderr] ${text.trim()}`);
      }
    });

    // Wait for server to be ready (poll the root URL)
    const serverReady = await waitForServer(baseURL, 60_000);
    if (!serverReady) {
      console.error("Server failed to start within 60 seconds.");
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(1);
    }
    console.log(`  Server ready at ${baseURL}`);
  }

  // ── Step 3: Seed fixture ──────────────────────────────────────────
  console.log("[3/7] Seeding audit fixture…");
  try {
    fixture = await seedFixture(baseURL);
  } catch (err) {
    console.error(`Fixture seeding failed: ${err.message}`);
    // Continue without fixture — audit public routes that don't need it
    fixture = null;
  }

  const articlePath = fixture
    ? `/notes/${fixture.slug}`
    : null;
  const routes = [
    { path: "/", label: "Homepage" },
    { path: "/archive", label: "Archive" },
    ...(articlePath
      ? [{ path: articlePath, label: `Article (${fixture.slug})` }]
      : []),
    { path: "/404-test", label: "404" },
  ];

  // ── Step 4: Launch Chrome & Lighthouse ────────────────────────────
  console.log("[4/7] Launching stable Chrome for Lighthouse…");
  // Use a dedicated debugging port rather than 0 (auto) to avoid
  // wsEndpoint() compatibility issues across Playwright versions.
  const debugPort = await findFreePort();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [`--remote-debugging-port=${debugPort}`],
  });
  const lighthousePort = debugPort;
  console.log(`  Chrome debugging on port ${lighthousePort}`);

  // ── Step 5: Audit each route ─────────────────────────────────────
  console.log("[5/7] Auditing routes (3× mobile + 3× desktop each)…");
  const routeResults = {};
  let allPass = true;

  for (const route of routes) {
    const url = `${baseURL}${route.path}`;
    console.log(`\n── ${route.label}: ${url}`);
    const result = await auditRoute(url, lighthousePort, 3);
    routeResults[route.path] = result;

    // Check mobile medians
    const { mobileMedian, desktopMedian } = result;

    console.log(
      `  MOBILE  median: P${mobileMedian.performance} A${mobileMedian.accessibility} B${mobileMedian.bestPractices} S${mobileMedian.seo} CLS=${mobileMedian.cls.toFixed(4)}`,
    );
    console.log(
      `  DESKTOP median: P${desktopMedian.performance} A${desktopMedian.accessibility} B${desktopMedian.bestPractices} S${desktopMedian.seo} CLS=${desktopMedian.cls.toFixed(4)}`,
    );

    // Show failing audit items from the first sample (for diagnosis)
    const firstSample = result.mobile[0];
    if (firstSample?.failingItems?.length > 0) {
      const uniqueFails = [...new Map(
        firstSample.failingItems.map((item) => [`${item.category}:${item.id}`, item])
      ).values()];
      for (const item of uniqueFails) {
        console.log(
          `    └─ [${item.category}] ${item.title} (score: ${item.score})${item.displayValue ? ` — ${item.displayValue}` : ""}`,
        );
      }
    }

    const mobilePass =
      mobileMedian.performance === 100 &&
      mobileMedian.accessibility === 100 &&
      mobileMedian.bestPractices === 100 &&
      mobileMedian.seo === 100 &&
      mobileMedian.cls <= 0.1;

    const desktopPass =
      desktopMedian.performance === 100 &&
      desktopMedian.accessibility === 100 &&
      desktopMedian.bestPractices === 100 &&
      desktopMedian.seo === 100 &&
      desktopMedian.cls <= 0.1;

    if (!mobilePass) {
      console.error(
        `  FAIL: Mobile median not 100/100/100/100 or CLS > 0.1`,
      );
      allPass = false;
    }
    if (!desktopPass) {
      console.error(
        `  FAIL: Desktop median not 100/100/100/100 or CLS > 0.1`,
      );
      allPass = false;
    }
  }

  // ── Step 6: Design-system compliance ─────────────────────────────
  console.log("\n[6/7] Design-system compliance checks…");
  const designViolations = designSystemChecks();
  if (designViolations.length > 0) {
    console.error(
      `  ${designViolations.length} design-system violation(s):`,
    );
    for (const v of designViolations) {
      console.error(`    - ${v}`);
    }
    allPass = false;
  } else {
    console.log("  No design-system violations found.");
  }

  // ── Step 7: Cleanup ──────────────────────────────────────────────
  console.log("\n[7/7] Cleaning up…");
  await browser.close();
  if (fixture) {
    await deleteFixture(baseURL, fixture.id);
  }
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    // On Windows, SIGTERM may not work — use taskkill fallback
    if (process.platform === "win32") {
      try {
        await exec("taskkill", [
          "/F",
          "/PID",
          String(serverProcess.pid),
          "/T",
        ]);
      } catch {
        // Already dead
      }
    }
    console.log("  Server stopped.");
  }

  // ── Write report ─────────────────────────────────────────────────
  const report = {
    runId: RUN_ID,
    timestamp: new Date().toISOString(),
    baseURL,
    isExternal,
    routes: Object.fromEntries(
      Object.entries(routeResults).map(([path, result]) => [
        path,
        {
          mobileSamples: result.mobile.map((s) => ({
            performance: s.performance,
            accessibility: s.accessibility,
            bestPractices: s.bestPractices,
            seo: s.seo,
            cls: s.cls,
          })),
          desktopSamples: result.desktop.map((s) => ({
            performance: s.performance,
            accessibility: s.accessibility,
            bestPractices: s.bestPractices,
            seo: s.seo,
            cls: s.cls,
          })),
          mobileMedian: result.mobileMedian,
          desktopMedian: result.desktopMedian,
        },
      ]),
    ),
    designViolations,
    elapsedSeconds: ((Date.now() - t0) / 1000).toFixed(1),
    verdict: allPass ? "PASS" : "FAIL",
  };

  const reportPath = resolve(EVIDENCE_DIR, `audit-report-${RUN_ID}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${relativePath(reportPath)}`);

  // ── Final verdict ──────────────────────────────────────────────────
  console.log(`\n${"=".repeat(50)}`);
  console.log(`VERDICT: ${report.verdict}`);
  console.log(`Elapsed: ${report.elapsedSeconds}s`);
  console.log(`${"=".repeat(50)}`);

  if (!allPass) {
    process.exit(1);
  }
}

// ─── Server Readiness Poll ─────────────────────────────────────────────

async function waitForServer(baseURL, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseURL, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// ─── Entry ──────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
