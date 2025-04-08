<template>
  <div class="character-selection-dialog" v-if="visible">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>选择关联角色</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-body">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchKeyword" 
            placeholder="搜索角色..." 
            class="search-input"
          />
        </div>
        
        <div class="character-list">
          <div v-if="filteredCharacters.length === 0" class="empty-state">
            <p>未找到角色</p>
          </div>
          <div v-else class="character-items">
            <div 
              v-for="character in filteredCharacters" 
              :key="character.id"
              class="character-item"
            >
              <div class="selection-row">
                <input 
                  type="checkbox" 
                  :id="'character-' + character.id" 
                  v-model="localSelectedCharacters" 
                  :value="character.id"
                >
                <label :for="'character-' + character.id">
                  <div class="character-info">
                    <div class="character-name">{{ character.name }}</div>
                    <div class="character-role">{{ character.role || '未知身份' }}</div>
                    <div class="character-scene">{{ getSceneName(character.sceneId) }}</div>
                  </div>
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
import { ref, computed, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  characters: {
    type: Array,
    required: true,
    default: () => []
  },
  scenes: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedCharacters: {
    type: Array,
    required: false,
    default: () => []
  }
});

const emit = defineEmits(['close', 'confirm']);

const searchKeyword = ref('');
const localSelectedCharacters = ref([]);

// 计算过滤后的角色列表
const filteredCharacters = computed(() => {
  if (!searchKeyword.value) return props.characters;
  
  return props.characters.filter(character => 
    character.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    character.role?.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    getSceneName(character.sceneId).toLowerCase().includes(searchKeyword.value.toLowerCase())
  );
});

// 获取场景名称
const getSceneName = (sceneId) => {
  const scene = props.scenes.find(s => s.id === sceneId);
  return scene ? scene.name : '未知场景';
};

// 当弹窗显示时，使用传入的已选择内容初始化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    localSelectedCharacters.value = [...props.selectedCharacters];
  }
});

const handleConfirm = () => {
  emit('confirm', localSelectedCharacters.value);
  emit('close');
};
</script>

<style scoped>
.character-selection-dialog {
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

.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.character-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
}

.selection-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.character-info {
  flex: 1;
}

.character-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.character-role {
  color: #666;
  font-size: 0.9em;
  margin-bottom: 2px;
}

.character-scene {
  color: #999;
  font-size: 0.85em;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
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