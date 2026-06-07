import tsconfigPaths from 'vite-tsconfig-paths';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Resolve tsconfig `paths` (e.g. @app/form-component/* -> ./src/*) so subpath imports
    // work without declaring them in the package's `exports`. Mirrors vitest.config.ts.
    config.plugins?.push(tsconfigPaths());
    return config;
  },
};
export default config;
