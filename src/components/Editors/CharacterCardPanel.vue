<template>
  <div class="character-card-panel">
    <div class="character-card-content">
      <div class="panel-section">
        <div class="section-header">场景列表</div>
        <div class="scene-filter">
          <input type="text" v-model="sceneSearchKeyword" placeholder="搜索场景..." class="search-input" />
        </div>
        <div class="scene-list">
          <div v-if="filteredScenes.length === 0" class="empty-state">
            <p>未找到场景</p>
            <button @click="refreshSceneData" class="refresh-btn">
              <i class="fas fa-sync-alt"></i> 刷新场景数据
            </button>
          </div>
          <div v-else class="scene-items">
            <div 
              v-for="scene in filteredScenes" 
              :key="scene.id"
              :class="['scene-item', { 'active': selectedScene && selectedScene.id === scene.id }]"
              @click="selectScene(scene)"
            >
              <div class="scene-name">{{ scene.name }}</div>
              <div class="scene-info">{{ scene.characterCount || 0 }} 个角色</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="selectedScene" class="panel-section">
        <div class="section-header-row">
          <div class="section-header">{{ selectedScene.name }} - 角色列表</div>
          <button class="add-btn" @click="openAddCharacterModal">
            <i class="fas fa-plus"></i> 新增角色
          </button>
        </div>
        
        <div class="character-filter">
          <input type="text" v-model="characterSearchKeyword" placeholder="搜索角色..." class="search-input" />
        </div>
        
        <div class="character-list">
          <div v-if="filteredCharacters.length === 0" class="empty-state">
            <p>该场景下暂无角色</p>
          </div>
          <div v-else class="character-items">
            <div 
              v-for="character in filteredCharacters" 
              :key="character.id"
              class="character-card"
              @click="selectCharacter(character)"
            >
              <div class="character-header">
                <h4>{{ character.name }}</h4>
                <div class="character-actions">
                  <button class="edit-btn" title="编辑" @click.stop="editCharacter(character)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="delete-btn" title="删除" @click.stop="confirmDeleteCharacter(character)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="character-avatar" :style="{ backgroundImage: character.avatar ? `url(${character.avatar})` : 'none' }">
                <div v-if="!character.avatar" class="avatar-placeholder">
                  {{ character.name ? character.name.charAt(0).toUpperCase() : '?' }}
                </div>
              </div>
              <div class="character-info">
                <div class="info-row"><span class="info-label">身份:</span> {{ character.role || '未知' }}</div>
                <div class="info-row"><span class="info-label">简介:</span> {{ character.description ? (character.description.length > 50 ? character.description.substring(0, 50) + '...' : character.description) : '暂无简介' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="selectedCharacter" class="panel-section">
        <div class="section-header">角色详情</div>
        <div class="character-detail">
          <div class="detail-header">
            <div class="detail-avatar" :style="{ backgroundImage: selectedCharacter.avatar ? `url(${selectedCharacter.avatar})` : 'none' }">
              <div v-if="!selectedCharacter.avatar" class="avatar-placeholder large">
                {{ selectedCharacter.name ? selectedCharacter.name.charAt(0).toUpperCase() : '?' }}
              </div>
            </div>
            <div class="detail-title">
              <h3>{{ selectedCharacter.name }}</h3>
              <div class="detail-subtitle">{{ selectedCharacter.role || '未知身份' }}</div>
            </div>
          </div>
          
          <div class="detail-content">
            <div class="detail-row">
              <div class="detail-label">描述</div>
              <div class="detail-text">{{ selectedCharacter.description || '暂无描述' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">性格</div>
              <div class="detail-text">{{ selectedCharacter.personality || '暂无性格描述' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">目标</div>
              <div class="detail-text">{{ selectedCharacter.goals || '暂无目标描述' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">关系</div>
              <div class="detail-text">{{ selectedCharacter.relationships || '暂无关系描述' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="primary-btn" @click="selectCharactersForCurrentChapter" v-if="selectedScene">为当前章节选择角色</button>
    </div>
    
    <!-- 新增/编辑角色模态框 -->
    <div v-if="showCharacterFormModal" class="modal-overlay" @click.self="closeCharacterFormModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEditMode ? '编辑角色' : '新增角色' }}</h3>
          <button class="close-modal-btn" @click="closeCharacterFormModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>角色名称 <span class="required">*</span></label>
            <input type="text" v-model="characterForm.name" class="form-input" placeholder="请输入角色名称" />
          </div>
          <div class="form-row">
            <label>角色身份</label>
            <input type="text" v-model="characterForm.role" class="form-input" placeholder="如：主角、配角、反派等" />
          </div>
          <div class="form-row">
            <label>角色头像</label>
            <div class="avatar-upload">
              <div class="avatar-preview" :style="{ backgroundImage: characterForm.avatar ? `url(${characterForm.avatar})` : 'none' }">
                <div v-if="!characterForm.avatar" class="avatar-placeholder">
                  {{ characterForm.name ? characterForm.name.charAt(0).toUpperCase() : '?' }}
                </div>
              </div>
              <button class="upload-btn">上传图片</button>
            </div>
          </div>
          <div class="form-row">
            <label>角色描述</label>
            <textarea v-model="characterForm.description" class="form-textarea" placeholder="描述角色的外貌、背景等基本信息"></textarea>
          </div>
          <div class="form-row">
            <label>性格特点</label>
            <textarea v-model="characterForm.personality" class="form-textarea" placeholder="描述角色的性格、行为模式等"></textarea>
          </div>
          <div class="form-row">
            <label>角色目标</label>
            <textarea v-model="characterForm.goals" class="form-textarea" placeholder="描述角色的动机、追求的目标等"></textarea>
          </div>
          <div class="form-row">
            <label>角色关系</label>
            <textarea v-model="characterForm.relationships" class="form-textarea" placeholder="描述与其他角色的关系"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeCharacterFormModal">取消</button>
          <button class="save-btn" @click="saveCharacter">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay" @click.self="closeDeleteConfirmModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认删除</h3>
          <button class="close-modal-btn" @click="closeDeleteConfirmModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>确定要删除角色 "{{ characterToDelete?.name }}" 吗？此操作不可恢复。</p>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDeleteConfirmModal">取消</button>
          <button class="delete-btn danger" @click="deleteCharacter">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { showToast } from '../../utils/common';
import { v4 as uuidv4 } from 'uuid';

// 场景和角色数据
const scenes = ref([
  { id: '1', name: '主城', characterCount: 3 },
  { id: '2', name: '学院', characterCount: 5 },
  { id: '3', name: '秘境', characterCount: 2 }
]);

const characters = ref([
  { 
    id: '1', 
    sceneId: '1', 
    name: '李白', 
    role: '主角', 
    description: '天才诗人，性格豪放不羁', 
    personality: '豪放、追求自由',
    goals: '寻找诗意与灵感，成为一代诗仙',
    relationships: '与杜甫为好友'
  },
  { 
    id: '2', 
    sceneId: '1', 
    name: '杜甫', 
    role: '配角', 
    description: '忧国忧民的诗人', 
    personality: '忧愁、敏感、关心民生',
    goals: '记录时代变迁，为苍生发声',
    relationships: '与李白为好友，尊敬孟浩然'
  },
  { 
    id: '3', 
    sceneId: '2', 
    name: '苏轼', 
    role: '重要配角', 
    description: '才华横溢的文学家', 
    personality: '豁达、幽默、乐观',
    goals: '追求文学艺术的极致',
    relationships: '与黄庭坚为师生关系'
  }
]);

// 搜索关键词
const sceneSearchKeyword = ref('');
const characterSearchKeyword = ref('');

// 选中的场景和角色
const selectedScene = ref(null);
const selectedCharacter = ref(null);

// 表单模态框状态
const showCharacterFormModal = ref(false);
const isEditMode = ref(false);
const characterForm = reactive({
  id: '',
  sceneId: '',
  name: '',
  role: '',
  avatar: '',
  description: '',
  personality: '',
  goals: '',
  relationships: ''
});

// 删除确认模态框
const showDeleteConfirmModal = ref(false);
const characterToDelete = ref(null);

// 计算过滤后的场景列表
const filteredScenes = computed(() => {
  if (!sceneSearchKeyword.value) return scenes.value;
  
  return scenes.value.filter(scene => 
    scene.name.toLowerCase().includes(sceneSearchKeyword.value.toLowerCase())
  );
});

// 计算过滤后的角色列表
const filteredCharacters = computed(() => {
  if (!selectedScene.value) return [];
  
  let filtered = characters.value.filter(char => char.sceneId === selectedScene.value.id);
  
  if (characterSearchKeyword.value) {
    filtered = filtered.filter(char => 
      char.name.toLowerCase().includes(characterSearchKeyword.value.toLowerCase()) ||
      char.role?.toLowerCase().includes(characterSearchKeyword.value.toLowerCase())
    );
  }
  
  return filtered;
});

// 刷新场景数据
const refreshSceneData = () => {
  // 这里可以实现从后端加载场景数据的逻辑
  // 暂时使用示例数据
  showToast('场景数据已刷新', 'success');
};

// 选择场景
const selectScene = (scene) => {
  selectedScene.value = scene;
  selectedCharacter.value = null; // 重置选中的角色
  characterSearchKeyword.value = ''; // 重置搜索关键词
};

// 选择角色
const selectCharacter = (character) => {
  selectedCharacter.value = character;
};

// 打开新增角色模态框
const openAddCharacterModal = () => {
  isEditMode.value = false;
  
  // 重置表单
  Object.keys(characterForm).forEach(key => {
    characterForm[key] = '';
  });
  
  characterForm.sceneId = selectedScene.value.id;
  showCharacterFormModal.value = true;
};

// 编辑角色
const editCharacter = (character) => {
  isEditMode.value = true;
  
  // 填充表单
  Object.keys(characterForm).forEach(key => {
    characterForm[key] = character[key];
  });
  
  showCharacterFormModal.value = true;
};

// 关闭角色表单模态框
const closeCharacterFormModal = () => {
  showCharacterFormModal.value = false;
};

// 保存角色
const saveCharacter = () => {
  // 验证必填字段
  if (!characterForm.name) {
    showToast('请输入角色名称', 'error');
    return;
  }
  
  if (isEditMode.value) {
    // 编辑现有角色
    const index = characters.value.findIndex(char => char.id === characterForm.id);
    if (index !== -1) {
      characters.value[index] = { ...characterForm };
      
      // 如果当前正在查看此角色，更新选中的角色
      if (selectedCharacter.value && selectedCharacter.value.id === characterForm.id) {
        selectedCharacter.value = { ...characterForm };
      }
    }
  } else {
    // 添加新角色
    const newCharacter = {
      ...characterForm,
      id: uuidv4()
    };
    
    characters.value.push(newCharacter);
    
    // 更新场景中的角色数量
    const sceneIndex = scenes.value.findIndex(scene => scene.id === newCharacter.sceneId);
    if (sceneIndex !== -1) {
      scenes.value[sceneIndex].characterCount = (scenes.value[sceneIndex].characterCount || 0) + 1;
    }
  }
  
  showToast(isEditMode.value ? '角色已更新' : '角色已添加', 'success');
  closeCharacterFormModal();
};

// 确认删除角色
const confirmDeleteCharacter = (character) => {
  characterToDelete.value = character;
  showDeleteConfirmModal.value = true;
};

// 关闭删除确认模态框
const closeDeleteConfirmModal = () => {
  showDeleteConfirmModal.value = false;
  characterToDelete.value = null;
};

// 删除角色
const deleteCharacter = () => {
  if (!characterToDelete.value) return;
  
  const index = characters.value.findIndex(char => char.id === characterToDelete.value.id);
  if (index !== -1) {
    const deletedChar = characters.value[index];
    characters.value.splice(index, 1);
    
    // 更新场景中的角色数量
    const sceneIndex = scenes.value.findIndex(scene => scene.id === deletedChar.sceneId);
    if (sceneIndex !== -1 && scenes.value[sceneIndex].characterCount > 0) {
      scenes.value[sceneIndex].characterCount--;
    }
    
    // 如果当前正在查看此角色，重置选中的角色
    if (selectedCharacter.value && selectedCharacter.value.id === deletedChar.id) {
      selectedCharacter.value = null;
    }
  }
  
  showToast('角色已删除', 'success');
  closeDeleteConfirmModal();
};

// 为当前章节选择角色
const selectCharactersForCurrentChapter = () => {
  showToast('为当前章节关联角色功能待实现', 'info');
  // 实际实现中，可能需要打开一个选择角色的模态框，允许用户选择多个角色
};

// 定义 emit 事件
defineEmits(['close']);
</script>

<style scoped>
.character-card-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.character-card-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.panel-section {
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
}

.section-header {
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 1.1em;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-bottom: 12px;
}

.scene-list, .character-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
}

.refresh-btn {
  background-color: #f0f0f0;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
}

.scene-item {
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.scene-item:hover {
  background-color: #f5f5f5;
}

.scene-item.active {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.scene-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.scene-info {
  font-size: 0.85em;
  color: #666;
}

.add-btn {
  padding: 6px 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.character-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.character-card {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.character-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.character-header {
  padding: 10px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.character-header h4 {
  margin: 0;
}

.character-actions {
  display: flex;
  gap: 4px;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.delete-btn {
  color: #f44336;
}

.character-avatar {
  height: 100px;
  background-color: #f0f0f0;
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4caf50;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: bold;
}

.avatar-placeholder.large {
  width: 60px;
  height: 60px;
  font-size: 28px;
}

.character-info {
  padding: 10px;
}

.info-row {
  margin-bottom: 6px;
  font-size: 0.9em;
}

.info-label {
  font-weight: bold;
  color: #555;
}

.character-detail {
  background-color: #f9f9f9;
  border-radius: 4px;
  overflow: hidden;
}

.detail-header {
  padding: 16px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
}

.detail-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #e0e0e0;
  margin-right: 16px;
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-title h3 {
  margin: 0 0 4px 0;
}

.detail-subtitle {
  color: #666;
}

.detail-content {
  padding: 16px;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-label {
  font-weight: bold;
  margin-bottom: 4px;
  color: #444;
}

.detail-text {
  line-height: 1.5;
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

.primary-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #388e3c;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 4px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-row {
  margin-bottom: 16px;
}

.form-row label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
}

.required {
  color: #f44336;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-size: cover;
  background-position: center;
}

.upload-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.cancel-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.save-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #388e3c;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
}

.delete-btn.danger {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #d32f2f;
  background-color: #f44336;
  color: white;
  cursor: pointer;
}
</style> 