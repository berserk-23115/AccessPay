"use client";
import { useEffect } from "react";
export function PageFocus({ identity }: { identity: string }) {
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>("main h1");
    heading?.focus({ preventScroll: true });
  }, [identity]);
  return null;
}
// Vibration only adds to spoken and written status; it never carries information alone.
// Timings are starting points to tune with testers. iPhone browsers ignore this.
const hapticPatterns = {
  listening: [40],
  attention: [120, 100, 120],
  success: [60, 60, 60, 60, 200],
  failure: [400, 150, 400],
};
export type Haptic = keyof typeof hapticPatterns;
export const hapticPreference = "accesspay_haptics";
export function playHaptic(name: Haptic) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (window.localStorage.getItem(hapticPreference) === "off") return;
  navigator.vibrate(hapticPatterns[name]);
}
export function Icon({
  name,
  size = 22,
}: {
  name:
    | "arrow"
    | "check"
    | "shield"
    | "phone"
    | "keyboard"
    | "help"
    | "bag"
    | "lock"
    | "back"
    | "external";
  size?: number;
}) {
  const paths = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    back: "M19 12H5m6-6-6 6 6 6",
    check: "m5 12 4 4L19 6",
    shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
    phone:
      "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2",
    keyboard:
      "M3 5h18v14H3V5Zm3 4h1m3 0h1m3 0h1m3 0h1M6 12h1m3 0h1m3 0h1m3 0h1M7 16h10",
    help: "M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
    bag: "M4 7h16l1 14H3L4 7Zm4 0V5a4 4 0 0 1 8 0v2",
    lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v2",
    external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
