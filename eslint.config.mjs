import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        node: {},
        typescript: {
          project: "./tsconfig.json",
        },
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-filename-extension": [1, { extensions: [".ts", ".tsx"] }],
      "react-hooks/exhaustive-deps": "off",
      "import/order": [
        "error",
        {
          groups: ["external", "internal", "parent", "sibling", "index"],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "next", group: "external", position: "before" },
            { pattern: "next/**", group: "external", position: "before" },
            { pattern: "@/**", group: "internal", position: "before" },
            { pattern: "~/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["react", "next", "next/**"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-unresolved": "off",
      "import/export": "off",
      "import/named": "off",
      "import/namespace": "off",
    },
  },
  {
    // OG 이미지(ImageResponse)는 next/image를 쓸 수 없어 <img>가 맞다.
    // 규칙 자체에 이 파일 예외가 있지만 경로 처리 버그로 Windows에서만 적용되지 않아
    // 인라인 disable 주석은 OS마다 경고가 갈린다(Mac: 미사용 주석, Windows: no-img-element). 설정에서 끈다.
    files: ["src/app/opengraph-image.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "next.config.ts",
  ]),
]);

export default eslintConfig;
