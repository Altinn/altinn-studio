import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export default mergeConfig(common, {
  base: APP_DEVELOPMENT_BASENAME,
  server: {
    port: ports['app-development'],
  },
  preview: {
    port: ports['app-development'],
  },
});
