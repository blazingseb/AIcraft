const fs = require('fs');
const root = JSON.parse(fs.readFileSync('schem_keys.json','utf8'));
const blocks = root.Schematic.Blocks;
console.log(Object.keys(blocks));
