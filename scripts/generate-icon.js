#!/usr/bin/env node
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Minimal PNG encoder: 80x80 RGB, single color (cat-orange)
const W = 80, H = 80;
const crc32 = (data) => {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let crc = n;
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    table[n] = crc;
  }
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const writeU32 = (b, o, v) => { b[o] = v >> 24; b[o + 1] = (v >> 16) & 0xff; b[o + 2] = (v >> 8) & 0xff; b[o + 3] = v & 0xff; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  writeU32(len, 0, data.length);
  const raw = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  writeU32(crc, 0, crc32(raw));
  return Buffer.concat([len, raw, crc]);
};
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
writeU32(ihdr, 0, W);
writeU32(ihdr, 4, H);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const rawRows = [];
const R = 255, G = 140, B = 0;
for (let y = 0; y < H; y++) {
  rawRows.push(0);
  for (let x = 0; x < W; x++) rawRows.push(R, G, B);
}
const idat = zlib.deflateSync(Buffer.from(rawRows), { level: 9 });
const out = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
const outPath = path.join(__dirname, '..', 'icon.png');
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath);