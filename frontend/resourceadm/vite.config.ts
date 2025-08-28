import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/resourceadm',
  server: {
    port: ports.resourceadm,
  },
  preview: {
    port: ports.resourceadm,
  },
});
