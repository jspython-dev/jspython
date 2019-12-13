import dynamic from 'next/dynamic';
import Layout from '@theme/Layout';
import React from 'react';

const JSPythonEditor = dynamic(
  () => import('../components/JSPythonEditor.js'),
  { ssr: false }
)

class Editor extends React.Component {
  onChange() {
    console.log('on change', this);
  }
  render() {
    return (
      <Layout title={`JSPython editor`}
        description="JSPython editor">
        <div className="mainContainer">
          <div className="container mainContainer docsContainer">
            <div className="wrapper">
              <JSPythonEditor></JSPythonEditor>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
}

export default Editor;
