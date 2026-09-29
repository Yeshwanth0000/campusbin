"use client";

import { useEffect, useRef, useState } from "react";

// Temporary diagnostic, only active when the URL has ?vv=1. Prints the
// viewport numbers the browser is really using so a scroll-time layout jump
// on a phone can be measured from a screen recording.
export default function ViewportDebug() {
  const [lines, setLines] = useState<string[]>([]);
  const probe = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("vv")) return;
    let raf = 0;
    const tick = () => {
      const vv = window.visualViewport;
      const fixedBottom = probe.current ? Math.round(probe.current.getBoundingClientRect().bottom) : -1;
      setLines([
        `innerH ${window.innerHeight}  clientH ${document.documentElement.clientHeight}`,
        `vvH ${vv ? Math.round(vv.height) : "-"}  vvTop ${vv ? Math.round(vv.offsetTop) : "-"}`,
        `fixedBottom ${fixedBottom}  scrollY ${Math.round(window.scrollY)}`,
        `screenH ${screen.height}  dpr ${window.devicePixelRatio}`,
      ]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div ref={probe} aria-hidden style={{ position: "fixed", left: 0, bottom: 0, width: 1, height: 0 }} />
      {lines.length > 0 && (
        <pre
          aria-hidden
          style={{
            position: "fixed",
            left: 4,
            top: 60,
            zIndex: 9999,
            margin: 0,
            padding: "4px 6px",
            background: "rgba(0,0,0,0.75)",
            color: "#0f0",
            font: "12px monospace",
            pointerEvents: "none",
          }}
        >
          {lines.join("\n")}
        </pre>
      )}
    </>
  );
}
