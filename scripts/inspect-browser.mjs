import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
let navigations = 0,
  errors = [];
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) navigations++;
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.goto("http://localhost:3000/");
await page.waitForTimeout(2500);
await mkdir("docs/screenshots", { recursive: true });
await page.screenshot({
  path: "docs/screenshots/home-desktop.png",
  fullPage: true,
});
console.log(JSON.stringify({ navigations, errors, title: await page.title() }));
await page.goto("http://localhost:3000/sign-in");
await page.waitForTimeout(2000);
await page.getByLabel("Email address").fill("demo@accesspay.test");
await page.getByLabel("Password", { exact: true }).fill("accesspay-demo-only");
await page
  .getByRole("button", { name: "Sign in", exact: true })
  .click({ timeout: 8000 });
await page.waitForURL("**/workspace");
await page.goto("http://localhost:3000/store-a");
await page.getByRole("button", { name: "Pay with AccessPay" }).first().click();
await page.waitForURL("**/review/**");
await page.waitForTimeout(500);
await page.screenshot({
  path: "docs/screenshots/review-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "docs/screenshots/review-phone.png",
  fullPage: true,
});
// Rasterize the authored vector app icon for install manifests, without a network image dependency.
const svg = await readFile("apps/web/public/icon.svg", "utf8");
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`,
  );
  await page.screenshot({
    path: `apps/web/public/icon-${size}.png`,
    omitBackground: true,
  });
}
await browser.close();
