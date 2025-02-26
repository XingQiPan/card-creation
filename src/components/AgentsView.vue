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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import TaskManager from './Agent/TaskManager.vue'
import AgentEditor from './Agent/AgentEditor.vue'
import TaskEditor from './Agent/TaskEditor.vue'

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

const formatApiUrl = (model) => {
  switch (model.provider) {
    case 'openai':
      return `${model.apiUrl.replace(/\/+$/, '')}/chat/completions`
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`
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
  //console.log('调用AI模型:', model.name, '提示词长度:', prompt.length)
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
        console.log('url:', url)
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
  console.log('收到执行所有任务请求，任务数量:', allTasks.length)
  
  // 打印所有任务的ID和标题，便于调试
  allTasks.forEach((task, index) => {
    console.log(`任务 ${index+1}: ID=${task.id}, 标题=${task.title}`)
    if (task.subtasks && task.subtasks.length > 0) {
      console.log(`- 包含 ${task.subtasks.length} 个子任务:`)
      task.subtasks.forEach(subtask => {
        console.log(`  - ${subtask.title} (${subtask.id})`)
      })
    }
  })
  
  executeAllTasks(allTasks)
}

// 执行所有任务
const executeAllTasks = async (allTasks) => {
  console.log('开始执行所有任务，共', allTasks.length, '个任务')
  
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
      console.log(`执行任务 ${i+1}/${allTasks.length}:`, task.title, task.id)
      
      // 执行任务
      await executeTask(task)
      
      // 检查任务是否成功完成
      if (task.status === 'completed') {
        // 查找下一个任务
        const nextTask = allTasks[i + 1]
        if (nextTask) {
          console.log('当前任务完成，准备执行下一个任务:', nextTask.title)
          
          // 如果下一个任务需要包含父任务上下文，将当前任务的输出传递给它
          if (nextTask.includeParentContext) {
            console.log('下一个任务需要父任务上下文，传递当前任务输出')
            nextTask._parentOutput = task.output
          }
        }
      } else {
        console.warn('当前任务未完成，状态:', task.status)
      }
      
      // 保存状态
      localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
      
      // 给UI一点时间更新
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // 清除批量执行标记和临时数据
    allTasks.forEach(task => {
      delete task._isPartOfBatch
      delete task._parentOutput
    })
    
    console.log('所有任务执行完成')
  } catch (error) {
    console.error('执行所有任务失败:', error)
    
    // 清除批量执行标记和临时数据
    allTasks.forEach(task => {
      delete task._isPartOfBatch
      delete task._parentOutput
    })
  } finally {
    isExecuting.value = false
  }
}

// 执行单个任务
const executeTask = async (task) => {
  console.log('执行任务:', task.title, task)
  
  if (isExecuting.value && !task._isPartOfBatch) {
    console.warn('已有任务正在执行，请等待完成')
    return
  }
  
  // 如果不是批量执行的一部分，设置执行状态
  if (!task._isPartOfBatch) {
    isExecuting.value = true
  }
  
  task.status = 'running'
  task.error = null
  task.output = null
  
  try {
    // 查找指定的AI成员
    const agent = agents.value.find(a => a.id === task.assignedTo)
    
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
    prompt += `任务: ${task.title}\n`
    prompt += `描述: ${task.description || ''}\n\n`
    
    // 添加场景卡片内容
    if (task.readSceneCard && task.sourceSceneId) {
      const targetScene = props.scenes.find(s => s.id === task.sourceSceneId)
      
      if (targetScene && targetScene.cards && targetScene.cards.length > 0) {
        // 从任务描述和标题中提取关键词
        const searchText = (task.title + ' ' + (task.description || '')).toLowerCase()
        
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
          console.log('找到匹配的卡片:', matchedCards.length, '个')
        }
      }
    }
    
    // 如果有格式要求，添加到提示词中
    if (task.responseFormat === 'json') {
      prompt += `请以JSON格式返回结果，格式如下:\n{"content": "", "isComplete": true}\n其中content字段包含你的回答内容(不需要json格式)，isComplete字段表示任务是否完成。\n\n请注意：直接返回JSON对象，不要使用Markdown代码块包装，确保JSON格式正确且不包含特殊控制字符，只需要这两个字段！！！\n\n`
    }
    
    // 添加父任务上下文
    if (task.includeParentContext) {
      // 首先检查是否有临时存储的父任务输出
      if (task._parentOutput) {
        prompt += `父任务输出:\n${task._parentOutput}\n\n`
      } else {
        // 如果没有临时存储的输出，则查找父任务
        const parent = findParentTask(task.id)
        if (parent && parent.output) {
          prompt += `父任务输出:\n${parent.output}\n\n`
        }
      }
    }
    
    console.log('发送提示词:', prompt)
    
    // 调用API
    const content = await callAI(model, prompt)
    console.log('API返回结果:', content)
    
    // 解析响应
    let finalContent = ''
    let isComplete = false
    
    if (task.responseFormat === 'json') {
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
    
    // 更新任务状态
    task.output = finalContent
    task.status = isComplete ? 'completed' : 'pending'
    
    // 如果任务完成且需要生成场景卡片
    if (task.status === 'completed' && task.generateSceneCard && task.targetSceneId) {
      const targetScene = props.scenes.find(s => s.id === task.targetSceneId)
      
      if (targetScene) {
        const newCard = {
          id: Date.now().toString(),
          title: task.addCardPrefix ? 
            `${(targetScene.cards || []).length + 1}. ${task.title}` : 
            task.title,
          content: finalContent, // 使用处理后的内容
          tags: [],
          timestamp: new Date().toISOString()
        }
        
        // 发出更新场景事件
        emit('update-scene', {
          ...targetScene,
          cards: [...(targetScene.cards || []), newCard]
        })
        
        console.log('已生成场景卡片:', newCard)
      }
    }
    
    // 任务执行完成后，打印状态和输出
    console.log('任务执行完成:', {
      id: task.id,
      title: task.title,
      status: task.status,
      output: finalContent ? finalContent.substring(0, 100) + '...' : null
    })
  } catch (error) {
    console.error('执行任务失败:', error)
    task.status = 'failed'
    task.error = error.message
  } finally {
    // 如果不是批量执行的一部分，重置执行状态
    if (!task._isPartOfBatch) {
      isExecuting.value = false
    }
    
    // 保存到本地存储
    localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
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

// 查找父任务
const findParentTask = (taskId) => {
  if (!rootTask.value) return null
  
  // 递归查找父任务
  const findParent = (task, id) => {
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        if (subtask.id === id) {
          return task
        }
        
        const parent = findParent(subtask, id)
        if (parent) {
          return parent
        }
      }
    }
    
    return null
  }
  
  return findParent(rootTask.value, taskId)
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

// 根据ID查找任务
const findTaskById = (taskId) => {
  if (!rootTask.value) return null
  
  const findTask = (task, id) => {
    if (task.id === id) return task
    
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        const found = findTask(subtask, id)
        if (found) return found
      }
    }
    
    return null
  }
  
  return findTask(rootTask.value, taskId)
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