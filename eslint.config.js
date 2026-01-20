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
        __COMMIT_HASH__: 'readonly',
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
      'scripts/**',
      'src/service-worker.ts',
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
  {
    // Relax type-aware rules for Playwright tests
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // Relax rules for shadcn-svelte UI components (third-party library code)
    // These are CLI-generated components that follow shadcn-svelte conventions
    files: ['src/lib/components/ui/**/*.svelte', 'src/lib/components/ui/**/*.ts'],
    rules: {
      // Svelte 5 runes use 'let' with $props() - this is correct and intentional
      'prefer-const': 'off',
      // Custom element warnings not relevant for this app
      'svelte/valid-compile': 'off',
      // TypeScript strict checks relaxed for library components
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
    },
  },
);
