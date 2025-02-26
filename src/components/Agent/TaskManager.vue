<template>
    <div class="task-manager">
      <div class="task-header">
        <h3>任务执行视图</h3>
        <div class="task-actions">
          <button @click="createRootTask" v-if="!rootTask" class="create-btn">
            <i class="fas fa-plus"></i> 创建根任务
          </button>
          <button 
            @click="executeAllTasks" 
            v-if="rootTask" 
            :disabled="isExecuting"
            class="execute-btn"
          >
            <i class="fas fa-play"></i> 执行所有任务
          </button>
          <button 
            @click="exportTasks" 
            v-if="rootTask"
            class="export-btn"
          >
            <i class="fas fa-file-export"></i> 导出任务
          </button>
          <label class="import-btn" v-if="!rootTask">
            <input 
              type="file" 
              accept=".json"
              @change="importTasks"
            >
            <i class="fas fa-file-import"></i> 导入任务
          </label>
          <button 
            @click="toggleSettings" 
            class="settings-btn"
          >
            <i class="fas fa-cog"></i> 设置
          </button>
        </div>
      </div>
  
      <div class="task-map" v-if="rootTask">
        <task-node 
          :task="rootTask" 
          :agents="agents"
          :scenes="scenes"
          :is-root="true"
          :selected-id="selectedTaskId"
          @execute="$emit('execute', $event)"
          @add-subtask="handleAddSubtask"
          @edit="handleEditTask"
          @delete="handleDeleteTask"
          @select="selectTask"
        />
      </div>
  
      <div class="task-settings" v-if="showSettings">
        <div class="settings-header">
          <h4>任务执行设置</h4>
          <button @click="showSettings = false" class="close-btn">&times;</button>
        </div>
        <div class="settings-body">
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="settings.autoSaveResults"
              >
              自动保存任务结果到场景
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="settings.continueOnError"
              >
              出错时继续执行后续任务
            </label>
          </div>
          <div class="form-group">
            <label>默认响应格式</label>
            <select v-model="settings.responseFormat">
              <option value="text">纯文本</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
          <div class="form-group" v-if="settings.responseFormat === 'json'">
            <label>JSON响应模板</label>
            <textarea 
              v-model="settings.jsonTemplate" 
              rows="5"
              placeholder='例如: {"content": "", "isComplete": false}'
            ></textarea>
          </div>
        </div>
        <div class="settings-footer">
          <button @click="saveSettings" class="save-btn">保存设置</button>
        </div>
      </div>
  
      <div class="task-detail" v-if="selectedTask">
        <div class="detail-header">
          <h4>{{ selectedTask.title }}</h4>
          <button @click="selectedTaskId = null" class="close-btn">&times;</button>
        </div>
        <div class="detail-body">
          <div class="detail-section">
            <h5>任务描述</h5>
            <p>{{ selectedTask.description || '无描述' }}</p>
          </div>
          <div class="detail-section" v-if="assignedAgent">
            <h5>指派给</h5>
            <div class="agent-info">
              <div class="agent-name">{{ assignedAgent.name }}</div>
              <div class="agent-skills">
                <span v-for="(skill, index) in assignedAgent.skills" :key="index" class="skill-tag">
                  {{ skill }}
                </span>
              </div>
            </div>
          </div>
          <div class="detail-section" v-if="selectedTask.output">
            <h5>任务输出</h5>
            <div class="output-content">{{ selectedTask.output }}</div>
          </div>
          <div class="detail-section" v-if="selectedTask.error">
            <h5>执行错误</h5>
            <div class="error-content">{{ selectedTask.error }}</div>
          </div>
        </div>
        <div class="detail-footer">
          <button 
            @click="$emit('execute', selectedTask)" 
            :disabled="isExecuting"
            class="execute-btn"
          >
            <i class="fas fa-play"></i> 执行任务
          </button>
          <button @click="handleEditTask(selectedTask)" class="edit-btn">
            <i class="fas fa-edit"></i> 编辑任务
          </button>
          <button @click="handleDeleteTask(selectedTask.id)" class="delete-btn">
            <i class="fas fa-trash"></i> 删除任务
          </button>
          <button @click="handleAddSubtask(selectedTask)" class="add-btn">
            <i class="fas fa-plus"></i> 添加子任务
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import TaskNode from './TaskNode.vue';
  
  const props = defineProps({
    rootTask: {
      type: Object,
      default: null
    },
    agents: {
      type: Array,
      default: () => []
    },
    scenes: {
      type: Array,
      default: () => []
    },
    models: {
      type: Array,
      default: () => []
    },
    isExecuting: {
      type: Boolean,
      default: false
    }
  });
  
  const emit = defineEmits([
    'save-tasks', 
    'execute', 
    'delete-task', 
    'add-subtask',
    'edit-task',
    'add-card-to-scene'
  ]);
  
  // 状态
  const selectedTaskId = ref(null);
  const showSettings = ref(false);
  const settings = ref({
    autoSaveResults: true,
    continueOnError: false,
    responseFormat: 'json',
    jsonTemplate: '{"content": "", "isComplete": false}'
  });
  
  // 计算属性
  const allTasks = computed(() => {
    const tasks = [];
    
    const collectTasks = (task) => {
      if (!task) return;
      tasks.push(task);
      if (task.subtasks) {
        task.subtasks.forEach(subtask => collectTasks(subtask));
      }
    };
    
    if (props.rootTask) {
      collectTasks(props.rootTask);
    }
    
    return tasks;
  });
  
  const selectedTask = computed(() => {
    if (!selectedTaskId.value || !props.rootTask) return null;
    
    const findTask = (task, id) => {
      if (task.id === id) return task;
      if (!task.subtasks) return null;
      
      for (const subtask of task.subtasks) {
        const found = findTask(subtask, id);
        if (found) return found;
      }
      
      return null;
    };
    
    return findTask(props.rootTask, selectedTaskId.value);
  });
  
  const assignedAgent = computed(() => {
    if (!selectedTask.value || !selectedTask.value.assignedTo) return null;
    return props.agents.find(a => a.id === selectedTask.value.assignedTo);
  });
  
  // 方法
  const createRootTask = () => {
    const newTask = {
      id: uuidv4(),
      title: '根任务',
      description: '',
      assignedTo: '',
      status: 'pending',
      subtasks: [],
      sceneId: '',
      includeParentContext: false,
      includeRelatedContext: false,
      includeSceneContext: false,
      relatedTaskId: ''
    };
    
    emit('save-tasks', newTask);
  };
  
  const executeAllTasks = async () => {
    console.log('TaskManager: 执行所有任务')
    
    if (props.isExecuting) {
      console.warn('已有任务正在执行，请等待完成')
      return
    }
    
    if (!props.rootTask) {
      console.warn('没有根任务可执行')
      return
    }
    
    // 收集所有任务
    const allTasks = []
    
    // 递归收集任务
    const collectTasks = (task) => {
      // 添加当前任务
      allTasks.push(task)
      
      // 如果有子任务，递归收集
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          collectTasks(subtask)
        })
      }
    }
    
    // 从根任务开始收集
    collectTasks(props.rootTask)
    
    console.log(`TaskManager: 收集到 ${allTasks.length} 个任务，包括子任务`)
    
    // 打印所有收集到的任务，便于调试
    allTasks.forEach((task, index) => {
      console.log(`TaskManager: 任务 ${index+1}: ID=${task.id}, 标题=${task.title}`)
    })
    
    // 发出执行所有任务的事件
    emit('execute-all', allTasks)
  };
  
  const exportTasks = () => {
    if (!props.rootTask) return;
    
    const dataStr = JSON.stringify(props.rootTask, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `task-flow-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const importTasks = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTask = JSON.parse(e.target.result);
        emit('save-tasks', importedTask);
      } catch (error) {
        console.error('导入任务失败:', error);
        alert('导入失败: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  
  const toggleSettings = () => {
    console.log('切换设置面板');
    showSettings.value = !showSettings.value;
  };
  
  const saveSettings = () => {
    localStorage.setItem('taskSettings', JSON.stringify(settings.value));
    showSettings.value = false;
  };
  
  const selectTask = (taskId) => {
    console.log('选择任务:', taskId);
    selectedTaskId.value = taskId;
  };
  
  const handleAddSubtask = (parentTask) => {
    console.log('TaskManager: 添加子任务到', parentTask);
    emit('add-subtask', parentTask);
  };
  
  const handleEditTask = (task) => {
    console.log('TaskManager: 编辑任务', task);
    emit('edit-task', task);
  };
  
  const handleDeleteTask = (taskId) => {
    console.log('TaskManager: 删除任务', taskId);
    emit('delete-task', taskId);
  };
  
  // 生命周期钩子
  onMounted(() => {
    // 加载设置
    try {
      const savedSettings = localStorage.getItem('taskSettings');
      if (savedSettings) {
        settings.value = JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  });
  
  // 监听props变化
  watch(() => props.agents, () => {
    // 当agents变化时，可能需要更新任务分配
  }, { deep: true });
  </script>
  
  <style scoped>
  .task-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .task-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .task-map {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
  
  .task-settings {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 1rem;
    width: 90%;
    max-width: 600px;
    z-index: 1000;
  }
  
  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .settings-body {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .settings-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #e8e8e8;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .create-btn,
  .save-btn,
  .execute-btn {
    background-color: #1890ff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .export-btn,
  .import-btn {
    background-color: #52c41a;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .settings-btn {
    background-color: #faad14;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .import-btn {
    position: relative;
  }
  
  .import-btn input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  
  .cancel-btn {
    background-color: #fff;
    border: 1px solid #d9d9d9;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .execute-btn:disabled {
    background-color: #d9d9d9;
    cursor: not-allowed;
  }
  
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .modal-body {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #e8e8e8;
    gap: 0.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #999;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .checkbox-group {
    margin-top: 0.5rem;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .task-detail {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .detail-body {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .detail-section {
    margin-bottom: 1rem;
  }
  
  .detail-section h5 {
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .detail-section p {
    margin-bottom: 0.5rem;
  }
  
  .agent-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .agent-name {
    font-size: 16px;
    font-weight: 500;
  }
  
  .agent-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  
  .skill-tag {
    background-color: #f0f0f0;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    color: #666;
  }
  
  .detail-footer {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #e8e8e8;
  }
  
  .edit-btn,
  .delete-btn,
  .add-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0;
  }
  
  .edit-btn:hover,
  .delete-btn:hover,
  .add-btn:hover {
    color: #f5222d;
  }
  
  .output-content {
    white-space: pre-wrap;
  }
  
  .error-content {
    color: #ff4d4f;
  }
  </style>