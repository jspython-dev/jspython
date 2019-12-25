import React from 'react';
import AceEditor from "react-ace";
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
    this.initThemeToggle();
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

  initThemeToggle() {
    let timeout;
    let timeout2;
    const menuBtn = document.querySelector('.navbar__toggle');
    let el;
    if (window.innerWidth > 760) {
      el = document.querySelector('.navbar .react-toggle');
      el.addEventListener('click', handler.bind(this));
    } else {
      menuBtn.addEventListener('click', () => {
        setTimeout(() => {
          el = document.querySelector('.navbar .navbar-sidebar .react-toggle');
          el.addEventListener('click', handler.bind(this));
        });
      })
    }

    function handler() {
      if (timeout) { clearTimeout(timeout) }
      if (timeout2) { clearTimeout(timeout2) }
      timeout = setTimeout(() => {
        this.setState({
          theme: this.theme
        });
        timeout = null;
      }, 1e1);
      timeout2 = setTimeout(() => {
        const t = this.theme;
        if (t !== this.state.theme) {
          this.setState({
            theme: t
          });
        }
        timeout2 = null;
      }, 1e2);
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
