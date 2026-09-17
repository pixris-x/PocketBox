<script setup>
// URL 参数解析：把 URL / 查询串拆成键值表，支持重新编码输出，纯本地
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { buildQuery, parseQuery } from '@/common/utils/query-string'
import { copyText } from '@/common/utils/copy'

const SAMPLE = 'https://pocketbox.pixris.online/search?q=%E4%B8%AD%E6%96%87&tag=go+go&page=2#top'

const input = ref(SAMPLE)
const parsed = computed(() => parseQuery(input.value))

const rebuilt = computed(() => {
  if (!parsed.value.ok) return ''
  return buildQuery(parsed.value.pairs)
})
</script>

<template>
  <ToolShell
    title="URL 参数解析"
    description="把完整 URL 或查询串拆成键值表：自动解码百分号编码、+ 号还原为空格，并可重新编码输出。与「URL 编码 / 解码」互补，这里看的是结构。全部本地完成。"
  >
    <UiCard>
      <UiSection title="输入">
        <UiTextarea
          v-model="input"
          :rows="4"
          mono
          placeholder="粘贴完整 URL 或查询串，如 a=1&b=2"
        />
        <div class="urlparse__row">
          <UiButton variant="ghost" size="sm" @click="input = SAMPLE">
            <UiIcon name="sparkles" :size="14" />
            填入示例
          </UiButton>
          <UiButton variant="ghost" size="sm" :disabled="!input" @click="input = ''">
            <UiIcon name="close" :size="14" />
            清空
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-if="input">
      <UiSection v-if="parsed.ok" title="解析结果">
        <p v-if="parsed.base" class="urlparse__base">
          页面地址：<code>{{ parsed.base }}</code>
        </p>
        <p v-if="parsed.count === 0" class="urlparse__hint">没有查询参数。</p>
        <dl v-else class="urlparse__list">
          <div
            v-for="(pair, index) in parsed.pairs"
            :key="`${pair.key}-${index}`"
            class="urlparse__row"
          >
            <dt class="urlparse__key">
              <code>{{ pair.key }}</code>
            </dt>
            <dd class="urlparse__value">
              <code>{{ pair.value }}</code>
            </dd>
          </div>
        </dl>

        <div v-if="parsed.count > 0" class="urlparse__row">
          <p class="urlparse__hint">
            共 {{ parsed.count }} 个参数；下方为解码后重新编码的结果（空格转为 %20）。
          </p>
          <UiButton
            variant="ghost"
            size="sm"
            @click="copyText(rebuilt, { successMsg: '重编码查询串已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制重编码结果
          </UiButton>
        </div>
      </UiSection>

      <UiSection v-else title="解析失败">
        <p class="urlparse__error">{{ parsed.error }}</p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
