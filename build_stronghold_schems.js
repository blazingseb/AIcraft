const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TAG = { END:0, BYTE:1, SHORT:2, INT:3, LONG:4, FLOAT:5, DOUBLE:6, BYTE_ARRAY:7, STRING:8, LIST:9, COMPOUND:10, INT_ARRAY:11, LONG_ARRAY:12 };

function parseSchem(filePath) {
  let data = fs.readFileSync(filePath);
  try { data = zlib.gunzipSync(data); } catch (e) {}
  let offset = 0;
  const read = n => { const b = data.slice(offset, offset + n); offset += n; return b; };
  const readUByte = () => data.readUInt8(offset++);
  const readByte = () => data.readInt8(offset++);
  const readUShort = () => { const v = data.readUInt16BE(offset); offset += 2; return v; };
  const readShort = () => { const v = data.readInt16BE(offset); offset += 2; return v; };
  const readInt = () => { const v = data.readInt32BE(offset); offset += 4; return v; };
  const readLong = () => { const hi = data.readInt32BE(offset); const lo = data.readInt32BE(offset + 4); offset += 8; return hi * 0x100000000 + (lo >>> 0); };
  const readFloat = () => { const v = data.readFloatBE(offset); offset += 4; return v; };
  const readDouble = () => { const v = data.readDoubleBE(offset); offset += 8; return v; };
  const readString = () => { const len = readUShort(); const s = data.slice(offset, offset + len).toString('utf8'); offset += len; return s; };

  const readPayload = (tag) => {
    switch(tag) {
      case TAG.BYTE: return readByte();
      case TAG.SHORT: return readShort();
      case TAG.INT: return readInt();
      case TAG.LONG: return readLong();
      case TAG.FLOAT: return readFloat();
      case TAG.DOUBLE: return readDouble();
      case TAG.BYTE_ARRAY: {
        const n = readInt();
        return read(n);
      }
      case TAG.STRING: return readString();
      case TAG.LIST: {
        const elem = readUByte();
        const n = readInt();
        const out = new Array(n);
        for(let i=0;i<n;i++) out[i] = readPayload(elem);
        return out;
      }
      case TAG.COMPOUND: {
        const obj = {};
        while(true) {
          const t = readUByte();
          if(t === TAG.END) break;
          const name = readString();
          obj[name] = readPayload(t);
        }
        return obj;
      }
      case TAG.INT_ARRAY: {
        const n = readInt();
        const out = new Array(n);
        for(let i=0;i<n;i++) out[i] = readInt();
        return out;
      }
      case TAG.LONG_ARRAY: {
        const n = readInt();
        const out = new Array(n);
        for(let i=0;i<n;i++) out[i] = readLong();
        return out;
      }
      default: throw new Error('Unknown tag ' + tag);
    }
  };

  const rootType = readUByte();
  if(rootType !== TAG.COMPOUND) throw new Error('Not compound root');
  readString();
  const root = readPayload(rootType);

  const sch = root.Schematic || root;
  const blocks = sch.Blocks || sch.blocks || sch;
  const paletteObj = blocks.Palette || blocks.palette;
  const dataBuf = blocks.Data || blocks.data || blocks.BlockData || blocks.block_data;
  const width = sch.Width || sch.width;
  const height = sch.Height || sch.height;
  const length = sch.Length || sch.length;
  if(!paletteObj || !dataBuf || !width || !height || !length) {
    throw new Error('Unsupported schematic format for ' + filePath);
  }

  const paletteArr = [];
  for(const k of Object.keys(paletteObj)) paletteArr[paletteObj[k]] = k;
  const buf = Buffer.isBuffer(dataBuf) ? dataBuf : Buffer.from(dataBuf);
  return { width, height, length, paletteArr, dataBuf: buf };
}

function detectExits(width, height, length, paletteArr, dataBuf) {
  const idxAt = (x, y, z) => (y * width * length) + (z * width) + x;
  const isAirAt = (x, y, z) => {
    if(x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return true;
    const idx = idxAt(x, y, z);
    const pid = dataBuf[idx];
    const name = paletteArr[pid] || 'minecraft:air';
    return name.endsWith('air');
  };
  const cx = Math.floor(width / 2);
  const cz = Math.floor(length / 2);

  const checkSide = (side) => {
    let hits = 0;
    for(let dx=-1; dx<=1; dx++) {
      for(let dy=1; dy<=3; dy++) {
        let x = cx + dx;
        let z = cz;
        if(side === 'N') z = 0;
        if(side === 'S') z = length - 1;
        if(side === 'W') { x = 0; z = cz + dx; }
        if(side === 'E') { x = width - 1; z = cz + dx; }
        if(isAirAt(x, dy, z)) hits++;
      }
    }
    return hits >= 3;
  };

  const exits = [];
  if(checkSide('N')) exits.push('N');
  if(checkSide('S')) exits.push('S');
  if(checkSide('E')) exits.push('E');
  if(checkSide('W')) exits.push('W');
  return exits;
}

const files = fs.readdirSync(process.cwd())
  .filter(f => /^SH_.*\.schem$/i.test(f))
  .sort((a, b) => a.localeCompare(b));

if(files.length === 0) {
  console.error('No SH_*.schem files found.');
  process.exit(1);
}

const out = {};
const exitsOut = {};
for(const file of files) {
  const parsed = parseSchem(path.join(process.cwd(), file));
  const base = path.basename(file, '.schem');
  const key = 'stronghold_' + base.replace(/^SH_/i, '').toLowerCase();
  out[key] = {
    width: parsed.width,
    height: parsed.height,
    length: parsed.length,
    palette: parsed.paletteArr,
    data: Buffer.from(parsed.dataBuf).toString('base64')
  };
  exitsOut[key] = detectExits(parsed.width, parsed.height, parsed.length, parsed.paletteArr, parsed.dataBuf);
}

const output = [
  'const STRONGHOLD_SCHEMS = ' + JSON.stringify(out) + ';',
  'const STRONGHOLD_EXITS = ' + JSON.stringify(exitsOut) + ';',
  ''
].join('\n');

fs.writeFileSync('stronghold_schems_data.js', output);
console.log('wrote stronghold_schems_data.js with', files.length, 'schematics');
