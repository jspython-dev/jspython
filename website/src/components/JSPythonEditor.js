import React from 'react';
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/theme-github";

class JSPythonEditor extends React.Component {
  onChange(newValue) {
    console.log("change", newValue);
    console.log('this', this);
  }
  render() {
    return (
      <AceEditor
        mode="java"
        theme="github"
        onChange={this.onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
      />
    )
  }
}

export default JSPythonEditor;
