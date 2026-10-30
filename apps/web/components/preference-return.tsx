"use client";
import { usePathname } from "next/navigation";
export function PreferenceReturn() {
  const pathname = usePathname();
  return <input type="hidden" name="returnTo" value={pathname} />;
}
