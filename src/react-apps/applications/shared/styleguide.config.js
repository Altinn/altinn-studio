const path = require('path');

module.exports = {
  components: 'src/components/**/*.tsx',
  webpackConfig: require('./styleguide.webpack.config'),
  propsParser: require('react-docgen-typescript').parse,
  template: {
    head: {
      scripts: [{
          src: 'https://use.fortawesome.com/ed31cded.js'
        },
        {
          src: 'https://use.fortawesome.com/df832575.js'
        },
        {
          src: 'https://use.fortawesome.com/bdabc5c1.js'
        },
      ],
    },
  },
  styleguideComponents: {
    Wrapper: path.join(__dirname, '/styleguide/wrapper.tsx'),
  },
  sections: [{
    name: 'Components',
    content: 'styleguide/components.md',
    components: 'src/components/*.tsx',
    exampleMode: 'expand',
    usageMode: 'expand'
  }]
}
