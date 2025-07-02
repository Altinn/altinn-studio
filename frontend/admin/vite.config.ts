import { mergeConfig } from 'vite';
import common from '../vite.config';

export default mergeConfig(common, {
  base: '/admin',
  server: {
    port: 2006,
  },
  preview: {
    port: 2006,
  },
});
