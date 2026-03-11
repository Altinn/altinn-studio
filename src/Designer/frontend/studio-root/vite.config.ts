import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';
import { STUDIO_ROOT_BASENAME } from 'app-shared/constants';

export default mergeConfig(common, {
  base: STUDIO_ROOT_BASENAME,
  server: {
    port: ports['studio-root'],
  },
  preview: {
    port: ports['studio-root'],
  },
});
