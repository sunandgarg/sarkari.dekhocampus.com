import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const source = resolve("src/assets/dc-lead-logo.png");
const outputs = [
  ["public/apple-touch-icon.png", 180],
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
];

await access(source);
for (const [file, size] of outputs) {
  const output = resolve(file);
  await mkdir(dirname(output), { recursive: true });
  await sharp(source)
    .flatten({ background: "#fcfcfd" })
    .resize(size, size, { fit: "contain", background: "#fcfcfd" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(output);
}

console.log("Generated DekhoCampus brand icons from src/assets/dc-lead-logo.png");
