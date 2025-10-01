/**
 * @see https://jestjs.io/docs/code-transformation#examples
 */
module.exports = {
  process(_sourceText, _sourcePath) {
    return {
      code: `module.exports = require('identity-obj-proxy');`,
    };
  },
};
