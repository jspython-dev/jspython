import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy'
import terser from "@rollup/plugin-terser";

const input = 'src/interpreter.ts';

const pkgMain = 'dist/jspython-interpreter.min.js';
const pkgModule = 'dist/jspython-interpreter.esm.js';

export default [{
  input,
  output: { file: pkgMain, name: 'jspython', format: 'umd', sourcemap: true, compact: true },
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
  output: { file: pkgModule, format: 'esm', sourcemap: true, compact: true },
  external: [],
  plugins: [
    typescript({
      clean: true
    })
  ]
}];
