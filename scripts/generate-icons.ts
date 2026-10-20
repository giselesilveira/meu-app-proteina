/**
 * npm run icons — gera os ícones PNG do PWA a partir de public/icons/icon.svg.
 * Para trocar a arte, substitua icon.svg (quadrado) e rode de novo.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve(__dirname, "../public/icons");
const svg = readFileSync(path.join(dir, "icon.svg"));
const maskable = readFileSync(path.join(dir, "icon-maskable.svg"));

async function main() {
  await sharp(svg).resize(192, 192).png().toFile(path.join(dir, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(dir, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(dir, "apple-touch-icon.png"));
  await sharp(maskable).resize(512, 512).png().toFile(path.join(dir, "icon-maskable-512.png"));
  await sharp(svg).resize(48, 48).png().toFile(path.join(dir, "favicon-48.png"));
  console.log("Ícones gerados em public/icons");
}
main();
