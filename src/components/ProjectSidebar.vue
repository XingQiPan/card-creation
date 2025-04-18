<template>
  <div class="project-sidebar-overlay" v-if="show" @click="closeProjectSidebar">
    <div class="project-sidebar" @click.stop>
      <div class="sidebar-header">
        <h3>项目列表</h3>
        <button class="close-btn" @click="closeProjectSidebar">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="sidebar-content">
        <div class="project-list">
          <!-- 默认的全部场景选项 -->
          <div 
            class="project-item" 
            :class="{ active: activeProject === null }"
            @click="selectProject(null)"
          >
            <div class="project-info">
              <div class="project-name">全部场景</div>
              <div class="project-scene-count">{{ allScenesCount }} 个场景</div>
            </div>
          </div>
          
          <!-- 项目列表 -->
          <div 
            v-for="project in projects" 
            :key="project.id"
            class="project-item"
            :class="{ active: activeProject?.id === project.id }"
            @click="selectProject(project)"
          >
            <div class="project-info">
              <div class="project-name">{{ project.name }}</div>
              <div class="project-scene-count">{{ project.scenes.length }} 个场景</div>
            </div>
            <div class="project-actions">
              <button class="edit-btn" @click.stop="editProject(project)">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn" @click.stop="confirmDeleteProject(project)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="sidebar-actions">
          <button class="add-project-btn" @click="openAddProjectSidebar">
            <i class="fas fa-plus"></i> 添加项目
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 添加/编辑项目侧边栏 -->
  <ProjectForm
    v-if="showProjectForm"
    :project="editingProject"
    :scenes="scenes"
    @close="closeProjectForm"
    @save="saveProject"
    @rename-scenes="handleRenameScenes"
  />
  
  <!-- 删除确认对话框 -->
  <div class="confirm-dialog" v-if="showDeleteConfirm">
    <div class="confirm-content">
      <h3>确认删除</h3>
      <p>确定要删除项目"{{ projectToDelete?.name }}"吗？</p>
      <div class="confirm-actions">
        <button class="cancel-btn" @click="cancelDelete">取消</button>
        <button class="delete-confirm-btn" @click="deleteProject">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed ,inject} from 'vue';
import ProjectForm from './ProjectForm.vue';
import { showToast } from '../utils/common';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  scenes: {
    type: Array,
    required: true
  },
  projects: {
    type: Array,
    required: true
  },
  activeProject: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'select-project', 'add-project', 'update-project', 'delete-project', 'rename-scenes']);
const syncData = inject('syncData');
// 状态变量
const showProjectForm = ref(false);
const editingProject = ref(null);
const showDeleteConfirm = ref(false);
const projectToDelete = ref(null);

// 计算属性
const allScenesCount = computed(() => props.scenes.length);

// 方法
const closeProjectSidebar = () => {
  emit('close');
};

const selectProject = (project) => {
  emit('select-project', project);
  syncData()
  closeProjectSidebar();
  
};

const openAddProjectSidebar = () => {
  editingProject.value = null;
  showProjectForm.value = true;
};

const editProject = (project) => {
  editingProject.value = { ...project };
  showProjectForm.value = true;
};

const closeProjectForm = () => {
  showProjectForm.value = false;
  editingProject.value = null;
};

const saveProject = (project) => {
  if (editingProject.value) {
    // 更新现有项目
    emit('update-project', project);
  } else {
    // 添加新项目
    emit('add-project', project);
  }
  closeProjectForm();
};

const confirmDeleteProject = (project) => {
  projectToDelete.value = project;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  projectToDelete.value = null;
};

const deleteProject = () => {
  emit('delete-project', projectToDelete.value.id);
  showDeleteConfirm.value = false;
  projectToDelete.value = null;
};

const handleRenameScenes = (modifiedScenes) => {
  // 将事件传递给父组件
  emit('rename-scenes', modifiedScenes);
};
</script>

<style scoped>
.project-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.project-sidebar {
  width: 350px;
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

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
}

.project-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.project-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-item:hover {
  background-color: #f8f9fa;
  border-color: #ddd;
}

.project-item.active {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-name {
  font-weight: 500;
  color: #333;
}

.project-scene-count {
  font-size: 12px;
  color: #666;
}

.project-actions {
  display: flex;
  gap: 8px;
  opacity: 0.7;
}

.project-item:hover .project-actions {
  opacity: 1;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
}

.edit-btn {
  color: #1890ff;
}

.edit-btn:hover {
  background-color: #e6f7ff;
}

.delete-btn {
  color: #ff4d4f;
}

.delete-btn:hover {
  background-color: #fff1f0;
}

.sidebar-actions {
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.add-project-btn {
  width: 100%;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.add-project-btn:hover {
  background-color: #096dd9;
}

/* 确认对话框样式 */
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.confirm-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.confirm-content h3 {
  margin-top: 0;
  color: #333;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel-btn, .delete-confirm-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
}

.cancel-btn {
  background-color: #f0f0f0;
  color: #666;
}

.delete-confirm-btn {
  background-color: #ff4d4f;
  color: white;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.delete-confirm-btn:hover {
  background-color: #ff7875;
}
</style> 