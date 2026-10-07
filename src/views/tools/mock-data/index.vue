<script setup>
// 测试数据生成页：批量生成格式合法的假数据，可导出 CSV / JSON
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'
import { MOCK_FIELDS, generateMockRows, mockRowsToCsv } from '@/common/utils/mock-data'

const formatOptions = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
]

const selected = ref(['name', 'phone', 'email', 'idcard', 'address'])
const count = ref(10)
const format = ref('csv')

const rows = computed(() => generateMockRows(selected.value, count.value))

const output = computed(() => {
  if (!rows.value.length) return ''
  return format.value === 'csv' ? mockRowsToCsv(rows.value) : JSON.stringify(rows.value, null, 2)
})

const rowFields = computed(() => MOCK_FIELDS.filter((item) => selected.value.includes(item.value)))

function toggle(value) {
  const index = selected.value.indexOf(value)
  if (index >= 0) {
    // 至少保留一个字段，否则输出无意义
    if (selected.value.length > 1) selected.value.splice(index, 1)
  } else {
    selected.value.push(value)
  }
}

function downloadFile() {
  if (!output.value) return
  downloadText(`mock-data.${format.value}`, output.value)
}
</script>

<template>
  <ToolShell
    title="测试数据生成"
    description="批量生成中文姓名、手机号、身份证、银行卡、邮箱、地址等假数据。号码类数据由本站的校验算法反算末位，因此能通过身份证与银行卡校验——不会在联调时反过来困扰你。随机源为 Web Crypto。"
  >
    <UiCard>
      <UiSection title="选择字段">
        <div class="mock-fields">
          <button
            v-for="field in MOCK_FIELDS"
            :key="field.value"
            type="button"
            class="mock-chip"
            :class="{ 'is-active': selected.includes(field.value) }"
            @click="toggle(field.value)"
          >
            <UiIcon :name="selected.includes(field.value) ? 'check' : 'close'" :size="13" />
            <span>{{ field.label }}</span>
          </button>
        </div>
      </UiSection>

      <UiSection title="生成设置">
        <div class="mock-options">
          <label class="mock-field">
            <span class="mock-field__label">行数（上限 1000）</span>
            <UiInput v-model="count" type="number" :maxlength="4" />
          </label>

          <div class="mock-field">
            <span class="mock-field__label">导出格式</span>
            <UiSelect v-model="format" aria-label="导出格式" :options="formatOptions" />
          </div>
        </div>
      </UiSection>

      <UiSection title="结果">
        <template v-if="output">
          <div class="mock-actions">
            <UiTag variant="info">{{ rows.length }} 行</UiTag>
            <UiTag variant="neutral">{{ rowFields.length }} 列</UiTag>
            <UiButton variant="secondary" size="sm" @click="copyText(output)">
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
            <UiButton variant="primary" size="sm" @click="downloadFile">
              <UiIcon name="download" :size="14" />
              下载
            </UiButton>
          </div>
          <UiTextarea :model-value="output" :rows="12" mono readonly class="mock-output" />
        </template>
        <p v-else class="mock-empty">请至少选择一个字段</p>
      </UiSection>

      <UiSection title="说明" spaced="false">
        <p class="mock-note">
          全部在浏览器本地生成，不联网、不上传。数据为随机构造，**不对应任何真实个人**；
          身份证与银行卡的校验位由算法反算，能通过本站校验器的检查，但依然不是有效证件或账户。
          邮箱域名使用 example / test / demo / mock 等保留域名，不会误发到真实地址。
        </p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
