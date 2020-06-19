module.exports = {
  env: {
    es6: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    //'project': '../tsconfig.json',
    'sourceType': 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'no-trailing-spaces': 'error',
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    '@typescript-eslint/semi': ['error', 'never'],
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/member-delimiter-style': 'off',
    '@typescript-eslint/no-explicit-any': 'off',

    'func-call-spacing': 'off',
    '@typescript-eslint/func-call-spacing': 'error',

    'quotes': 'off',
    '@typescript-eslint/quotes': ['error', 'single'],

    'comma-spacing': 'off',
    '@typescript-eslint/comma-spacing': ['error']    
  }
};
