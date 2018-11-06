module.exports = {
  root: true,
  extends: ['airbnb-base', 'eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['node', 'promise'],
  parserOptions: {
    ecmaFeatures: {
      impliedStrict: true,
    },
    ecmaVersion: 9,
    sourceType: 'script',
  },
  env: {
    node: true,
    'shared-node-browser': true,
  },
  rules: {
    'arrow-parens': 'off', // prettier only support always or avoid
    'class-methods-use-this': 'off',
    curly: ['error', 'all'], // override airbnb's multi-line
    'import/extensions': [
      'error',
      'always',
      {
        js: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/*.config.js'],
      },
    ],
    'no-console': 'off',
    'no-mixed-operators': 'off', // trust prettier
    'no-multiple-empty-lines': 'off', // trust prettier
    'no-use-before-define': ['error', { functions: false }],
    'no-plusplus': 'off', // just make sensible use of ++ and --
    'padding-line-between-statements': [
      'error',
      { blankLine: 'never', prev: '*', next: ['case', 'default'] },
      { blankLine: 'never', prev: ['case', 'default'], next: '*' },
      {
        blankLine: 'always',
        prev: '*',
        next: [
          'block',
          'block-like',
          'class',
          'const',
          'directive',
          'export',
          'function',
          'import',
          'let',
          'return',
          'var',
        ],
      },
      {
        blankLine: 'always',
        prev: [
          'block',
          'block-like',
          'class',
          'const',
          'directive',
          'export',
          'function',
          'import',
          'let',
          'return',
          'var',
        ],
        next: '*',
      },
      { blankLine: 'any', prev: 'const', next: 'const' },
      { blankLine: 'any', prev: 'directive', next: 'directive' },
      { blankLine: 'any', prev: 'export', next: 'export' },
      { blankLine: 'any', prev: 'import', next: 'import' },
      { blankLine: 'any', prev: 'let', next: 'let' },
      { blankLine: 'any', prev: 'var', next: 'var' },
    ],
  },
}
