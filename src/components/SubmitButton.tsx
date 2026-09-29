"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const MAGNETIC_STRENGTH = 0.25;
const MAGNETIC_MAX = 6;

export default function SubmitButton({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);
  const reducedMotionRef = useRef<boolean | null>(null);

  function prefersReducedMotion() {
    if (reducedMotionRef.current === null) {
      reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return reducedMotionRef.current;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (prefersReducedMotion() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    setOffset({
      x: Math.max(-MAGNETIC_MAX, Math.min(MAGNETIC_MAX, relX * MAGNETIC_STRENGTH)),
      y: Math.max(-MAGNETIC_MAX, Math.min(MAGNETIC_MAX, relY * MAGNETIC_STRENGTH)),
    });
  }

  function handleMouseLeave() {
    setOffset({ x: 0, y: 0 });
  }

  return (
    <button
      ref={ref}
      type="submit"
      disabled={pending || disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleMouseLeave();
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${pressed ? 0.97 : 1})` }}
      className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-brand-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none dark:focus-visible:ring-offset-slate-900"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
