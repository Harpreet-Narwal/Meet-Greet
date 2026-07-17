import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint flat-config base for all TS workspaces.
 * Per CLAUDE.md: no `any` without a justifying comment — hence the explicit-any error.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },
  {
    ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**"]
  }
);
