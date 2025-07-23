import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@chromatic-com/storybook', '@storybook/addon-docs'],
  features: {
    buildStoriesJson: true,
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  refs: {
    'studio-components-legacy': {
      title: 'Studio Components Legacy',
      url: 'https://ambitious-glacier-071516503.6.azurestaticapps.net/?path=/story',
      expanded: false,
    },
  },
};
export default config;
