/**
 * Registers the Cloudflare ESM loader hooks that intercept
 * `cloudflare:workers` imports and redirect them to the local
 * D1-backed stub.
 *
 * Intended to be loaded via `node --import` BEFORE any module
 * that needs `cloudflare:workers` resolution.
 *
 * Usage: node --import ./scripts/cf-hooks-register.mjs --test tests/api.test.mjs
 */
import { register } from "node:module";

// Path to the hooks file, resolved relative to this registration file.
register("./cf-loader-hooks.mjs", import.meta.url);
