module.exports = {
  root: true, // Important for monorepos
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Uses eslint-config-prettier to disable ESLint rules that conflict with Prettier
  ],
  env: {
    node: true, // Define Node.js global variables and Node.js scoping.
    es2021: true, // Add globals for ES2021
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Add specific rule overrides here if needed later
    // Example: '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'packages/*/dist/',
    'packages/*/node_modules/',
    '**/.*.js', // Ignore dotfiles starting with js extension e.g. .eslintrc.js
    '*.js',
  ],
}; 