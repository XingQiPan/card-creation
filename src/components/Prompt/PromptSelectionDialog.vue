<template>
  <div class="prompt-selection-dialog-overlay" v-if="visible" @click.self="closeDialog">
    <div class="prompt-selection-dialog">
      <div class="dialog-header">
        <h3>选择提示词</h3>
        <div class="category-selector">
          <select v-model="selectedCategory">
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <button class="close-button" @click="closeDialog">&times;</button>
      </div>
      
      <div class="dialog-content">
        <div v-if="loading" class="loading-indicator">加载中...</div>
        
        <div v-else-if="filteredPrompts.length === 0" class="no-prompts">
          当前分类没有可用的提示词
        </div>
        
        <div v-else class="prompts-list">
          <div 
            v-for="prompt in filteredPrompts" 
            :key="prompt.id" 
            class="prompt-item"
            :class="{ 'selected': selectedPromptId === prompt.id }"
            @click="selectPrompt(prompt)"
          >
            <div class="prompt-title">{{ prompt.title }}</div>
            <div class="prompt-preview">{{ getPromptPreview(prompt.systemPrompt) }}</div>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="closeDialog">取消</button>
        <button 
          class="confirm-btn" 
          :disabled="!selectedPromptId" 
          @click="confirmSelection"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    required: true
  },
  prompts: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'select']);

// 数据加载状态
const loading = ref(false);

// 当前选中的分类，默认为"黄金开篇生成"
const selectedCategory = ref('黄金开篇生成');

// 当前选中的提示词ID
const selectedPromptId = ref(null);
const selectedPromptData = ref(null);

// 根据分类筛选提示词
const filteredPrompts = computed(() => {
  return props.prompts.filter(prompt => prompt.category === selectedCategory.value);
});

// 获取提示词预览（截取部分内容）
const getPromptPreview = (systemPrompt) => {
  if (!systemPrompt) return '';
  // 截取前50个字符并添加省略号
  return systemPrompt.length > 50 ? systemPrompt.slice(0, 50) + '...' : systemPrompt;
};

// 选择提示词
const selectPrompt = (prompt) => {
  selectedPromptId.value = prompt.id;
  selectedPromptData.value = prompt;
};

// 确认选择
const confirmSelection = () => {
  if (selectedPromptData.value) {
    emit('select', selectedPromptData.value);
    closeDialog();
  }
};

// 关闭对话框
const closeDialog = () => {
  selectedPromptId.value = null;
  selectedPromptData.value = null;
  emit('close');
};

// 监听分类变化，重置选中的提示词
watch(selectedCategory, () => {
  selectedPromptId.value = null;
  selectedPromptData.value = null;
});
</script>

<style scoped>
.prompt-selection-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.prompt-selection-dialog {
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.dialog-header h3 {
  margin: 0;
}

.category-selector {
  margin: 0 16px;
}

.category-selector select {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
}

.close-button {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #999;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-indicator, .no-prompts {
  text-align: center;
  padding: 24px;
  color: #999;
}

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-item {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.prompt-item:hover {
  background-color: #f5f5f5;
}

.prompt-item.selected {
  background-color: #e6f7ff;
  border-color: #1890ff;
}

.prompt-title {
  font-weight: bold;
  margin-bottom: 6px;
}

.prompt-preview {
  color: #666;
  font-size: 0.9em;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;
  gap: 8px;
}

.cancel-btn, .confirm-btn {
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #f5f5f5;
  border: 1px solid #d9d9d9;
}

.confirm-btn {
  background-color: #1890ff;
  color: white;
  border: none;
}

.confirm-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}
</style> 