const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Minimal PNG generator (solid color with centered text-like pattern)
function createPNG(width, height, r, g, b) {
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Create gradient-like pattern
  const raw = [];
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    raw.push(0); // filter none
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const factor = 1 - dist * 0.3; // subtle radial gradient
      raw.push(Math.round(r * factor));
      raw.push(Math.round(g * factor));
      raw.push(Math.round(b * factor));
    }
  }

  const deflated = zlib.deflateSync(Buffer.from(raw));

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflated),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

// App icons - dark navy (#191f28 = 25, 31, 40)
const icon192 = createPNG(192, 192, 25, 31, 40);
const icon512 = createPNG(512, 512, 25, 31, 40);

// OG image - 1200x630 (link preview thumbnail)
const ogImage = createPNG(1200, 630, 25, 31, 40);

// Favicon 32x32
const favicon32 = createPNG(32, 32, 49, 130, 246); // blue500 #3182f6

fs.writeFileSync(path.join(outDir, "icon-192.png"), icon192);
fs.writeFileSync(path.join(outDir, "icon-512.png"), icon512);
fs.writeFileSync(path.join(outDir, "og-image.png"), ogImage);
fs.writeFileSync(path.join(outDir, "favicon-32.png"), favicon32);

console.log("Generated: icon-192.png, icon-512.png, og-image.png, favicon-32.png");
