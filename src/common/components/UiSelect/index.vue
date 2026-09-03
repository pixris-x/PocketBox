<script setup>
// 自定义下拉选择组件（替换原生 select，统一美化）
// options: [{ label, value, disabled? }]
// 支持：键盘导航（↑/↓/Enter/Esc）、点击外部关闭、下方空间不足自动向上展开
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import UiIcon from '../UiIcon/index.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const upward = ref(false)
const activeIndex = ref(-1)
const rootRef = ref(null)
const panelRef = ref(null)

const selectedLabel = computed(() => {
  const found = props.options.find((o) => String(o.value) === String(props.modelValue))
  return found ? found.label : ''
})

const enabledIndexes = computed(() => props.options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0))

function toggle() {
  if (props.disabled) return
  open.value ? close() : openPanel()
}

function openPanel() {
  open.value = true
  const selectedIdx = props.options.findIndex((o) => String(o.value) === String(props.modelValue))
  activeIndex.value = enabledIndexes.value.includes(selectedIdx) ? selectedIdx : (enabledIndexes.value[0] ?? -1)
  nextTick(() => {
    measurePlacement()
    scrollActiveIntoView()
  })
}

/** 下方空间不足时向上展开 */
function measurePlacement() {
  if (!rootRef.value || !panelRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  upward.value = spaceBelow < panelRef.value.offsetHeight && spaceAbove > spaceBelow
}

function close() {
  open.value = false
  activeIndex.value = -1
}

function select(option) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

function onKeydown(event) {
  if (props.disabled) return
  if (!open.value) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      openPanel()
    }
    return
  }
  switch (event.key) {
    case 'Escape':
    case 'Tab':
      close()
      break
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      const opt = props.options[activeIndex.value]
      if (opt && !opt.disabled) select(opt)
      break
  }
}

function moveActive(dir) {
  const list = enabledIndexes.value
  if (!list.length) return
  let idx = list.indexOf(activeIndex.value)
  idx = idx === -1 ? (dir > 0 ? -1 : 0) : idx
  idx = (idx + dir + list.length) % list.length
  activeIndex.value = list[idx]
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  nextTick(() => {
    panelRef.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  })
}

function onDocumentMouseDown(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) close()
}

watch(open, (val) => {
  if (val) document.addEventListener('mousedown', onDocumentMouseDown)
  else document.removeEventListener('mousedown', onDocumentMouseDown)
})

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMouseDown))
</script>

<template>
  <div ref="rootRef" class="ui-select" :class="{ 'is-disabled': disabled, 'is-open': open }">
    <button
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-disabled="disabled"
      class="ui-select__trigger"
      :class="{ 'is-placeholder': !selectedLabel }"
      :disabled="disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="ui-select__value">{{ selectedLabel || placeholder }}</span>
      <UiIcon class="ui-select__arrow" name="chevron-down" :size="16" />
    </button>

    <div v-if="open" ref="panelRef" class="ui-select__panel" :class="{ 'is-upward': upward }" role="listbox">
      <button
        v-for="(opt, i) in options"
        :key="opt.value"
        type="button"
        role="option"
        :aria-selected="String(opt.value) === String(modelValue)"
        :data-active="activeIndex === i"
        class="ui-select__option"
        :class="{
          'is-selected': String(opt.value) === String(modelValue),
          'is-disabled': opt.disabled,
          'is-active': activeIndex === i,
        }"
        :disabled="opt.disabled"
        @click="select(opt)"
        @mouseenter="activeIndex = i"
      >
        <span class="ui-select__option-label">{{ opt.label }}</span>
        <UiIcon v-if="String(opt.value) === String(modelValue)" class="ui-select__check" name="check" :size="14" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
