/**
 * Cross-platform unit-test launcher.
 *
 * Discovers `tests/*.test.mjs` and `tests/*.test.ts` files on disk and runs
 * them via `node --test --experimental-strip-types`.  Does NOT fail when a
 * `.test.ts` file does not yet exist — only existing files are included.
 *
 * Pre-loads the Cloudflare ESM loader hooks so that built-worker tests
 * (which import `cloudflare:workers`) resolve to a local D1-backed stub.
 * The hooks are inert for tests that do not use Cloudflare imports.
 */
import { readdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const testsDir = resolve(root, "tests");

const existing = readdirSync(testsDir).filter(
  (f) => f.endsWith(".test.mjs") || f.endsWith(".test.ts"),
);

if (existing.length === 0) {
  console.error("No test files found in tests/");
  process.exit(1);
}

/** Preload the Cloudflare loader — inert for pure-Node tests, resolves built-worker imports. */
const hooksRegister = resolve(__dirname, "cf-hooks-register.mjs");
const hasHooks = existsSync(hooksRegister);
// pathToFileURL produces correct file:/// URL on all platforms (including Windows drive letters).
const hooksImport = hasHooks ? pathToFileURL(hooksRegister).href : null;

const args = [
  // --import registers ESM hooks BEFORE --test loads any test files.
  // This is critical: the Cloudflare loader must be installed before
  // built-worker modules try to import "cloudflare:workers".
  ...(hooksImport ? ["--import", hooksImport] : []),
  "--test",
  "--experimental-strip-types",
  // Send a distinct marker env var so hooks can detect test mode.
  ...existing.map((f) => `tests/${f}`),
];

if (hasHooks) {
  process.env.CF_LOADER_ENABLED = "1";
}

console.error(
  `Running: node ${args.join(" ")}  (${existing.length} test files)`,
);

const child = spawn("node", args, {
  stdio: "inherit",
  cwd: root,
  shell: false,
  env: { ...process.env, CF_LOADER_ENABLED: "1" },
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});
