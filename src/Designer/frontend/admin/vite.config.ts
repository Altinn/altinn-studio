import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';
import { ADMIN_BASENAME } from 'app-shared/constants';

export default mergeConfig(common, {
  base: ADMIN_BASENAME,
  server: {
    port: ports.admin,
  },
  preview: {
    port: ports.admin,
  },
});
