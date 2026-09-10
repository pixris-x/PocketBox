<script setup>
// 随机强密码生成页
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import StrengthMeter from './components/StrengthMeter/index.vue'
import {
  CHARSET_KEYS,
  CHARSET_LABELS,
  buildCharset,
  generatePassword,
  entropyBits,
} from './scripts/generator'

const length = ref(16)
const count = ref(5)
const include = ref({ upper: true, lower: true, digits: true, symbols: true })
const excludeAmbiguous = ref(false)
const atLeastOne = ref(true)

const passwords = ref([])

const charset = computed(() =>
  buildCharset(include.value, { excludeAmbiguous: excludeAmbiguous.value })
)
const selectedCount = computed(() => CHARSET_KEYS.filter((key) => include.value[key]).length)
const bits = computed(() => entropyBits(length.value, charset.value.length))

function generate() {
  if (!charset.value) return
  const list = []
  for (let i = 0; i < count.value; i++) {
    list.push(
      generatePassword(length.value, charset.value, {
        atLeastOne: atLeastOne.value,
        include: include.value,
      })
    )
  }
  passwords.value = list
}

function onCopy(password) {
  copyText(password)
}
</script>

<template>
  <ToolShell
    title="随机强密码生成"
    description="使用浏览器 Web Crypto 真随机生成，密码只在本地生成，不会离开你的设备。"
  >
    <UiCard>
      <UiSection title="生成选项">
        <div class="option-row">
          <span class="option-label">密码长度</span>
          <UiSlider
            v-model="length"
            :min="8"
            :max="64"
            :step="1"
            show-value
            class="option-control"
          />
        </div>

        <div class="option-row">
          <span class="option-label">生成数量</span>
          <UiSlider
            v-model="count"
            :min="1"
            :max="10"
            :step="1"
            show-value
            class="option-control"
          />
        </div>

        <div class="option-row">
          <span class="option-label">包含字符</span>
          <div class="checkbox-group">
            <UiCheckbox v-for="key in CHARSET_KEYS" :key="key" v-model="include[key]">
              {{ CHARSET_LABELS[key] }}
            </UiCheckbox>
          </div>
        </div>

        <div class="option-row">
          <span class="option-label">其它选项</span>
          <div class="switch-group">
            <div class="switch-item">
              <UiSwitch v-model="excludeAmbiguous" />
              <span class="switch-item__text">排除易混淆字符（0O1lI）</span>
            </div>
            <div class="switch-item">
              <UiSwitch v-model="atLeastOne" />
              <span class="switch-item__text">每类字符至少包含一个</span>
            </div>
          </div>
        </div>

        <div class="option-row">
          <span class="option-label">强度</span>
          <StrengthMeter :bits="bits" class="option-control" />
        </div>

        <p v-if="!selectedCount" class="field-error">请至少选择一种字符类型</p>

        <div class="actions">
          <UiButton :disabled="!charset" @click="generate">
            <UiIcon name="refresh" :size="15" />
            生成密码
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-if="passwords.length">
      <UiSection title="生成结果" :description="`共 ${passwords.length} 条，点击右侧按钮复制`">
        <div class="result-list">
          <div v-for="(password, index) in passwords" :key="index" class="result-item">
            <code class="result-item__code">{{ password }}</code>
            <UiButton variant="secondary" size="sm" @click="onCopy(password)">
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </div>
        </div>
        <div class="result-actions">
          <UiButton variant="ghost" size="sm" @click="generate">
            <UiIcon name="refresh" :size="14" />
            换一批
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
