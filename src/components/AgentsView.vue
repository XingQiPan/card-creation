<template>
    <div class="agents-view">
      <div class="view-tabs">
        <button 
          @click="activeTab = 'agents'" 
          :class="{ active: activeTab === 'agents' }"
        >
          <i class="fas fa-users"></i> AI团队管理
        </button>
        <button 
          @click="activeTab = 'tasks'" 
          :class="{ active: activeTab === 'tasks' }"
        >
          <i class="fas fa-tasks"></i> 任务执行图
        </button>
      </div>
  
      <!-- AI团队管理视图 -->
      <div v-if="activeTab === 'agents'" class="agents-container">
        <div class="agents-header">
          <h2>AI团队管理</h2>
          <div class="header-actions">
            <button @click="createNewAgent" class="create-btn">
              <i class="fas fa-plus"></i> 新建AI成员
            </button>
          </div>
        </div>
  
        <div class="agents-list">
          <div v-if="agents.length === 0" class="empty-state">
            <p>还没有AI成员，点击"新建AI成员"开始</p>
          </div>
          <div 
            v-for="agent in agents" 
            :key="agent.id"
            class="agent-item"
            @click="editAgent(agent)"
          >
            <div class="agent-name">{{ agent.name }}</div>
            <div class="agent-actions">
              <button @click.stop="deleteAgent(agent)" title="删除">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
  
      <!-- 任务执行图视图 -->
      <div v-if="activeTab === 'tasks'" class="tasks-container">
        <div class="tasks-header">
          <h2>任务执行图</h2>
          <div class="header-actions">
            <button @click="createRootTask" class="create-btn">
              <i class="fas fa-plus"></i> 创建根任务
            </button>
            <button 
              v-if="rootTask" 
              @click="executeAllTasks" 
              class="execute-btn"
              :disabled="isExecuting"
            >
              <i class="fas fa-play"></i> 执行所有任务
            </button>
          </div>
        </div>
  
        <div class="task-tree">
          <task-manager 
            v-if="showTaskManager"
            :agents="agents"
            :scenes="scenes"
            :models="models"
            @save-tasks="handleTasksSaved"
            @execute="executeTask"
          />
          <div v-else class="empty-state">
            <p>还没有任务，点击"创建根任务"开始</p>
          </div>
        </div>
      </div>
  
      <!-- AI成员编辑模态框 -->
      <div class="modal" v-if="showAgentEditor">
        <agent-editor
          :agent="editingAgent"
          :models="models"
          @save="saveAgent"
          @close="showAgentEditor = false"
        />
      </div>
      
      <!-- 任务编辑模态框 -->
      <div class="modal" v-if="showTaskEditor">
        <task-editor
          :task="editingTask"
          :parent-task="parentTask"
          :all-tasks="allTasks"
          :agents="agents"
          :scenes="scenes"
          @save="saveTask"
          @close="showTaskEditor = false"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import TaskManager from './Agent/TaskManager.vue'
  import AgentEditor from './Agent/AgentEditor.vue'
  import TaskEditor from './Agent/TaskEditor.vue'
  
  // 基本状态
  const activeTab = ref('agents')
  const agents = ref([])
  const scenes = ref([])
  const models = ref([])
  const showTaskManager = ref(false)
  const rootTask = ref(null)
  const isExecuting = ref(false)
  
  // 编辑AI成员
  const showAgentEditor = ref(false)
  const editingAgent = ref(null)
  
  // 编辑任务
  const showTaskEditor = ref(false)
  const editingTask = ref(null)
  const parentTask = ref(null)
  const allTasks = computed(() => {
    const tasks = []
    
    const collectTasks = (task) => {
      tasks.push(task)
      if (task.subtasks) {
        task.subtasks.forEach(subtask => collectTasks(subtask))
      }
    }
    
    if (rootTask.value) {
      collectTasks(rootTask.value)
    }
    
    return tasks
  })
  
  // 创建新AI成员
  const createNewAgent = () => {
    editingAgent.value = null
    showAgentEditor.value = true
  }
  
  // 删除AI成员
  const deleteAgent = (agent) => {
    if (confirm(`确定要删除AI成员 "${agent.name}" 吗？`)) {
      const index = agents.value.findIndex(a => a.id === agent.id)
      if (index !== -1) {
        agents.value.splice(index, 1)
        saveAgents()
      }
    }
  }
  
  // 创建根任务
  const createRootTask = () => {
    editingTask.value = null
    parentTask.value = null
    showTaskEditor.value = true
  }
  
  // 保存根任务
  const saveRootTask = () => {
    if (!taskForm.value.title.trim()) {
      alert('任务标题不能为空')
      return
    }
  
    // 创建根任务
    const rootTask = {
      id: Date.now(),
      title: taskForm.value.title.trim(),
      description: taskForm.value.description.trim(),
      status: 'pending',
      subtasks: []
    }
  
    // 保存到本地存储
    localStorage.setItem('agentTasks', JSON.stringify(rootTask))
    
    // 显示任务管理器
    showTaskManager.value = true
    
    // 关闭模态框
    showTaskModal.value = false
  }
  
  // 处理任务保存事件
  const handleTasksSaved = (tasks) => {
    rootTask.value = tasks
    saveTasks()
  }
  
  // 保存AI成员
  const saveAgents = () => {
    try {
      localStorage.setItem('agents', JSON.stringify(agents.value))
    } catch (error) {
      console.error('保存AI成员失败:', error)
    }
  }
  
  // 加载AI成员
  const loadAgents = () => {
    try {
      const savedAgents = localStorage.getItem('agents')
      if (savedAgents) {
        agents.value = JSON.parse(savedAgents)
      }
    } catch (error) {
      console.error('加载AI成员失败:', error)
    }
  }
  
  // 加载场景
  const loadScenes = () => {
    try {
      const savedScenes = localStorage.getItem('scenes')
      if (savedScenes) {
        scenes.value = JSON.parse(savedScenes)
      }
    } catch (error) {
      console.error('加载场景失败:', error)
    }
  }
  
  // 加载模型
  const loadModels = () => {
    try {
      const savedModels = localStorage.getItem('models')
      if (savedModels) {
        models.value = JSON.parse(savedModels)
      } else {
        // 默认模型
        models.value = [
          {
            id: 'default-model',
            name: '默认模型',
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            temperature: 0.7
          }
        ]
      }
    } catch (error) {
      console.error('加载模型失败:', error)
    }
  }
  
  // 加载任务
  const loadTasks = () => {
    try {
      const savedTasks = localStorage.getItem('agentTasks')
      if (savedTasks) {
        rootTask.value = JSON.parse(savedTasks)
        showTaskManager.value = true
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  }
  
  // 组件挂载时
  onMounted(() => {
    console.log('AgentsView组件已挂载')
    loadAgents()
    loadScenes()
    loadModels()
    loadTasks()
  })
  
  // 编辑AI成员
  const editAgent = (agent) => {
    editingAgent.value = { ...agent }
    showAgentEditor.value = true
  }
  
  const saveAgent = (agent) => {
    if (editingAgent.value) {
      // 更新现有AI成员
      const index = agents.value.findIndex(a => a.id === agent.id)
      if (index !== -1) {
        agents.value[index] = agent
      }
    } else {
      // 添加新AI成员
      agents.value.push(agent)
    }
    
    saveAgents()
    showAgentEditor.value = false
  }
  
  // 编辑任务
  const editTask = (task) => {
    editingTask.value = { ...task }
    showTaskEditor.value = true
  }
  
  const createSubtask = (parent) => {
    editingTask.value = null
    parentTask.value = parent
    showTaskEditor.value = true
  }
  
  const saveTask = (task) => {
    if (editingTask.value) {
      // 更新现有任务
      const updateTask = (tasks, updatedTask) => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].id === updatedTask.id) {
            tasks[i] = { ...tasks[i], ...updatedTask }
            return true
          }
          if (tasks[i].subtasks) {
            if (updateTask(tasks[i].subtasks, updatedTask)) {
              return true
            }
          }
        }
        return false
      }
      
      if (rootTask.value) {
        if (rootTask.value.id === task.id) {
          rootTask.value = { ...rootTask.value, ...task }
        } else {
          updateTask([rootTask.value], task)
        }
      }
    } else if (parentTask.value) {
      // 添加子任务
      if (!parentTask.value.subtasks) {
        parentTask.value.subtasks = []
      }
      parentTask.value.subtasks.push(task)
    } else {
      // 添加根任务
      rootTask.value = task
    }
    
    saveTasks()
    showTaskEditor.value = false
  }
  
  // 执行单个任务
  const executeTask = async (task) => {
    if (isExecuting.value) return
    
    isExecuting.value = true
    
    try {
      // 查找任务
      const findTask = (tasks, taskId) => {
        for (const t of tasks) {
          if (t.id === taskId) {
            return t
          }
          if (t.subtasks) {
            const found = findTask(t.subtasks, taskId)
            if (found) return found
          }
        }
        return null
      }
      
      const targetTask = findTask([rootTask.value], task.id)
      if (!targetTask) {
        throw new Error('任务未找到')
      }
      
      // 更新任务状态
      targetTask.status = 'executing'
      saveTasks()
      
      // 查找执行者
      const agent = targetTask.assignedTo 
        ? agents.value.find(a => a.id === targetTask.assignedTo)
        : null
      
      if (!agent) {
        throw new Error('未指定执行者')
      }
      
      // 构建上下文
      let context = ''
      
      // 添加父任务上下文
      if (targetTask.includeParentContext) {
        const findParent = (tasks, taskId, parent = null) => {
          for (const t of tasks) {
            if (t.id === taskId) {
              return parent
            }
            if (t.subtasks) {
              const found = findParent(t.subtasks, taskId, t)
              if (found) return found
            }
          }
          return null
        }
        
        const parentTask = findParent([rootTask.value], targetTask.id)
        if (parentTask && parentTask.output) {
          context += `父任务输出:\n${parentTask.output}\n\n`
        }
      }
      
      // 添加相关任务上下文
      if (targetTask.includeRelatedContext && targetTask.relatedTaskId) {
        const relatedTask = findTask([rootTask.value], targetTask.relatedTaskId)
        if (relatedTask && relatedTask.output) {
          context += `相关任务输出:\n${relatedTask.output}\n\n`
        }
      }
      
      // 构建提示词
      const prompt = targetTask.customPrompt || `请完成以下任务:\n${targetTask.title}\n\n${targetTask.description}`
      
      // 模拟API调用
      console.log(`执行任务: ${targetTask.title}`)
      console.log(`执行者: ${agent.name}`)
      console.log(`上下文: ${context}`)
      console.log(`提示词: ${prompt}`)
      
      // 这里应该是实际的API调用
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 模拟结果
      targetTask.output = `任务 "${targetTask.title}" 已由 ${agent.name} 完成。\n这里是任务输出内容。`
      targetTask.status = 'completed'
      
      saveTasks()
    } catch (error) {
      console.error('执行任务失败:', error)
      alert(`执行任务失败: ${error.message}`)
    } finally {
      isExecuting.value = false
    }
  }
  
  // 执行所有任务
  const executeAllTasks = async () => {
    if (isExecuting.value || !rootTask.value) return
    
    isExecuting.value = true
    
    try {
      // 递归执行任务
      const executeTasksRecursively = async (task) => {
        // 先执行当前任务
        if (task.status !== 'completed') {
          task.status = 'executing'
          saveTasks()
          
          // 查找执行者
          const agent = task.assignedTo 
            ? agents.value.find(a => a.id === task.assignedTo)
            : null
          
          if (agent) {
            // 构建上下文和提示词
            const prompt = task.customPrompt || `请完成以下任务:\n${task.title}\n\n${task.description}`
            
            // 模拟API调用
            console.log(`执行任务: ${task.title}`)
            console.log(`执行者: ${agent.name}`)
            
            // 这里应该是实际的API调用
            // 模拟异步操作
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // 模拟结果
            task.output = `任务 "${task.title}" 已由 ${agent.name} 完成。\n这里是任务输出内容。`
            task.status = 'completed'
            saveTasks()
          } else {
            task.status = 'pending'
            task.error = '未指定执行者'
            saveTasks()
          }
        }
        
        // 然后执行子任务
        if (task.subtasks && task.subtasks.length > 0) {
          for (const subtask of task.subtasks) {
            await executeTasksRecursively(subtask)
          }
        }
      }
      
      await executeTasksRecursively(rootTask.value)
      
      alert('所有任务执行完成')
    } catch (error) {
      console.error('执行任务失败:', error)
      alert(`执行任务失败: ${error.message}`)
    } finally {
      isExecuting.value = false
    }
  }
  
  // 保存任务
  const saveTasks = () => {
    try {
      if (rootTask.value) {
        localStorage.setItem('agentTasks', JSON.stringify(rootTask.value))
      }
    } catch (error) {
      console.error('保存任务失败:', error)
    }
  }
  </script>
  
  <style scoped>
  .agents-view {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .view-tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #e8e8e8;
    padding-bottom: 0.5rem;
  }
  
  .view-tabs button {
    background: none;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 1rem;
    color: #666;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 2px solid transparent;
  }
  
  .view-tabs button.active {
    color: #1890ff;
    border-bottom-color: #1890ff;
  }
  
  .agents-container, .tasks-container {
    flex: 1;
    overflow-y: auto;
    background-color: #f9f9f9;
    border-radius: 4px;
    padding: 20px;
  }
  
  .agents-header, .tasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .header-actions {
    display: flex;
    gap: 10px;
  }
  
  .create-btn {
    background-color: #1890ff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .execute-btn {
    background-color: #52c41a;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .execute-btn:disabled {
    background-color: #d9d9d9;
    cursor: not-allowed;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #999;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .agents-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .agent-item {
    background-color: white;
    padding: 15px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }
  
  .agent-item:hover {
    background-color: #f0f0f0;
  }
  
  .agent-actions {
    display: flex;
    gap: 8px;
  }
  
  .agent-actions button {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
  }
  
  .agent-actions button:hover {
    color: #ff4d4f;
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
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 500px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid #e8e8e8;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #999;
  }
  
  .save-btn {
    background-color: #1890ff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .cancel-btn {
    background-color: white;
    color: #666;
    border: 1px solid #d9d9d9;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .task-tree {
    height: calc(100% - 60px);
    overflow-y: auto;
  }
  </style>
  