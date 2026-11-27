// The architecture check (design/README.md, rule 7): the website's logic reaches outside only through its ports, so
// only the adapters and the place that wires them, `src/main.ts`, may touch the backend's client, error reports,
// `fetch`, the browser's storage or its clipboard. It is the only thing this lint checks.

import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

const where = 'only src/adapters/ and src/main.ts may';

const restrictedImports = {
    paths: [{ name: '@supabase/supabase-js', message: `Reach the backend through an outbound port: ${where} import it.` }],
    patterns: [
        { group: ['@supabase/supabase-js/*'], message: `Reach the backend through an outbound port: ${where} import it.` },
        { group: ['@sentry/*'], message: `Error reports are started in src/main.ts alone: ${where} import them.` },
    ],
};

const restrictedGlobals = ['fetch', 'localStorage'].map(name => ({
    name,
    message: `Reach ${name} through an outbound port: ${where} use it.`,
}));

const restrictedProperties = ['fetch', 'localStorage'].flatMap(property =>
    ['window', 'globalThis', 'self'].map(object => ({
        object,
        property,
        message: `Reach ${property} through an outbound port: ${where} use it.`,
    })));

const clipboard = {
    message: `Reach the clipboard through an outbound port: ${where} use it.`,
};

export default [
    { ignores: ['dist/**', 'node_modules/**', '.svelte-kit/**'] },
    ...svelte.configs['flat/base'],
    { files: ['**/*.{ts,js}'], languageOptions: { parser: tseslint.parser } },
    { files: ['**/*.svelte'], languageOptions: { parserOptions: { parser: tseslint.parser } } },
    { files: ['**/*.svelte.ts'], languageOptions: { parser: tseslint.parser } },
    {
        files: ['src/**/*.{ts,js,svelte}'],
        ignores: ['src/adapters/**', 'src/main.ts'],
        rules: {
            'no-restricted-imports': ['error', restrictedImports],
            'no-restricted-globals': ['error', ...restrictedGlobals],
            'no-restricted-properties': ['error', ...restrictedProperties],
            'no-restricted-syntax': [
                'error',
                { selector: "MemberExpression[object.name='navigator'][property.name='clipboard']", ...clipboard },
                { selector: "MemberExpression[object.property.name='navigator'][property.name='clipboard']", ...clipboard },
            ],
        },
    },
];
