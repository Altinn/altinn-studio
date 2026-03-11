import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/org-settings',
  server: {
    port: ports['org-settings'],
  },
  preview: {
    port: ports['org-settings'],
  },
});
