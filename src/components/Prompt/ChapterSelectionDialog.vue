<template>
  <div class="chapter-selection-dialog" v-if="visible">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>选择关联章节</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-body">
        <div class="chapter-list">
          <div v-for="chapter in chapters" :key="chapter.id" class="chapter-item">
            <div class="selection-row">
              <div class="checkbox-group">
                <input 
                  type="checkbox" 
                  :id="'chapter-' + chapter.id" 
                  v-model="localSelectedChapters" 
                  :value="chapter.id"
                >
                <label :for="'chapter-' + chapter.id">章节：{{ chapter.title }}</label>
              </div>
              
              <div class="checkbox-group">
                <input 
                  type="checkbox" 
                  :id="'outline-' + chapter.id" 
                  v-model="localSelectedOutlines" 
                  :value="chapter.id"
                  :disabled="!chapter.outline"
                >
                <label :for="'outline-' + chapter.id" :class="{ 'disabled': !chapter.outline }">
                  大纲：{{ chapter.outline ? '已设置' : '未设置' }}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button class="confirm-btn" @click="handleConfirm">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  chapters: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedChapters: {
    type: Array,
    required: false,
    default: () => []
  },
  selectedOutlines: {
    type: Array,
    required: false,
    default: () => []
  }
});

const emit = defineEmits(['close', 'confirm']);

const localSelectedChapters = ref([]);
const localSelectedOutlines = ref([]);

// 当弹窗显示时，使用传入的已选择内容初始化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    localSelectedChapters.value = [...props.selectedChapters];
    localSelectedOutlines.value = [...props.selectedOutlines];
  }
});

const handleConfirm = () => {
  emit('confirm', {
    chapters: localSelectedChapters.value,
    outlines: localSelectedOutlines.value
  });
  emit('close');
};
</script>

<style scoped>
.chapter-selection-dialog {
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

.dialog-content {
  background-color: white;
  border-radius: 8px;
  width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: #666;
}

.dialog-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
}

.selection-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.checkbox-group label {
  font-size: 0.9em;
}

.checkbox-group label.disabled {
  color: #999;
  cursor: not-allowed;
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn, .confirm-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #f5f5f5;
  border: 1px solid #ccc;
}

.confirm-btn {
  background-color: #4caf50;
  border: 1px solid #388e3c;
  color: white;
}

.confirm-btn:hover {
  background-color: #388e3c;
}
</style> 