const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/**
 * Generates a valid PNG file of a solid color square.
 * Uses only built-in Node.js modules (no dependencies).
 *
 * @param {number} size - Width and height in pixels
 * @param {number[]} rgb - [r, g, b] color values (0-255)
 * @returns {Buffer} A valid PNG file buffer
 */
function createSolidPng(size, rgb) {
  const [r, g, b] = rgb;

  // Build raw image data: each row starts with a filter byte (0 = None),
  // followed by RGB bytes for each pixel.
  const rowLen = 1 + size * 3; // filter byte + 3 bytes per pixel
  const rawData = Buffer.alloc(rowLen * size);

  for (let y = 0; y < size; y++) {
    const offset = y * rowLen;
    rawData[offset] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const px = offset + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const chunks = [];

  // --- PNG Signature ---
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // --- IHDR chunk ---
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;                  // bit depth
  ihdr[9] = 2;                  // color type: RGB
  ihdr[10] = 0;                 // compression
  ihdr[11] = 0;                 // filter
  ihdr[12] = 0;                 // interlace
  chunks.push(makeChunk("IHDR", ihdr));

  // --- IDAT chunk ---
  chunks.push(makeChunk("IDAT", compressed));

  // --- IEND chunk ---
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

/**
 * Creates a PNG chunk with length, type, data, and CRC.
 * @param {string} type - 4-character chunk type
 * @param {Buffer} data - Chunk data
 * @returns {Buffer}
 */
function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuf]);
}

/**
 * Computes CRC-32 as required by the PNG spec.
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Theme color #1a1a2e = rgb(26, 26, 46)
const THEME_COLOR = [26, 26, 46];
const ICONS_DIR = path.join(__dirname, "..", "public", "icons");

fs.mkdirSync(ICONS_DIR, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const png = createSolidPng(size, THEME_COLOR);
  const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes, ${size}x${size})`);
}

console.log("Done.");
