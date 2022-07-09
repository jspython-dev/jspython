import typescript from 'rollup-plugin-typescript2';
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

export default {

  input: 'src/runtime/JspyInterpreter.ts',
  output: {
    name: 'jspython',
    file: 'dist/jspy-interpreter.js',
    format: 'umd',
    sourcemap: true,
    globals: {}
  },
  external: [],
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
