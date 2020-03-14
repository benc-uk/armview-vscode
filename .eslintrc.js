module.exports = {
  env: {
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    'project': 'tsconfig.json',
    'sourceType': 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    '@typescript-eslint/no-console': 'off',
    '@typescript-eslint/no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    '@typescript-eslint/semi': ['error', 'never'],
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/member-delimiter-style': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'func-call-spacing': 'off',
    '@typescript-eslint/func-call-spacing': 'error',
    'no-trailing-spaces': 'error',
    'quotes': 'off',
    '@typescript-eslint/quotes': ['error', 'single']
  }
};
