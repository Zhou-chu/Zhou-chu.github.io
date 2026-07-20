import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "npx vinext dev",
    port: 3000,
    reuseExistingServer: true,
    // Bounded: fail if the dev server does not listen within 60 s.
    timeout: 60_000,
  },
  // Protect against accidental remote-target runs.
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
  projects: [
    {
      name: "chrome",
      use: {
        channel: "chrome",
      },
    },
  ],
});
