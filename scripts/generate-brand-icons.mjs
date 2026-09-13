import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const compactSource = resolve("src/assets/dc-logo.png");
const wordmarkSource = resolve("src/assets/dekhocampus-logo.png");
const footerWordmarkSource = resolve("src/assets/dekhocampus-footer-logo.png");
const outputs = [
  ["public/favicon.png", 52],
  ["public/apple-touch-icon.png", 180],
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
];

await Promise.all([compactSource, wordmarkSource, footerWordmarkSource].map((source) => access(source)));
for (const [file, size] of outputs) {
  const output = resolve(file);
  await mkdir(dirname(output), { recursive: true });
  await sharp(compactSource)
    .flatten({ background: "#fcfcfd" })
    .resize(size, size, { fit: "contain", background: "#fcfcfd" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(output);
}

const brandOutputs = [
  [compactSource, "public/brand/dc-logo.webp", 128, 123],
  [wordmarkSource, "public/brand/dekhocampus-wordmark.webp", 256, 70],
  [footerWordmarkSource, "public/brand/dekhocampus-footer-wordmark.webp", 308, 102],
];

for (const [source, file, width, height] of brandOutputs) {
  const output = resolve(file);
  await mkdir(dirname(output), { recursive: true });
  await sharp(source)
    .resize(width, height, { fit: "contain" })
    .webp({ lossless: true, effort: 6 })
    .toFile(output);
}

console.log("Generated DekhoCampus app icons and public brand assets from the canonical logo masters");
