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
            @click="showSettings = !showSettings" 
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
          @execute="executeTask"
          @add-subtask="showAddSubtaskModal"
          @edit="showEditTaskModal"
          @delete="deleteTask"
          @assign="openAssignModal"
          @select="selectTask"
        />
      </div>
  
      <div class="task-settings" v-if="showSettings">
        <h3>任务设置</h3>
        <div class="form-group">
          <label>默认任务分拆提示词</label>
          <textarea v-model="taskSettings.subtaskPrompt" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>默认任务执行提示词</label>
          <textarea v-model="taskSettings.executePrompt" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>默认任务总结提示词</label>
          <textarea v-model="taskSettings.summaryPrompt" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>默认输出重写提示词</label>
          <textarea v-model="taskSettings.rewritePrompt" rows="4"></textarea>
        </div>
        <div class="form-actions">
          <button @click="saveSettings" class="save-btn">保存设置</button>
          <button @click="showSettings = false" class="cancel-btn">取消</button>
        </div>
      </div>
  
      <!-- 任务表单模态框 -->
      <div class="modal task-modal" v-if="showTaskModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editingTask ? '编辑任务' : '创建任务' }}</h3>
            <button @click="closeTaskModal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>任务标题</label>
              <input v-model="taskForm.title" placeholder="输入任务标题">
              <small>使用@成员名::场景名可直接指派任务</small>
            </div>
            <div class="form-group">
              <label>任务描述</label>
              <textarea 
                v-model="taskForm.description" 
                placeholder="描述任务目标和要求"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label>相关任务</label>
              <select v-model="taskForm.relatedTaskId">
                <option value="">无相关任务</option>
                <option 
                  v-for="task in allTasks" 
                  :key="task.id" 
                  :value="task.id"
                  v-if="task.id !== taskForm.id"
                >
                  {{ task.title }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>相关场景</label>
              <select v-model="taskForm.relatedSceneId">
                <option value="">无相关场景</option>
                <option 
                  v-for="scene in scenes" 
                  :key="scene.id" 
                  :value="scene.id"
                >
                  {{ scene.name }}
                </option>
              </select>
            </div>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="taskForm.includeParentContext"
                >
                包含父任务输出作为上下文
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="saveTask" class="save-btn">保存任务</button>
            <button @click="closeTaskModal" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
  
      <!-- 分配任务模态框 -->
      <div class="modal assign-modal" v-if="showAssignModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>分配任务</h3>
            <button @click="showAssignModal = false" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>选择AI成员</label>
              <select v-model="assignForm.agentId">
                <option value="">请选择AI成员</option>
                <option 
                  v-for="agent in agents" 
                  :key="agent.id" 
                  :value="agent.id"
                >
                  {{ agent.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>选择场景</label>
              <select v-model="assignForm.sceneId">
                <option value="">请选择场景</option>
                <option 
                  v-for="scene in scenes" 
                  :key="scene.id" 
                  :value="scene.id"
                >
                  {{ scene.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="assignTask" class="save-btn">分配任务</button>
            <button @click="showAssignModal = false" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import TaskNode from './TaskNode.vue';
  
  const props = defineProps({
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
    }
  });
  
  const emit = defineEmits(['save-tasks']);
  
  // 状态
  const rootTask = ref(null);
  const selectedTaskId = ref(null);
  const isExecuting = ref(false);
  const showTaskModal = ref(false);
  const showAssignModal = ref(false);
  const showSettings = ref(false);
  const editingTask = ref(null);
  const assigningTask = ref(null);
  const parentTaskId = ref(null);
  
  // 表单
  const taskForm = ref({
    id: '',
    title: '',
    description: '',
    relatedTaskId: '',
    relatedSceneId: '',
    includeParentContext: true
  });
  
  const assignForm = ref({
    agentId: '',
    sceneId: ''
  });
  
  const taskSettings = ref({
    subtaskPrompt: '请将以下任务分解为多个子任务，每个子任务应该是独立的、可执行的步骤：\n\n任务：{task}\n\n输出格式：\n1. 子任务1标题\n2. 子任务2标题\n...',
    executePrompt: '你是一个专业的{agent}，现在需要完成以下任务：\n\n任务：{task}\n\n{context}\n\n请提供详细的解决方案。',
    summaryPrompt: '请总结以下内容的要点：\n\n{content}\n\n请用简洁的语言提炼出核心信息。',
    rewritePrompt: '请重写以下内容，使其更加清晰、专业：\n\n{content}'
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
    
    if (rootTask.value) {
      collectTasks(rootTask.value);
    }
    
    return tasks;
  });
  
  // 方法
  const createRootTask = () => {
    showTaskModal.value = true;
    editingTask.value = null;
    parentTaskId.value = null;
    taskForm.value = {
      id: '',
      title: '',
      description: '',
      relatedTaskId: '',
      relatedSceneId: '',
      includeParentContext: true
    };
  };
  
  const showAddSubtaskModal = (parentTask) => {
    showTaskModal.value = true;
    editingTask.value = null;
    parentTaskId.value = parentTask.id;
    taskForm.value = {
      id: '',
      title: '',
      description: '',
      relatedTaskId: '',
      relatedSceneId: '',
      includeParentContext: true
    };
  };
  
  const showEditTaskModal = (task) => {
    showTaskModal.value = true;
    editingTask.value = task;
    parentTaskId.value = task.parentId;
    taskForm.value = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      relatedTaskId: task.relatedTaskId || '',
      relatedSceneId: task.relatedSceneId || '',
      includeParentContext: task.includeParentContext !== false
    };
  };
  
  const closeTaskModal = () => {
    showTaskModal.value = false;
    editingTask.value = null;
    parentTaskId.value = null;
  };
  
  const saveTask = () => {
    if (!taskForm.value.title.trim()) {
      alert('任务标题不能为空');
      return;
    }
    
    // 解析@成员::场景语法
    const titleMatch = taskForm.value.title.match(/@([^:]+)::([^:]+)/);
    let assignedTo = '';
    let sceneId = '';
    
    if (titleMatch) {
      const agentName = titleMatch[1].trim();
      const sceneName = titleMatch[2].trim();
      
      // 查找匹配的成员和场景
      const agent = props.agents.find(a => a.name === agentName);
      const scene = props.scenes.find(s => s.name === sceneName);
      
      if (agent) assignedTo = agent.id;
      if (scene) sceneId = scene.id;
      
      // 移除语法标记
      taskForm.value.title = taskForm.value.title.replace(/@([^:]+)::([^:]+)/, '').trim();
    }
    
    if (editingTask.value) {
      // 更新现有任务
      editingTask.value.title = taskForm.value.title;
      editingTask.value.description = taskForm.value.description;
      editingTask.value.relatedTaskId = taskForm.value.relatedTaskId;
      editingTask.value.relatedSceneId = taskForm.value.relatedSceneId;
      editingTask.value.includeParentContext = taskForm.value.includeParentContext;
      
      if (assignedTo) editingTask.value.assignedTo = assignedTo;
      if (sceneId) editingTask.value.sceneId = sceneId;
    } else {
      // 创建新任务
      const newTask = {
        id: uuidv4(),
        title: taskForm.value.title,
        description: taskForm.value.description,
        status: 'pending',
        relatedTaskId: taskForm.value.relatedTaskId,
        relatedSceneId: taskForm.value.relatedSceneId,
        includeParentContext: taskForm.value.includeParentContext,
        subtasks: [],
        createdAt: new Date().toISOString()
      };
      
      if (assignedTo) newTask.assignedTo = assignedTo;
      if (sceneId) newTask.sceneId = sceneId;
      
      if (parentTaskId.value) {
        // 添加子任务
        newTask.parentId = parentTaskId.value;
        addTaskToParent(newTask);
      } else {
        // 设置为根任务
        rootTask.value = newTask;
      }
    }
    
    saveTasks();
    closeTaskModal();
  };
  
  const addTaskToParent = (task) => {
    const findParent = (tasks, parentId) => {
      for (const t of tasks) {
        if (t.id === parentId) {
          if (!t.subtasks) t.subtasks = [];
          t.subtasks.push(task);
          return true;
        }
        if (t.subtasks && findParent(t.subtasks, parentId)) {
          return true;
        }
      }
      return false;
    };
    
    if (rootTask.value) {
      findParent([rootTask.value], task.parentId);
    }
  };
  
  const deleteTask = (task) => {
    if (!confirm(`确定要删除任务"${task.title}"吗？`)) return;
    
    if (task.id === rootTask.value?.id) {
      rootTask.value = null;
    } else {
      const removeTask = (tasks, taskId) => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].subtasks) {
            const index = tasks[i].subtasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
              tasks[i].subtasks.splice(index, 1);
              return true;
            }
            if (removeTask(tasks[i].subtasks, taskId)) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (rootTask.value) {
        removeTask([rootTask.value], task.id);
      }
    }
    
    saveTasks();
  };
  
  const openAssignModal = (task) => {
    assigningTask.value = task;
    assignForm.value = {
      agentId: task.assignedTo || '',
      sceneId: task.sceneId || ''
    };
    showAssignModal.value = true;
  };
  
  const assignTask = () => {
    if (!assigningTask.value) return;
    
    assigningTask.value.assignedTo = assignForm.value.agentId || null;
    assigningTask.value.sceneId = assignForm.value.sceneId || null;
    
    saveTasks();
    showAssignModal.value = false;
  };
  
  const selectTask = (taskId) => {
    selectedTaskId.value = taskId;
  };
  
  const executeTask = async (task) => {
    if (isExecuting.value) return;
    
    // 设置任务状态为执行中
    task.status = 'running';
    task.error = null;
    saveTasks();
    
    try {
      isExecuting.value = true;
      
      // 构建任务上下文
      const context = await buildTaskContext(task);
      
      // 获取分配的AI成员
      const agent = task.assignedTo 
        ? props.agents.find(a => a.id === task.assignedTo)
        : autoAssignAgent(task);
      
      if (!agent) {
        throw new Error('没有可用的AI成员执行此任务');
      }
      
      // 构建提示词
      const prompt = buildPrompt(task, agent, context);
      
      // 调用AI API
      const response = await callAI(prompt, agent);
      
      // 更新任务状态和输出
      task.output = response;
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      saveTasks();
    } catch (error) {
      console.error('执行任务失败:', error);
      task.status = 'failed';
      task.error = error.message;
    } finally {
      isExecuting.value = false;
    }
  };
  
  const executeAllTasks = async () => {
    if (!rootTask.value || isExecuting.value) return;
    
    try {
      isExecuting.value = true;
      
      // 先执行根任务
      if (rootTask.value.status !== 'completed') {
        await executeTask(rootTask.value);
      }
      
      // 递归执行子任务
      const executeSubtasks = async (tasks) => {
        for (const task of tasks) {
          if (task.status !== 'completed') {
            await executeTask(task);
          }
          if (task.subtasks && task.subtasks.length) {
            await executeSubtasks(task.subtasks);
          }
        }
      };
      
      if (rootTask.value.subtasks && rootTask.value.subtasks.length) {
        await executeSubtasks(rootTask.value.subtasks);
      }
    } catch (error) {
      console.error('执行所有任务失败:', error);
    } finally {
      isExecuting.value = false;
    }
  };
  
  const buildTaskContext = async (task) => {
    let context = '';
    
    // 添加父任务上下文
    if (task.includeParentContext && task.parentId) {
      const parent = findTaskById(task.parentId);
      if (parent && parent.output) {
        context += `父任务输出:\n${parent.output}\n\n`;
      }
    }
    
    // 添加相关任务上下文
    if (task.relatedTaskId) {
      const relatedTask = findTaskById(task.relatedTaskId);
      if (relatedTask && relatedTask.output) {
        context += `相关任务输出:\n${relatedTask.output}\n\n`;
      }
    }
    
    // 添加场景上下文
    if (task.relatedSceneId) {
      const scene = props.scenes.find(s => s.id === task.relatedSceneId);
      if (scene && scene.description) {
        context += `场景描述:\n${scene.description}\n\n`;
      }
    }
    
    return context;
  };
  
  const findTaskById = (taskId) => {
    return allTasks.value.find(t => t.id === taskId);
  };
  
  const autoAssignAgent = (task) => {
    // 简单实现：随机选择一个AI成员
    if (props.agents.length === 0) return null;
    return props.agents[Math.floor(Math.random() * props.agents.length)];
  };
  
  const buildPrompt = (task, agent, context) => {
    let prompt = taskSettings.value.executePrompt
      .replace('{agent}', agent.name)
      .replace('{task}', `${task.title}\n${task.description || ''}`)
    
    if (context) {
      prompt = prompt.replace('{context}', `上下文信息:\n${context}`);
    } else {
      prompt = prompt.replace('{context}', '');
    }
    
    return prompt;
  };
  
  const callAI = async (prompt, agent) => {
    try {
      // 这里应该调用实际的AI API
      console.log('调用AI API:', { prompt, agent });
      
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(`这是AI的回复：\n\n我已完成任务"${prompt.split('\n')[0]}"。\n\n这里是详细的解决方案...`);
        }, 1000);
      });
    } catch (error) {
      console.error('调用AI API失败:', error);
      throw new Error('调用AI服务失败');
    }
  };
  
  const exportTasks = () => {
    try {
      const data = JSON.stringify(rootTask.value, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出任务失败:', error);
      alert('导出任务失败');
    }
  };
  
  const importTasks = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        rootTask.value = data;
        saveTasks();
      } catch (error) {
        console.error('导入任务失败:', error);
        alert('导入任务失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    
    // 重置文件输入
    event.target.value = null;
  };
  
  const saveSettings = () => {
    localStorage.setItem('taskSettings', JSON.stringify(taskSettings.value));
    showSettings.value = false;
  };
  
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('taskSettings');
      if (saved) {
        taskSettings.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };
  
  const saveTasks = () => {
    try {
      localStorage.setItem('tasks', JSON.stringify(rootTask.value));
      emit('save-tasks', rootTask.value);
      return true;
    } catch (error) {
      console.error('保存任务失败:', error);
      return false;
    }
  };
  
  const loadTasks = () => {
    try {
      const saved = localStorage.getItem('tasks');
      if (saved) {
        rootTask.value = JSON.parse(saved);
      }
      return true;
    } catch (error) {
      console.error('加载任务失败:', error);
      return false;
    }
  };
  
  // 生命周期钩子
  onMounted(() => {
    loadSettings();
    loadTasks();
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
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
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
  </style>