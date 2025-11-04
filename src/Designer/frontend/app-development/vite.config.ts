import { mergeConfig, defineConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(
  common,
  defineConfig({
    base: '/editor',
    server: {
      port: ports['app-development'],
    },
    preview: {
      port: ports['app-development'],
    },
  }),
);
