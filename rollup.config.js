import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy'
import { terser } from "rollup-plugin-terser";

const pkg = require('./package.json');
const input = 'src/interpreter.ts';

export default [{
  input,
  output: { file: pkg.main, name: 'jspython', format: 'umd', sourcemap: true, compact: true },
  external: [],
  treeshake: true,
  plugins: [
    typescript({
      clean: true
    }),
    copy({
      targets: [
        { src: 'src/assets', dest: 'dist' }
      ]
    }),
    terser()
  ]
}, {
  input,
  output: { file: pkg.module, format: 'esm', sourcemap: true, compact: true },
  external: [],
  plugins: [
    typescript({
      clean: true
    })
  ]
}];
