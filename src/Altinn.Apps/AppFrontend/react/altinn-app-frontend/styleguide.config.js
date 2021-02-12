const path = require('path');
module.exports = {
  components: 'src/components/**/*.tsx',
  webpackConfig: require('./webpack.config.development'),
  //propsParser: require('react-docgen-typescript').withDefaultConfig({propFilter: {skipPropsWithName: 'classes'}}).parse,
  styles: {
    StyleGuide: {
      '@global html': {
        fontSize: '10px',
      },
      '@global body': {
        fontSize: '16px',
      },
    },
  },
  template: {
    head: {
      links: [
        {
          rel: 'stylesheet',
          href:
            '"https://altinncdn.no/fonts/altinn-din/altinn-din.css'
        },
        {
          rel: 'stylesheet',
          href:
          'https://altinncdn.no/toolkits/altinn-app-frontend/1/altinn-app-frontend.css'
        },
      ],
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
  pagePerSection: true,
  sections: [
    {
      name: "Introduction",
      content: 'styleguide/introduction.md',
    },
    {
      name: "Base",
      content: 'styleguide/base.md',
      components: 'src/components/base/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand'
    },
    {
      name: "Advanced",
      content: 'styleguide/advanced.md',
      components: 'src/components/advanced/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand'
    },
  ]
};
