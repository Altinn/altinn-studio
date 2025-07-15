import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/dashboard',
  server: {
    port: ports.dashboard,
  },
  preview: {
    port: ports.dashboard,
  },
});
