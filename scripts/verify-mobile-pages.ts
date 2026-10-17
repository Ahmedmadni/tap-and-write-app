import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { mobilePagePaths } from "./mobile-pages";

export function verifyMobilePages(root: string): string[] {
  const errors: string[] = [];
  for (const path of mobilePagePaths) {
    const file = join(root, path.slice(1), "index.html");
    if (!existsSync(file)) {
      errors.push(`Missing bundled page: ${path} (${file})`);
      continue;
    }
    const html = readFileSync(file, "utf8");
    if (!html.includes("<html") || !html.includes("<script")) {
      errors.push(`Incomplete bundled page: ${path}`);
    }
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const url = match[1];
      if (!url || !/\.(?:js|css)(?:[?#]|$)/.test(url)) continue;
      if (/^(?:https?:)?\/\//.test(url)) {
        errors.push(`External page dependency on ${path}: ${url}`);
        continue;
      }
      const asset = url.split(/[?#]/)[0];
      if (!existsSync(join(root, asset.startsWith("/") ? asset.slice(1) : join(path.slice(1), asset)))) {
        errors.push(`Missing page dependency on ${path}: ${url}`);
      }
    }
  }
  return errors;
}

function filesIn(root: string, directory = root): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const file = join(directory, entry);
    return statSync(file).isDirectory() ? filesIn(root, file) : [relative(root, file)];
  });
}

export function verifyCopiedFiles(source: string, destination: string): string[] {
  return filesIn(source).flatMap((file) => {
    const target = join(destination, file);
    return !existsSync(target) || !readFileSync(join(source, file)).equals(readFileSync(target))
      ? [`Missing or outdated Android asset: ${file}`]
      : [];
  });
}

if (import.meta.main) {
  const root = process.argv[2] ?? "dist/client";
  const errors = verifyMobilePages(root);
  if (process.argv.includes("--compare")) {
    errors.push(...verifyCopiedFiles("dist/client", root));
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Verified ${mobilePagePaths.length} local pages and their dependencies in ${root}.`);
  }
}