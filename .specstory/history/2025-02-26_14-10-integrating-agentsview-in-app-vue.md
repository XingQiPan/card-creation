## SpecStory

## Integrating AgentsView in App.vue (2025/2/26 14:10:24)

_**User**_

修复显示问题，去除掉App.vue无用代码

---

_**Assistant**_

I'll help you integrate the AgentsView component into your App.vue file. Looking at the code snippets, I can see that you need to import and register the AgentsView component in your main App.vue file.

```vue:src/App.vue
// ... existing code ...
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'
import draggable from 'vuedraggable'
import Scene from './components/Scene.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import BookSplitter from './components/BookSplitter.vue'
import ChatView from './components/ChatView.vue'
import NotePad from './components/NotePad.vue'
import AgentsView from './components/AgentsView.vue'  // Add this import

// 将状态声明移到最前面
const currentView = ref('main') // 添加视图切换状态
const prompts = ref([])
const textCards = ref([])
const selectedCards = ref([])
const selectedPrompt = ref(null)
const showPromptModal = ref(false)
// ... existing code ...
```

This edit adds the import for the AgentsView component. Based on the code snippets you provided, it seems that the AgentsView component is already implemented but just needs to be imported and used in your App.vue file.

Let me know if you need any other changes or have questions about integrating this component!

---

_**User**_

打开anetsview还是空白

---

_**Assistant**_



Let's fix the issue with the AgentsView component showing a blank screen. Based on the code you provided, there might be a few issues to address:

```vue:src/App.vue
<template>
  <div class="container">
    <!-- 当 currentView 为 'agents' 时，显示路由视图 -->
    <router-view v-if="currentView === 'agents'" />
    
    <!-- 其他视图内容 -->
    <div v-else class="content-area">
      <!-- 主要内容区域 -->
      <div v-if="currentView === 'main'" class="main-content">
      <router-view v-if="currentView === 'agents'" />

        <!-- 左侧提示词模板区 -->
        <div class="prompt-panel" :style="{ width: promptPanelWidth + 'px' }">
          <!-- ... existing code ... -->
        </div>

        <!-- ... existing code ... -->
      </div>

      <BookSplitter 
        v-else-if="currentView === 'book'"
        :prompts="prompts"
        :models="models"
        :scenes="scenes"
      />
      <ChatView
        v-else-if="currentView === 'chat'"
        :models="models"
        :scenes="scenes"
        :prompts="prompts"
        @add-cards-to-scene="handleAddCardsToScene"
      />
      <NotePad 
        v-if="currentView === 'note'" 
        :scenes="scenes"
        :initial-content="notepadInitialContent"
        :prompts="prompts"
        :models="models"
      />
      <AgentsView 
        v-else-if="currentView === 'agents'"
        :models="models"
      />
    </div>

    <!-- ... existing code ... -->
  </div>
  <!-- ... existing code ... -->
</template>
```

There are a few issues in your template:

1. You have duplicate `router-view` for agents at the top level and inside the main content
2. The conditional rendering logic might be conflicting

Let me fix these issues:

```vue:src/App.vue
<template>
  <div class="container">
    <!-- 其他视图内容 -->
    <div class="content-area">
      <!-- 主要内容区域 -->
      <div v-if="currentView === 'main'" class="main-content">
        <!-- 左侧提示词模板区 -->
        <div class="prompt-panel" :style="{ width: promptPanelWidth + 'px' }">
          <!-- ... existing code ... -->
        </div>

        <!-- ... existing code ... -->
      </div>

      <BookSplitter 
        v-else-if="currentView === 'book'"
        :prompts="prompts"
        :models="models"
        :scenes="scenes"
      />
      <ChatView
        v-else-if="currentView === 'chat'"
        :models="models"
        :scenes="scenes"
        :prompts="prompts"
        @add-cards-to-scene="handleAddCardsToScene"
      />
      <NotePad 
        v-else-if="currentView === 'note'" 
        :scenes="scenes"
        :initial-content="notepadInitialContent"
        :prompts="prompts"
        :models="models"
      />
      <AgentsView 
        v-else-if="currentView === 'agents'"
        :models="models"
        :scenes="scenes"
      />
    </div>

    <!-- ... existing code ... -->
  </div>
  <!-- ... existing code ... -->
</template>
```

Additionally, make sure you're passing the required props to the AgentsView component. Looking at the AgentsView.vue component, it expects both `models` and `scenes` props:

```javascript
// From AgentsView.vue
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
```

So I've added the `:scenes="scenes"` prop to the AgentsView component in the template.

If you're still seeing a blank screen, check your browser console for any JavaScript errors that might be occurring when the AgentsView component is loaded.

---

_**User**_

打开还是一片空白

---

_**Assistant**_



Let's check for any issues that might be causing the blank screen. Let's look at the console errors and make sure all the required components are properly imported and registered.

```vue:src/components/AgentsView.vue
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
      <!-- ... existing code ... -->
    </div>

    <!-- 任务执行图视图 -->
    <div v-if="activeTab === 'tasks'" class="tasks-container">
      <!-- ... existing code ... -->
    </div>
  </div>
</template>
```

The issue might be related to missing dependencies or component registration. Let's check if all the required components are properly imported and registered in the AgentsView component:

1. Make sure TaskManager, AgentEditor, and TaskEditor are properly imported
2. Check if the activeTab ref is initialized correctly
3. Ensure the component is receiving the required props

Let's add some debugging to help identify the issue:

```vue:src/components/AgentsView.vue
<template>
  <div class="agents-view">
    <h2>Debug Info</h2>
    <p>Active Tab: {{ activeTab }}</p>
    <p>Agents Count: {{ agents.length }}</p>
    <p>Models Count: {{ models.length }}</p>
    <p>Scenes Count: {{ scenes.length }}</p>
    
    <div class="view-tabs">
      <!-- ... existing code ... -->
    </div>
    
    <!-- ... rest of the component ... -->
  </div>
</template>
```

Also, let's check if you have the required dependencies installed. Make sure you have:

1. Font Awesome for the icons
2. UUID for generating unique IDs
3. Vuedraggable for drag-and-drop functionality

If you're still seeing a blank screen, try adding a simple element to verify the component is rendering:

```vue:src/components/AgentsView.vue
<template>
  <div class="agents-view">
    <h1>AI团队管理</h1>
    <!-- Rest of your component -->
  </div>
</template>
```

If this still doesn't work, there might be an issue with how the component is being loaded or with the CSS. Let's try adding some basic styling to make sure the component is visible:

```vue:src/components/AgentsView.vue
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
</style>
```

Let me know if any of these suggestions help identify the issue!

---

_**User**_

不应该啊

---

_**Assistant**_



Let's check what might be causing the blank screen issue with the AgentsView component. Based on the code snippets you've provided, I can see a few potential issues:

1. The AgentsView component might not be properly registered in your Vue application
2. There might be missing dependencies or components
3. There could be CSS issues hiding the content

Let's try a more direct approach:

```vue:src/App.vue
<template>
  <div class="container">
    <div class="sidebar">
      <!-- Navigation buttons -->
      <button 
        @click="currentView = 'main'" 
        :class="{ active: currentView === 'main' }"
        title="主页"
      >
        <i class="fas fa-home"></i>
      </button>
      <button 
        @click="currentView = 'book'" 
        :class="{ active: currentView === 'book' }"
        title="书籍拆解"
      >
        <i class="fas fa-book"></i>
      </button>
      <button 
        @click="currentView = 'chat'" 
        :class="{ active: currentView === 'chat' }"
        title="聊天"
      >
        <i class="fas fa-comment"></i>
      </button>
      <button 
        @click="currentView = 'note'" 
        :class="{ active: currentView === 'note' }"
        title="记事本"
      >
        <i class="fas fa-sticky-note"></i>
      </button>
      <button 
        @click="currentView = 'agents'" 
        :class="{ active: currentView === 'agents' }"
        title="AI团队"
      >
        <i class="fas fa-users"></i>
      </button>
    </div>

    <div class="content-area">
      <!-- 主要内容区域 -->
      <div v-if="currentView === 'main'" class="main-content">
        <!-- ... existing main content ... -->
      </div>

      <BookSplitter 
        v-else-if="currentView === 'book'"
        :prompts="prompts"
        :models="models"
        :scenes="scenes"
      />
      <ChatView
        v-else-if="currentView === 'chat'"
        :models="models"
        :scenes="scenes"
        :prompts="prompts"
        @add-cards-to-scene="handleAddCardsToScene"
      />
      <NotePad 
        v-else-if="currentView === 'note'" 
        :scenes="scenes"
        :initial-content="notepadInitialContent"
        :prompts="prompts"
        :models="models"
      />
      <div v-else-if="currentView === 'agents'" class="agents-wrapper">
        <AgentsView 
          :models="models"
          :scenes="scenes"
        />
      </div>
    </div>
  </div>
</template>
```

And let's add some basic styling to make sure the AgentsView component is visible:

```vue:src/components/AgentsView.vue
<template>
  <div class="agents-view">
    <h1>AI团队管理</h1>
    <h2>Debug Info</h2>
    <p>Active Tab: {{ activeTab }}</p>
    <p>Agents Count: {{ agents.length }}</p>
    <p>Models Count: {{ models.length }}</p>
    <p>Scenes Count: {{ scenes.length }}</p>

    <!-- Rest of your component -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import TaskManager from './Agent/TaskManager.vue'
import AgentEditor from './Agent/AgentEditor.vue'
import TaskEditor from './Agent/TaskEditor.vue'

// Define props
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

// Load agents from localStorage on component mount
onMounted(() => {
  try {
    const savedAgents = localStorage.getItem('agents')
    if (savedAgents) {
      agents.value = JSON.parse(savedAgents)
    }
    console.log('Loaded agents:', agents.value)
  } catch (error) {
    console.error('Failed to load agents:', error)
  }
})
</script>

<style scoped>
.agents-view {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  width: 100%;
}

h1 {
  margin-bottom: 20px;
  color: #333;
}

.debug-info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #e0e0e0;
  border-radius: 4px;
}
</style>
```

This simplified version should help identify if there are issues with the component itself or with how it's being integrated into your application. The debug information will also help identify if the component is receiving the expected props.

---

_**User**_

ai自动摘取卡片内容，只需要你卡片标题弄的好，摘取后根据任务，任务调配到ai成员中，任务可以衔接下一个任务，最后返回内容会自动生成卡片到场景中

---

_**Assistant**_



I understand now - you're trying to implement an AI team management system where AI agents can process card content based on tasks, and then generate new cards in your scenes. Let's fix the AgentsView component to make it work properly.

```vue:src/components/AgentsView.vue
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
}
</style>
```

This implementation provides:

1. AI team management - create, edit, and delete AI agents
2. Task execution flow - create tasks and assign them to AI agents
3. Context management - tasks can include context from parent tasks, related tasks, and scene content
4. Result generation - task outputs can be automatically added as cards to scenes

The component handles:
- Loading and saving agents and tasks to localStorage
- Executing tasks using the assigned AI agent and model
- Creating result cards in the specified scenes
- Managing task dependencies and execution flow

You can now use this component to automatically extract content from cards, process it with AI agents based on tasks, and generate new cards with the results.

---

_**User**_

完善功能，任务无法删除，无法创建更多任务，应该是新建一个任务流程图，然后后面流程图可以建立更多节点，一步步完成，然后我想的是所有任务模块通过ai成员完成，设置触发条件。给你一个例子：
假设我现在新建一个任务，为写小说：
根任务：写小说
大任务拆解：
子任务1：写大纲（AI成员），他需要返回一个json数据，包含两个字段：1：生成大纲内容，2：是否生成完成（只需要写生成完成）若没有生成完成则会重新发送请求。（可以设置是否生成场景卡片）【可以设置是否读取场景卡片，通过卡片标题进行泛搜索】
子任务2：写正文（AI成员），他会接收上一个任务数据，然后生成。他需要返回一个json数据，包含两个字段：1：生成大纲内容，2：是否生成完成（只需要写生成完成）若没有生成完成则会重新发送请求。（可以设置是否生成场景卡片）【可以设置是否读取场景卡片】
子任务3：审核（AI成员），他会接收上一个任务数据，然后生成。他需要返回一个json数据，包含两个字段：1：生成大纲内容，2：分数（若少于多少分则重新请求，程序判断）若没有分数则会重新发送请求。这个分数，是否生成完成需要人输入。
最后再场景返回卡片，执行完任务。

---

_**Assistant**_





I understand your requirements for enhancing the task management functionality. Let's improve the AgentsView component to support:

1. Creating multiple task flow diagrams
2. Better task deletion
3. Task dependencies with conditional execution
4. JSON response format for task completion status
5. Scene card integration (reading from and writing to scenes)

Here's the improved implementation:

```vue:src/components/AgentsView.vue
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
          <button @click="createNewTaskFlow" class="create-btn">
            <i class="fas fa-plus"></i> 创建新任务流程
          </button>
          <button 
            v-if="taskFlows.length > 0" 
            @click="executeSelectedTaskFlow" 
            class="execute-btn"
            :disabled="isExecuting"
          >
            <i class="fas fa-play"></i> 执行当前流程
          </button>
          <button 
            v-if="taskFlows.length > 0" 
            @click="deleteSelectedTaskFlow" 
            class="delete-btn"
          >
            <i class="fas fa-trash"></i> 删除当前流程
          </button>
        </div>
      </div>

      <!-- 任务流程选择器 -->
      <div class="task-flow-selector" v-if="taskFlows.length > 0">
        <select v-model="selectedTaskFlowId">
          <option 
            v-for="flow in taskFlows" 
            :key="flow.id" 
            :value="flow.id"
          >
            {{ flow.name }}
          </option>
        </select>
      </div>

      <div class="task-tree">
        <task-manager 
          v-if="selectedTaskFlow"
          :root-task="selectedTaskFlow.rootTask"
          :agents="agents"
          :scenes="scenes"
          :models="models"
          @save-tasks="handleTasksSaved"
          @execute="executeTask"
          @delete-task="deleteTask"
        />
        <div v-else class="empty-state">
          <p>还没有任务流程，点击"创建新任务流程"开始</p>
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

    <!-- 任务流程创建模态框 -->
    <div class="modal" v-if="showTaskFlowEditor">
      <div class="task-flow-editor">
        <div class="editor-header">
          <h3>{{ editingTaskFlow ? '编辑任务流程' : '创建任务流程' }}</h3>
          <button @click="showTaskFlowEditor = false" class="close-btn">&times;</button>
        </div>
        
        <div class="editor-body">
          <div class="form-group">
            <label>流程名称</label>
            <input v-model="taskFlowForm.name" placeholder="输入任务流程名称">
          </div>
          
          <div class="form-group">
            <label>描述</label>
            <textarea 
              v-model="taskFlowForm.description" 
              placeholder="描述任务流程的目标和用途"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div class="editor-footer">
          <button @click="saveTaskFlow" class="save-btn">保存</button>
          <button @click="showTaskFlowEditor = false" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

// 定义emit
const emit = defineEmits(['add-card-to-scene'])

// 基本状态
const activeTab = ref('agents')
const agents = ref([])
const taskFlows = ref([])
const selectedTaskFlowId = ref('')
const isExecuting = ref(false)

// 编辑AI成员
const showAgentEditor = ref(false)
const editingAgent = ref(null)

// 编辑任务
const showTaskEditor = ref(false)
const editingTask = ref(null)
const parentTask = ref(null)

// 编辑任务流程
const showTaskFlowEditor = ref(false)
const editingTaskFlow = ref(null)
const taskFlowForm = ref({
  id: '',
  name: '',
  description: '',
  rootTask: null
})

// 计算属性
const selectedTaskFlow = computed(() => {
  if (!selectedTaskFlowId.value) return null
  return taskFlows.value.find(flow => flow.id === selectedTaskFlowId.value)
})

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
  
  if (selectedTaskFlow.value?.rootTask) {
    collectTasks(selectedTaskFlow.value.rootTask)
  }
  
  return tasks
})

// 创建新AI成员
const createNewAgent = () => {
  editingAgent.value = {
    id: '',
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
const saveAgent = (agentData) => {
  const index = agents.value.findIndex(a => a.id === agentData.id)
  
  if (index !== -1) {
    // 更新现有成员
    agents.value[index] = agentData
  } else {
    // 添加新成员
    agents.value.push(agentData)
  }
  
  // 保存到本地存储
  localStorage.setItem('agents', JSON.stringify(agents.value))
  
  // 关闭编辑器
  showAgentEditor.value = false
}

// 删除AI成员
const deleteAgent = (agent) => {
  if (confirm(`确定要删除AI成员"${agent.name}"吗？`)) {
    agents.value = agents.value.filter(a => a.id !== agent.id)
    localStorage.setItem('agents', JSON.stringify(agents.value))
  }
}

// 创建新任务流程
const createNewTaskFlow = () => {
  editingTaskFlow.value = null
  taskFlowForm.value = {
    id: '',
    name: '',
    description: '',
    rootTask: null
  }
  showTaskFlowEditor.value = true
}

// 保存任务流程
const saveTaskFlow = () => {
  if (!taskFlowForm.value.name) {
    alert('请输入任务流程名称')
    return
  }
  
  const flowData = { ...taskFlowForm.value }
  
  if (!flowData.id) {
    flowData.id = Date.now().toString()
    flowData.rootTask = {
      id: 'root-' + Date.now(),
      title: flowData.name,
      description: flowData.description,
      status: 'pending',
      subtasks: [],
      assignedTo: '',
      sceneId: '',
      includeParentContext: true,
      includeRelatedContext: false,
      customPrompt: '',
      output: '',
      error: ''
    }
  }
  
  const index = taskFlows.value.findIndex(f => f.id === flowData.id)
  
  if (index !== -1) {
    // 更新现有流程
    taskFlows.value[index] = flowData
  } else {
    // 添加新流程
    taskFlows.value.push(flowData)
  }
  
  // 设置为当前选中的流程
  selectedTaskFlowId.value = flowData.id
  
  // 保存到本地存储
  localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
  
  // 关闭编辑器
  showTaskFlowEditor.value = false
}

// 删除当前任务流程
const deleteSelectedTaskFlow = () => {
  if (!selectedTaskFlow.value) return
  
  if (confirm(`确定要删除任务流程"${selectedTaskFlow.value.name}"吗？`)) {
    taskFlows.value = taskFlows.value.filter(f => f.id !== selectedTaskFlowId.value)
    localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
    
    if (taskFlows.value.length > 0) {
      selectedTaskFlowId.value = taskFlows.value[0].id
    } else {
      selectedTaskFlowId.value = ''
    }
  }
}

// 处理任务保存
const handleTasksSaved = (rootTask) => {
  if (!selectedTaskFlow.value) return
  
  // 更新当前流程的根任务
  const index = taskFlows.value.findIndex(f => f.id === selectedTaskFlowId.value)
  if (index !== -1) {
    taskFlows.value[index].rootTask = rootTask
    localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
  }
}

// 创建任务
const createTask = (parentTaskId = null) => {
  if (!selectedTaskFlow.value) return
  
  parentTask.value = null
  
  if (parentTaskId) {
    // 查找父任务
    const findParentTask = (task, id) => {
      if (task.id === id) return task
      if (task.subtasks) {
        for (const subtask of task.subtasks) {
          const found = findParentTask(subtask, id)
          if (found) return found
        }
      }
      return null
    }
    
    parentTask.value = findParentTask(selectedTaskFlow.value.rootTask, parentTaskId)
  }
  
  editingTask.value = {
    id: '',
    title: '',
    description: '',
    assignedTo: '',
    sceneId: '',
    relatedTaskId: '',
    includeParentContext: true,
    includeRelatedContext: false,
    customPrompt: '',
    status: 'pending',
    output: '',
    error: '',
    subtasks: [],
    readFromScene: false,
    writeToScene: true,
    responseFormat: {
      type: 'json',
      fields: [
        { name: 'content', description: '任务生成的内容' },
        { name: 'completed', description: '任务是否完成 (true/false)' }
      ]
    },
    retryCondition: {
      field: 'completed',
      value: false,
      operator: '=='
    }
  }
  
  showTaskEditor.value = true
}

// 保存任务
const saveTask = (taskData) => {
  if (!selectedTaskFlow.value) return
  
  if (parentTask.value) {
    // 添加子任务
    if (!parentTask.value.subtasks) {
      parentTask.value.subtasks = []
    }
    
    const index = parentTask.value.subtasks.findIndex(t => t.id === taskData.id)
    
    if (index !== -1) {
      // 更新现有任务
      parentTask.value.subtasks[index] = taskData
    } else {
      // 添加新任务
      parentTask.value.subtasks.push(taskData)
    }
  } else {
    // 更新根任务
    if (taskData.id === selectedTaskFlow.value.rootTask.id) {
      selectedTaskFlow.value.rootTask = { ...selectedTaskFlow.value.rootTask, ...taskData }
    }
  }
  
  // 保存到本地存储
  localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
  
  // 关闭编辑器
  showTaskEditor.value = false
}

// 删除任务
const deleteTask = (taskId) => {
  if (!selectedTaskFlow.value) return
  
  const deleteTaskById = (parentTask, id) => {
    if (!parentTask.subtasks) return false
    
    const index = parentTask.subtasks.findIndex(t => t.id === id)
    
    if (index !== -1) {
      parentTask.subtasks.splice(index, 1)
      return true
    }
    
    // 递归查找子任务
    for (const subtask of parentTask.subtasks) {
      if (deleteTaskById(subtask, id)) {
        return true
      }
    }
    
    return false
  }
  
  // 不能删除根任务
  if (taskId === selectedTaskFlow.value.rootTask.id) {
    alert('不能删除根任务')
    return
  }
  
  if (confirm('确定要删除此任务吗？')) {
    deleteTaskById(selectedTaskFlow.value.rootTask, taskId)
    localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
  }
}

// 执行当前任务流程
const executeSelectedTaskFlow = async () => {
  if (!selectedTaskFlow.value || isExecuting.value) return
  
  try {
    isExecuting.value = true
    await executeTaskAndSubtasks(selectedTaskFlow.value.rootTask)
  } catch (error) {
    console.error('执行任务流程失败:', error)
    alert('执行任务流程失败: ' + error.message)
  } finally {
    isExecuting.value = false
  }
}

// 执行单个任务
const executeTask = async (task) => {
  if (!task || task.status === 'running') return
  
  try {
    // 更新任务状态
    task.status = 'running'
    task.output = ''
    task.error = ''
    
    // 保存状态
    localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
    
    // 获取指派的AI成员
    const agent = agents.value.find(a => a.id === task.assignedTo)
    if (!agent) {
      throw new Error('未指派AI成员')
    }
    
    // 获取模型
    const model = props.models.find(m => m.id === agent.modelId)
    if (!model) {
      throw new Error('AI成员未配置模型')
    }
    
    // 构建上下文
    let context = ''
    
    // 添加父任务上下文
    if (task.includeParentContext) {
      const parentTask = findParentTask(task.id)
      if (parentTask && parentTask.output) {
        context += `父任务输出:\n${parentTask.output}\n\n`
      }
    }
    
    // 添加相关任务上下文
    if (task.includeRelatedContext && task.relatedTaskId) {
      const relatedTask = findTaskById(task.relatedTaskId)
      if (relatedTask && relatedTask.output) {
        context += `相关任务输出:\n${relatedTask.output}\n\n`
      }
    }
    
    // 从场景读取内容
    if (task.readFromScene && task.sceneId) {
      const scene = props.scenes.find(s => s.id === task.sceneId)
      if (scene && scene.cards && scene.cards.length > 0) {
        context += `场景内容:\n`
        scene.cards.forEach(card => {
          context += `标题: ${card.title}\n内容: ${card.content}\n---\n`
        })
        context += '\n'
      }
    }
    
    // 构建提示词
    let prompt = task.customPrompt || `执行以下任务: ${task.title}\n${task.description}`
    
    // 添加响应格式要求
    if (task.responseFormat && task.responseFormat.type === 'json') {
      prompt += '\n\n请以JSON格式返回结果，包含以下字段:\n'
      task.responseFormat.fields.forEach(field => {
        prompt += `- ${field.name}: ${field.description}\n`
      })
    }
    
    // 添加上下文
    if (context) {
      prompt = `${prompt}\n\n上下文信息:\n${context}`
    }
    
    // 添加系统提示词
    const systemPrompt = agent.systemPrompt || '你是一个智能AI助手，负责执行用户指派的任务。'
    
    // 调用API
    let response
    let content
    
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: Number(agent.temperature),
          max_tokens: Number(model.maxTokens || 2000)
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
      }
      
      const result = await response.json()
      content = result.choices[0].message.content
    } else if (model.provider === 'gemini') {
      // Gemini API 调用
      response = await fetch(`${model.apiUrl}/v1/models/${model.modelId}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': model.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${systemPrompt}\n\n${prompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: Number(agent.temperature),
            maxOutputTokens: Number(model.maxTokens || 2000)
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
      }
      
      const result = await response.json()
      content = result.candidates[0].content.parts[0].text
    } else if (model.provider === 'mistral') {
      // Mistral API 调用
      response = await fetch(`${model.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: Number(agent.temperature),
          max_tokens: Number(model.maxTokens || 2000)
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
      }
      
      const result = await response.json()
      content = result.choices[0].message.content
    } else {
      throw new Error(`不支持的模型提供商: ${model.provider}`)
    }
    
    if (!content) {
      throw new Error('响应内容为空')
    }
    
    // 更新任务输出
    task.output = content
    
    // 检查是否需要重试
    let shouldRetry = false
    
    if (task.responseFormat && task.responseFormat.type === 'json' && task.retryCondition) {
      try {
        // 尝试解析JSON
        let jsonResponse
        
        // 提取JSON部分
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*?}/)
        
        if (jsonMatch) {
          jsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[0])
        } else {
          jsonResponse = JSON.parse(content)
        }
        
        // 检查重试条件
        const { field, value, operator } = task.retryCondition
        
        if (field in jsonResponse) {
          const fieldValue = jsonResponse[field]
          
          if (operator === '==') {
            shouldRetry = fieldValue === value
          } else if (operator === '!=') {
            shouldRetry = fieldValue !== value
          } else if (operator === '<') {
            shouldRetry = fieldValue < value
          } else if (operator === '>') {
            shouldRetry = fieldValue > value
          } else if (operator === '<=') {
            shouldRetry = fieldValue <= value
          } else if (operator === '>=') {
            shouldRetry = fieldValue >= value
          }
        }
        
        // 写入场景卡片
        if (task.writeToScene && task.sceneId && !shouldRetry) {
          const scene = props.scenes.find(s => s.id === task.sceneId)
          if (scene) {
            // 创建新卡片
            const newCard = {
              id: Date.now() + Math.random(),
              title: `${task.title} - 结果`,
              content: jsonResponse.content || content,
              tags: [],
              height: '200px'
            }
            
            // 添加到场景
            emit('add-card-to-scene', { sceneId: task.sceneId, card: newCard })
          }
        }
      } catch (error) {
        console.error('解析JSON响应失败:', error)
        task.error = `解析响应失败: ${error.message}`
      }
    }
    
    // 更新任务状态
    task.status = shouldRetry ? 'pending' : 'completed'
    
    // 如果需要重试，递归调用
    if (shouldRetry) {
      console.log(`任务 ${task.title} 需要重试`)
      // 延迟1秒后重试
      setTimeout(() => executeTask(task), 1000)
    }
    
    // 保存状态
    localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
    
    return !shouldRetry
  } catch (error) {
    console.error('执行任务失败:', error)
    task.status = 'failed'
    task.error = error.message
    localStorage.setItem('taskFlows', JSON.stringify(taskFlows.value))
    return false
  }
}

// 递归执行任务及其子任务
const executeTaskAndSubtasks = async (task) => {
  // 执行当前任务
  const success = await executeTask(task)
  
  // 如果当前任务执行成功且有子任务，则执行子任务
  if (success && task.subtasks && task.subtasks.length > 0) {
    for (const subtask of task.subtasks) {
      await executeTaskAndSubtasks(subtask)
    }
  }
}

// 查找父任务
const findParentTask = (taskId) => {
  if (!selectedTaskFlow.value) return null
  
  const findParent = (task, id, parent = null) => {
    if (task.id === id) return parent
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        const found = findParent(subtask, id, task)
        if (found) return found
      }
    }
    return null
  }
  
  return findParent(selectedTaskFlow.value.rootTask, taskId)
}

// 根据ID查找任务
const findTaskById = (taskId) => {
  if (!selectedTaskFlow.value) return null
  
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
  
  return findTask(selectedTaskFlow.value.rootTask, taskId)
}

// 监听选中的任务流程变化
watch(selectedTaskFlowId, (newId) => {
  if (newId) {
    localStorage.setItem('selectedTaskFlowId', newId)
  }
})

// 加载数据
onMounted(() => {
  try {
    // 加载AI成员
    const savedAgents = localStorage.getItem('agents')
    if (savedAgents) {
      agents.value = JSON.parse(savedAgents)
    }
    
    // 加载任务流程
    const savedTaskFlows = localStorage.getItem('taskFlows')
    if (savedTaskFlows) {
      taskFlows.value = JSON.parse(savedTaskFlows)
    }
    
    // 加载选中的任务流程
    const savedSelectedTaskFlowId = localStorage.getItem('selectedTaskFlowId')
    if (savedSelectedTaskFlowId && taskFlows.value.some(f => f.id === savedSelectedTaskFlowId)) {
      selectedTaskFlowId.value = savedSelectedTaskFlowId
    } else if (taskFlows.value.length > 0) {
      selectedTaskFlowId.value = taskFlows.value[0].id
    }
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
  display:

---

_**User**_

继续

---

_**Assistant**_



Here's the continuation of the AgentsView component:

```vue:src/components/AgentsView.vue
<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
}

.create-btn, .execute-btn, .delete-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.create-btn {
  background-color: #1890ff;
  color: white;
}

.execute-btn {
  background-color: #52c41a;
  color: white;
}

.execute-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.delete-btn {
  background-color: #ff4d4f;
  color: white;
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

.task-flow-selector {
  margin-bottom: 20px;
}

.task-flow-selector select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.task-tree {
  background-color: white;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.task-flow-editor {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.editor-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.editor-footer {
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
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
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
</style>
```

Now let's update the TaskManager component to support the new functionality:

```vue:src/components/Agent/TaskManager.vue
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
        @add-subtask="addSubtask"
        @edit="editTask"
        @delete="deleteTask"
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
          @click="executeTask(selectedTask)" 
          :disabled="isExecuting"
          class="execute-btn"
        >
          <i class="fas fa-play"></i> 执行任务
        </button>
        <button @click="editTask(selectedTask)" class="edit-btn">
          <i class="fas fa-edit"></i> 编辑任务
        </button>
        <button @click="deleteTask(selectedTask.id)" class="delete-btn">
          <i class="fas fa-trash"></i> 删除任务
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// ... existing imports and props ...

// Add new props
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
  }
});

const emit = defineEmits([
  'save-tasks', 
  'execute', 
  'delete-task', 
  'add-card-to-scene'
]);

// ... rest of the component logic ...
</script>
```

And finally, let's update the TaskNode component to support the new functionality:

```vue:src/components/Agent/TaskNode.vue
<template>
  <div 
    class="task-node"
    :class="{
      'root-node': isRoot,
      'is-selected': isSelected,
      'status-pending': task.status === 'pending',
      'status-running': task.status === 'running',
      'status-completed': task.status === 'completed',
      'status-failed': task.status === 'failed'
    }"
    @click.stop="$emit('select', task.id)"
  >
    <div class="task-header">
      <div class="task-title">
        <span class="status-indicator"></span>
        <h4>{{ task.title }}</h4>
      </div>
      <div class="task-assignee" v-if="assignedAgent">
        <i class="fas fa-user-circle"></i> {{ assignedAgent.name }}
      </div>
    </div>
    
    <div class="task-description" v-if="task.description">
      {{ task.description }}
    </div>
    
    <div class="task-output" v-if="task.output">
      <div class="output-header">
        <h5>任务输出</h5>
        <div class="output-actions">
          <button @click.stop="copyOutput" title="复制输出">
            <i class="fas fa-copy"></i>
          </button>
          <button @click.stop="rewriteOutput" title="重写输出">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button @click.stop="summarizeOutput" title="总结输出">
            <i class="fas fa-compress-alt"></i>
          </button>
        </div>
      </div>
      <div class="output-content">{{ task.output }}</div>
    </div>
    
    <div class="task-error" v-if="task.error">
      <div class="error-header">
        <h5>执行错误</h5>
      </div>
      <div class="error-content">{{ task.error }}</div>
    </div>
    
    <div class="task-actions">
      <button 
        @click.stop="$emit('execute', task)"
        :disabled="task.status === 'running'"
      >
        <i class="fas fa-play"></i> 执行
      </button>
      <button @click.stop="$emit('add-subtask', task)">
        <i class="fas fa-plus"></i> 添加子任务
      </button>
      <button @click.stop="$emit('edit', task)">
        <i class="fas fa-edit"></i> 编辑
      </button>
      <button @click.stop="$emit('delete', task.id)">
        <i class="fas fa-trash"></i> 删除
      </button>
    </div>
    
    <div class="subtasks" v-if="task.subtasks && task.subtasks.length > 0">
      <div class="subtask-list">
        <task-node
          v-for="subtask in task.subtasks"
          :key="subtask.id"
          :task="subtask"
          :agents="agents"
          :scenes="scenes"
          :selected-id="selectedId"
          @execute="$emit('execute', subtask)"
          @add-subtask="$emit('add-subtask', subtask)"
          @edit="$emit('edit', subtask)"
          @delete="$emit('delete', subtask.id)"
          @select="$emit('select', subtask.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
// ... existing imports and props ...

// Add new props and emits
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  agents: {
    type: Array,
    default: () => []
  },
  scenes: {
    type: Array,
    default: () => []
  },
  isRoot: {
    type: Boolean,
    default: false
  },
  selectedId: {
    type: String,
    default: null
  }
});

const emit = defineEmits([
  'execute', 
  'add-subtask', 
  'edit', 
  'delete', 
  'select'
]);

// ... rest of the component logic ...
</script>
```

These updates provide a comprehensive task management system that supports:

1. Multiple task flows with individual root tasks
2. Task deletion and editing
3. JSON response format with completion status
4. Scene card integration for input and output
5. Conditional execution based on task output
6. Task dependencies and sequential execution

The system now allows you to create complex AI workflows like your novel writing example, where tasks can be chained together with conditional logic and scene card integration.

---

_**User**_

添加子任务编辑删除都不能用

---

_**Assistant**_



Let's fix the issues with adding, editing, and deleting subtasks in the AgentsView component. The problem might be related to event handling and task management.

```vue:src/components/AgentsView.vue
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

// Define props
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

// 计算所有任务列表（用于任务编辑器中的相关任务选择）
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

// 创建新AI成员
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
  if (confirm(`确定要删除AI成员"${agent.name}"吗？`)) {
    agents.value = agents.value.filter(a => a.id !== agent.id)
    localStorage.setItem('agents', JSON.stringify(agents.value))
  }
}

// 创建根任务
const createRootTask = () => {
  parentTask.value = null
  editingTask.value = {
    id: uuidv4(),
    title: '根任务',
    description: '',
    assignedTo: '',
    sceneId: '',
    status: 'pending',
    subtasks: [],
    includeParentContext: false,
    includeRelatedContext: false,
    relatedTaskId: '',
    customPrompt: ''
  }
  showTaskEditor.value = true
}

// 添加子任务
const addSubtask = (parentTaskObj) => {
  parentTask.value = parentTaskObj
  editingTask.value = {
    id: uuidv4(),
    title: '',
    description: '',
    assignedTo: '',
    sceneId: '',
    status: 'pending',
    subtasks: [],
    includeParentContext: true,
    includeRelatedContext: false,
    relatedTaskId: '',
    customPrompt: ''
  }
  showTaskEditor.value = true
}

// 编辑任务
const editTask = (task) => {
  // 查找父任务
  const findParent = (root, taskId) => {
    if (!root || !root.subtasks) return null
    
    for (const subtask of root.subtasks) {
      if (subtask.id === taskId) return root
      
      const parent = findParent(subtask, taskId)
      if (parent) return parent
    }
    
    return null
  }
  
  parentTask.value = task.id === rootTask.value.id ? null : findParent(rootTask.value, task.id)
  editingTask.value = { ...task }
  showTaskEditor.value = true
}

// 保存任务
const saveTask = (task) => {
  if (!parentTask.value) {
    // 保存根任务
    rootTask.value = task
    showTaskManager.value = true
  } else {
    // 保存子任务
    const updateSubtasks = (parent, newTask) => {
      if (!parent.subtasks) {
        parent.subtasks = []
      }
      
      const index = parent.subtasks.findIndex(t => t.id === newTask.id)
      
      if (index !== -1) {
        parent.subtasks[index] = newTask
      } else {
        parent.subtasks.push(newTask)
      }
    }
    
    updateSubtasks(parentTask.value, task)
  }
  
  // 保存到本地存储
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  showTaskEditor.value = false
}

// 删除任务
const deleteTask = (taskId) => {
  // 如果是根任务
  if (rootTask.value && rootTask.value.id === taskId) {
    if (confirm('确定要删除根任务及其所有子任务吗？')) {
      rootTask.value = null
      showTaskManager.value = false
      localStorage.removeItem('rootTask')
    }
    return
  }
  
  // 删除子任务
  const removeSubtask = (parent, id) => {
    if (!parent || !parent.subtasks) return false
    
    const index = parent.subtasks.findIndex(t => t.id === id)
    
    if (index !== -1) {
      if (confirm(`确定要删除任务"${parent.subtasks[index].title}"及其所有子任务吗？`)) {
        parent.subtasks.splice(index, 1)
        return true
      }
      return false
    }
    
    for (const subtask of parent.subtasks) {
      if (removeSubtask(subtask, id)) {
        return true
      }
    }
    
    return false
  }
  
  if (rootTask.value && removeSubtask(rootTask.value, taskId)) {
    localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  }
}

// 处理任务保存
const handleTasksSaved = (tasks) => {
  rootTask.value = tasks
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
}

// 执行任务
const executeTask = async (task) => {
  if (isExecuting.value) return
  
  isExecuting.value = true
  task.status = 'running'
  task.error = null
  
  try {
    // 获取指派的AI成员
    const agent = agents.value.find(a => a.id === task.assignedTo)
    if (!agent) {
      throw new Error('未指派AI成员')
    }
    
    // 获取模型
    const model = props.models.find(m => m.id === agent.modelId)
    if (!model) {
      throw new Error('AI成员未配置模型')
    }
    
    // 构建提示词
    let prompt = agent.systemPrompt || ''
    
    // 添加任务描述
    prompt += `\n\n任务: ${task.title}\n${task.description || ''}`
    
    // 添加父任务上下文
    if (task.includeParentContext && parentTask.value && parentTask.value.output) {
      prompt += `\n\n父任务输出:\n${parentTask.value.output}`
    }
    
    // 添加相关任务上下文
    if (task.includeRelatedContext && task.relatedTaskId) {
      const findTask = (root, id) => {
        if (root.id === id) return root
        if (!root.subtasks) return null
        
        for (const subtask of root.subtasks) {
          const found = findTask(subtask, id)
          if (found) return found
        }
        
        return null
      }
      
      const relatedTask = rootTask.value ? findTask(rootTask.value, task.relatedTaskId) : null
      
      if (relatedTask && relatedTask.output) {
        prompt += `\n\n相关任务输出:\n${relatedTask.output}`
      }
    }
    
    // 添加场景内容
    if (task.sceneId) {
      const scene = props.scenes.find(s => s.id === task.sceneId)
      
      if (scene && scene.cards && scene.cards.length > 0) {
        prompt += '\n\n场景内容:\n'
        
        scene.cards.forEach(card => {
          prompt += `- ${card.title || '无标题'}: ${card.content || '无内容'}\n`
        })
      }
    }
    
    // 添加自定义提示词
    if (task.customPrompt) {
      prompt += `\n\n${task.customPrompt}`
    }
    
    // 添加JSON响应格式要求
    prompt += '\n\n请以JSON格式返回结果，包含以下字段:\n{"content": "你的输出内容", "isComplete": true/false}'
    
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
```

The key changes I've made:

1. Fixed the event handling for task operations:
   - Added `@add-subtask="addSubtask"` and `@edit-task="editTask"` to the TaskManager component
   - Improved the `deleteTask` function to properly handle subtask deletion
   - Enhanced the `saveTask` function to correctly update subtasks

2. Improved the task execution logic:
   - Added proper JSON response parsing
   - Added scene card creation based on task output
   - Added error handling for task execution

3. Fixed the parent-child task relationship:
   - Improved the `findParent` function to correctly identify parent tasks
   - Fixed the subtask update logic in the `saveTask` function

These changes should fix the issues with adding, editing, and deleting subtasks.

---

_**User**_

继续修复问题，还是打不开，任务编辑，增加不了子任务，点击不了设置，创建大任务不显示（中文回答）

---

_**Assistant**_



让我们继续修复这些问题。看起来主要有几个功能点需要解决：任务编辑、添加子任务、设置按钮和创建大任务的显示问题。

```vue:src/components/AgentsView.vue
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
  console.log('添加子任务到:', parentTaskObj)
  
  // 设置父任务
  parentTask.value = parentTaskObj
  
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
  }
  
  showTaskEditor.value = true
}

// 编辑任务
const editTask = (task) => {
  console.log('编辑任务:', task)
  
  // 查找父任务
  parentTask.value = findParent(task.id)
  
  // 设置编辑任务
  editingTask.value = { ...task }
  
  showTaskEditor.value = true
}

// 保存任务
const saveTask = (task) => {
  console.log('保存任务:', task)
  
  // 如果是根任务
  if (task.id === rootTask.value?.id) {
    rootTask.value = { ...task }
  } 
  // 如果是子任务
  else if (parentTask.value) {
    // 递归更新子任务
    const updateSubtask = (parent, updatedTask) => {
      if (!parent.subtasks) return false
      
      const index = parent.subtasks.findIndex(t => t.id === updatedTask.id)
      
      if (index !== -1) {
        parent.subtasks[index] = { ...updatedTask }
        return true
      }
      
      // 递归查找更深层级的子任务
      for (const subtask of parent.subtasks) {
        if (updateSubtask(subtask, updatedTask)) {
          return true
        }
      }
      
      return false
    }
    
    // 如果是新任务，添加到父任务的子任务列表
    if (!allTasks.value.find(t => t.id === task.id)) {
      if (!parentTask.value.subtasks) {
        parentTask.value.subtasks = []
      }
      parentTask.value.subtasks.push(task)
    } 
    // 否则更新现有任务
    else {
      updateSubtask(rootTask.value, task)
    }
  }
  
  // 保存到本地存储
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  
  // 关闭编辑器
  showTaskEditor.value = false
}

// 删除任务
const deleteTask = (taskId) => {
  console.log('删除任务:', taskId)
  
  // 如果是根任务
  if (rootTask.value && rootTask.value.id === taskId) {
    if (confirm('确定要删除根任务及其所有子任务吗？')) {
      rootTask.value = null
      showTaskManager.value = false
      localStorage.removeItem('rootTask')
    }
    return
  }
  
  // 查找父任务
  const parent = findParent(taskId)
  
  if (parent && confirm('确定要删除此任务及其所有子任务吗？')) {
    // 从父任务的子任务列表中移除
    parent.subtasks = parent.subtasks.filter(t => t.id !== taskId)
    
    // 保存到本地存储
    localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
  }
}

// 处理任务保存
const handleTasksSaved = (updatedRootTask) => {
  rootTask.value = updatedRootTask
  localStorage.setItem('rootTask', JSON.stringify(rootTask.value))
}

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
```

我对代码进行了以下修改：

1. **任务编辑问题**：
   - 改进了`editTask`函数，确保正确设置`parentTask`
   - 增强了`saveTask`函数的逻辑，确保正确处理新任务和现有任务的更新

2. **添加子任务问题**：
   - 完善了`addSubtask`函数，确保正确设置父任务
   - 添加了详细的日志输出，帮助调试

3. **创建大任务不显示问题**：
   - 修改了`createRootTask`函数，创建根任务后立即打开编辑器
   - 确保根任务创建后立即保存到localStorage

4. **调试信息**：
   - 添加了更多的`console.log`语句，帮助调试
   - 在`onMounted`中添加了日志，显示加载的数据

这些修改应该能解决你提到的问题。如果仍然有问题，请查看浏览器控制台中的错误信息，这将帮助我们进一步定位问题。

---

_**User**_

继续修复添加不了子任务问题，点击任务设置设置不了，任务中添加子任务添加不了。

---

_**Assistant**_





让我们继续修复添加子任务和任务设置的问题。我会重点关注这两个功能点，确保它们正常工作。

```vue:src/components/Agent/TaskManager.vue
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
import { ref, computed, watch } from 'vue';
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

// 任务设置
const showSettings = ref(false);
const settings = ref({
  autoSaveResults: true,
  continueOnError: false,
  responseFormat: 'json',
  jsonTemplate: '{"content": "", "isComplete": false}'
});

// 选中的任务
const selectedTaskId = ref(null);
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

// 选中任务的执行者
const assignedAgent = computed(() => {
  if (!selectedTask.value || !selectedTask.value.assignedTo) return null;
  return props.agents.find(a => a.id === selectedTask.value.assignedTo);
});

// 选择任务
const selectTask = (taskId) => {
  console.log('选择任务:', taskId);
  selectedTaskId.value = taskId;
};

// 创建根任务
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

// 执行所有任务
const executeAllTasks = () => {
  if (props.rootTask) {
    emit('execute', props.rootTask);
  }
};

// 导出任务
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

// 导入任务
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

// 切换设置面板
const toggleSettings = () => {
  console.log('切换设置面板');
  showSettings.value = !showSettings.value;
};

// 保存设置
const saveSettings = () => {
  localStorage.setItem('taskSettings', JSON.stringify(settings.value));
  showSettings.value = false;
};

// 处理添加子任务
const handleAddSubtask = (parentTask) => {
  console.log('TaskManager: 添加子任务到', parentTask);
  emit('add-subtask', parentTask);
};

// 处理编辑任务
const handleEditTask = (task) => {
  console.log('TaskManager: 编辑任务', task);
  emit('edit-task', task);
};

// 处理删除任务
const handleDeleteTask = (taskId) => {
  console.log('TaskManager: 删除任务', taskId);
  emit('delete-task', taskId);
};

// 加载设置
watch(() => showSettings.value, (newVal) => {
  if (newVal) {
    try {
      const savedSettings = localStorage.getItem('taskSettings');
      if (savedSettings) {
        settings.value = JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }
});
</script>

<style scoped>
.task-manager {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.create-btn, .execute-btn, .export-btn, .settings-btn, .import-btn {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.create-btn {
  background-color: #1890ff;
  color: white;
  border: none;
}

.execute-btn {
  background-color: #52c41a;
  color: white;
  border: none;
}

.execute-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.export-btn, .import-btn {
  background-color: #faad14;
  color: white;
  border: none;
}

.settings-btn {
  background-color: #722ed1;
  color: white;
  border: none;
}

.import-btn {
  position: relative;
  overflow: hidden;
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

.task-map {
  margin-top: 20px;
}

.task-settings {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  z-index: 1000;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.settings-body {
  padding: 16px;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid #e8e8e8;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group select, .form-group textarea {
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

.task-detail {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  z-index: 1000;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.detail-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section h5 {
  margin-bottom: 8px;
  font-weight: 500;
}

.output-content, .error-content {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  font-family: monospace;
}

.error-content {
  color: #f5222d;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e8e8e8;
}

.execute-btn, .edit-btn, .delete-btn, .add-btn {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.execute-btn {
  background-color: #52c41a;
  color: white;
  border: none;
}

.edit-btn {
  background-color: #1890ff;
  color: white;
  border: none;
}

.delete-btn {
  background-color: #f5222d;
  color: white;
  border: none;
}

.add-btn {
  background-color: #722ed1;
  color: white;
  border: none;
}

.agent-info {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
}

.agent-name {
  font-weight: 500;
  margin-bottom: 8px;
}

.agent-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.skill-tag {
  background-color: #e6f7ff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: #1890ff;
}
</style>
```


现在让我们修改AgentsView组件，确保它能正确处理TaskManager发出的事件：

```vue:src/components/AgentsView.vue
<script setup>
// ... 其他代码保持不变 ...

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

// ... 其他代码保持不变 ...
</script>
```


这些修改主要解决了以下问题：

1. **添加子任务问题**：
   - 在TaskManager中添加了明确的处理函数`handleAddSubtask`
   - 在AgentsView中改进了`addSubtask`函数，确保正确创建新任务
   - 添加了更多日志输出，帮助调试

2. **任务设置问题**：
   - 在TaskManager中添加了`toggleSettings`函数，专门处理设置面板的显示/隐藏
   - 添加了设置面板的样式，确保它正确显示
   - 添加了设置保存和加载功能

3. **任务编辑问题**：
   - 改进了TaskManager中的`handleEditTask`函数
   - 在AgentsView中使用深拷贝来避免引用问题
   - 确保编辑后的任务正确保存到父任务中

这些修改应该能解决你提到的问题。如果仍然有问题，请查看浏览器控制台中的日志输出，这将帮助我们进一步定位问题。

---

_**User**_

修复对应面板的css

---

_**Assistant**_



---



---

