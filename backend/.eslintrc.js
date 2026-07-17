module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
  },
  plugins: ['import'],
  rules: {
    // Vol 3: Forbid cross-module deep imports. Modules must only import from the root index of other modules.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../modules/*/*'],
            message: 'Vol 3 Architecture Violation: Modules must communicate via bounded context boundaries (index.js barrel files) or EventBus, not direct deep imports.',
          },
          {
            group: ['../modules/*/*'],
            message: 'Vol 3 Architecture Violation: Do not deep import into other bounded contexts.',
          }
        ],
      },
    ],
  },
};
