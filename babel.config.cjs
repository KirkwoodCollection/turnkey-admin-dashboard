module.exports = {
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'  // Force CommonJS for tests
        }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        ['@babel/preset-typescript', {
          allowDeclareFields: true,
          isTSX: true,
          allExtensions: true
        }]
      ],
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-transform-class-properties',
        '@babel/plugin-transform-class-static-block'
      ]
    }
  },
  // Default configuration for non-test environments
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',
    }],
    ['@babel/preset-typescript', {
      allowDeclareFields: true,
    }],
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-class-static-block',
  ],
};