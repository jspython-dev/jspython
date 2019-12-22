const pkg = require('../package.json')

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  title: 'JSPython',
  tagline: 'Run your Python scripts in browser or NodeJS environment',
  url: 'https://jspython.dev',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'FalconSoft Ltd', // Usually your GitHub org/user name.
  projectName: 'JSPython', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'JSPython',
      logo: {
        alt: 'JSPython Logo',
        src: 'img/logo.svg',
      },
      links: [
        {to: 'docs/readme', label: 'Docs', position: 'left'},
        {to: 'playground', label: 'Playground'},
        {
          href: 'https://github.com/jspython-dev/jspython',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} FalconSoft Ltd`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        }
      }
    ],
  ],
};
