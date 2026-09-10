<script setup>
// 颜色格式转换页
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { contrastRatio, parseColor, rgbToHex } from '@/common/utils/color'

const input = ref('#f97316')

const parsed = computed(() => parseColor(input.value))

const outputs = computed(() => {
  const result = parsed.value
  if (!result.ok) return []
  const { r, g, b } = result.rgb
  const { h, s, l } = result.hsl
  return [
    { label: 'HEX', value: rgbToHex(r, g, b) },
    { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)` },
  ]
})

// 与黑/白的对比度，给出建议文字色
const onWhite = computed(() =>
  parsed.value.ok ? contrastRatio(parsed.value.rgb, { r: 255, g: 255, b: 255 }) : 0
)
const onBlack = computed(() =>
  parsed.value.ok ? contrastRatio(parsed.value.rgb, { r: 0, g: 0, b: 0 }) : 0
)
const readableText = computed(() => (onWhite.value >= onBlack.value ? '#ffffff' : '#000000'))
const readableRatio = computed(() => Math.max(onWhite.value, onBlack.value))

const PRESETS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#27272a', '#f4f4f5']

function onPickColor(event) {
  input.value = event.target.value
}

function onCopy(value) {
  copyText(value)
}
</script>

<template>
  <ToolShell
    title="颜色格式转换"
    description="HEX / RGB / HSL 互转，自动识别输入格式，附带对比度参考。"
  >
    <UiCard>
      <UiSection
        title="输入颜色"
        description="支持 #f97316 / #f90 / rgb(249,115,22) / hsl(25,95%,53%)"
      >
        <div class="color-row">
          <UiInput v-model="input" placeholder="输入颜色值" class="color-row__input" />
          <label class="color-picker" title="使用系统拾色器选取">
            <input type="color" :value="parsed.ok ? parsed.hex : '#000000'" @input="onPickColor" />
            <span
              class="color-picker__box"
              :style="{ background: parsed.ok ? parsed.hex : 'transparent' }"
            />
          </label>
          <UiButton variant="secondary" size="sm" @click="input = ''">清空</UiButton>
        </div>

        <div class="color-presets">
          <button
            v-for="preset in PRESETS"
            :key="preset"
            type="button"
            class="color-preset"
            :style="{ background: preset }"
            :title="preset"
            @click="input = preset"
          />
        </div>
      </UiSection>

      <UiSection v-if="!parsed.ok" title="无法识别">
        <UiTag variant="danger">请输入合法的颜色值</UiTag>
      </UiSection>

      <template v-else>
        <UiSection title="转换结果" description="点击按钮复制">
          <div v-for="item in outputs" :key="item.label" class="color-out">
            <span class="color-out__label">{{ item.label }}</span>
            <code class="color-out__value">{{ item.value }}</code>
            <UiButton variant="secondary" size="sm" @click="onCopy(item.value)">
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </div>
        </UiSection>

        <UiSection title="可读性参考" description="在当前颜色上放置文字时的对比度">
          <div class="color-demo" :style="{ background: parsed.hex, color: readableText }">
            示例文字 Sample Text
          </div>
          <div class="color-contrast">
            <UiTag :variant="readableRatio >= 4.5 ? 'success' : 'warning'">
              最佳对比度 {{ readableRatio.toFixed(2) }}:1
            </UiTag>
            <UiTag variant="neutral">白字 {{ onWhite.toFixed(2) }}:1</UiTag>
            <UiTag variant="neutral">黑字 {{ onBlack.toFixed(2) }}:1</UiTag>
            <span class="color-contrast__hint">正文建议 ≥ 4.5:1（WCAG AA）</span>
          </div>
        </UiSection>
      </template>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
