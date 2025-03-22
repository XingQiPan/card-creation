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
              style="display: none;"
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
  
      <div class="task-content">
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
            @edit-output="handleEditOutput"
          />
        </div>
  
      
      </div>
  
      <div class="task-settings" v-if="showSettings">
        <div class="settings-header">
          <h4>任务执行设置</h4>
          <button @click="closeSettings" class="close-btn">&times;</button>
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
    'add-card-to-scene',
    'edit-output'
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
    
    
    // 打印所有收集到的任务，便于调试
    allTasks.forEach((task, index) => {
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
    showSettings.value = !showSettings.value;
  };
  
  const saveSettings = () => {
    localStorage.setItem('taskSettings', JSON.stringify(settings.value));
    showSettings.value = false;
  };
  
  const selectTask = (taskId) => {
    selectedTaskId.value = taskId;
  };
  
  const handleAddSubtask = (parentTask) => {
    emit('add-subtask', parentTask);
  };
  
  const handleEditTask = (task) => {
    emit('edit-task', task);
  };
  
  const handleDeleteTask = (taskId) => {
    emit('delete-task', taskId);
  };
  
  const handleEditOutput = (task) => {
    emit('edit-output', task);
  };
  
  const closeSettings = () => {
    showSettings.value = false
  }
  
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
  /* 基础变量 */
  :root {
    --primary-color: #1890ff;
    --success-color: #52c41a;
    --warning-color: #faad14;
    --danger-color: #ff4d4f;
    --border-radius: 8px;
    --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .task-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f5f5f5;
    padding: 20px;
  }

  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    background: white;
    padding: 16px 20px;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
  }

  .task-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
    font-weight: 500;
  }

  .task-actions {
    display: flex;
    gap: 12px;
  }

  .task-content {
    display: flex;
    gap: 20px;
    flex: 1;
    min-height: 0;
  }

  .task-map {
    flex: 1;
    background: white;
    border-radius: var(--border-radius);
    padding: 20px;
    overflow: auto;
    box-shadow: var(--box-shadow);
  }

  .task-detail {
    width: 400px;
    background: white;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }

  .detail-header {
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border-radius: 12px 12px 0 0;
  }

  .detail-header h4 {
    margin: 0;
    font-size: 18px;
    color: #1f1f1f;
    font-weight: 600;
  }

  .detail-body {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }

  .detail-section {
    margin-bottom: 24px;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .agent-info {
    background: #fafafa;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
  }

  .agent-name {
    font-weight: 500;
    margin-bottom: 12px;
    color: #1f1f1f;
  }

  .agent-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .skill-tag {
    background: #e6f7ff;
    color: #1890ff;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 13px;
  }

  .output-content {
    background: #fafafa;
    padding: 16px;
    border-radius: 8px;
    white-space: pre-wrap;
    font-family: monospace;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #f0f0f0;
    font-size: 14px;
    line-height: 1.6;
    color: #1f1f1f;
  }

  .error-content {
    background: #fff2f0;
    color: #ff4d4f;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #ffccc7;
    font-size: 14px;
    line-height: 1.6;
  }

  .detail-footer {
    padding: 20px 24px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: #fff;
    border-radius: 0 0 12px 12px;
  }

  /* 按钮样式统一 */
  button {
    padding: 9px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .execute-btn {
    background: #1890ff;
    border: 1px solid #1890ff;
    color: white;
  }

  .execute-btn:hover:not(:disabled) {
    background: #40a9ff;
    border-color: #40a9ff;
  }

  .edit-btn {
    background: #52c41a;
    border: 1px solid #52c41a;
    color: white;
  }

  .edit-btn:hover {
    background: #73d13d;
    border-color: #73d13d;
  }

  .delete-btn {
    background: #ff4d4f;
    border: 1px solid #ff4d4f;
    color: white;
  }

  .delete-btn:hover {
    background: #ff7875;
    border-color: #ff7875;
  }

  .add-btn {
    background: #faad14;
    border: 1px solid #faad14;
    color: white;
  }

  .add-btn:hover {
    background: #ffc53d;
    border-color: #ffc53d;
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #f5f5f5;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #bbb;
  }

  /* 任务设置面板 */
  .task-settings {
    position: absolute;
    left: 20px;
    top: 60px;
    width: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
  }

  .settings-header h4 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: #999;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #666;
    background-color: #f0f0f0;
    border-radius: 4px;
  }

  .settings-body {
    padding: 16px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  select {
    width: 100%;
    padding: 8px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
  }

  textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
    resize: vertical;
    min-height: 80px;
  }

  .settings-footer {
    padding: 12px 16px;
    border-top: 1px solid #e8e8e8;
    display: flex;
    justify-content: flex-end;
  }

  .save-btn {
    padding: 6px 16px;
    background-color: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
  }

  .save-btn:hover {
    background-color: #40a9ff;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .task-settings {
      position: fixed;
      right: 10px;
      left: 10px;
      width: auto;
      max-width: 400px;
      margin: 0 auto;
    }
  }
  </style>