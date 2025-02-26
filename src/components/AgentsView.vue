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
  
  // 定义props
  const props = defineProps({
    models: {
      type: Array,
      default: () => []
    },
    scenes: {
      type: Array,
      default: () => []
    }
  })
  
  // 基本状态
  const activeTab = ref('agents')
  const agents = ref([])
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
      if (task) {
        tasks.push(task)
        if (task.subtasks) {
          task.subtasks.forEach(subtask => collectTasks(subtask))
        }
      }
    }
    
    if (rootTask.value) {
      collectTasks(rootTask.value)
    }
    
    return tasks
  })
  
  // 创建新AI成员
  const createNewAgent = () => {
    editingAgent.value = {
      id: Date.now().toString(),
      name: '',
      description: '',
      modelId: '',
      systemPrompt: '',
      capabilities: []
    }
    showAgentEditor.value = true
  }
  
  // 编辑AI成员
  const editAgent = (agent) => {
    editingAgent.value = { ...agent }
    showAgentEditor.value = true
  }
  
  // 保存AI成员
  const saveAgent = (agent) => {
    const index = agents.value.findIndex(a => a.id === agent.id)
    if (index !== -1) {
      agents.value[index] = agent
    } else {
      agents.value.push(agent)
    }
    saveAgents()
    showAgentEditor.value = false
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
  
  // 保存AI成员到本地存储
  const saveAgents = () => {
    localStorage.setItem('agents', JSON.stringify(agents.value))
  }
  
  // 创建根任务
  const createRootTask = () => {
    editingTask.value = null
    parentTask.value = null
    showTaskEditor.value = true
  }
  
  // 保存任务
  const saveTask = (task) => {
    if (parentTask.value) {
      // 保存子任务
      if (!parentTask.value.subtasks) {
        parentTask.value.subtasks = []
      }
      
      const index = parentTask.value.subtasks.findIndex(t => t.id === task.id)
      if (index !== -1) {
        parentTask.value.subtasks[index] = task
      } else {
        parentTask.value.subtasks.push(task)
      }
      
      saveTasks()
    } else {
      // 保存根任务
      rootTask.value = task
      showTaskManager.value = true
      saveTasks()
    }
    
    showTaskEditor.value = false
  }
  
  // 保存任务到本地存储
  const saveTasks = () => {
    localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  }
  
  // 处理任务保存事件
  const handleTasksSaved = (tasks) => {
    rootTask.value = tasks
    saveTasks()
  }
  
  // 执行任务
  const executeTask = async (task) => {
    if (!task) return
    
    // 设置任务状态为运行中
    task.status = 'running'
    saveTasks()
    
    try {
      // 查找指派的AI成员
      const agent = agents.value.find(a => a.id === task.assignedTo)
      if (!agent) {
        throw new Error('未找到指派的AI成员')
      }
      
      // 查找使用的模型
      const model = props.models.find(m => m.id === agent.modelId)
      if (!model) {
        throw new Error('未找到AI成员使用的模型')
      }
      
      // 构建上下文
      let context = ''
      
      // 添加父任务上下文
      if (task.includeParentContext && task.parentId) {
        const parentTask = allTasks.value.find(t => t.id === task.parentId)
        if (parentTask && parentTask.output) {
          context += `父任务输出:\n${parentTask.output}\n\n`
        }
      }
      
      // 添加相关任务上下文
      if (task.includeRelatedContext && task.relatedTaskId) {
        const relatedTask = allTasks.value.find(t => t.id === task.relatedTaskId)
        if (relatedTask && relatedTask.output) {
          context += `相关任务输出:\n${relatedTask.output}\n\n`
        }
      }
      
      // 添加场景内容
      if (task.sceneId) {
        const scene = props.scenes.find(s => s.id === task.sceneId)
        if (scene) {
          context += `场景内容:\n`
          scene.cards.forEach(card => {
            context += `标题: ${card.title}\n内容: ${card.content}\n\n`
          })
        }
      }
      
      // 构建提示词
      let prompt = agent.systemPrompt || ''
      prompt += `\n\n任务: ${task.title}\n`
      prompt += `任务描述: ${task.description || '无描述'}\n\n`
      
      if (context) {
        prompt += `上下文信息:\n${context}\n`
      }
      
      if (task.customPrompt) {
        prompt += `\n${task.customPrompt}\n`
      }
      
      // 调用API
      const response = await callLLMAPI(model, prompt)
      
      // 更新任务输出
      task.output = response
      task.status = 'completed'
      
      // 如果有指定场景，创建结果卡片
      if (task.sceneId) {
        createResultCard(task)
      }
    } catch (error) {
      console.error('执行任务失败:', error)
      task.status = 'failed'
      task.error = error.message
    }
    
    saveTasks()
  }
  
  // 调用LLM API
  const callLLMAPI = async (model, prompt) => {
    // 根据不同的模型提供商调用不同的API
    if (model.provider === 'openai') {
      const response = await fetch(`${model.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
      }
      
      const data = await response.json()
      return data.choices[0].message.content
    } else {
      throw new Error(`不支持的模型提供商: ${model.provider}`)
    }
  }
  
  // 创建结果卡片
  const createResultCard = (task) => {
    const scene = props.scenes.find(s => s.id === task.sceneId)
    if (!scene) return
    
    // 创建新卡片
    const newCard = {
      id: Date.now().toString(),
      title: `任务结果: ${task.title}`,
      content: task.output,
      height: '200px',
      tags: []
    }
    
    // 添加到场景
    scene.cards.push(newCard)
    
    // 保存场景
    localStorage.setItem('scenes', JSON.stringify(props.scenes))
  }
  
  // 执行所有任务
  const executeAllTasks = async () => {
    if (!rootTask.value || isExecuting.value) return
    
    isExecuting.value = true
    
    try {
      await executeTaskAndSubtasks(rootTask.value)
    } catch (error) {
      console.error('执行所有任务失败:', error)
    } finally {
      isExecuting.value = false
    }
  }
  
  // 递归执行任务及其子任务
  const executeTaskAndSubtasks = async (task) => {
    // 执行当前任务
    await executeTask(task)
    
    // 执行子任务
    if (task.subtasks && task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        await executeTaskAndSubtasks(subtask)
      }
    }
  }
  
  // 加载数据
  onMounted(() => {
    try {
      // 加载AI成员
      const savedAgents = localStorage.getItem('agents')
      if (savedAgents) {
        agents.value = JSON.parse(savedAgents)
      }
      
      // 加载任务
      const savedRootTask = localStorage.getItem('rootTask')
      if (savedRootTask) {
        rootTask.value = JSON.parse(savedRootTask)
        showTaskManager.value = true
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  })
  </script>
  
  <style scoped>
  .agents-view {
    padding: 20px;
    background-color: #f0f0f0;
    min-height: 100vh;
    color: #333;
  }
  
  h1 {
    color: #1890ff;
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
  