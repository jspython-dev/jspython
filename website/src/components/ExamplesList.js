import React from 'react';

class ExampleList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeGroup: null,
      activeCode: null,
      examles: [{
        group: 'Example group 1',
        list: [{
          name: 'Array',
          code: `
# use JavaScript arrays
x = [1, 2, 3]
x.push(55)
x.map(r => r * 2)
`.trim()
        }, {
          name: 'Math',
          code: `Math.sqrt(4)`
        }]
      }, {
        group: 'Example group 2',
        list: [{
          name: 'Object',
          code: `
x = {
  prop: 1
}
x.prop
`.trim()
        }, {
          name: 'String',
          code: `
s = "Test"
s2 = s + "2"
s2
`
        }]
      }]
    }
  }
  selectExample(group, example) {
    this.state.activeCode = example.name;
    this.state.activeGroup = group;
    this.props.selectCode(example.code);
  }

  toggleGroup(e) {
    const cL = e.target.parentNode.classList;
    const collapsedClass = 'menu__list-item--collapsed';
    if (cL.contains(collapsedClass)) {
      cL.remove(collapsedClass);
    } else {
      cL.add(collapsedClass);
    }
  }

  render() {
    const styles = {
      borderRight: '1px solid var(--ifm-contents-border-color)',
      boxSizing: 'border-box',
      width: '300px',
      paddingTop: '1rem'
    }
    return (
      <div className="docSidebarContainer_node_modules-@docusaurus-theme-classic-src-theme-DocPage-"
        style={styles}>
        <h1 style={{ display: 'inline-block', marginLeft: '1.25rem', marginBottom: '0.5rem' }}>Examples</h1>
        <div className="sidebar_node_modules-@docusaurus-theme-classic-src-theme-DocSidebar-">
          <div className="menu menu--responsive">
            <button aria-label="Open Menu" className="button button--secondary button--sm menu__button" type="button">
              <svg className="sidebarMenuIcon_node_modules-@docusaurus-theme-classic-src-theme-DocSidebar-" xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 32 32" role="img" focusable="false">
                <title>Menu</title>
                <path stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="2" d="M4 7h22M4 15h22M4 23h22"></path>
              </svg>
            </button>
            <ul className="menu__list">
              {this.state.examles.map((e, index) => {
                return (
                  <li className={"menu__list-item"} key={index}>
                    <a className={"menu__link menu__link--sublist " + (this.state.activeGroup === e.group ? "menu__link--active" : "")}
                      onClick={this.toggleGroup}>{e.group}</a>
                    <ul className="menu__list">
                      {e.list.map((i, index2) => {
                        return (
                          <li className="menu__list-item" key={`${index}:${index2}`}>
                            <a aria-current="page" className={"menu__link " + (this.state.activeCode === i.name ? "menu__link--active" : "")}
                              onClick={this.selectExample.bind(this, e.group, i)}>{i.name}</a>
                          </li>
                        )
                      })
                      }
                    </ul>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    )
  }
}

export default ExampleList;
