const eslintPluginNode = require('eslint-plugin-node');

module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
  plugins: [
    'ember',
  ],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended',
    'airbnb-base',
  ],
  env: {
    browser: true,
  },
  rules: {
    'ember/no-jquery': 'error',
    'func-names': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'no-underscore-dangle': ['error', {
      allowAfterThis: true,
      allowAfterSuper: true,
    }],
    'lines-between-class-members': ['error', 'always', {
      exceptAfterSingleLine: true,
    }],
    'import/no-extraneous-dependencies': 'off',
    'prefer-arrow-callback': ['error', { allowUnboundThis: true }],
  },
  overrides: [
    // node files
    {
      files: [
        '.eslintrc.js',
        '.template-lintrc.js',
        'ember-cli-build.js',
        'index.js',
        'testem.js',
        'blueprints/*/index.js',
        'config/**/*.js',
        'tests/dummy/config/**/*.js',
      ],
      excludedFiles: [
        'addon/**',
        'addon-test-support/**',
        'app/**',
        'tests/dummy/app/**',
      ],
      parserOptions: {
        sourceType: 'script',
      },
      env: {
        browser: false,
        node: true,
      },
      plugins: ['node'],
      rules: {
        ...eslintPluginNode.configs.recommended.rules,
        ...{
          // add your custom rules and overrides for node files here
        },
      },
    },
  ],
};
