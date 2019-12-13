const pkg = require('../package.json')

/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  title: 'JSPython',
  tagline: 'The tagline of my site',
  url: 'http://jspython-dev.github.io',
  baseUrl: '/jspython/',
  favicon: 'img/favicon.ico',
  organizationName: 'jspython-dev', // Usually your GitHub org/user name.
  projectName: 'jspython', // Usually your repo name.
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
      logo: {
        alt: 'Facebook Open Source Logo',
        src: 'https://docusaurus.io/img/oss_logo.png',
        href: 'https://opensource.facebook.com/',
      },
      copyright: `Copyright © ${new Date().getFullYear()} Falconsoft, Inc. Built with Docusaurus.`,
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
        },
      },
    ],
  ],
};
