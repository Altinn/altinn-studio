import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/info',
  server: {
    port: ports['studio-root'],
  },
  preview: {
    port: ports['studio-root'],
  },
});
