import { mergeConfig } from 'vite';
import common from '../vite.config';

export default mergeConfig(common, {
  base: '/dashboard',
  server: {
    port: 2003,
  },
  preview: {
    port: 2003,
  },
});
