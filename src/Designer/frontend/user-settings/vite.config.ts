import { mergeConfig } from 'vite';
import common from '../vite.config';
import ports from '../ports.json';

export default mergeConfig(common, {
  base: '/settings',
  server: {
    port: ports['user-settings'],
  },
  preview: {
    port: ports['user-settings'],
  },
});
