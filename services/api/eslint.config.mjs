import base from "@mulaqat/config/eslint.base";

export default [
  ...base,
  {
    // Nest DI relies on parameter properties + decorators; these rules fight the framework.
    rules: {
      "@typescript-eslint/no-extraneous-class": "off"
    }
  }
];
