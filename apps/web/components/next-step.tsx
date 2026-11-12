"use client";
import { useEffect, useRef } from "react";
// Tells a screen-reader user what to do next and jumps straight to it,
// so nobody has to swipe through the whole page to find the next button.
export function NextStep({
  text,
  label,
  targetId,
  focusOnLoad = false,
}: {
  text: string;
  label: string;
  targetId: string;
  focusOnLoad?: boolean;
}) {
  const message = useRef<HTMLParagraphElement>(null);
  // After a step completes, start reading here instead of losing focus to the page.
  useEffect(() => {
    if (focusOnLoad) message.current?.focus();
  }, [focusOnLoad]);
  return (
    <div className="notice next-step">
      <p ref={message} tabIndex={-1}>
        {text}
      </p>
      <a
        href={`#${targetId}`}
        onClick={(event) => {
          const target = document.getElementById(targetId);
          if (!target) return;
          event.preventDefault();
          target.scrollIntoView({ block: "center" });
          target.focus();
        }}
      >
        {label}
      </a>
    </div>
  );
}
