#!/usr/bin/env node
/**
 * Inlines longlife-hospital.css and the two scripts into one self-contained
 * HTML file, for publishing somewhere that cannot serve sibling assets.
 *
 *   node tools/build-single-file.js [outputPath]
 */
const fs = require("fs");
const path = require("path");

const repo = path.resolve(__dirname, "..");
const out = process.argv[2] || path.join(repo, "longlife-hospital.bundle.html");

const read = (f) => fs.readFileSync(path.join(repo, f), "utf8");

let html = read("index.html");

html = html.replace(
  '<link rel="stylesheet" href="longlife-hospital.css">',
  "<style>\n" + read("longlife-hospital.css") + "\n</style>"
);

html = html.replace(
  '<script src="longlife-data.js"></script>\n<script src="longlife-app.js"></script>',
  "<script>\n" + read("longlife-data.js") + "\n</script>\n<script>\n" + read("longlife-app.js") + "\n</script>"
);

for (const leftover of ["longlife-hospital.css", "longlife-data.js", "longlife-app.js"]) {
  if (html.includes('href="' + leftover + '"') || html.includes('src="' + leftover + '"')) {
    console.error("Failed to inline " + leftover + " — the tag in index.html changed.");
    process.exit(1);
  }
}

fs.writeFileSync(out, html);
console.log("Wrote " + out + " (" + (html.length / 1024).toFixed(1) + " KB)");
