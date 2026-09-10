// ESLint 扁平配置（ESLint 10+）
// 规则保持克制：只做错误预防与 Vue 基础检查，不做风格强制（风格交给 Prettier）
import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', '.workbuddy/**', '.zcode/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      // 工具页多用 v-for 索引作 key，允许保守的 key 用法
      'vue/require-v-for-key': 'error',
      'vue/no-unused-components': 'off',
    },
  },
  {
    // 站点前端：Vue 单文件组件
    files: ['src/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // 部署脚本与 Worker：Node 环境
    files: ['deploy/**/*.js', '**/*.worker.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.worker,
        self: 'readonly',
      },
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]
