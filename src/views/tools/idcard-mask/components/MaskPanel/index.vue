<script setup>
// 脱敏面板：按类型打码敏感信息，支持批量逐行处理
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { MASK_TYPES, maskByType } from '@/common/utils/idcard-mask'

const SAMPLES = {
  phone: '13812345678',
  idcard: '11010519491231002X',
  bankcard: '6222021234567890128',
  name: '张三',
  email: 'peter@example.com',
  address: '北京市朝阳区望京街道某某小区 1 号楼',
  plate: '京A12345',
}

const type = ref('phone')
const source = ref(SAMPLES.phone)

const activeType = computed(() => MASK_TYPES.find((item) => item.value === type.value))

/** 批量模式：按行处理，便于一次脱敏一列数据 */
const batch = ref(false)
const listInput = ref(SAMPLES.phone)

const output = computed(() => {
  if (!source.value) return ''
  return batch.value
    ? listInput.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => maskByType(type.value, line))
        .join('\n')
    : maskByType(type.value, source.value)
})

const lineCount = computed(() =>
  batch.value ? listInput.value.split('\n').filter((line) => line.trim()).length : 0
)

function loadSample() {
  source.value = SAMPLES[type.value] || ''
  listInput.value = SAMPLES[type.value] || ''
}
</script>

<template>
  <UiCard>
    <UiSection title="脱敏设置">
      <div class="idm-options">
        <div class="idm-field">
          <span class="idm-label">信息类型</span>
          <UiSelect v-model="type" aria-label="信息类型" :options="MASK_TYPES" />
        </div>

        <div class="idm-field">
          <span class="idm-label">处理方式</span>
          <div class="idm-switch">
            <UiSwitch v-model="batch" />
            <span>{{ batch ? '批量（一行一条）' : '单条' }}</span>
          </div>
        </div>
      </div>

      <p class="idm-hint">
        当前规则：<b>{{ activeType?.label }}</b> →
        <code>{{ activeType?.hint }}</code>
      </p>

      <UiButton variant="ghost" size="sm" @click="loadSample">
        <UiIcon name="sparkles" :size="14" />
        填入示例
      </UiButton>
    </UiSection>

    <UiSection
      :title="batch ? '原始数据' : '原始内容'"
      :description="batch ? '每行一条，输出与输入行数一致' : ''"
    >
      <UiTextarea
        v-if="batch"
        v-model="listInput"
        :rows="7"
        mono
        placeholder="一行一条待脱敏内容"
      />
      <UiInput v-else v-model="source" placeholder="输入待脱敏内容" clearable mono />
    </UiSection>

    <UiSection title="脱敏结果">
      <template v-if="output">
        <UiTextarea :model-value="output" :rows="7" mono readonly />
        <div class="idm-actions">
          <UiButton variant="secondary" size="sm" @click="copyText(output)">
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
          <span v-if="batch" class="idm-actions-hint">已处理 {{ lineCount }} 行</span>
        </div>
      </template>
      <p v-else class="idm-empty">输入内容后即可得到脱敏结果</p>
    </UiSection>

    <UiSection spaced="false" title="说明">
      <p class="idm-note">
        脱敏在浏览器本地完成，原文不会离开你的设备，也不会被上传或记录。
        保留的首尾位数按常见规范设置：手机号前 3 后 4、身份证前 6 后 4、银行卡仅留后 4 位。
        需要更强保护时，请连首部也一并替换。
      </p>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
