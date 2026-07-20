/**
 * Node ESM loader hooks for Cloudflare test adapter.
 *
 * Resolve hook: redirects `cloudflare:workers` to the local stub module.
 * Any OTHER `cloudflare:*` specifier throws immediately (fail-closed).
 *
 * Registered via `module.register()` from `cf-hooks-register.mjs`.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUB_URL = String(
  new URL(
    "../tests/support/cloudflare-workers-stub.mjs",
    import.meta.url,
  ),
);

/**
 * Intercept `cloudflare:workers` and redirect to the D1-backed stub.
 * Any unknown `cloudflare:*` import fails immediately (no silent skip).
 *
 * @param {string} specifier
 * @param {{ parentURL?: string }} context
 * @param {(specifier: string, context: { parentURL?: string }) => { url: string }} nextResolve
 * @returns {Promise<{ url: string, shortCircuit: boolean }>}
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("cloudflare:")) {
    if (specifier === "cloudflare:workers") {
      // Redirect to the local stub module that provides env.DB via node:sqlite.
      return { url: STUB_URL, shortCircuit: true };
    }
    // Fail-closed: any unknown cloudflare:* import is a test infrastructure error.
    throw new Error(
      `CF-LOADER: Unsupported Cloudflare import "${specifier}". ` +
        `Only "cloudflare:workers" is resolved. Add it to the loader stub or fix the import.`,
    );
  }
  return nextResolve(specifier, context);
}
