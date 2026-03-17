const fs = require('fs');
const zlib = require('zlib');
const path = 'bastion_treasure.schem';
let data = fs.readFileSync(path);
try { data = zlib.gunzipSync(data); } catch (e) {}
let offset = 0;
const read = n => { const b = data.slice(offset, offset+n); offset += n; return b; };
const readUByte = () => data.readUInt8(offset++);
const readByte = () => data.readInt8(offset++);
const readUShort = () => { const v = data.readUInt16BE(offset); offset+=2; return v; };
const readShort = () => { const v = data.readInt16BE(offset); offset+=2; return v; };
const readInt = () => { const v = data.readInt32BE(offset); offset+=4; return v; };
const readLong = () => { const hi = data.readInt32BE(offset); const lo = data.readInt32BE(offset+4); offset+=8; return hi * 0x100000000 + (lo>>>0); };
const readFloat = () => { const v = data.readFloatBE(offset); offset+=4; return v; };
const readDouble = () => { const v = data.readDoubleBE(offset); offset+=8; return v; };
const readString = () => { const len = readUShort(); const s = data.slice(offset, offset+len).toString('utf8'); offset += len; return s; };

const TAG = { END:0, BYTE:1, SHORT:2, INT:3, LONG:4, FLOAT:5, DOUBLE:6, BYTE_ARRAY:7, STRING:8, LIST:9, COMPOUND:10, INT_ARRAY:11, LONG_ARRAY:12 };

function readPayload(tag) {
  switch(tag) {
    case TAG.BYTE: return readByte();
    case TAG.SHORT: return readShort();
    case TAG.INT: return readInt();
    case TAG.LONG: return readLong();
    case TAG.FLOAT: return readFloat();
    case TAG.DOUBLE: return readDouble();
    case TAG.BYTE_ARRAY: { const n = readInt(); return read(n); }
    case TAG.STRING: return readString();
    case TAG.LIST: { const elem = readUByte(); const n = readInt(); const out = new Array(n); for(let i=0;i<n;i++) out[i]=readPayload(elem); return out; }
    case TAG.COMPOUND: { const obj = {}; while(true){ const t = readUByte(); if(t===TAG.END) break; const name = readString(); obj[name]=readPayload(t);} return obj; }
    case TAG.INT_ARRAY: { const n = readInt(); const out = new Array(n); for(let i=0;i<n;i++) out[i]=readInt(); return out; }
    case TAG.LONG_ARRAY: { const n = readInt(); const out = new Array(n); for(let i=0;i<n;i++) out[i]=readLong(); return out; }
    default: throw new Error('Unknown tag '+tag);
  }
}

const rootType = readUByte();
const rootName = readString();
const root = readPayload(rootType);
console.log('rootName', rootName);
console.log('keys', Object.keys(root));
fs.writeFileSync('schem_keys.json', JSON.stringify(root, null, 2));
