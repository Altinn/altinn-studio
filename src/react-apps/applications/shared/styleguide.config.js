const path = require('path');

module.exports = {
  components: 'src/components/**/*.tsx',
  webpackConfig: require('./styleguide.webpack.config'),
  propsParser: require('react-docgen-typescript').withDefaultConfig({propFilter: {skipPropsWithName: 'classes'}}).parse,
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
            'https://fonts.googleapis.com/css?family=Roboto&display=swap'
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
      name: "Atoms",
      content: 'styleguide/atoms.md',
      components: 'src/components/atoms/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand'
    },
    {
      name: "Molecules",
      content: 'styleguide/molecules.md',
      components: 'src/components/molecules/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand'
    },
    {
      name: "Organisms",
      content: 'styleguide/organisms.md',
      components: 'src/components/organisms/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand'
    },
    {
      name: 'Shared Components',
      content: 'styleguide/components.md',
      components: 'src/components/*.tsx',
      exampleMode: 'expand',
      usageMode: 'expand'
    }
  ]
};
