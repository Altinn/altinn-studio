const fs = require('fs');

const filname = 'en.json';
const source = require(`./old/${filname}`);
const target = {};
Object.keys(source).forEach((key1) => {
  Object.keys(source[key1]).forEach((key2) => {
    const key = key1 + '.' + key2;
    target[key] = source[key1][key2];
  });
});
const keysCopy = Object.keys(target);
keysCopy.sort();
const ordered = {};
keysCopy.forEach((key) => {
  ordered[key] = target[key];
});

fs.writeFileSync(`./src/${filname}`, JSON.stringify(ordered, null, 2), 'utf-8');
