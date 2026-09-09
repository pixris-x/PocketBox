<script setup>
// 404 页面：未知路径与 /404 均渲染此页
// 复用首页的 ToolCard 展示常用工具入口，避免做成死胡同
import { useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import { tools } from '@/data/tools'

const router = useRouter()
const suggestions = tools.slice(0, 3)
</script>

<template>
  <ToolShell title="页面不存在" description="这个地址没有对应的工具，可能是链接已失效或输入有误。">
    <div class="not-found">
      <div class="not-found__panel">
        <span class="not-found__icon">
          <UiIcon name="alert-circle" :size="26" />
        </span>
        <p class="not-found__hint">
          可以返回首页浏览全部 {{ tools.length }} 个工具，也可以直接从下面这些常用工具进入。
        </p>
        <UiButton variant="primary" @click="router.push('/')">返回首页</UiButton>
      </div>

      <section class="not-found__grid">
        <ToolCard v-for="tool in suggestions" :key="tool.id" :tool="tool" />
      </section>
    </div>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
