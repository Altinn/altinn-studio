import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';
import { PREVIEW_BASENAME } from 'app-shared/constants';

export default mergeConfig(common, {
  base: PREVIEW_BASENAME,
  server: {
    port: ports['app-preview'],
  },
  preview: {
    port: ports['app-preview'],
  },
});
