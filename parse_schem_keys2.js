const fs = require('fs');
const root = JSON.parse(fs.readFileSync('schem_keys.json','utf8'));
const sch = root.Schematic;
console.log(Object.keys(sch));
