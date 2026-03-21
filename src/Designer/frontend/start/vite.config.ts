import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/start',
  optimizeDeps: {
    include: ['react'],
  },
  server: {
    port: ports.start,
  },
  preview: {
    port: ports.start,
  },
});
