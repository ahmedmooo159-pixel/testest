#!/usr/bin/env node
/**
 * Extract legacy Base64 menu images from js/data.js into assets/images/.
 *
 * Usage:
 *   node scripts/migrate-base64-images.js
 *   node scripts/migrate-base64-images.js path/to/data.js path/to/assets/images
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const dataFile = path.resolve(repoRoot, process.argv[2] || "js/data.js");
const imageDir = path.resolve(repoRoot, process.argv[3] || "assets/images");

const DATA_IMAGE_RE = /image:\s*"data:image\/([a-zA-Z0-9.+-]+);base64,([^"]+)"/g;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function extensionFor(mimeSubtype) {
  const type = String(mimeSubtype || "").toLowerCase();
  if (type === "jpeg" || type === "jpg") return "jpg";
  if (type === "svg+xml") return "svg";
  return type.replace(/[^a-z0-9]/g, "") || "webp";
}

function findObjectStart(content, imageIndex) {
  let depth = 0;
  for (let i = imageIndex; i >= 0; i -= 1) {
    const char = content[i];
    if (char === "}") depth += 1;
    if (char === "{") {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return Math.max(0, content.lastIndexOf("\n", imageIndex));
}

function extractField(objectText, field) {
  const re = new RegExp(field + '\\s*:\\s*"([^"]*)"', "i");
  const match = re.exec(objectText);
  return match ? match[1] : "";
}

function uniqueFilename(base, ext, used) {
  let filename = `${base}.${ext}`;
  let counter = 2;
  while (used.has(filename) || fs.existsSync(path.join(imageDir, filename))) {
    filename = `${base}-${counter}.${ext}`;
    counter += 1;
  }
  used.add(filename);
  return filename;
}

function main() {
  if (!fs.existsSync(dataFile)) {
    throw new Error(`Data file not found: ${dataFile}`);
  }

  fs.mkdirSync(imageDir, { recursive: true });

  const content = fs.readFileSync(dataFile, "utf8");
  const used = new Set();
  let extracted = 0;

  const migrated = content.replace(DATA_IMAGE_RE, (fullMatch, mimeSubtype, base64, offset) => {
    const objectStart = findObjectStart(content, offset);
    const objectText = content.slice(objectStart, offset);
    const id = extractField(objectText, "id");
    const nameEn = extractField(objectText, "nameEn");
    const name = extractField(objectText, "name");
    const base = slugify(id) || slugify(nameEn) || slugify(name) || `menu-image-${extracted + 1}`;
    const ext = extensionFor(mimeSubtype);
    const filename = uniqueFilename(`migrated-${base}`, ext, used);
    const outputPath = path.join(imageDir, filename);

    fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));
    extracted += 1;

    return `image: "assets/images/${filename}"`;
  });

  if (extracted > 0) {
    fs.writeFileSync(dataFile, migrated, "utf8");
  }

  console.log(`Extracted ${extracted} image(s).`);
  console.log(`Updated ${path.relative(repoRoot, dataFile)}`);
  console.log(`Images written to ${path.relative(repoRoot, imageDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
