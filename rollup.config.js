import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy'
import { uglify } from "rollup-plugin-uglify";

const pkg = require('./package.json');
const input = 'src/interpreter.ts';

export default [{
  input,
  output: { file: pkg.main, name: 'JSPython', format: 'umd', sourcemap: true, compact: true, globals: {'json5': 'JSON5'} },
  external: [
    'json5'
  ],
  treeshake: true,
  plugins: [
    typescript({
      clean: true
    }),
    copy({
      targets: [
        { src: 'src/assets', dest: 'lib' }
      ]
    }),
    uglify()
  ]
}, {
  input,
  output: { file: pkg.module, format: 'esm', sourcemap: true, compact: true },
  external: [
    'json5'
  ],
  plugins: [
    typescript({
      clean: true
    })
  ]
}];
