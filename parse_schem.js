const fs = require('fs');
const zlib = require('zlib');

const path = 'bastion_treasure.schem';
let data = fs.readFileSync(path);
try { data = zlib.gunzipSync(data); } catch (e) {}

let offset = 0;
const read = (n) => { const b = data.slice(offset, offset + n); offset += n; return b; };
const readByte = () => data.readInt8(offset++);
const readUByte = () => data.readUInt8(offset++);
const readShort = () => { const v = data.readInt16BE(offset); offset += 2; return v; };
const readUShort = () => { const v = data.readUInt16BE(offset); offset += 2; return v; };
const readInt = () => { const v = data.readInt32BE(offset); offset += 4; return v; };
const readLong = () => { const hi = data.readInt32BE(offset); const lo = data.readInt32BE(offset + 4); offset += 8; return hi * 0x100000000 + (lo >>> 0); };
const readFloat = () => { const v = data.readFloatBE(offset); offset += 4; return v; };
const readDouble = () => { const v = data.readDoubleBE(offset); offset += 8; return v; };
const readString = () => { const len = readUShort(); const s = data.slice(offset, offset + len).toString('utf8'); offset += len; return s; };

const TAG = { END:0, BYTE:1, SHORT:2, INT:3, LONG:4, FLOAT:5, DOUBLE:6, BYTE_ARRAY:7, STRING:8, LIST:9, COMPOUND:10, INT_ARRAY:11, LONG_ARRAY:12 };

function readPayload(tag) {
  switch(tag) {
    case TAG.BYTE: return readByte();
    case TAG.SHORT: return readShort();
    case TAG.INT: return readInt();
    case TAG.LONG: return readLong();
    case TAG.FLOAT: return readFloat();
    case TAG.DOUBLE: return readDouble();
    case TAG.BYTE_ARRAY: {
      const n = readInt();
      const b = read(n);
      return b;
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
    default: throw new Error('Unknown tag '+tag);
  }
}

const rootType = readUByte();
if(rootType !== TAG.COMPOUND) throw new Error('Not compound root');
const rootName = readString();
const root = readPayload(rootType);

const palette = root.Palette || root.palette;
const blockData = root.BlockData || root.block_data;
const width = root.Width || root.width;
const height = root.Height || root.height;
const length = root.Length || root.length;

const idToName = {};
for(const k of Object.keys(palette)) idToName[palette[k]] = k;

const buf = Buffer.isBuffer(blockData) ? blockData : Buffer.from(blockData);

// decode varints
const indices = [];
let i = 0;
while(i < buf.length) {
  let val = 0;
  let shift = 0;
  while(true) {
    if(i >= buf.length) break;
    const byte = buf[i++];
    val |= (byte & 0x7F) << shift;
    if((byte & 0x80) === 0) break;
    shift += 7;
  }
  indices.push(val);
}

const expected = width * height * length;
if(indices.length !== expected) {
  console.error('warning indices', indices.length, 'expected', expected);
}

const blocks = [];
for(let idx=0; idx<indices.length; idx++) {
  const pid = indices[idx];
  const name = idToName[pid] || 'minecraft:air';
  if(name.endsWith('air')) continue;
  const y = Math.floor(idx / (width * length));
  const rem = idx % (width * length);
  const z = Math.floor(rem / width);
  const x = rem % width;
  blocks.push([x,y,z,name]);
}

const out = { width, height, length, blocks };
fs.writeFileSync('bastion_treasure.json', JSON.stringify(out));
console.log('ok', width, height, length, blocks.length);
