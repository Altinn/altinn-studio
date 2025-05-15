import { mergeConfig } from 'vite';
import common from '../vite.config';

export default mergeConfig(common, {
  base: '/editor',
  server: {
    port: 2004,
  },
  preview: {
    port: 2004,
  },
});
