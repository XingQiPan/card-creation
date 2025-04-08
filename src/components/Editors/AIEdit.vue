<template>
  <div class="ai-edit-panel">
    <div class="ai-edit-content">
      <!-- AI模型选择 -->
      <div class="panel-section">
        <div class="section-header">AI 模型</div>
        <select v-model="aiSettings.model" class="model-selector">
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
      
      <!-- 会话连续性 -->
      <div class="panel-section">
        <div class="section-header-row">
          <div class="tooltip-container">
            <span class="continuity-label">启用会话连续性</span>
            <span class="tooltip-text">开启后AI将记住上下文，重新生成时可填入自定义要求，但字数会明请谨慎开启,对话模式默认关联上下文！</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" v-model="aiSettings.continuity" id="edit-continuity-toggle">
            <label for="edit-continuity-toggle"></label>
          </div>
        </div>
      </div>
      
      <!-- 编辑模式 -->
      <div class="panel-section">
        <div class="section-header">编辑模式</div>
        <div class="edit-mode-selector">
          <button 
            :class="['mode-btn', aiSettings.editMode === 'polish' ? 'active' : '']" 
            @click="aiSettings.editMode = 'polish'">
            润色文章
          </button>
          <button 
            :class="['mode-btn', aiSettings.editMode === 'expand' ? 'active' : '']" 
            @click="aiSettings.editMode = 'expand'">
            细节扩写
          </button>
          <button 
            :class="['mode-btn', aiSettings.editMode === 'condense' ? 'active' : '']" 
            @click="aiSettings.editMode = 'condense'">
            精简文章
          </button>
          <button 
            :class="['mode-btn', aiSettings.editMode === 'custom' ? 'active' : '']" 
            @click="aiSettings.editMode = 'custom'">
            自定义编辑
          </button>
        </div>
      </div>
      
      <!-- 自定义编辑需求 -->
      <div v-if="aiSettings.editMode === 'custom'" class="panel-section">
        <div class="section-header">自定义编辑需求</div>
        <textarea 
          class="custom-input" 
          placeholder="请输入您的编辑需求，例如：修改语法错误、调整段落结构、改变叙述视角等..." 
          v-model="aiSettings.customEditRequest">
        </textarea>
      </div>
      
      <!-- 编辑范围 -->
      <div class="panel-section">
        <div class="section-header">编辑范围</div>
        <div class="range-selector">
          <button 
            :class="['range-btn', aiSettings.editRange === 'selection' ? 'active' : '']" 
            @click="aiSettings.editRange = 'selection'">
            选中文本
          </button>
          <button 
            :class="['range-btn', aiSettings.editRange === 'chapter' ? 'active' : '']" 
            @click="aiSettings.editRange = 'chapter'">
            整个章节
          </button>
        </div>
      </div>
      
      <!-- 编辑风格 -->
      <div class="panel-section">
        <div class="section-header">编辑风格</div>
        <select v-model="aiSettings.editStyle" class="style-selector">
          <option value="neutral">标准风格</option>
          <option value="literary">文学风格</option>
          <option value="academic">学术风格</option>
          <option value="conversational">对话风格</option>
          <option value="dramatic">戏剧性风格</option>
        </select>
      </div>
      
      <!-- 风格强度 -->
      <div class="panel-section">
        <div class="section-header">风格强度</div>
        <div class="slider-container">
          <input 
            type="range" 
            min="1" 
            max="10" 
            v-model="aiSettings.styleIntensity" 
            class="style-slider">
          <div class="slider-labels">
            <span>轻微</span>
            <span>中等</span>
            <span>强烈</span>
          </div>
        </div>
      </div>
      
      <!-- 编辑备注 -->
      <div class="panel-section">
        <div class="section-header">编辑备注 <span class="optional-text">(可选)</span></div>
        <textarea 
          class="notes-input" 
          placeholder="请输入任何关于编辑的额外说明..." 
          v-model="aiSettings.editNotes">
        </textarea>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="generate-btn" @click="startEdit">开始编辑</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue';

const props = defineProps({
  availableModels: {
    type: Array,
    required: true
  },
  aiSettings: {
    type: Object,
    required: true
  },
  panelState: {
    type: Object,
    required: false,
    default: () => ({
      content: '',
      editMode: 'polish',
      customRequest: ''
    })
  }
});

// 使用传入的 panelState 初始化数据
const aiSettings = reactive({
  ...props.aiSettings,
  editMode: props.panelState.editMode || 'polish',
  customEditRequest: props.panelState.customRequest || ''
});

// 添加要编辑的内容变量
const contentToEdit = ref(props.panelState.content || '');

// 确保 aiSettings 中有必要的编辑相关属性
if (!props.aiSettings.editRange) {
  props.aiSettings.editRange = 'selection';
}
if (!props.aiSettings.editStyle) {
  props.aiSettings.editStyle = 'neutral';
}
if (!props.aiSettings.styleIntensity) {
  props.aiSettings.styleIntensity = 5;
}
if (!props.aiSettings.editNotes) {
  props.aiSettings.editNotes = '';
}

// 方法
const startEdit = () => {
  console.log('开始编辑内容');
  // 这里可以添加开始编辑的逻辑
}

// 监听数据变化，更新父组件状态
const emit = defineEmits(['close', 'update:state']);

// 监视数据变化
watch(() => [aiSettings.editMode, aiSettings.customEditRequest], () => {
  emit('update:state', {
    content: contentToEdit.value,
    editMode: aiSettings.editMode,
    customRequest: aiSettings.customEditRequest
  });
}, { deep: true });
</script>

<style scoped>
.ai-edit-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-edit-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.panel-section {
  margin-bottom: 20px;
}

.section-header {
  font-weight: bold;
  margin-bottom: 8px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.optional-text {
  color: #888;
  font-size: 0.85em;
  font-weight: normal;
}

.model-selector, .style-selector {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.custom-input, .notes-input {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.edit-mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-btn, .range-btn {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  text-align: center;
}

.mode-btn.active, .range-btn.active {
  background-color: #4caf50;
  color: white;
  border-color: #388e3c;
}

.range-selector {
  display: flex;
  gap: 8px;
}

.range-btn {
  flex: 1;
}

.slider-container {
  margin-top: 10px;
}

.style-slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  outline: none;
  border-radius: 4px;
}

.style-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4caf50;
  cursor: pointer;
}

.style-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4caf50;
  cursor: pointer;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.75em;
  color: #666;
}

.panel-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f8f8;
}

.close-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.generate-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #388e3c;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
}

.generate-btn:hover {
  background-color: #388e3c;
}

.tooltip-container {
  position: relative;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: #4caf50;
}

.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}
</style> 