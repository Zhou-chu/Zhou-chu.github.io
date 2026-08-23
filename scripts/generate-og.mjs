import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --paper: #fbfaf6;
    --paper-warm: #ece4d4;
    --moss: #52644c;
    --moss-soft: #dce4d6;
    --timber: #956d4b;
    --timber-deep: #684932;
    --vermillion: #b44a32;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1536px; height: 1024px; }
  body {
    font-family: "Noto Serif SC", "STSong", "SimSun", "Songti SC", "Times New Roman", serif;
    background: var(--paper);
    overflow: hidden;
    position: relative;
  }
  /* 纸面质感：极淡的竖向木纹 */
  body::before {
    content: "";
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(90deg,
        rgba(149,109,75,0.028) 0px, rgba(149,109,75,0.028) 2px,
        transparent 2px, transparent 22px);
    mix-blend-mode: multiply;
  }
  .stage {
    position: relative; width: 100%; height: 100%;
    display: flex; align-items: center;
  }
  .copy {
    position: relative; z-index: 2;
    padding-left: 130px;
    max-width: 760px;
  }
  .kicker {
    font-family: "Cascadia Code", "Consolas", monospace;
    font-size: 26px; letter-spacing: 0.42em;
    color: var(--moss);
    text-transform: uppercase;
    margin-bottom: 46px;
  }
  .wordmark {
    font-size: 208px; line-height: 1.02;
    color: var(--timber-deep);
    letter-spacing: 0.06em;
    font-weight: 700;
  }
  .wordmark .accent { color: var(--vermillion); }
  .tagline {
    margin-top: 40px;
    font-size: 46px; letter-spacing: 0.1em;
    color: var(--timber);
  }
  .divider {
    margin-top: 54px;
    width: 96px; height: 3px;
    background: var(--moss);
  }
  .sub {
    margin-top: 34px;
    font-family: "Cascadia Code", "Consolas", monospace;
    font-size: 22px; letter-spacing: 0.18em;
    color: #9aa58f;
  }
  /* 右侧：木纹年轮 + 朱砂印章 */
  .motif {
    position: absolute; right: 60px; top: 50%; transform: translateY(-50%);
    width: 520px; height: 520px; z-index: 1;
  }
  .ring {
    position: absolute; border-radius: 50%;
    border: 3px solid rgba(149,109,75,0.30);
  }
  .ring.r1 { inset: 0; }
  .ring.r2 { inset: 46px; border-color: rgba(149,109,75,0.24); }
  .ring.r3 { inset: 94px; border-color: rgba(149,109,75,0.20); }
  .ring.r4 { inset: 142px; border-color: rgba(82,100,76,0.28); }
  .ring.r5 { inset: 190px; border-color: rgba(82,100,76,0.20); }
  .core {
    position: absolute; inset: 238px; border-radius: 50%;
    background: var(--moss-soft);
  }
  .seal {
    position: absolute; right: 128px; bottom: 96px; z-index: 3;
    width: 132px; height: 132px;
    background: var(--vermillion);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    color: #fdf6ec;
    font-size: 56px; line-height: 1.12;
    letter-spacing: 0.06em; font-weight: 700;
    writing-mode: vertical-rl;
    box-shadow: 0 10px 30px rgba(180,74,50,0.28);
  }
  .seal span { display: block; }
  .corner {
    position: absolute; left: 130px; bottom: 96px; z-index: 2;
    font-family: "Cascadia Code", "Consolas", monospace;
    font-size: 20px; letter-spacing: 0.16em;
    color: #9aa58f;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="copy">
      <div class="kicker">KOMOREBI NOTES</div>
      <div class="wordmark">木<span class="accent">漏</span></div>
      <div class="tagline">刨花落尽，木纹方显。</div>
      <div class="divider"></div>
      <div class="sub">TECH · READING · WRITING · LIFE</div>
    </div>
    <div class="motif" aria-hidden="true">
      <div class="ring r1"></div>
      <div class="ring r2"></div>
      <div class="ring r3"></div>
      <div class="ring r4"></div>
      <div class="ring r5"></div>
      <div class="core"></div>
    </div>
    <div class="seal" aria-hidden="true"><span>木</span><span>漏</span></div>
    <div class="corner">gm-2.zhou-chu.workers.dev</div>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(root, "public", "og.png"), type: "png" });
await browser.close();
console.log("og.png generated → public/og.png");
