import { mergeConfig } from 'vite';
import common from '../vite.config';

export default mergeConfig(common, {
  base: '/info',
  server: {
    port: 2002,
  },
  preview: {
    port: 2002,
  },
});
