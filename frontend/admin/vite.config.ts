import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/admin',
  server: {
    port: ports.admin,
  },
  preview: {
    port: ports.admin,
  },
});
