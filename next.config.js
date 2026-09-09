const webpack = require('webpack');
const { i18n } = require('./next-i18next.config');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,

  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    config.plugins.push(
      new webpack.DefinePlugin({
        PACKAGE_VERSION: JSON.stringify(
          require('mathjax-full/package.json').version,
        ),
      }),
    );

    return config;
  },
};

module.exports = withPWA(nextConfig);
