// Is to be executed with node in terminal to convert language
const fs = require('fs');
const ini = require('ini');

const obj = ini.decode(fs.readFileSync('../../../../../AltinnCore/Common/Languages/ini/nb.ini', 'utf-8'));
console.log(obj);
