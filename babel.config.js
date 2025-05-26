module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    '@babel/preset-typescript',
    'next/babel' // If it's a Next.js project, this is often beneficial
  ],
};
