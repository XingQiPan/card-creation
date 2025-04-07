<template>
  <div class="ai-writ-panel">
    <div class="ai-writ-content">
      <h3>AI写作</h3>
      <div class="panel-section">
        <div class="section-header">AI 模型</div>
        <select v-model="aiSettings.model" class="model-selector">
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
      
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
      
      <div class="panel-section">
        <div class="section-header">要求</div>
        <div class="prompt-selection">
          <div class="selected-prompt" v-if="aiSettings.selectedPrompt">
            <div class="prompt-title">{{ aiSettings.selectedPrompt }}</div>
            <button class="change-prompt-btn" @click="showPromptSelection">更换</button>
          </div>
          <button v-else class="prompt-select-btn" @click="showPromptSelection">点击选择要求</button>
        </div>
      </div>
      
      <div class="panel-section">
        <div class="section-header">写作剧情点 <span class="highlight-text">*一次5~10个剧情点效果最佳，不要太多也不要太少，否则AI容易自由发挥！</span></div>
        <textarea class="idea-input" placeholder="请简要描述本章的主要剧情发展..." v-model="aiSettings.plotPoints"></textarea>
      </div>
      
      <div class="panel-section">
        <div class="section-header">关联章节</div>
        <div class="link-buttons">
          <button class="link-btn" :class="{ 'active': aiSettings.linkedChapters?.length > 0 }">
            {{ aiSettings.linkedChapters?.length > 0 ? `已选择 ${aiSettings.linkedChapters.length} 章` : '选择章节' }}
          </button>
        </div>
        
        <div class="section-header">相关角色</div>
        <div class="link-buttons">
          <button class="link-btn" :class="{ 'active': aiSettings.linkedCharacters?.length > 0 }">
            <span v-if="aiSettings.linkedCharacters?.length > 0">
              已选择 {{ aiSettings.linkedCharacters.length }} 个角色
              <span v-if="aiSettings.selectedCardsInfo" class="selected-cards-preview">
                ({{ aiSettings.selectedCardsInfo }})
              </span>
            </span>
            <span v-else>选择角色</span>
          </button>
        </div>
        
        <div class="section-header">关联词条</div>
        <div class="link-note">选择词条后，按写作顺序输出词条内容，一次不要选择太多，否则AI容易混乱！</div>
        <div class="link-buttons">
          <button class="link-btn" :class="{ 'active': aiSettings.linkedEntries?.length > 0 }">
            {{ aiSettings.linkedEntries?.length > 0 ? `已选择 ${aiSettings.linkedEntries.length} 个词条` : '选择词条' }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="generate-btn" @click="generateIdea">开始生成</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue';

const props = defineProps({
  availableModels: {
    type: Array,
    required: true
  },
  aiSettings: {
    type: Object,
    required: true
  }
});

// 简化的基本数据
const aiSettings = reactive(props.aiSettings);

// 简化方法
const showPromptSelection = () => {
  console.log('显示提示词选择');
  // 这里可以添加显示提示词选择的逻辑
}

const generateIdea = () => {
  console.log('开始生成内容');
  // 这里可以添加生成内容的逻辑
}

const emit = defineEmits(['close']);
</script>

<style scoped>
.ai-writ-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-writ-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.panel-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f8f8;
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

.idea-input {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.link-note {
  font-size: 0.85em;
  color: #666;
  margin-bottom: 8px;
}

.link-btn, .prompt-select-btn, .change-prompt-btn, .generate-btn, .close-btn {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
}

.link-btn.active, .generate-btn {
  background-color: #4caf50;
  color: white;
  border-color: #388e3c;
}

.close-btn {
  background-color: #f5f5f5;
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

.selected-prompt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
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