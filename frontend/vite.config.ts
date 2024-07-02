import path from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import setupMiddlewares from '@altinn-studio/mockend/src';
import svgr from 'vite-plugin-svgr';

const npm_package_name = 'app-development';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@altinn/policy-editor': path.resolve(__dirname, 'packages/policy-editor/src'),
      '@altinn/process-editor': path.resolve(__dirname, 'packages/process-editor/src'),
      '@altinn/schema-editor': path.resolve(__dirname, 'packages/schema-editor/src'),
      '@altinn/schema-model': path.resolve(__dirname, 'packages/schema-model/src'),
      'app-shared': path.resolve(__dirname, 'packages/shared/src'),
      '@altinn/text-editor': path.resolve(__dirname, 'packages/text-editor/src'),
      '@altinn/ux-editor': path.resolve(__dirname, 'packages/ux-editor/src'),
      '@altinn/ux-editor-v3': path.resolve(__dirname, 'packages/ux-editor-v3/src'),
      '@studio/testing': path.resolve(__dirname, 'testing'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist', npm_package_name),
    rollupOptions: {
      input: path.resolve(__dirname, npm_package_name, 'index.tsx'),
      output: {
        entryFileNames: `${npm_package_name}.js`,
      },
    },
    sourcemap: true,
    minify: 'esbuild', // Vite uses esbuild by default for minification
  },
  css: {
    modules: {
      generateScopedName: '[name]__[local]--[hash:base64:5]',
    },
  },
  plugins: [react(), svgr()],
  server: {
    origin: '*',
    cors: false,
    port: 2004,
  },
  setup: (server) => {
    server.middlewares.use(setupMiddlewares());
  },
  watch: {
    usePolling: true,
  },
  hmr: {
    overlay: false,
  },
});
