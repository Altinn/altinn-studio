import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';
import { DASHBOARD_BASENAME } from 'app-shared/constants';

export default mergeConfig(common, {
  base: DASHBOARD_BASENAME,
  server: {
    port: ports.dashboard,
  },
  preview: {
    port: ports.dashboard,
  },
});
