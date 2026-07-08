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
    rules: {
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
      "eol-last": ["error", "always"],
      "no-trailing-spaces": "error",
    },
		plugins: { js,"@stylistic" : stylistic },
		extends: [js.configs.recommended, ...configs.recommended],
		languageOptions: { ecmaVersion: "latest", globals: browser }
	},
	// Somehow eslint-plugin-react.configs.flat.recommended and tseslint.configs.recommended will ignore my ignores defined above
	reactRefresh.configs.recommended,
	reactHooks.configs.flat["recommended-latest"]
])
