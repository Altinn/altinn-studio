import react from '@vitejs/plugin-react-swc';
import alias from '@rollup/plugin-alias';
import aliases from './studio.alias.js';
import type { UserConfig } from 'vite';

export default {
  plugins: [react()],
  server: {
    port: 2004,
  },
  preview: {
    port: 2004,
  },
  base: '/editor/',
  resolve: {
    alias: aliases,
  },
  build: {
    rollupOptions: {
      plugins: [
        alias({
          entries: aliases,
        }),
      ],
      output: {
        manualChunks(id) {
          if (id.includes('@digdir_designsystemet-react')) {
            return 'designsystemet';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('ux-editor-v3')) {
            return 'ux-editor-v3';
          }
        },
      },
    },
  },
} satisfies UserConfig;
