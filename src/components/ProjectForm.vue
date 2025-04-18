<template>
  <div class="project-form-overlay" @click="$emit('close')">
    <div class="project-form-sidebar" @click.stop>
      <div class="sidebar-header">
        <h3>{{ isEditing ? '编辑项目' : '添加项目' }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="form-content">
        <div class="form-group">
          <label for="project-name">项目名称</label>
          <input 
            id="project-name"
            v-model="formData.name"
            type="text"
            placeholder="请输入项目名称"
            @input="validateForm"
          />
          <div class="error-message" v-if="nameError">{{ nameError }}</div>
        </div>
        
        <div class="form-group">
          <label>场景（多选）</label>
          <div class="scene-filter">
            <input 
              type="text"
              v-model="sceneFilter"
              placeholder="搜索场景..."
              class="search-input"
            />
          </div>
          
          <div class="batch-actions">
            <button 
              class="rename-btn" 
              @click="batchRenameScenes"
              :disabled="!canRenameScenes"
              :title="renameButtonTitle"
            >
              <i class="fas fa-tag"></i> 批量改名
            </button>
          </div>
          
          <div class="scene-list">
            <div 
              v-for="scene in filteredScenes" 
              :key="scene.id"
              class="scene-item"
              :class="{ 
                selected: isSceneSelected(scene.id),
                renamed: isSceneRenamed(scene)
              }"
              @click="toggleSceneSelection(scene.id)"
            >
              <div class="scene-info">
                <span class="scene-name">{{ scene.name }}</span>
                <span v-if="isSceneRenamed(scene)" class="renamed-badge" title="已重命名">
                  <i class="fas fa-check"></i>
                </span>
              </div>
              <div class="scene-checkbox">
                <i class="fas" :class="isSceneSelected(scene.id) ? 'fa-check-square' : 'fa-square'"></i>
              </div>
            </div>
            
            <div v-if="filteredScenes.length === 0" class="empty-scenes">
              <p>没有找到匹配的场景</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          class="cancel-btn" 
          @click="$emit('close')"
        >
          取消
        </button>
        <button 
          class="save-btn" 
          :disabled="!isFormValid"
          @click="saveProject"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';

const syncData = inject('syncData');
const props = defineProps({
  project: {
    type: Object,
    default: null
  },
  scenes: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['close', 'save', 'rename-scenes']);

// 表单数据
const formData = ref({
  id: null,
  name: '',
  scenes: []
});

// 场景筛选
const sceneFilter = ref('');
const nameError = ref('');

// 跟踪已重命名的场景
const renamedScenes = ref(new Set());

// 计算属性
const isEditing = computed(() => !!props.project);

const filteredScenes = computed(() => {
  if (!sceneFilter.value) {
    return props.scenes;
  }
  
  const keyword = sceneFilter.value.toLowerCase();
  return props.scenes.filter(scene => 
    scene.name.toLowerCase().includes(keyword)
  );
});

const isFormValid = computed(() => {
  return formData.value.name.trim() !== '' && 
         formData.value.scenes.length > 0 &&
         !nameError.value;
});

// 检查场景是否已经重命名为项目名-场景名格式
const isSceneRenamed = (scene) => {
  return renamedScenes.value.has(scene.id) || 
         (formData.value.name && scene.name.startsWith(`${formData.value.name}-`));
};

// 检查是否有未重命名的选中场景
const canRenameScenes = computed(() => {
  if (!formData.value.name.trim()) return false;
  
  return formData.value.scenes.some(sceneId => {
    const scene = props.scenes.find(s => s.id === sceneId);
    return scene && !isSceneRenamed(scene);
  });
});

// 重命名按钮的提示文本
const renameButtonTitle = computed(() => {
  if (!formData.value.name.trim()) {
    return '请先输入项目名称';
  }
  
  if (!formData.value.scenes.length) {
    return '请选择要重命名的场景';
  }
  
  if (!canRenameScenes.value) {
    return '所有选中场景已重命名';
  }
  
  return '将选中场景重命名为: 项目名-场景名';
});

// 方法
const validateForm = () => {
  // 验证项目名称
  if (formData.value.name.trim() === '') {
    nameError.value = '项目名称不能为空';
  } else if (formData.value.name.length > 30) {
    nameError.value = '项目名称不能超过30个字符';
  } else {
    nameError.value = '';
  }
};

const isSceneSelected = (sceneId) => {
  return formData.value.scenes.includes(sceneId);
};

const toggleSceneSelection = (sceneId) => {
  const index = formData.value.scenes.indexOf(sceneId);
  if (index === -1) {
    formData.value.scenes.push(sceneId);
  } else {
    formData.value.scenes.splice(index, 1);
  }
};

// 批量重命名场景
const batchRenameScenes = () => {
  if (!formData.value.name.trim() || !formData.value.scenes.length) return;
  
  const projectName = formData.value.name.trim();
  const renamedSceneIds = [];

  // 创建要修改的场景的副本
  const modifiedScenes = [...props.scenes];
  
  // 对选中的场景进行重命名
  formData.value.scenes.forEach(sceneId => {
    const sceneIndex = modifiedScenes.findIndex(s => s.id === sceneId);
    if (sceneIndex !== -1) {
      const scene = modifiedScenes[sceneIndex];
      
      // 如果场景名称没有以项目名开头，则进行重命名
      if (!scene.name.startsWith(`${projectName}-`)) {
        // 创建新的场景对象
        modifiedScenes[sceneIndex] = {
          ...scene,
          name: `${projectName}-${scene.name}`
        };
        
        // 记录已重命名的场景ID
        renamedSceneIds.push(sceneId);
      }
    }
    syncData()
  });
  
  // 如果有场景被重命名，更新场景数据
  if (renamedSceneIds.length > 0) {
    // 更新已重命名的场景集合
    renamedSceneIds.forEach(id => renamedScenes.value.add(id));
    
    // 将修改后的场景传递给父组件
    emit('rename-scenes', modifiedScenes);
  }
};

const saveProject = () => {
  if (!isFormValid.value) return;
  
  // 收集完整的场景对象
  const selectedScenes = props.scenes.filter(scene => 
    formData.value.scenes.includes(scene.id)
  );
  
  const projectData = {
    id: formData.value.id || Date.now(),
    name: formData.value.name,
    scenes: selectedScenes,
    // 添加重命名信息
    renamedScenes: Array.from(renamedScenes.value)
  };
  
  emit('save', projectData);
};

// 初始化表单数据
onMounted(() => {
  if (props.project) {
    formData.value = {
      id: props.project.id,
      name: props.project.name,
      scenes: props.project.scenes.map(scene => scene.id)
    };
    
    // 初始化已重命名的场景集合
    if (props.project.renamedScenes) {
      renamedScenes.value = new Set(props.project.renamedScenes);
    }
  }
});
</script>

<style scoped>
.project-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
}

.project-form-sidebar {
  width: 400px;
  height: 100%;
  background-color: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input[type="text"]:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.error-message {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}

.scene-filter {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.scene-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.scene-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scene-item:last-child {
  border-bottom: none;
}

.scene-item:hover {
  background-color: #f5f5f5;
}

.scene-item.selected {
  background-color: #e6f7ff;
}

.scene-item.renamed {
  background-color: #f0fff0;
}

.scene-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-name {
  font-size: 14px;
  color: #333;
}

.scene-checkbox {
  color: #999;
}

.scene-item.selected .scene-checkbox {
  color: #1890ff;
}

.empty-scenes {
  padding: 16px;
  text-align: center;
  color: #999;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  gap: 12px;
  border-top: 1px solid #eee;
}

.cancel-btn, .save-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background-color: white;
  color: #666;
  border: 1px solid #ddd;
}

.save-btn {
  background-color: #1890ff;
  color: white;
}

.cancel-btn:hover {
  background-color: #f5f5f5;
}

.save-btn:hover {
  background-color: #096dd9;
}

.save-btn:disabled {
  background-color: #bae7ff;
  cursor: not-allowed;
}

.batch-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.rename-btn {
  padding: 8px 12px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rename-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
  border-color: #ccc;
}

.rename-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.renamed-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background-color: #4caf50;
  color: white;
  border-radius: 50%;
  font-size: 10px;
}
</style> 