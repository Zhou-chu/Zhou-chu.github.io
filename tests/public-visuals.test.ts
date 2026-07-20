import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Image dimension helpers (zero-dependency: parses WebP RIFF container)
// ---------------------------------------------------------------------------

interface Dims {
  width: number;
  height: number;
}

function decodeWebpDimensions(buf: Buffer): Dims {
  // RIFF header: "RIFF" (4) + file size (4) + "WEBP" (4) = 12 bytes
  if (buf.length < 30) throw new Error("File too small for WebP");
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("Not a RIFF container");
  if (buf.toString("ascii", 8, 12) !== "WEBP") throw new Error("Not a WebP file");

  const chunkFourCC = buf.toString("ascii", 12, 16);
  if (chunkFourCC === "VP8 ") {
    // Lossy VP8: dimensions at offset 26 (uint16 LE, masked 0x3FFF)
    const w = buf.readUInt16LE(26) & 0x3fff;
    const h = buf.readUInt16LE(28) & 0x3fff;
    return { width: w, height: h };
  }
  if (chunkFourCC === "VP8L") {
    // Lossless VP8L: 14-bit width + height packed into 4 bytes at offset 21
    const bits = buf.readUInt32LE(21);
    const w = (bits & 0x3fff) + 1;
    const h = ((bits >> 14) & 0x3fff) + 1;
    return { width: w, height: h };
  }
  if (chunkFourCC === "VP8X") {
    // Extended VP8X: 24-bit width + height at offset 24, each + 1
    const w = buf.readUIntLE(24, 3) + 1;
    const h = buf.readUIntLE(27, 3) + 1;
    return { width: w, height: h };
  }
  throw new Error(`Unsupported WebP chunk type: ${chunkFourCC}`);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function dispatchImport(): Promise<typeof import("../app/lib/public-visuals.ts")> {
  return import("../app/lib/public-visuals.ts");
}

function filePathFromPublicSrc(src: string): string {
  // src must be relative to /public (e.g. "/images/timber/foo.jpg")
  if (src.startsWith("/")) return join(projectRoot, "public", src);
  return join(projectRoot, "public", src.startsWith("./") ? src.slice(2) : src);
}

function fileExists(absPath: string): boolean {
  return existsSync(absPath);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("public-visuals manifest", () => {
  it("exports homeHero with all required keys", async () => {
    const mod = await dispatchImport();
    assert.ok(mod.homeHero, "expected homeHero export");
    const h = mod.homeHero;
    assert.equal(typeof h.src, "string", "src must be a string");
    assert.equal(typeof h.width, "number", "width must be a number");
    assert.equal(typeof h.height, "number", "height must be a number");
    assert.equal(typeof h.alt, "string", "alt must be a string");
    assert.ok(h.alt.length > 0, "alt must not be empty");
    assert.equal(typeof h.objectPosition, "string", "objectPosition must be a string");
    assert.equal(typeof h.creator, "string", "creator must be a string");
    assert.equal(typeof h.sourceUrl, "string", "sourceUrl must be a string");
    assert.equal(typeof h.license, "string", "license must be a string");
    assert.equal(typeof h.licenseUrl, "string", "licenseUrl must be a string");
    assert.equal(typeof h.attributionModification, "string", "attributionModification must be a string");
  });

  it("homeHero src must NOT be a remote URL (http/https)", async () => {
    const mod = await dispatchImport();
    const { src } = mod.homeHero;
    assert.ok(!/^https?:\/\//i.test(src), `src must not be a remote URL, got: ${src}`);
  });

  it("homeHero src must start with / (local public path)", async () => {
    const mod = await dispatchImport();
    const { src } = mod.homeHero;
    assert.ok(src.startsWith("/"), `src must be a local absolute path starting with /, got: ${src}`);
  });

  it("homeHero src must NOT point under obsidian-assets", async () => {
    const mod = await dispatchImport();
    const { src } = mod.homeHero;
    assert.ok(!src.includes("obsidian-assets"), `src must not reference obsidian-assets, got: ${src}`);
  });

  it("homeHero width and height must be positive (non-zero)", async () => {
    const mod = await dispatchImport();
    const h = mod.homeHero;
    assert.ok(h.width > 0, `width must be > 0, got ${h.width}`);
    assert.ok(h.height > 0, `height must be > 0, got ${h.height}`);
  });

  it("homeHero creator must name Tedmoseby", async () => {
    const mod = await dispatchImport();
    assert.ok(
      mod.homeHero.creator.includes("Tedmoseby"),
      `creator must contain Tedmoseby, got: ${mod.homeHero.creator}`,
    );
  });

  it("homeHero sourceUrl must link to Wikimedia Commons page", async () => {
    const mod = await dispatchImport();
    const { sourceUrl } = mod.homeHero;
    assert.ok(
      sourceUrl.startsWith("https://commons.wikimedia.org/"),
      `sourceUrl must point to Commons, got: ${sourceUrl}`,
    );
  });

  it("homeHero license must be CC BY-SA 3.0", async () => {
    const mod = await dispatchImport();
    assert.equal(mod.homeHero.license, "CC BY-SA 3.0");
  });

  it("homeHero licenseUrl must be the CC BY-SA 3.0 deed", async () => {
    const mod = await dispatchImport();
    assert.ok(
      mod.homeHero.licenseUrl.startsWith("https://creativecommons.org/licenses/by-sa/3.0/"),
      `licenseUrl must point to CC BY-SA 3.0 deed, got: ${mod.homeHero.licenseUrl}`,
    );
  });

  it("homeHero attributionModification must disclose cropping/conversion", async () => {
    const mod = await dispatchImport();
    const disc = mod.homeHero.attributionModification;
    assert.ok(disc.length > 10, "attributionModification must be a substantive disclosure");
    // Accept English or Chinese terms for crop, convert, optimise, modify
    assert.ok(
      /crop|convert|optimize|optimise|modif|裁剪|转换|压缩|优化|修改/i.test(disc),
      `attributionModification must mention cropping or conversion, got: ${disc}`,
    );
  });

  it("homeHero file exists on disk at the resolved public path", async () => {
    const mod = await dispatchImport();
    const abs = filePathFromPublicSrc(mod.homeHero.src);
    assert.ok(fileExists(abs), `File not found at resolved path: ${abs}`);
  });

  it("homeHero file is a valid WebP image (RIFF+WEBP header)", async () => {
    const mod = await dispatchImport();
    const abs = filePathFromPublicSrc(mod.homeHero.src);
    const buf = readFileSync(abs);
    assert.ok(buf.length >= 30, "File too small for WebP");
    assert.equal(buf.toString("ascii", 0, 4), "RIFF", "Missing RIFF signature");
    assert.equal(buf.toString("ascii", 8, 12), "WEBP", "Missing WEBP signature");
    const chunkType = buf.toString("ascii", 12, 16);
    assert.ok(
      chunkType === "VP8 " || chunkType === "VP8L" || chunkType === "VP8X",
      `Expected VP8 / VP8L / VP8X chunk, got: ${chunkType}`,
    );
  });

  it("homeHero WebP dimensions are positive and match expected range", async () => {
    const mod = await dispatchImport();
    const abs = filePathFromPublicSrc(mod.homeHero.src);
    const buf = readFileSync(abs);
    const dims = decodeWebpDimensions(buf);
    assert.ok(dims.width > 0, `width must be > 0, got ${dims.width}`);
    assert.ok(dims.height > 0, `height must be > 0, got ${dims.height}`);
    // Homepage hero is the -1280w variant at ~1280px wide, 3:2 aspect
    assert.ok(
      dims.width >= 800 && dims.width <= 5000,
      `width out of expected range: ${dims.width}`,
    );
    assert.ok(
      dims.height >= 500 && dims.height <= 5000,
      `height out of expected range: ${dims.height}`,
    );
  });

  it("homeHero alt text is in Chinese and describes the image", async () => {
    const mod = await dispatchImport();
    const { alt } = mod.homeHero;
    assert.ok(
      /[\u4e00-\u9fff]/.test(alt),
      `alt text must contain Chinese characters, got: ${alt}`,
    );
    // must be more than just a single character
    assert.ok(alt.length >= 4, `alt text too short: ${alt.length} chars`);
  });
});
