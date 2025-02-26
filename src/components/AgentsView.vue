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
          <div class="agent-info">
            <div class="agent-name">{{ agent.name }}</div>
            <div class="agent-description">{{ agent.description }}</div>
            <div class="agent-skills">
              <span v-for="(skill, index) in agent.skills" :key="index" class="skill-tag">
                {{ skill }}
              </span>
            </div>
          </div>
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
        </div>
      </div>

      <div class="task-tree">
        <task-manager 
          v-if="showTaskManager"
          :root-task="rootTask"
          :agents="agents"
          :scenes="scenes"
          :models="models"
          @save-tasks="handleTasksSaved"
          @execute="executeTask"
          @delete-task="deleteTask"
          @add-subtask="addSubtask"
          @edit-task="editTask"
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
import { v4 as uuidv4 } from 'uuid'
import TaskManager from './Agent/TaskManager.vue'
import AgentEditor from './Agent/AgentEditor.vue'
import TaskEditor from './Agent/TaskEditor.vue'

// 定义属性
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

// 计算所有任务的列表（用于任务编辑器中的相关任务选择）
const allTasks = computed(() => {
  if (!rootTask.value) return []
  
  const tasks = []
  
  const collectTasks = (task) => {
    tasks.push(task)
    if (task.subtasks) {
      task.subtasks.forEach(subtask => collectTasks(subtask))
    }
  }
  
  collectTasks(rootTask.value)
  return tasks
})

// 创建新的AI成员
const createNewAgent = () => {
  editingAgent.value = {
    id: uuidv4(),
    name: '',
    description: '',
    skills: [],
    systemPrompt: '',
    modelId: '',
    temperature: 0.7
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
  
  localStorage.setItem('agents', JSON.stringify(agents.value))
  showAgentEditor.value = false
}

// 删除AI成员
const deleteAgent = (agent) => {
  if (confirm(`确定要删除 ${agent.name} 吗？`)) {
    agents.value = agents.value.filter(a => a.id !== agent.id)
    localStorage.setItem('agents', JSON.stringify(agents.value))
  }
}

// 创建根任务
const createRootTask = () => {
  rootTask.value = {
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
  }
  
  showTaskManager.value = true
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  
  // 打开任务编辑器
  editTask(rootTask.value)
}

// 添加子任务
const addSubtask = (parentTaskObj) => {
  console.log('AgentsView: 添加子任务到:', parentTaskObj);
  
  // 设置父任务
  parentTask.value = parentTaskObj;
  
  // 创建新任务
  editingTask.value = {
    id: uuidv4(),
    title: '',
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
  
  showTaskEditor.value = true;
};

// 编辑任务
const editTask = (task) => {
  console.log('AgentsView: 编辑任务:', task);
  
  // 查找父任务
  parentTask.value = findParent(task.id);
  console.log('父任务:', parentTask.value);
  
  // 设置编辑任务
  editingTask.value = JSON.parse(JSON.stringify(task)); // 深拷贝以避免引用问题
  
  showTaskEditor.value = true;
};

// 保存任务
const saveTask = (task) => {
  console.log('AgentsView: 保存任务:', task);
  
  // 如果是根任务
  if (!parentTask.value) {
    rootTask.value = task;
  } else {
    // 如果是子任务
    if (!parentTask.value.subtasks) {
      parentTask.value.subtasks = [];
    }
    
    // 查找是否已存在
    const index = parentTask.value.subtasks.findIndex(t => t.id === task.id);
    
    if (index !== -1) {
      // 更新现有任务
      parentTask.value.subtasks[index] = task;
    } else {
      // 添加新任务
      parentTask.value.subtasks.push(task);
    }
  }
  
  // 保存到本地存储
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value));
  
  // 关闭编辑器
  showTaskEditor.value = false;
  
  // 通知任务管理器
  handleTasksSaved(rootTask.value);
};

// 删除任务
const deleteTask = (taskId) => {
  console.log('AgentsView: 删除任务:', taskId);
  
  // 如果是根任务
  if (rootTask.value && rootTask.value.id === taskId) {
    rootTask.value = null;
    showTaskManager.value = false;
    localStorage.removeItem('rootTask');
    return;
  }
  
  // 查找父任务
  const parent = findParent(taskId);
  
  if (parent && parent.subtasks) {
    // 从父任务中移除
    parent.subtasks = parent.subtasks.filter(t => t.id !== taskId);
    
    // 保存到本地存储
    localStorage.setItem('rootTask', JSON.stringify(rootTask.value));
  }
};

// 处理任务保存
const handleTasksSaved = (savedRootTask) => {
  console.log('AgentsView: 处理任务保存:', savedRootTask);
  rootTask.value = savedRootTask;
  showTaskManager.value = true;
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value));
};

// 执行任务
const executeTask = async (task) => {
  console.log('执行任务:', task)
  
  if (isExecuting.value) {
    alert('已有任务正在执行，请等待完成')
    return
  }
  
  if (!task.assignedTo) {
    alert('请先指派任务给AI成员')
    return
  }
  
  try {
    isExecuting.value = true
    task.status = 'running'
    
    // 查找指派的AI成员
    const agent = agents.value.find(a => a.id === task.assignedTo)
    
    if (!agent) {
      throw new Error('找不到指派的AI成员')
    }
    
    // 查找模型
    const model = props.models.find(m => m.id === agent.modelId)
    
    if (!model) {
      throw new Error('找不到AI成员使用的模型')
    }
    
    // 构建提示词
    let prompt = agent.systemPrompt + '\n\n'
    
    // 添加任务描述
    prompt += `任务: ${task.title}\n${task.description}\n\n`
    
    // 添加父任务上下文
    if (task.includeParentContext) {
      const parent = findParent(task.id)
      if (parent && parent.output) {
        prompt += `父任务输出:\n${parent.output}\n\n`
      }
    }
    
    // 添加相关任务上下文
    if (task.includeRelatedContext && task.relatedTaskId) {
      const relatedTask = allTasks.value.find(t => t.id === task.relatedTaskId)
      if (relatedTask && relatedTask.output) {
        prompt += `相关任务输出:\n${relatedTask.output}\n\n`
      }
    }
    
    // 添加场景上下文
    if (task.includeSceneContext && task.sceneId) {
      const scene = props.scenes.find(s => s.id === task.sceneId)
      if (scene) {
        const sceneContent = scene.cards.map(card => `${card.title}: ${card.content}`).join('\n\n')
        prompt += `场景内容:\n${sceneContent}\n\n`
      }
    }
    
    // 添加响应格式要求
    prompt += `请以JSON格式返回结果，包含以下字段：
{
  "content": "你的回答内容",
  "isComplete": true/false (任务是否完成)
}
`
    
    // 调用API
    let response
    
    if (model.provider === 'openai') {
      response = await fetch(`${model.apiUrl}/v1/chat/completions`, {
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
              content: agent.systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: Number(agent.temperature)
        })
      })
    } else if (model.provider === 'gemini') {
      response = await fetch(`${model.apiUrl}/v1/models/${model.modelId}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': model.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: Number(agent.temperature)
          }
        })
      })
    } else {
      throw new Error('不支持的模型提供商')
    }
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `请求失败: ${response.status}`)
    }
    
    const result = await response.json()
    
    let content
    
    if (model.provider === 'openai') {
      content = result.choices[0].message.content
    } else if (model.provider === 'gemini') {
      content = result.candidates[0].content.parts[0].text
    }
    
    // 解析JSON响应
    try {
      const jsonResponse = JSON.parse(content)
      task.output = jsonResponse.content
      
      // 检查任务是否完成
      if (!jsonResponse.isComplete) {
        task.status = 'pending'
        throw new Error('任务未完成，需要重新执行')
      }
      
      // 如果有场景ID，创建结果卡片
      if (task.sceneId && jsonResponse.content) {
        const scene = props.scenes.find(s => s.id === task.sceneId)
        
        if (scene) {
          // 创建新卡片
          const newCard = {
            id: uuidv4(),
            title: `${task.title} - 结果`,
            content: jsonResponse.content,
            tags: []
          }
          
          // 添加到场景
          scene.cards.push(newCard)
        }
      }
      
      task.status = 'completed'
    } catch (error) {
      // 如果不是有效的JSON，直接使用内容
      task.output = content
      task.status = 'completed'
    }
  } catch (error) {
    console.error('执行任务失败:', error)
    task.status = 'failed'
    task.error = error.message
  } finally {
    isExecuting.value = false
    localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  }
}

// 查找父任务
const findParent = (taskId) => {
  if (!rootTask.value) return null
  
  // 如果是根任务，返回null
  if (rootTask.value.id === taskId) return null
  
  const findParentTask = (task, id) => {
    if (!task.subtasks) return null
    
    // 检查直接子任务
    const directChild = task.subtasks.find(t => t.id === id)
    if (directChild) return task
    
    // 递归检查更深层级的子任务
    for (const subtask of task.subtasks) {
      const parent = findParentTask(subtask, id)
      if (parent) return parent
    }
    
    return null
  }
  
  return findParentTask(rootTask.value, taskId)
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
    
    console.log('已加载AI成员:', agents.value)
    console.log('已加载根任务:', rootTask.value)
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})
</script>

<style scoped>
.agents-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.view-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.view-tabs button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
}

.view-tabs button.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
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

.create-btn, .execute-btn {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.execute-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.agents-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.agent-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 5px;
}

.agent-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
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

.agent-actions {
  display: flex;
  gap: 5px;
}

.agent-actions button {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 5px;
}

.agent-actions button:hover {
  color: #f5222d;
}

.empty-state {
  padding: 40px;
  text-align: center;
  background-color: #f9f9f9;
  border-radius: 4px;
  color: #999;
}

.modal {
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

.task-tree {
  background-color: white;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}
</style>