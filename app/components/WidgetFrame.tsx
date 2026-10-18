"use client";

import { useEffect, useRef, useState } from "react";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 4000;

type WidgetFrameProps = {
  src: string;
  /** Initial height in px, from `![[widget.html|600]]`; replaced by the widget's own report. */
  initialHeight?: number;
  title?: string;
};

/**
 * Interactive explainer widget embedded in an article (`![[xxx.html]]` in
 * Obsidian). Runs in a sandboxed iframe WITHOUT allow-same-origin: the widget's
 * scripts get an opaque origin, so they can't read the site's cookies (admin
 * session) or touch the page. The sync script appends a tiny reporter to each
 * widget that posts its content height; we only trust messages from our own
 * frame and clamp the value.
 */
export function WidgetFrame({ src, initialHeight, title = "交互演示" }: WidgetFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(() => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, initialHeight || 480)));

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: unknown } | null;
      if (data?.type !== "komorebi-widget-height" || typeof data.height !== "number" || !Number.isFinite(data.height)) return;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(data.height))));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <span className="note-widget">
      <span className="note-widget__bar">
        <span className="note-widget__label">
          <span className="note-widget__dot" aria-hidden="true" />
          {title}
        </span>
        <a className="note-widget__open" href={src} target="_blank" rel="noreferrer">
          新窗口打开 <span aria-hidden="true">↗</span>
        </a>
      </span>
      <iframe
        ref={frameRef}
        className="note-widget__frame"
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
        referrerPolicy="no-referrer"
        style={{ height }}
      />
    </span>
  );
}
