<template>
  <div class="ai-inspiration-panel">
    <div class="ai-inspiration-content">
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
            <input type="checkbox" v-model="aiSettings.continuity" id="continuity-toggle">
            <label for="continuity-toggle"></label>
          </div>
        </div>
      </div>
      
      <!-- 提示词模式 -->
      <div class="panel-section">
        <div class="section-header">提示词模式</div>
        <div class="tab-buttons">
          <button :class="['tab-btn', aiSettings.promptMode === 'template' ? 'active' : '']" 
                  @click="aiSettings.promptMode = 'template'">提示词模板</button>
          <button :class="['tab-btn', aiSettings.promptMode === 'custom' ? 'active' : '']" 
                  @click="aiSettings.promptMode = 'custom'">自定义提示词</button>
        </div>
      </div>
      
      <!-- 提示词模板 -->
      <div v-if="aiSettings.promptMode === 'template'" class="panel-section">
        <div class="template-selector">
          <div class="template-item">
            <div class="template-header">灵感生成-【灵感速写】</div>
            <button class="action-btn" @click="showPromptSelection">点击选择提示词</button>
          </div>
        </div>
        
        <!-- 大纲方向 -->
        <div class="panel-section">
          <div class="section-header">大纲的方向（悲剧情，虐剧情，日常，甜剧情）</div>
          <input type="text" class="direction-input" placeholder="请输入大纲的方向" v-model="aiSettings.outlineDirection">
        </div>
        
        <!-- 想法输入框 -->
        <div class="panel-section">
          <div class="section-header">你的想法 <span class="highlight-text">*请描述你的想法，AI将基于此提供后续发展方向的灵感！</span></div>
          <textarea class="idea-input" placeholder="请描述你的想法..." v-model="aiSettings.userIdea"></textarea>
        </div>
        
        <!-- 关联章节 -->
        <div class="panel-section">
          <div class="section-header">关联章节 <span class="note-text">为保证写作效果，建议关联章节，默认关联前两章</span></div>
          <div class="link-buttons">
            <button class="link-btn" :class="{ 'active': aiSettings.linkedChapters?.length > 0 }">
              {{ aiSettings.linkedChapters?.length > 0 ? `已选择 ${aiSettings.linkedChapters.length} 章` : '选择章节' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 自定义提示词 -->
      <div v-if="aiSettings.promptMode === 'custom'" class="panel-section">
        <textarea class="custom-prompt" placeholder="请输入自定义提示词..." v-model="aiSettings.customPrompt"></textarea>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="generate-btn" @click="generateIdea">开始生成</button>
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
      theme: '',
      direction: '',
      customPrompt: ''
    })
  }
});

// 使用传入的 panelState 初始化数据
const aiSettings = reactive({
  ...props.aiSettings,
  theme: props.panelState.theme || '',
  outlineDirection: props.panelState.direction || '',
  customPrompt: props.panelState.customPrompt || ''
});

// 方法
const showPromptSelection = () => {
  console.log('显示提示词选择');
  // 这里可以添加显示提示词选择的逻辑
}

const generateIdea = () => {
  console.log('开始生成灵感');
  // 这里可以添加生成灵感的逻辑
}

// 监听数据变化，更新父组件状态
const emit = defineEmits(['close', 'update:state']);

// 监视数据变化
watch(() => [aiSettings.theme, aiSettings.outlineDirection, aiSettings.customPrompt], () => {
  emit('update:state', {
    theme: aiSettings.theme,
    direction: aiSettings.outlineDirection,
    customPrompt: aiSettings.customPrompt
  });
}, { deep: true });
</script>

<style scoped>
.ai-inspiration-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-inspiration-content {
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

.highlight-text {
  color: #ff5722;
  font-size: 0.85em;
  font-weight: normal;
}

.note-text {
  color: #666;
  font-size: 0.85em;
}

.idea-input, .custom-prompt {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.direction-input {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.tab-buttons {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
}

.tab-btn.active {
  color: #4caf50;
  font-weight: bold;
}

.tab-btn.active:after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #4caf50;
}

.template-selector {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
  background-color: #f9f9f9;
}

.template-header {
  font-weight: bold;
  margin-bottom: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
}

.link-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.link-btn {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
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

.model-selector {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

</style> 