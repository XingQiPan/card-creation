<template>
  <div class="agents-view">
    <div class="view-tabs">
      <button 
        :class="{ active: activeTab === 'agents' }"
        @click="activeTab = 'agents'"
      >
        AI成员管理
      </button>
      <button 
        :class="{ active: activeTab === 'tasks' }"
        @click="activeTab = 'tasks'"
      >
        任务执行视图
      </button>
    </div>

    <!-- AI团队管理视图 -->
    <div v-if="activeTab === 'agents'" class="agents-container">
      <div class="agents-header">
        <h2>AI团队管理</h2>
        <div class="header-actions">
          <button @click="importPromptAsAgent" class="import-btn">
            <i class="fas fa-download"></i> 从提示词导入
          </button>
          <button @click="addAgent" class="create-btn">
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
        <h3>任务执行视图</h3>
        <div class="header-actions">
          <button @click="createRootTask" class="create-btn" v-if="!rootTask">
            <i class="fas fa-plus"></i> 创建根任务
          </button>
        </div>
      </div>

      <task-manager 
        v-if="showTaskManager"
        :root-task="rootTask"
        :agents="agents"
        :scenes="scenes"
        :models="models"
        :is-executing="isExecuting"
        @save-tasks="handleTasksSaved"
        @execute="executeTask"
        @execute-all="handleExecuteAll"
        @delete-task="deleteTask"
        @add-subtask="addSubtask"
        @edit-task="editTask"
          @edit-output="editTaskOutput"
      />
      
      <div v-else class="empty-state">
        暂无任务，点击"创建根任务"按钮开始创建
      </div>
    </div>

    <!-- AI成员编辑模态框 -->
    <div class="modal" v-if="showAgentEditor">
      <agent-editor
        :agent="editingAgent"
        :models="models"
        :scenes="scenes"
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

    <!-- 任务输出编辑器模态框 -->
    <div class="modal" v-if="showOutputEditor">
      <task-output-editor
        :task="editingTask"
        @save="saveTaskOutput"
        @close="showOutputEditor = false"
      />
    </div>

    <!-- 提示词选择模态框 -->
    <div class="modal" v-if="showPromptSelector">
      <div class="prompt-selector">
        <div class="prompt-selector-header">
          <h3>选择提示词导入为AI成员</h3>
          <button @click="showPromptSelector = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="prompt-search">
          <input 
            type="text" 
            v-model="promptSearchQuery" 
            placeholder="搜索提示词..." 
            @input="filterPrompts"
          />
        </div>
        
        <div class="prompts-list">
          <div v-if="filteredPrompts.length === 0" class="empty-state">
            <p>没有找到匹配的提示词</p>
          </div>
          <div 
            v-for="prompt in filteredPrompts" 
            :key="prompt.id"
            class="prompt-item"
            @click="selectPrompt(prompt)"
          >
            <div class="prompt-info">
              <div class="prompt-title">{{ prompt.title }}</div>
              <div class="prompt-category" v-if="prompt.category">{{ prompt.category }}</div>
              <div class="prompt-tags">
                <span v-for="(tag, index) in prompt.tags" :key="index" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import TaskManager from './Agent/TaskManager.vue'
import AgentEditor from './Agent/AgentEditor.vue'
import TaskEditor from './Agent/TaskEditor.vue'
import TaskOutputEditor from './Agent/TaskOutputEditor.vue'
import { showToast } from '../utils/common'

const props = defineProps({
  models: {
    type: Array,
    required: true
  },
  scenes: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update-scene'])

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

// 添加状态
const showOutputEditor = ref(false)

// 提示词导入相关状态
const showPromptSelector = ref(false)
const prompts = ref([])
const promptSearchQuery = ref('')
const filteredPrompts = ref([])

// 修改 AI 成员相关的方法
const loadAgents = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/agents')
    if (!response.ok) {
      throw new Error(`加载AI成员失败: ${response.status}`)
    }
    
    const result = await response.json()
    if (result.success && Array.isArray(result.data)) {
      agents.value = result.data
    } else {
      throw new Error('加载AI成员返回格式不正确')
    }
  } catch (error) {
    console.error('加载AI成员失败:', error)
    showToast('加载AI成员失败: ' + error.message, 'error')
    agents.value = [] // 设置为空数组
  }
}

// 添加新AI成员
const addAgent = () => {
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
const saveAgent = async (agent) => {
  try {
    // 直接使用API端点保存AI成员
    const response = await fetch('http://localhost:3000/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agent)
    })
    
    if (!response.ok) {
      throw new Error(`保存AI成员失败: ${response.status}`)
    }
    
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '保存AI成员失败')
    }
    
    // 更新本地数组
    const index = agents.value.findIndex(a => a.id === agent.id)
    if (index !== -1) {
      agents.value[index] = agent
    } else {
      agents.value.push(agent)
    }
    
    showAgentEditor.value = false
    showToast('AI成员保存成功', 'success')
  } catch (error) {
    console.error('保存AI成员失败:', error)
    showToast('保存AI成员失败: ' + error.message, 'error')
  }
}

// 删除AI成员
const deleteAgent = async (agent) => {
  if (confirm(`确定要删除 ${agent.name} 吗？`)) {
    try {
      // 直接使用API端点删除AI成员
      const response = await fetch(`http://localhost:3000/api/agents/${agent.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`删除AI成员失败: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '删除AI成员失败')
      }
      
      // 更新本地数组
      agents.value = agents.value.filter(a => a.id !== agent.id)
      showToast('AI成员删除成功', 'success')
    } catch (error) {
      console.error('删除AI成员失败:', error)
      showToast('删除AI成员失败: ' + error.message, 'error')
    }
  }
}

// 修改任务相关的方法
const loadTasks = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/tasks')
    if (!response.ok) {
      throw new Error(`加载任务失败: ${response.status}`)
    }
    
    const result = await response.json()
    if (result.success && result.data) {
      rootTask.value = result.data
      showTaskManager.value = rootTask.value !== null
    } else {
      rootTask.value = null
      showTaskManager.value = false
    }
  } catch (error) {
    console.error('加载任务失败:', error)
    showToast('加载任务失败: ' + error.message, 'error')
    rootTask.value = null
    showTaskManager.value = false
  }
}

// 保存任务
const saveTasks = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rootTask.value)
    })
    
    if (!response.ok) {
      throw new Error(`保存任务失败: ${response.status}`)
    }
    
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || '保存任务失败')
    }
    
  } catch (error) {
    console.error('保存任务失败:', error)
    showToast('保存任务失败: ' + error.message, 'error')
  }
}

// 创建根任务
const createRootTask = async () => {
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
  await saveTasks()
  
  // 打开任务编辑器
  editTask(rootTask.value)
}

// 添加子任务
const addSubtask = (parentTaskObj) => {
  
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
  
  // 查找父任务
  parentTask.value = findParent(task.id);
  
  // 设置编辑任务
  editingTask.value = JSON.parse(JSON.stringify(task)); // 深拷贝以避免引用问题
  
  showTaskEditor.value = true;
};

// 保存任务
const saveTask = async (task) => {
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
  
  // 保存到后端
  await saveTasks();
  
  // 关闭编辑器
  showTaskEditor.value = false;
  
  // 通知任务管理器
  handleTasksSaved(rootTask.value);
};

// 删除任务
const deleteTask = async (taskId) => {
  // 如果是根任务
  if (rootTask.value && rootTask.value.id === taskId) {
    try {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`删除根任务失败: ${response.status}`)
      }
      
      rootTask.value = null;
      showTaskManager.value = false;
      showToast('根任务删除成功', 'success')
      return;
    } catch (error) {
      console.error('删除根任务失败:', error)
      showToast('删除根任务失败: ' + error.message, 'error')
      return;
    }
  }
  
  // 查找父任务
  const parent = findParent(taskId);
  
  if (parent && parent.subtasks) {
    // 从父任务中移除
    parent.subtasks = parent.subtasks.filter(t => t.id !== taskId);
    
    // 保存到后端
    await saveTasks();
  }
};

// 处理任务保存
const handleTasksSaved = async (savedRootTask) => {
  rootTask.value = savedRootTask;
  showTaskManager.value = true;
  await saveTasks();
};

const formatApiUrl = (model) => {
  switch (model.provider) {
    case 'openai':
      return `${model.apiUrl.replace(/\/+$/, '')}/chat/completions`
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent`
    case 'ollama':
      return 'http://localhost:11434/api/chat'
    case 'custom':
      return model.apiUrl // 自定义API使用完整URL
    default:
      return model.apiUrl
  }
}

// 调用AI模型API - 参考ChatView组件的实现
const callAI = async (model, prompt) => {
  let modelUrl = formatApiUrl(model)
  try {
    const apiUrl = model.apiUrl || ''
    let url = ''
    let body = {}
    let headers = {
      'Content-Type': 'application/json'
    }

    // 根据不同的提供商构建请求
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
        url = `${apiUrl.replace(/\/+$/, '')}/chat/completions`
        headers['Authorization'] = `Bearer ${model.apiKey}`
        body = {
          model: model.modelId,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: Number(model.maxTokens) || 2048,
          temperature: Number(model.temperature) || 0.7
        }
        break
      case 'gemini':
        url = `${modelUrl}?key=${model.apiKey}`
        body = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: Number(model.maxTokens) || 2048,
            temperature: Number(model.temperature) || 0.7
          }
        }
        break
      case 'custom':
        url = apiUrl
        headers['Authorization'] = `Bearer ${model.apiKey}`
        body = {
          model: model.modelId,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: Number(model.maxTokens) || 2048,
          temperature: Number(model.temperature) || 0.7
        }
        break
      default:
        throw new Error(`不支持的模型提供商: ${model.provider}`)
    }

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      let errorMessage = `请求失败: ${response.status}`
      
      // 尝试解析错误信息
      const errorData = await response.json().catch(() => ({}))
      console.error('错误响应数据:', errorData)
      
      if (errorData) {
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        } else if (errorData.error?.code) {
          errorMessage = `服务器错误 (${errorData.error.code})`
        }
      }
      
      // 特别处理 Gemini API 认证错误
      if (model.provider === 'gemini' && response.status === 403) {
        errorMessage = "Gemini API 认证失败 (403)。请检查您的 API 密钥是否正确，并确保它有权访问 Gemini API。"
      }
      
      throw new Error(`API错误: ${errorMessage}`)
    }

    const result = await response.json()
    
    // 解析不同提供商的响应
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
      case 'custom':
        return result.choices[0].message.content
      case 'gemini':
        if (result.candidates && result.candidates.length > 0) {
          const candidate = result.candidates[0]
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text
          }
        }
        throw new Error('无法解析 Gemini 响应')
    }
  } catch (error) {
    console.error('调用AI API失败:', error)
    throw new Error(`调用AI失败: ${error.message}`)
  }
}

// 处理来自TaskManager的执行所有任务请求
const handleExecuteAll = (allTasks) => {
  executeAllTasks(allTasks)
}

// 执行所有任务
const executeAllTasks = async (allTasks) => {
  if (!allTasks || allTasks.length === 0) {
    console.warn('没有任务可执行')
    return
  }
  
  isExecuting.value = true
  
  try {
    // 标记所有任务为批量执行的一部分
    allTasks.forEach(task => {
      task._isPartOfBatch = true
      // 重置任务状态，确保重新执行
      task.status = 'pending'
      task.output = null
      task.error = null
    })
    
    // 按顺序执行所有任务
    for (let i = 0; i < allTasks.length; i++) {
      const task = allTasks[i]
      // 执行任务
      await executeTask(task)
      
      // 检查任务是否成功完成
      if (task.status === 'completed') {
        // 查找下一个任务
        const nextTask = allTasks[i + 1]
        if (nextTask) {
          
          // 如果下一个任务需要包含父任务上下文，将当前任务的输出传递给它
          if (nextTask.includeParentContext) {
            nextTask._parentOutput = task.output
          }
        }
      } else {
        console.warn('当前任务未完成，状态:', task.status)
      }
      
      // 保存状态
      await saveTasks()
      
      // 给UI一点时间更新
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // 清除批量执行标记和临时数据
    allTasks.forEach(task => {
      delete task._isPartOfBatch
      delete task._parentOutput
    })
    
    await saveTasks()
  } catch (error) {
    console.error('执行所有任务失败:', error)
    
    // 清除批量执行标记和临时数据
    allTasks.forEach(task => {
      delete task._isPartOfBatch
      delete task._parentOutput
    })
    
    await saveTasks()
  } finally {
    isExecuting.value = false
  }
}

// 执行单个任务
const executeTask = async (task) => {
  
  if (isExecuting.value && !task._isPartOfBatch) {
    console.warn('已有任务正在执行，请等待完成')
    return
  }
  
  // 如果不是批量执行的一部分，设置执行状态
  if (!task._isPartOfBatch) {
    isExecuting.value = true
  }
  
  // 确保我们使用的是正确的任务对象
  const currentTask = findTaskById(task.id)
  if (!currentTask) {
    throw new Error('未找到指定的任务')
  }
  
  currentTask.status = 'running'
  currentTask.error = null
  currentTask.output = null
  
  try {
    // 查找指定的AI成员
    const agent = agents.value.find(a => a.id === currentTask.assignedTo)
    
    if (!agent) {
      throw new Error('未找到指定的AI成员')
    }
    
    // 查找指定的模型
    const model = props.models.find(m => m.id === agent.modelId)
    
    if (!model) {
      throw new Error('未找到指定的模型')
    }
    
    // 构建提示词
    let prompt = agent.systemPrompt + '\n\n'
    
    // 添加任务描述
    prompt += `任务: ${currentTask.title}\n`
    prompt += `描述: ${currentTask.description || ''}\n\n`
    
    // 添加父任务上下文 - 修改这部分逻辑
    const parentTask = findParent(currentTask.id)
    if (parentTask) {
      prompt += `父任务信息:\n标题: ${parentTask.title}\n描述: ${parentTask.description || ''}\n`
      if (parentTask.output) {
        prompt += `父任务输出:\n${parentTask.output}\n\n`
      }
    }
    
    // 添加关联任务上下文
    if (currentTask.includeRelatedContext && currentTask.relatedTaskId) {
      const relatedTask = findTaskById(currentTask.relatedTaskId)
      if (relatedTask && relatedTask.output) {
        prompt += `关联任务信息:\n标题: ${relatedTask.title}\n输出: ${relatedTask.output}\n\n`
      }
    }
    
    // 添加场景卡片内容
    if (currentTask.readSceneCard && currentTask.sourceSceneId) {
      const targetScene = props.scenes.find(s => s.id === currentTask.sourceSceneId)
      
      if (targetScene && targetScene.cards && targetScene.cards.length > 0) {
        // 从任务描述和标题中提取关键词
        const searchText = (currentTask.title + ' ' + (currentTask.description || '')).toLowerCase()
        
        // 查找匹配的卡片
        const matchedCards = targetScene.cards.filter(card => {
          const cardTitle = card.title.toLowerCase()
          // 检查卡片标题是否包含在任务描述或标题中
          return searchText.includes(cardTitle) || 
                 // 或者任务描述/标题中的词是否出现在卡片标题中
                 searchText.split(/\s+/).some(word => 
                   word.length > 1 && cardTitle.includes(word)
                 )
        })
        
        if (matchedCards.length > 0) {
          prompt += '相关场景卡片内容:\n\n'
          matchedCards.forEach(card => {
            prompt += `【${card.title}】\n${card.content}\n\n`
          })
        }
      }
    }
    
    // 如果有格式要求，添加到提示词中
    if (currentTask.responseFormat === 'json') {
      prompt += `请以JSON格式返回结果，格式如下:\n{"content": "", "isComplete": true}\n其中content字段包含你的回答内容(不需要json格式)，isComplete字段表示任务是否完成。\n\n请注意：直接返回JSON对象，不要使用Markdown代码块包装，确保JSON格式正确且不包含特殊控制字符，只需要这两个字段！！！\n\n`
    }
    
    
    // 调用API
    const content = await callAI(model, prompt)
    
    // 解析响应
    let finalContent = ''
    let isComplete = false
    
    if (currentTask.responseFormat === 'json') {
      try {
        const jsonResponse = parseJsonResponse(content)
        finalContent = jsonResponse.content
        isComplete = jsonResponse.isComplete
      } catch (error) {
        console.error('解析JSON响应失败:', error)
        finalContent = content
        isComplete = true
      }
    } else {
      finalContent = content
      isComplete = true
    }
    
    // 更新正确的任务对象
    currentTask.output = finalContent
    currentTask.status = isComplete ? 'completed' : 'pending'
    
    // 如果任务完成且需要生成场景卡片
    if (currentTask.status === 'completed' && currentTask.generateSceneCard && currentTask.targetSceneId) {
      const targetScene = props.scenes.find(s => s.id === currentTask.targetSceneId)
      
      if (targetScene) {
        const newCard = {
          id: Date.now().toString(),
          title: currentTask.addCardPrefix ? 
            `${(targetScene.cards || []).length + 1}. ${currentTask.title}` : 
            currentTask.title,
          content: finalContent, // 使用处理后的内容
          tags: [],
          timestamp: new Date().toISOString()
        }
        
        // 发出更新场景事件
        emit('update-scene', {
          ...targetScene,
          cards: [...(targetScene.cards || []), newCard]
        })
        
      }
    }
    
    // 保存到后端
    await saveTasks()
  } catch (error) {
    console.error('执行任务失败:', error)
    currentTask.status = 'failed'
    currentTask.error = error.message
    
    // 保存到后端
    await saveTasks()
  } finally {
    // 如果不是批量执行的一部分，重置执行状态
    if (!task._isPartOfBatch) {
      isExecuting.value = false
    }
  }
}

// 辅助函数：解析JSON响应
const parseJsonResponse = (content) => {
  let jsonContent = content
  
  // 检查是否包含Markdown代码块
  const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
  const match = content.match(jsonBlockRegex)
  
  if (match && match[1]) {
    jsonContent = match[1]
  }
  
  try {
    return JSON.parse(jsonContent)
  } catch (parseError) {
    console.warn('JSON直接解析失败，尝试使用正则提取:', parseError)
    
    const contentMatch = jsonContent.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"isComplete"\s*:\s*(true|false)/i)
    
    if (contentMatch) {
      return {
        content: contentMatch[1],
        isComplete: contentMatch[2].toLowerCase() === 'true'
      }
    }
    
    throw new Error('无法解析JSON响应')
  }
}

// 优化 findParent 函数
const findParent = (taskId) => {
  if (!rootTask.value) return null
  
  const findParentRecursive = (task, id) => {
    if (!task.subtasks) return null
    
    // 直接在子任务中查找
    for (const subtask of task.subtasks) {
      if (subtask.id === id) {
        return task
      }
    }
    
    // 在子任务的子任务中递归查找
    for (const subtask of task.subtasks) {
      const parent = findParentRecursive(subtask, id)
      if (parent) {
        return parent
      }
    }
    
    return null
  }
  
  return findParentRecursive(rootTask.value, taskId)
}

// 优化 findTaskById 函数
const findTaskById = (taskId) => {
  if (!rootTask.value) return null
  
  const findTaskRecursive = (task, id) => {
    if (task.id === id) return task
    
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        const found = findTaskRecursive(subtask, id)
        if (found) return found
      }
    }
    
    return null
  }
  
  return findTaskRecursive(rootTask.value, taskId)
}

// 加载数据
onMounted(async () => {
  try {
    // 加载AI成员
    await loadAgents()
    
    // 加载任务
    await loadTasks()
    
  } catch (error) {
    console.error('加载数据失败:', error)
    showToast('加载数据失败: ' + error.message, 'error')
  }
})

// 修改编辑任务输出方法
const editTaskOutput = (task) => {
  // 设置当前编辑的任务
  editingTask.value = findTaskById(task.id)
  
  // 显示编辑器
  showOutputEditor.value = true
}

// 保存任务输出
const saveTaskOutput = async (updatedTask) => {
  
  // 查找正确的任务对象
  const currentTask = findTaskById(updatedTask.id)
  if (currentTask) {
    // 更新输出
    currentTask.output = updatedTask.output
    
    // 保存到后端
    await saveTasks()
    
    // 关闭编辑器
    showOutputEditor.value = false
    
    // 显示成功提示
    showToast('任务输出已更新', 'success')
  }
}

// 加载提示词
const loadPrompts = async () => {
  try {
    // 使用正确的内置提示词API端点
    const response = await fetch('http://localhost:3000/api/built-in-prompts')
    if (!response.ok) {
      throw new Error(`加载提示词失败: ${response.status}`)
    }
    
    const result = await response.json()
    
    // 服务器返回的格式是 { success: true, data: [...] }
    if (result.success && Array.isArray(result.data)) {
      prompts.value = result.data
    } else {
      // 尝试加载本地提示词作为备份
      const localResponse = await fetch('http://localhost:3000/api/load-data')
      if (localResponse.ok) {
        const localData = await localResponse.json()
        prompts.value = localData.prompts || []
      } else {
        prompts.value = []
      }
    }
    
    filterPrompts()
  } catch (error) {
    console.error('加载提示词失败:', error)
    showToast('加载提示词失败: ' + error.message, 'error')
    prompts.value = []
  }
}

// 过滤提示词
const filterPrompts = () => {
  if (!promptSearchQuery.value.trim()) {
    filteredPrompts.value = prompts.value
    return
  }
  
  const query = promptSearchQuery.value.toLowerCase()
  filteredPrompts.value = prompts.value.filter(prompt => 
    prompt.title.toLowerCase().includes(query) || 
    (prompt.category && prompt.category.toLowerCase().includes(query)) ||
    (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(query)))
  )
}

// 监听搜索查询变化
watch(promptSearchQuery, filterPrompts)

// 打开提示词导入对话框
const importPromptAsAgent = async () => {
  await loadPrompts()
  showPromptSelector.value = true
}

// 选择提示词并创建AI成员
const selectPrompt = (prompt) => {
  // 创建新的AI成员
  const newAgent = {
    id: uuidv4(),
    name: prompt.title,
    description: `从提示词"${prompt.title}"导入的AI成员`,
    skills: prompt.tags || [],
    systemPrompt: prompt.systemPrompt || '',
    modelId: props.models.length > 0 ? props.models[0].id : '',
    temperature: 0.7
  }
  
  // 关闭提示词选择器
  showPromptSelector.value = false
  
  // 打开编辑器以便用户可以进一步修改
  editingAgent.value = newAgent
  showAgentEditor.value = true
}
</script>

<style scoped>
@import url("../styles/agentsView.css");
</style>