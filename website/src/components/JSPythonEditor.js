import React from 'react';
import AceEditor from "react-ace";

import '../../../src/assets/mode-jspython';
import 'ace-builds/src-noconflict/theme-github';

class JSPythonEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value
    }
    this.onChange = this.onChange.bind(this)
  }

  onChange(newValue) {
    if (this.props.onChange) {
      this.setState({value: newValue});
      this.props.onChange(newValue);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.state.value) {
      this.setState({ value: nextProps.value });
    }
  }

  render() {
    return (
      <AceEditor
        mode="python"
        theme="github"
        height="100%"
        width="100%"
        value={this.state.value}
        onChange={this.onChange}
        editorProps={{ $blockScrolling: true }}
      />
    )
  }
}

export default JSPythonEditor;
