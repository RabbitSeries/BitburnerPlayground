import js from "@eslint/js"
import { browser } from "globals"
import { configs } from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import { defineConfig } from "eslint/config"
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        ignores: [
            "node_modules/**",
            "dist/**",
            "bitburner-filesync/**/*",
            "NetscriptDefinitions.d.ts"
        ],
        plugins: { js,"@stylistic" : stylistic },
        extends: [js.configs.recommended, ...configs.recommended],
        languageOptions: { ecmaVersion: "latest", globals: browser },
        rules: {
            '@stylistic/indent': ['error', 4],
            '@stylistic/no-trailing-spaces' : ['error', {
                skipBlankLines: false,
                ignoreComments: false
            }],
            '@stylistic/eol-last': ["error", "always"],
            '@stylistic/no-multiple-empty-lines': ["error",
                { max: 1, maxEOF: 0 }
            ],
            '@stylistic/jsx-curly-spacing' : ["error", {
                when: "never",
                attributes: false
            }],
            '@stylistic/jsx-tag-spacing' : ["error", {
                closingSlash: "never",
                beforeSelfClosing: "always",
                afterOpening: "never",
                beforeClosing: "never"
            }],
            "@stylistic/jsx-self-closing-comp": ["error", {
                component: true,
                html: true
            }],
            "@stylistic/no-multi-spaces": ["error", {
                ignoreEOLComments: true
            }],
            "@stylistic/template-curly-spacing": ["error", "never"],
            "@stylistic/type-generic-spacing": ["error"]
            // 6.0.0:
            // "@stylistic/type-generic-spacing": ["error", {before: false, after: false}]
        },
    },
    // Somehow eslint-plugin-react.configs.flat.recommended and tseslint.configs.recommended will ignore my ignores defined above
    reactRefresh.configs.recommended,
    reactHooks.configs.flat["recommended-latest"]
])
