import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules", "raw", "results", "catalog", ".venv"] },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Validators consume untyped SDK payloads; any at those boundaries is deliberate.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
