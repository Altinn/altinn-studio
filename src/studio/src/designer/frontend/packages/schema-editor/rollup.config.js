import typescript from "rollup-plugin-typescript2";
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-css-only';
import json from '@rollup/plugin-json';

import pkg from './package.json';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],
  plugins: [
    external(),
    resolve(),
    typescript({
      useTsconfigDeclarationDir: true,
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    json(),
    css({
      output: 'index.css',
    }),
  ]
};
