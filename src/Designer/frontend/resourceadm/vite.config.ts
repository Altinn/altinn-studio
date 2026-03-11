import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';
import { RESOURCEADM_BASENAME } from 'app-shared/constants';

export default mergeConfig(common, {
  base: RESOURCEADM_BASENAME,
  server: {
    port: ports.resourceadm,
  },
  preview: {
    port: ports.resourceadm,
  },
});
