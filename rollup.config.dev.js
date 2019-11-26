import typescript from 'rollup-plugin-typescript2';
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

export default {

  input: 'src/interpreter.ts',
  output: {
    name: 'jspython',
    file: 'dist/jspython.js',
    format: 'umd',
    sourcemap: true,
    globals: {'json5': 'JSON5'}
  },
  external: [
    'json5'
  ],
  plugins: [
    typescript({
      abortOnError: false
    }),
    serve({contentBase: '', open: true}),
    livereload('dist')
  ],
  watch: {
    exclude: ['node_modules/**'],
    include: 'src/**'
  }
};
