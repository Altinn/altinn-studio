import react from '@vitejs/plugin-react-swc';
import alias from '@rollup/plugin-alias';
import aliases from './studio.alias.js';
import type { UserConfig } from 'vite';
import colors from 'picocolors';

export default {
  optimizeDeps: {
    include: ['react-dom', 'posthog-js'],
    exclude: ['@digdir/designsystemet-react'],
  },
  css: {
    transformer: 'lightningcss',
  },
  plugins: [
    react(),
    {
      name: 'url-override',
      configureServer: (server) => {
        const { printUrls } = server;
        server.printUrls = () => {
          const { logger } = server.config;
          printUrls();
          const url = 'http://studio.localhost' + server.config.base;
          logger.info(`  ${colors.green('➜')}  ${colors.bold('Studio running on:')}`);
          logger.info(`  ${colors.green('➜')}  ${colors.bold('URL')}:     ${colors.cyan(url)}`);
        };
      },
    },
  ],
  server: {
    allowedHosts: ['host.docker.internal'],
  },
  preview: {
    allowedHosts: ['host.docker.internal'],
  },
  resolve: {
    alias: aliases,
  },
  build: {
    cssMinify: 'lightningcss',
    rollupOptions: {
      plugins: [
        alias({
          entries: aliases,
        }),
      ],
    },
  },
} satisfies UserConfig;
