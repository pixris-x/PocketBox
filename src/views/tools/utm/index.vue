<script setup>
// UTM 跟踪链接页：构造与解析 utm_* 参数
import { computed, reactive, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { UTM_FIELDS, UTM_PRESETS, buildUtmUrl, parseUtm } from '@/common/utils/utm'

const baseUrl = ref('https://pocketbox.pixris.online/')
const params = reactive({})

const result = computed(() => buildUtmUrl(baseUrl.value, params))

const parsed = computed(() => parseUtm(result.value.url))

function applyPreset(preset) {
  for (const key of Object.keys(params)) delete params[key]
  Object.assign(params, preset)
}
</script>

<template>
  <ToolShell
    title="UTM 跟踪链接"
    description="给链接追加 utm_source / utm_medium 等参数，统计来源用。空格会被拒绝（统计平台会把空格换成下划线导致归因对不上），已有 UTM 参数会被覆盖而非追加。纯本地拼串，不发请求。"
  >
    <UiCard>
      <UiSection title="基础链接">
        <UiInput v-model="baseUrl" placeholder="https://example.com/page" clearable mono />

        <div class="utm-presets">
          <span class="utm-presets__label">常用预设</span>
          <UiButton
            v-for="(preset, name) in UTM_PRESETS"
            :key="name"
            variant="ghost"
            size="sm"
            @click="applyPreset(preset)"
          >
            {{ name }}
          </UiButton>
        </div>
      </UiSection>

      <UiSection
        title="跟踪参数"
        description="utm_source 与 utm_medium 建议都填，缺失可能导致来源归因失败"
      >
        <div class="utm-fields">
          <label v-for="field in UTM_FIELDS" :key="field.value" class="utm-field">
            <span class="utm-field__label">
              {{ field.label }}
              <code>{{ field.value }}</code>
            </span>
            <UiInput v-model="params[field.value]" :placeholder="field.hint" clearable mono />
          </label>
        </div>
      </UiSection>

      <UiSection title="生成结果">
        <template v-if="result.url">
          <UiTextarea :model-value="result.url" :rows="4" mono readonly />
          <div class="utm-actions">
            <UiButton variant="secondary" size="sm" @click="copyText(result.url)">
              <UiIcon name="copy" :size="14" />
              复制链接
            </UiButton>
            <UiTag v-if="result.included.length" variant="info">
              已含 {{ result.included.length }} 个参数
            </UiTag>
          </div>

          <ul v-if="result.warnings.length" class="utm-warnings">
            <li v-for="(warning, index) in result.warnings" :key="index">
              <UiIcon name="info" :size="14" />
              <span>{{ warning }}</span>
            </li>
          </ul>
        </template>
        <p v-else class="utm-hint">输入基础链接后即可生成</p>
      </UiSection>

      <UiSection v-if="parsed.found" title="回读校验" spaced="false">
        <p class="utm-verify">
          解析回读到
          <b>{{ parsed.params.utm_source }}</b>
          <template v-if="parsed.missing.length"> ，缺少 {{ parsed.missing.join('、') }} </template>
        </p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
