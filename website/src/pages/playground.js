import dynamic from 'next/dynamic';
import Layout from '@theme/Layout';
import React from 'react';
import styles from './styles.module.css';
import { jsPython } from '../../../dist/jspython-interpreter.esm.js';

const JSPythonEditor = dynamic(
  () => import('../components/JSPythonEditor.js'),
  { ssr: false }
)


const scripts = `
print("|------------------------------|")
print("| Welcome My JSPython program! |")
print("|------------------------------|")
x = [1, 2, 3, 4]
x
  .map((r, i) =>
    v = r * i
    return v
  )
  .filter(r => r * r)
  .join(",")
`;

class Playground extends React.Component {
  constructor(props) {
    super(props);
    this.codeChange = this.codeChange.bind(this)
    this.interpreter = jsPython();
    this.state = {
      code: scripts,
      result: ''
    };
  }
  codeChange(code) {
    this.setState({code});
  }
  run() {
    this.interpreter.evaluate(this.state.code).then(res => {
      console.log('res', res);
      this.setState({result: JSON.stringify(res)})
    })
  }
  render() {
    return (
      <Layout title={`JSPython editor`}
        description="JSPython editor">
          <div className="container mainContainer docsContainer"
            style={{display: 'flex', height: '100%'}}>
            <div className={styles.editorWrapper}>
              <div className={styles.editorBlock}>
                <div>
                  <h1 style={{display: 'inline-block'}}>Code</h1>
                  <button className="button button--outline button--primary" onClick={this.run.bind(this)}
                    style={{float: "right", marginTop: '.5rem'}}>Run</button>
                </div>
                <JSPythonEditor ref="code" onChange={this.codeChange} value={scripts}></JSPythonEditor>
              </div>
              <div className={styles.editorBlock}>
                <h1>Result</h1>
                <JSPythonEditor value={this.state.result}></JSPythonEditor>
              </div>
            </div>
          </div>
      </Layout>
    );
  }
}

export default Playground;
