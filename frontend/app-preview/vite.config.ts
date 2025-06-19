import { mergeConfig } from 'vite';
import common from '../vite.config';

export default mergeConfig(common, {
  base: '/preview',
  server: {
    port: 2005,
  },
  preview: {
    port: 2005,
  },
});
