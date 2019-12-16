import dynamic from 'next/dynamic';
import Layout from '@theme/Layout';
import React from 'react';
import styles from './styles.module.css';
import { jsPython } from '../../../dist/jspython-interpreter.esm.js';
import ExampleList from '../components/ExamplesList';
import 'ace-builds';
import * as langTools from '../../../node_modules/ace-builds/src-min-noconflict/ext-language_tools';

const JSPythonEditor = dynamic(
  () => import('../components/JSPythonEditor.js'),
  { ssr: false }
)


const scripts = `
"""|------------------------------|"""
"""| Welcome My JSPython program! |"""
"""|------------------------------|"""
x = [1, 2, 3, 4]
x.map((r, i) =>
    v = r * i
    return v
  )
  .filter(r => r * r)
  .join(",")
`;

class Playground extends React.Component {
  constructor(props) {
    super(props);
    this.codeChange = this.codeChange.bind(this);
    this.interpreter = jsPython();
    this.state = {
      code: scripts,
      result: ''
    };
    this.initEditorMode();
  }

  codeChange(code) {
    this.setState({ code });
  }

  formatJSON(format = true) {
    console.log('this.state.result', this.state.result);
    if (typeof this.state.result !== 'string') return;
    try {
      this.error = null;
      if (format) {
        this.setState({
          result: JSON.stringify(JSON.parse(this.state.result), null, '\t')
        });
      } else {
        this.setState({
          result: JSON.stringify(JSON.parse(this.state.result))
        });
      }
    } catch (e) {
      this.error = e;
    }
  }

  async run() {
    try {
      const res = await this.interpreter.evaluate(this.state.code);

      if (res === null || res == undefined) {
        this.setState({ result: '' });
      } else if (['string', 'number', 'boolean'].indexOf(typeof res) >= 0 ) {
        this.setState({ result: res.toString() });
      } else {
        this.setState({ result: JSON.stringify(res, null, 4) });
      }
    } catch (e) {
      this.setState({ result: e.message })
    }
  }
  render() {
    return (
      <Layout title={`JSPython editor`}
        description="JSPython editor">
        <div className={styles.playgroundPage}>
          <ExampleList selectCode={this.codeChange}></ExampleList>
          <div className={"container mainContainer docsContainer " + styles.playgroundContent}>
            <div className={styles.playgroundPageHeader}>
              <h1>JSPython playground</h1>
              <p>Write custom code, use and edit examples. For more advanced experience 
                use <a href="https://run.worksheet.systems/rest-client/jspython-editor" target="_blank">Worksheets JSPython Editor</a>&nbsp;or&nbsp;
                <a href="https://chrome.google.com/webstore/detail/worksheets-rest-client/bjaifffdmbokgicfacjmhdkdonpmbkbd">Chrome Extensions</a>
                </p>
            </div>
            <div className={styles.editorWrapper}>
              <div className={styles.editorBlock} style={{ marginRight: '1rem'}}>
                <div>
                  <h1 style={{ display: 'inline-block' }}>Code</h1>
                  <button onClick={this.run.bind(this)}
                    className={styles.runBtn + " button button--outline button--primary"}>Run</button>
                </div>
                <JSPythonEditor ref="code" onChange={this.codeChange} value={this.state.code}></JSPythonEditor>
              </div>
              <div className={styles.editorBlock}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h1>Result</h1>
                <div>
                  <button className="runBtn_src-pages- button button--outline button--primary button--sm"
                    onClick={this.formatJSON.bind(this, true)}>Format</button>
                  <button className="runBtn_src-pages- button button--outline button--primary button--sm"
                    style={{marginRight: '0.5rem'}}
                    onClick={this.formatJSON.bind(this, false)}>Minify</button>
                </div>
                </div>
                <JSPythonEditor format={true} value={this.state.result}></JSPythonEditor>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  initEditorMode() {
    const interpreterCompleter = {
      getCompletions: (editor, session, pos, prefix, callback) => {
        const line = editor.session.getLine(pos.row);
        const regexp = `([\\w.]+).${prefix}`;
        const res = line.match(new RegExp(regexp));
        const wordList = this.interpreter.getAutocompletionList(res ? res[1] : null);
        callback(null, wordList);
      }
    };
    langTools.addCompleter(interpreterCompleter);
  }
}

export default Playground;
