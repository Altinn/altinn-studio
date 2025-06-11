import { mergeConfig } from 'vite';
import common from '../vite.config';

export default mergeConfig(common, {
  base: '/resourceadm',
  server: {
    port: 2023,
  },
  preview: {
    port: 2023,
  },
});
