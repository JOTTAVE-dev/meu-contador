// Gera os ícones PNG do PWA (sem dependências): `node scripts/gen-icons.mjs`
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const TOP = [0x8b, 0x5c, 0xf6]; // violeta claro
const BOTTOM = [0x4c, 0x1d, 0x95]; // violeta escuro
const BARS = [
  // x0, x1, topo (coordenadas 0..1); todas terminam na base 0.70
  [0.27, 0.37, 0.52],
  [0.45, 0.55, 0.4],
  [0.63, 0.73, 0.28],
];
const BASE = 0.7;

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function render(size, { rounded }) {
  const S = 4; // supersampling para bordas suaves
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let bg = 0;
      let fg = 0;
      for (let sj = 0; sj < S; sj++) {
        for (let si = 0; si < S; si++) {
          const x = (i + (si + 0.5) / S) / size;
          const y = (j + (sj + 0.5) / S) / size;
          if (!rounded || inRoundRect(x, y, 0, 0, 1, 1, 0.22)) bg++;
          if (BARS.some(([x0, x1, top]) => inRoundRect(x, y, x0, top, x1, BASE, 0.03))) fg++;
        }
      }
      const t = j / size;
      const bgColor = TOP.map((c, k) => c + (BOTTOM[k] - c) * t);
      const a = fg / (S * S);
      const o = (j * size + i) * 4;
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(bgColor[k] * (1 - a) + 255 * a);
      px[o + 3] = Math.round((bg / (S * S)) * 255);
    }
  }
  return encodePng(size, px);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", render(192, { rounded: true }));
writeFileSync("public/icons/icon-512.png", render(512, { rounded: true }));
writeFileSync("public/icons/icon-maskable-512.png", render(512, { rounded: false }));
writeFileSync("public/icons/apple-touch-icon.png", render(180, { rounded: false }));
writeFileSync("src/app/icon.png", render(64, { rounded: true }));
console.log("Ícones gerados.");
