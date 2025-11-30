import globals from "globals";
import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/", 
      "docs/", 
      "types/"
    ],
  },
  js.configs.recommended,
  {
    files: ["lib/**/*.js", "bin/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "indent": ["warn", 2, { "SwitchCase": 1 }],
      "quotes": ["warn", "double"],
      "semi": ["warn", "always"],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    }
  }
];