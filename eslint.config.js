import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...svelte.configs['flat/recommended'],
  prettier,
  ...svelte.configs['flat/prettier'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    ignores: [
      'site/**',
      'dist/**',
      'build/**',
      '.svelte-kit/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
  {
    rules: {
      // Enforce undefined over null (project standard)
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      // Code quality
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|\\$\\$)',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Svelte-specific
      'svelte/no-at-html-tags': 'error',
      'svelte/no-target-blank': 'error',

      // Best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
);
