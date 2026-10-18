/**
 * Runs a DOM update (theme / style switch) inside a View Transition whose new
 * state is revealed as a circle growing from the control that was clicked.
 * Falls back to an instant update when the API is missing or the reader
 * prefers reduced motion. The update itself must be synchronous DOM work.
 */
export function runWithCircularReveal(origin: Element | null, update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }

  const root = document.documentElement;
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.style.setProperty("--vt-x", `${x}px`);
  root.style.setProperty("--vt-y", `${y}px`);
  root.style.setProperty("--vt-r", `${radius}px`);
  root.classList.add("vt-reveal");

  const transition = doc.startViewTransition(update);
  transition.finished.finally(() => root.classList.remove("vt-reveal"));
}
