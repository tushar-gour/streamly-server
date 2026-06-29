module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true,
    },
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    extends: ["eslint:recommended"],
    ignorePatterns: ["node_modules/", "public/", "dist/"],
    rules: {
        "no-console": "off",
        "no-process-exit": "off",
        "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        "no-undef": "error",
        "no-unreachable": "error",
        "no-redeclare": "error",
    },
};
