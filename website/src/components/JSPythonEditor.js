import React from 'react';
import AceEditor from "react-ace";
import '../../../src/assets/mode-jspython';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-tomorrow_night';

class JSPythonEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.value,
      theme: this.theme
    }
    this.onChange = this.onChange.bind(this);
    document.querySelector('.navbar .react-toggle').addEventListener('click', () => {
      setTimeout(() => {
        this.setState({
          theme: this.theme
        })
      });
    });
  }

  get theme() {
    const appTheme = document.querySelector('html').getAttribute('data-theme');
    return appTheme === 'dark' ? 'tomorrow_night' : 'github'
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
        style={{border: '1px solid var(--ifm-contents-border-color)'}}
        mode="python"
        height="100%"
        width="100%"
        theme={this.state.theme}
        value={this.state.value}
        onChange={this.onChange}
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          enableBasicAutocompletion: true,
          enableSnippets: false,
          enableLiveAutocompletion: true
        }}
      />
    )
  }
}

export default JSPythonEditor;
