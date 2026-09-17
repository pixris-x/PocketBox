// ============================================================
// 自研 UI 组件库统一注册入口
// 用法：app.use(UiLibrary) 后即可全局使用 <UiButton /> 等；
// 也可按需 import 单组件
// 新增组件：在 common/components/<Name>/ 下创建 index.vue + style.scss，
//          并在此处 import + 注册 + 导出
// ============================================================
import UiButton from './UiButton/index.vue'
import UiInput from './UiInput/index.vue'
import UiTextarea from './UiTextarea/index.vue'
import UiCheckbox from './UiCheckbox/index.vue'
import UiSwitch from './UiSwitch/index.vue'
import UiSlider from './UiSlider/index.vue'
import UiSelect from './UiSelect/index.vue'
import UiTabs from './UiTabs/index.vue'
import UiCard from './UiCard/index.vue'
import UiTag from './UiTag/index.vue'
import UiIcon from './UiIcon/index.vue'
import UiSection from './UiSection/index.vue'
import UiDivider from './UiDivider/index.vue'
import UiToast from './UiToast/index.vue'
import UiDropzone from './UiDropzone/index.vue'

const COMPONENTS = {
  UiButton,
  UiInput,
  UiTextarea,
  UiCheckbox,
  UiSwitch,
  UiSlider,
  UiSelect,
  UiTabs,
  UiCard,
  UiTag,
  UiIcon,
  UiSection,
  UiDivider,
  UiToast,
  UiDropzone,
}

export const UiLibrary = {
  install(app) {
    Object.entries(COMPONENTS).forEach(([name, component]) => {
      app.component(name, component)
    })
  },
}

export {
  UiButton,
  UiInput,
  UiTextarea,
  UiCheckbox,
  UiSwitch,
  UiSlider,
  UiSelect,
  UiTabs,
  UiCard,
  UiTag,
  UiIcon,
  UiSection,
  UiDivider,
  UiToast,
  UiDropzone,
}
