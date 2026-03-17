const fs = require('fs');
const txt = fs.readFileSync('bastion_treasure_data.js','utf8');
const m = txt.match(/const BASTION_TREASURE_SCHEM = (.*);/s);
const obj = JSON.parse(m[1]);
console.log(obj.palette);
