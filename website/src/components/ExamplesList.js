import React from 'react';
import styles from './styles.module.css';

class ExampleList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mobileMenu: false,
      activeGroup: null,
      activeCode: null,
      examles: [{
        group: 'Basic',
        list: [{
          name: 'Working with Objects',
          code: `
# create object
x = {}
x.someProp = 55
x1 = {prop: x}
dateObj = {
  currentYear: dateTime().getFullYear(),
  currentMonth: dateTime().getMonth() + 1,
  currentDate: dateTime().getDate(),
  currentTime: dateTime()
}

# JavaScript Object works here very well
x1.allKeys = Object.keys(dateObj)

x1["dynamicObject_" + dateTime().getMinutes()] = "This is dynamic object"

# merges two objects
Object.assign(dateObj, x1)

          `.trim()
        },
        {
          name: 'Working with Arrays',
          code: `
nums = [1, 2, 3, 4, 5]

""" All standard JavaScript functions work here """

nums.push(6)
nums.push(nums.pop() + 10)


y = nums.map((r, i) =>
        newItem = {
            element: r,
            index: i,
            square: Math.pow(i, 2),
            cube: Math.pow(i, 3)
        }
        return newItem
    )     
    .filter(r => r.cube > 5)
return y
          `.trim()
        },
        {
          name: 'Working with Math',
          code: `
""" All JavaScript Math functionas are working fine here """
{
  sqrt: Math.sqrt(4),
  floor: Math.floor(5.6),
  ceil: Math.ceil(5.6),
  min: Math.min(4, 2, 5, 8),
  max: Math.max(4, 2, 5, 8)
}          
          `.trim()
        },
        {
          name: 'Working with strings',
          code: `
text = """
  You can call any 
  JavaScript function
  even with " or '
"""
s = text + "Test "
s2 = s.replace("call", "invoke") + " 2 " + dateTime()
s2.trim()
`.trim()
        },
        {
          name: 'Working with dates',
          code: `
"""
returns a number of dates from new year
"""          
today = dateTime() # now
firstDate = dateTime(today.getFullYear() + "-01-01") # a first date of the current year
diffTime = today - firstDate

# number of days from the begining of year
Math.ceil(diffTime / 86400000)
`.trim()
        }]
      }, {
        group: 'Example group 2',
        list: [
          {
            name: 'Null Conditioning',
            code: `


myObj = {}

# this feature is not available in a classic Python,
# but it is very usefull and popular with other languages
myObj?.property?.subProperty or "N/A"
            `.trim()
          },          
          {
          name: 'while loop',
          code: `
i = 0
a = [] # array
while i < 6:
  i = i + 1
  
  if i % 2 == 0:
    continue
  a.push(i * i)

return a          
          `.trim()
        },
        {
          name: 'for loop',
          code: `
numbers = [2, 6, 8, 0, -1]
result = []

for x in numbers:
  result.push(x * 2)

# return only numbers greater than 5  
result.filter(r => r > 5)
`.trim()
        },
        {
          name: 'Functions',
          code: `
def add(a, b):
  return a + b
""" 
It is optional to specify 'return'
If no return specified, then it will return last statement
"""
def minus(a, b):
  a - b

# returns object what has two values
{
  name: "Examples",
  add: add(2, 3),
  substract: minus(10, 5)
}
`
        },
        {
          name: 'Arrow functions',
          code: `
nums = range(20)

"""
Here is example of multi line and single line arrow functions
"""
y = nums
  .map((r, i) =>
    newItem = {
        element: r,
        index: i,
        square: Math.pow(i, 2),
        cube: Math.pow(i, 3)
    }
    return newItem
  )     
  .filter(r => r.cube > 5)

return y          
          `.trim()
        },        
        {
          name: 'Recursive function',
          code: `
def power(base, exponent):
  if exponent == 0:
    return 1
  else:
    return base * power(base, exponent - 1)

"5 ** 10 = " + power(5, 10) + " == " + Math.pow(5, 10)
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

  toggleMobileMenu() {
    this.setState({
      mobileMenu: !this.state.mobileMenu
    });
  }

  render() {
    return (
      <div className="docSidebarContainer_node_modules-@docusaurus-theme-classic-src-theme-DocPage-"
        className={styles.examplesList}>
        <h2>Examples</h2>
        <div className="sidebar_node_modules-@docusaurus-theme-classic-src-theme-DocSidebar-" style={{ height: '100%' }}>
          <div className={"menu menu--responsive" + (this.state.mobileMenu ? ' menu--show' : '')}>
            <button aria-label="Open Menu" className="button button--secondary button--sm menu__button" onClick={this.toggleMobileMenu.bind(this)} type="button">
              {
                (this.state.mobileMenu ?
                  <span className={styles.sidebarMenuCloseIcon}>x</span> :
                  <svg className="sidebarMenuIcon_node_modules-@docusaurus-theme-classic-src-theme-DocSidebar-" xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 32 32" role="img" focusable="false"><title>Menu</title><path stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="2" d="M4 7h22M4 15h22M4 23h22"></path></svg>)
              }
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
