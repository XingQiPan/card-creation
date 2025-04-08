<template>
  <div class="ai-open-panel">
    <div class="ai-open-content">
      <h3>AI开篇</h3>
      
      <!-- AI 模型选择 -->
      <div class="panel-section">
        <div class="section-header">AI 模型</div>
        <select v-model="aiSettings.model" class="model-selector">
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
      
      <!-- 会话连续性开关 -->
      <div class="panel-section">
        <div class="section-header-row">
          <div class="tooltip-container">
            <span class="continuity-label">启用会话连续性</span>
            <span class="tooltip-text">开启后AI将记住上下文，重新生成时可填入自定义要求，但字数会明请谨慎开启</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" v-model="aiSettings.continuity" id="continuity-toggle">
            <label for="continuity-toggle"></label>
          </div>
        </div>
      </div>
      
      <!-- 提示词模式 -->
      <div class="panel-section">
        <div class="section-header">提示词模式</div>
        <div class="prompt-mode-buttons">
          <button 
            class="prompt-mode-btn" 
            :class="{ 'active': aiSettings.promptMode === 'select' }"
            @click="aiSettings.promptMode = 'select'"
          >
            选择开篇提示词
          </button>
          <button 
            class="prompt-mode-btn" 
            :class="{ 'active': aiSettings.promptMode === 'custom' }"
            @click="aiSettings.promptMode = 'custom'"
          >
            自定义提示词
          </button>
        </div>
        
        <!-- 选择提示词 -->
        <div v-if="aiSettings.promptMode === 'select'" class="prompt-selection">
          <div class="selected-prompt" v-if="aiSettings.selectedPrompt">
            <div class="prompt-title">{{ aiSettings.selectedPrompt }}</div>
            <button class="change-prompt-btn" @click="showPromptSelection">更换</button>
          </div>
          <button v-else class="prompt-select-btn" @click="showPromptSelection">点击选择开篇提示词</button>
        </div>
        
        <!-- 自定义提示词 -->
        <div v-if="aiSettings.promptMode === 'custom'" class="custom-prompt">
          <textarea 
            class="custom-prompt-input" 
            placeholder="请输入自定义提示词..." 
            v-model="aiSettings.customPrompt"
          ></textarea>
        </div>
      </div>
      
      <!-- 小说信息 -->
      <div class="panel-section">
        <div class="section-header">小说信息</div>
        <div class="novel-info-container">
          <div class="form-row">
            <label>小说名称:</label>
            <input type="text" v-model="novelInfo.title" class="info-input" />
          </div>
          <div class="form-row">
            <label>小说类型:</label>
            <input type="text" v-model="novelInfo.genre" class="info-input" />
          </div>
          <div class="form-row">
            <label>小说简介:</label>
            <textarea v-model="novelInfo.summary" class="info-textarea"></textarea>
          </div>
          <div class="form-row">
            <label>小说标签:</label>
            <textarea v-model="novelInfo.tags" class="info-textarea" placeholder="多个标签用逗号分隔"></textarea>
          </div>
        </div>
      </div>
      
      <!-- 补充信息 -->
      <div class="panel-section">
        <div class="section-header">补充信息 (可选)</div>
        <textarea 
          class="additional-info" 
          placeholder="请输入补充信息..." 
          v-model="aiSettings.additionalInfo"
        ></textarea>
      </div>
    </div>
    
    <!-- 面板操作按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="generate-btn" @click="generateOpening">灵感开篇 生成</button>
    </div>
    
    <!-- 提示词选择弹窗 -->
    <PromptSelectionDialog
      :visible="promptSelectionVisible"
      :categories="categories"
      :prompts="prompts"
      @close="promptSelectionVisible = false"
      @select="handlePromptSelect"
    />
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import PromptSelectionDialog from '../Prompt/PromptSelectionDialog.vue';

const props = defineProps({
  availableModels: {
    type: Array,
    required: true
  },
  aiSettings: {
    type: Object,
    required: true
  },
  categories: {
    type: Array,
    required: true
  },
  prompts: {
    type: Array,
    required: true
  },
  panelState: {
    type: Object,
    required: false,
    default: () => ({
      novelName: '',
      novelDescription: '',
      selectedCategory: '',
      selectedPrompt: '',
      customContent: ''
    })
  }
});

// 使用传入的 aiSettings
const aiSettings = reactive(props.aiSettings);

// 提示词选择弹窗状态
const promptSelectionVisible = ref(false);

// 小说信息 - 使用传入的 panelState 初始化
const novelInfo = reactive({
  title: props.panelState.novelName || '',
  genre: props.panelState.selectedCategory || '都市修真',
  summary: props.panelState.novelDescription || '',
  tags: '',
});

// 监听数据变化并通知父组件
const emit = defineEmits(['close', 'showPromptSelection', 'update:state']);

// 监视数据变化
watch(novelInfo, (newValue) => {
  emit('update:state', {
    novelName: newValue.title,
    novelDescription: newValue.summary,
    selectedCategory: newValue.genre,
    customContent: aiSettings.customPrompt,
    selectedPrompt: aiSettings.selectedPrompt
  });
}, { deep: true });

watch(() => [aiSettings.customPrompt, aiSettings.selectedPrompt], () => {
  emit('update:state', {
    novelName: novelInfo.title,
    novelDescription: novelInfo.summary,
    selectedCategory: novelInfo.genre,
    customContent: aiSettings.customPrompt,
    selectedPrompt: aiSettings.selectedPrompt
  });
});

// 显示提示词选择
const showPromptSelection = () => {
  promptSelectionVisible.value = true;
};

// 处理提示词选择
const handlePromptSelect = (prompt) => {
  aiSettings.selectedPrompt = prompt.title;
  aiSettings.selectedPromptId = prompt.id;
  aiSettings.selectedPromptContent = prompt.systemPrompt;
};

// 生成开篇
const generateOpening = () => {
  if (!novelInfo.title) {
    alert('请输入小说名称');
    return;
  }
  
  if (aiSettings.promptMode === 'select' && !aiSettings.selectedPrompt) {
    alert('请选择开篇提示词');
    return;
  }
  
  if (aiSettings.promptMode === 'custom' && !aiSettings.customPrompt) {
    alert('请输入自定义提示词');
    return;
  }
  
  console.log('生成开篇:', {
    novelInfo,
    aiSettings
  });
  
  // 这里可以添加生成开篇的逻辑
};
</script>

<style scoped>
.ai-open-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-radius: 4px;
  overflow: hidden;
}

.ai-open-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
}

.panel-section {
  margin-bottom: 20px;
}

.section-header {
  font-weight: bold;
  margin-bottom: 8px;
  color: #444;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

/* 表单样式 */
.form-row {
  margin-bottom: 12px;
}

.form-row label {
  display: block;
  margin-bottom: 4px;
  color: #555;
}

.info-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.info-textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

/* 提示词相关样式 */
.prompt-mode-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.prompt-mode-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background-color: #f8f8f8;
  border-radius: 4px;
  cursor: pointer;
}

.prompt-mode-btn.active {
  background-color: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.selected-prompt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f8f8f8;
}

.prompt-select-btn {
  width: 100%;
  padding: 8px;
  border: 1px dashed #ddd;
  background-color: #f8f8f8;
  border-radius: 4px;
  cursor: pointer;
}

.change-prompt-btn {
  padding: 4px 8px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.custom-prompt-input, .additional-info {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

/* 模型选择器 */
.model-selector {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* 切换开关 */
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
  border-radius: 34px;
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
  background-color: #2196F3;
}

.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

/* 提示文本 */
.tooltip-container {
  position: relative;
}

.tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip-container:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

/* 操作按钮 */
.panel-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f8f8;
}

.close-btn, .generate-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.close-btn {
  background-color: #f5f5f5;
  border: 1px solid #d9d9d9;
}

.generate-btn {
  background-color: #1890ff;
  color: white;
  border: none;
}

.generate-btn:hover {
  background-color: #40a9ff;
}
</style>