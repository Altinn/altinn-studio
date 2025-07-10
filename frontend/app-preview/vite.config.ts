import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/preview',
  server: {
    port: ports['app-preview'],
  },
  preview: {
    port: ports['app-preview'],
  },
});
