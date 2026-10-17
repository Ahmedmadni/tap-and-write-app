import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mobilePagePaths } from "./mobile-pages";
import { verifyCopiedFiles, verifyMobilePages } from "./verify-mobile-pages";

const temporaryDirectories: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "nfc-mobile-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "assets/app.js"), "export {};");
  for (const path of mobilePagePaths) {
    mkdirSync(join(root, path.slice(1)), { recursive: true });
    writeFileSync(join(root, path.slice(1), "index.html"), '<html><script src="/assets/app.js"></script></html>');
  }
  return root;
}
afterEach(() => temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

for (const path of ["/read", "/write", "/history", "/premium"]) {
  test(`requires ${path} to be stored locally before Android packaging`, () => {
    const root = fixture();
    expect(verifyMobilePages(root)).toEqual([]);
    rmSync(join(root, path.slice(1), "index.html"));
    expect(verifyMobilePages(root).some((error) => error.includes(`Missing bundled page: ${path} `))).toBe(true);
  });
}
test("requires JavaScript dependencies to be available without internet", () => {
  const root = fixture();
  rmSync(join(root, "assets/app.js"));
  expect(verifyMobilePages(root)).toHaveLength(mobilePagePaths.length);
});
test("detects outdated or missing files after Android sync", () => {
  const source = fixture();
  const destination = fixture();
  expect(verifyCopiedFiles(source, destination)).toEqual([]);
  writeFileSync(join(destination, "assets/app.js"), "outdated");
  expect(verifyCopiedFiles(source, destination)).toEqual(["Missing or outdated Android asset: assets/app.js"]);
});