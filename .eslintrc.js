module.exports = {
  plugins: ["@typescript-eslint"],
  overrides: [
    {
      env: {
        es6: true,
        node: true,
      },
      files: ["lib/**/*.ts", "tests/**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "prettier",
        "plugin:prettier/recommended",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            varsIgnorePattern: "^_",
            argsIgnorePattern: "^_",
            ignoreRestSiblings: true,
          },
        ],
      },
    },
  ],
};
