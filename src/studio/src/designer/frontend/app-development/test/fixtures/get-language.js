let currentCategory;

require('fs')
  .readFileSync('../../backend/Languages/ini/nb.ini', 'utf8')
  .split(/\n/)
  .map(line => line.trim())
  .filter(line => !line.startsWith('#') && !line.startsWith(';') && line.length)
  .forEach(line => {
    if (/^\[.*]$/.test(line)) {
      currentCategory = line.replace(/(^\[)|(]$)/g, '');
      module.exports[currentCategory] = {};
    } else if (currentCategory?.length) {
      const firstEqualsSignIndex = line.indexOf('=');
      const key = line.substring(0, firstEqualsSignIndex).trim();
      module.exports[currentCategory][key] = line.substring(firstEqualsSignIndex + 1).trim();
    }
  });
