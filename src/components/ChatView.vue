<template>
  <div class="chat-container">
    <!-- 左侧聊天记录列表 -->
    <div class="chat-list">
      <div class="list-header">
        <h3>聊天记录</h3>
        <div class="header-actions">
          <button class="icon-btn" @click="createNewChat" title="新建对话">
            <i class="fas fa-plus"></i>
          </button>
          <button class="icon-btn" @click="exportChatSessions" title="导出聊天记录">
            <i class="fas fa-download"></i>
          </button>
          <input
            type="file"
            accept=".json"
            @change="importChatSessions"
            style="display: none"
            ref="fileInput"
          >
          <button class="icon-btn" @click="$refs.fileInput.click()" title="导入聊天记录">
            <i class="fas fa-upload"></i>
          </button>
        </div>
      </div>
      <div class="chat-sessions">
        <div 
          v-for="chat in chatSessions" 
          :key="chat.id"
          :class="['chat-session', { active: currentChatId === chat.id }]"
          @click="currentChatId = chat.id"
        >
          <input 
            v-model="chat.title" 
            class="chat-title-input"
            @click.stop
            @change="saveSessions"
          />
          <button @click.stop="deleteChat(chat.id)" class="icon-btn delete">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-main" v-if="currentChat">
      <div class="chat-header">
        <div class="header-controls">
          <select v-model="currentChat.modelId" class="model-select">
            <option value="">选择模型</option>
            <option v-for="model in props.models" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
          <select v-model="currentChat.promptId" class="prompt-select">
            <option value="">选择提示词</option>
            <option v-for="prompt in props.prompts" :key="prompt.id" :value="prompt.id">
              {{ prompt.title }}
            </option>
          </select>
          <div class="history-control">
            <label for="historyTurns">(默认20轮)对话轮数:</label>
            <input 
              type="number" 
              id="historyTurns"
              v-model="currentChat.historyTurns" 
              min="1" 
              max="1000"
              @change="handleHistoryTurnsChange"
            >
          </div>
          <div class="keyword-toggle">
            <input 
              type="checkbox" 
              v-model="currentChat.enableKeywords"
              id="keywordToggle"
            >
            <label for="keywordToggle">启用关键词检测</label>
          </div>
        </div>

        <!-- 修改关键词显示区域 -->
        <div v-if="currentChat.enableKeywords && detectedKeywords.length" class="keywords-area">
          <div class="keywords-header">
            <i class="fas fa-link"></i> 检测到相关卡片:
          </div>
          <div class="keywords-list">
            <div 
              v-for="keyword in detectedKeywords" 
              :key="keyword.id"
              class="keyword-card"
              @click="toggleKeywordContent(keyword)"
            >
              <div class="keyword-title">
                <span>{{ keyword.name }}</span>
                <i :class="['fas', expandedKeywords.includes(keyword.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
              </div>
              <div 
                v-if="expandedKeywords.includes(keyword.id)"
                class="keyword-content"
              >
                {{ getKeywordContent(keyword) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="messages" ref="messagesContainer">
        <div 
          v-for="msg in currentChat.messages" 
          :key="msg.id"
          :class="['message', msg.role]"
        >
          <div class="message-header">
            <span class="role-badge">{{ msg.role === 'user' ? '我' : 'AI' }}</span>
            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
            <!-- 显示响应时间 -->
            <span v-if="msg.role === 'assistant' && msg.responseTime" class="response-time">
              ({{ formatResponseTime(msg.responseTime) }})
            </span>
            <div class="message-actions">
              <button class="icon-btn" @click="editMessage(msg)" title="编辑">
                <i class="fas fa-edit"></i>
              </button>
              <button class="icon-btn" @click="resendMessage(msg)" v-if="msg.role === 'user'" title="重新发送">
                <i class="fas fa-redo"></i>
              </button>
              <button class="icon-btn delete" @click="deleteMessage(msg.id)" title="删除">
                <i class="fas fa-trash"></i>
              </button>
              <button 
                class="icon-btn split-btn" 
                @click="splitMessage(msg)" 
                v-if="msg.role === 'assistant'"
                title="拆分内容"
              >
                <i class="fas fa-cut"></i>
              </button>
            </div>
          </div>
          <div 
            class="message-content" 
            v-html="formatMessage(msg.content)"
            v-if="!msg.isEditing"
          ></div>
          <textarea
            v-else
            v-model="msg.editContent"
            class="edit-textarea"
            @keydown.enter.exact.prevent="saveMessageEdit(msg)"
            @keydown.esc="cancelMessageEdit(msg)"
          ></textarea>
          <div class="edit-actions" v-if="msg.isEditing">
            <button class="small-btn" @click="saveMessageEdit(msg)">保存</button>
            <button class="small-btn" @click="cancelMessageEdit(msg)">取消</button>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <textarea 
          v-model="inputMessage"
          @keydown.enter.exact.prevent="sendMessage"
          placeholder="输入消息，Enter 发送，Shift + Enter 换行"
          rows="3"
          class="input-textarea"
          :disabled="isRequesting"
        ></textarea>
        <div class="input-actions">
          <div v-if="isRequesting" class="elapsed-time">
            {{ formatElapsedTime(elapsedTime) }}
          </div>
          <button 
            v-if="!isRequesting"
            @click="sendMessage"
            :disabled="!currentChat.modelId || !inputMessage.trim()"
            class="send-btn"
          >
            <i class="fas fa-paper-plane"></i>
            发送
          </button>
          <button 
            v-else
            @click="abortRequest"
            class="abort-btn"
          >
            <i class="fas fa-stop"></i>
            终止
          </button>
        </div>
      </div>
    </div>

    <!-- 添加拆分选择模态框 -->
    <div v-if="showSplitModal" class="split-modal" @click="closeSplitModal">
      <div class="split-modal-content" @click.stop>
        <h3>选择要保存的片段</h3>
        <div class="split-sections">
          <div 
            v-for="(section, index) in splitSections" 
            :key="index"
            class="split-section"
            :data-type="section.type"
          >
            <div class="section-header">
              <input 
                type="checkbox" 
                v-model="section.selected"
                :id="'section-' + index"
              />
              <input 
                v-model="section.title"
                class="section-title-input"
                placeholder="输入标题..."
              />
              <button 
                v-if="index > 0"
                class="merge-btn"
                @click="mergeToPrevious(index)"
                title="合并到上一节"
              >
                <i class="fas fa-link"></i>
              </button>
              <button 
                class="split-btn"
                @click="splitSection(index)"
                title="拆分段落"
              >
                <i class="fas fa-cut"></i>
              </button>
              <span class="section-type-badge" :data-type="section.type">
                {{ section.type === 'code' ? '代码' : 
                   section.type === 'heading' ? '标题' :
                   section.type === 'list' ? '列表' : '文本' }}
              </span>
            </div>
            <div class="section-preview" v-html="formatMessage(section.content)"></div>
          </div>
        </div>
        <div class="scene-selector">
          <label>选择目标场景：</label>
          <select v-model="selectedSceneId" required>
            <option value="" disabled selected>请选择场景</option>
            <option v-for="scene in scenes" :key="scene.id" :value="scene.id">
              {{ scene.name }}
            </option>
          </select>
        </div>
        <div class="modal-actions">
          <button 
            @click="saveSplitSections" 
            :disabled="!selectedSceneId || !splitSections.some(s => s.selected)"
          >
            保存选中片段
          </button>
          <button @click="closeSplitModal">取消</button>
        </div>
      </div>
    </div>

    <!-- 添加 Toast 提示 -->
    <div 
      v-if="showToast" 
      :class="['toast', `toast-${toastType}`]"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  models: {
    type: Array,
    required: true
  },
  scenes: {
    type: Array,
    required: true
  },
  prompts: {
    type: Array,
    required: true
  }
})

const chatSessions = ref([])
const currentChatId = ref(null)
const inputMessage = ref('')
const messagesContainer = ref(null)

// 当前聊天会话
const currentChat = computed(() => 
  chatSessions.value.find(c => c.id === currentChatId.value)
)

// 获取所有卡片标题作为关键词
const allKeywords = computed(() => {
  //console.log("scenes:", props.scenes) // 打印整个 scenes 数据
  const keywords = new Set()
  props.scenes.forEach(scene => {
    //console.log("scene:", scene) // 打印每个场景
    scene.cards?.forEach(card => {
      //console.log("card:", card) // 打印每个卡片
      if (card.title?.trim()) {
        //console.log("found title:", card.title.trim())
        keywords.add(card.title.trim())
      }
    })
  })
  const result = Array.from(keywords).map(title => ({
    id: title,
    name: title
  }))
  //console.log("all keywords:", result) // 打印最终的关键词列表
  return result
})

// 检测关键词并找到关联卡片
const detectedKeywords = computed(() => {
  if (!currentChat.value?.enableKeywords || !currentChat.value?.messages.length) {
    return []
  }

  // 获取最新的用户消息
  const latestMessage = currentChat.value.messages
    .filter(msg => msg.role === 'user')
    .slice(-1)[0]

  if (!latestMessage) return []

  // 检测消息中包含的关键词
  return allKeywords.value.filter(keyword => 
    latestMessage.content.toLowerCase().includes(keyword.name.toLowerCase())
  )
})

// 获取关键词关联的卡片内容
const getKeywordContent = (keyword) => {
  for (const scene of props.scenes) {
    const card = scene.cards?.find(card => 
      card.title?.trim().toLowerCase() === keyword.name.toLowerCase()
    )
    if (card) {
      return card.content
    }
  }
  return null
}

// 修改创建新对话的函数
const createNewChat = () => {
  const newChat = {
    id: Date.now(),
    title: '新对话',
    messages: [],
    modelId: '',
    promptId: '',
    enableKeywords: false,
    historyTurns: 20  // 修改默认值为20
  }
  
  chatSessions.value.push(newChat)
  currentChatId.value = newChat.id
  saveSessions()
}

// 删除对话
const deleteChat = (id) => {
  if (confirm('确定要删除这个对话吗？')) {
    chatSessions.value = chatSessions.value.filter(c => c.id !== id)
    if (currentChatId.value === id) {
      currentChatId.value = chatSessions.value[0]?.id || null
    }
    saveSessions()
  }
}

// 添加响应式变量来跟踪请求时间和请求状态
const requestStartTime = ref(null)
const responseTime = ref(null)
const isRequesting = ref(false)
const abortController = ref(null)
const elapsedTime = ref(0)  // 添加用于实时显示的计时器变量
const timerInterval = ref(null)  // 添加计时器间隔引用

// 终止请求的方法
const abortRequest = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isRequesting.value = false
    clearInterval(timerInterval.value)  // 清除计时器
    timerInterval.value = null
    elapsedTime.value = 0
    showToastMessage('已终止请求', 'info')
  }
}

// 修改发送消息方法
const sendMessage = async () => {
  if (!inputMessage.value.trim() || !currentChat.value?.modelId) return

  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: inputMessage.value,
    timestamp: new Date()
  }
  
  currentChat.value.messages.push(userMessage)
  inputMessage.value = ''
  
  try {
    // 设置请求状态
    isRequesting.value = true
    requestStartTime.value = Date.now()
    elapsedTime.value = 0  // 重置计时器
    
    // 启动计时器，每10毫秒更新一次
    timerInterval.value = setInterval(() => {
      elapsedTime.value = Date.now() - requestStartTime.value
    }, 10)
    
    abortController.value = new AbortController()
    
    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) throw new Error('未找到选择的模型')

    // 获取对话历史时使用设定的轮数，默认值改为20
    const historyTurns = currentChat.value.historyTurns || 20
    const context = []
    
    // 如果选择了提示词，添加为 system 消息
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        context.push({
          role: 'system',
          content: prompt.systemPrompt || prompt.template || prompt.userPrompt
        })
      }
    }

    // 添加历史消息，限制轮数
    const recentMessages = currentChat.value.messages
      .slice(-(historyTurns * 2)) // 每轮包含用户和助手的消息，所以乘以2
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

    context.push(...recentMessages)
    context.pop() // 移除最后一条消息，因为它会作为当前消息发送

    // 处理关键词检测
    let processedContent = userMessage.content
    if (currentChat.value.enableKeywords) {
      // 检测关键词
      const keywords = allKeywords.value.filter(keyword => {
        return userMessage.content.toLowerCase().includes(keyword.name.toLowerCase())
      })

      if (keywords.length > 0) {
        let keywordsContext = '检测到以下相关内容:\n\n'
        
        for (const keyword of keywords) {
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
        
        // 将关键词内容添加到用户消息前面
        processedContent = keywordsContext + '用户问题:\n' + userMessage.content
      }
    }
    
    // 调用 API 获取回复
    const response = await sendToModel(model, processedContent, context)
    
    // 计算响应时间
    const endTime = Date.now()
    responseTime.value = endTime - requestStartTime.value
    
    // 清除计时器
    clearInterval(timerInterval.value)
    timerInterval.value = null
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      responseTime: responseTime.value // 保存响应时间
    }

    currentChat.value.messages.push(assistantMessage)
    saveSessions()

    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }

  } catch (error) {
    console.error('发送失败:', error)
    
    // 清除计时器
    clearInterval(timerInterval.value)
    timerInterval.value = null
    
    // 如果是用户主动终止，不显示错误
    if (error.name === 'AbortError') {
      currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== userMessage.id)
      return
    }
    
    currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== userMessage.id)
    alert(error.message)
  } finally {
    isRequesting.value = false
    abortController.value = null
    elapsedTime.value = 0  // 重置计时器
  }
}

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

// 修改调用模型 API
const sendToModel = async (model, message, context = []) => {
  try {
    let url = ''
    let body = {}
    let headers = {
      'Content-Type': 'application/json'
    }

    let modelUrl = formatApiUrl(model)

    // 根据不同的提供商构建请求
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
        url = `${modelUrl}`
        headers['Authorization'] = `Bearer ${model.apiKey}`
        body = {
          model: model.modelId,
          messages: [
            ...context,
            { role: 'user', content: message }
          ],
          max_tokens: Number(model.maxTokens) || 2048,
          temperature: Number(model.temperature) || 0.7
        }
        break
      case 'gemini':
        url = `${modelUrl}?key=${model.apiKey}`
        const contents = []
        
        // 处理上下文消息
        for (const msg of context) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })
        }
        
        // 添加当前用户消息
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        })
        
        body = {
          contents,
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
            ...context,
            { role: 'user', content: message }
          ],
          max_tokens: Number(model.maxTokens) || 2048,
          temperature: Number(model.temperature) || 0.7
        }
        break
      default:
        throw new Error(`不支持的模型提供商: ${model.provider}`)
    }


    // 添加终止控制器
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortController.value?.signal
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
      
      throw new Error(`${errorMessage}: ${response?.status || 'Unknown Error'}`)
    }

    const result = await response.json()
    //console.log('API 响应:', result)
    
    // 解析不同提供商的响应
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
      case 'custom': // 将 custom 也使用 OpenAI 格式
        return result.choices[0].message.content
      case 'gemini':
        // 修改 Gemini 响应解析
        if (result.candidates && result.candidates.length > 0) {
          const candidate = result.candidates[0]
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text
          }
        }
        throw new Error('无法解析 Gemini 响应')
      default:
        throw new Error(`不支持的模型提供商: ${model.provider}`)
    }

  } catch (error) {
    console.error('API 请求错误:', error)
    throw error // 直接抛出错误，让调用者处理
  }
}

// 格式化消息内容（支持 Markdown）
const formatMessage = (content) => {
  const html = marked(content)
  return DOMPurify.sanitize(html)
}

// 格式化时间
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 保存会话到本地存储
const saveSessions = () => {
  localStorage.setItem('chatSessions', JSON.stringify(chatSessions.value))
}

// 监听消息变化，自动滚动
watch(
  () => currentChat.value?.messages,
  () => nextTick(scrollToBottom),
  { deep: true }
)

// 添加 watch 来监听 scenes 的变化
watch(() => props.scenes, (newScenes) => {
  console.log("scenes changed:", newScenes)
}, { deep: true })

// 初始化
onMounted(() => {
  const saved = localStorage.getItem('chatSessions')
  if (saved) {
    chatSessions.value = JSON.parse(saved)
    if (chatSessions.value.length > 0) {
      currentChatId.value = chatSessions.value[0].id
    }
  } else {
    createNewChat()
  }
})

// 添加消息编辑相关方法
const editMessage = (msg) => {
  msg.isEditing = true
  msg.editContent = msg.content
}

const saveMessageEdit = (msg) => {
  msg.content = msg.editContent
  msg.isEditing = false
  delete msg.editContent
  saveSessions()
}

const cancelMessageEdit = (msg) => {
  msg.isEditing = false
  delete msg.editContent
}

// 添加删除消息方法
const deleteMessage = (msgId) => {
  if (!confirm('确定要删除这条消息吗？')) return
  
  currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== msgId)
  saveSessions()
}

// 添加展开状态管理
const expandedKeywords = ref([])

// 切换关键词内容显示
const toggleKeywordContent = (keyword) => {
  const index = expandedKeywords.value.indexOf(keyword.id)
  if (index === -1) {
    expandedKeywords.value.push(keyword.id)
  } else {
    expandedKeywords.value.splice(index, 1)
  }
}

// 添加新的响应式变量
const showSplitModal = ref(false)
const splitSections = ref([])
const selectedSceneId = ref('')

// 修改计算属性
const canSaveSections = computed(() => {
  const hasSelectedSections = splitSections.value.some(s => s.selected)
  const hasSelectedScene = Boolean(selectedSceneId.value)
  return hasSelectedSections && hasSelectedScene
})

// 修改拆分消息方法
const splitMessage = (msg) => {
  console.log('Splitting message:', msg.content)
  
  // 使用修改后的拆分函数
  const sections = splitMarkdownContent(msg.content)
  
  // 初始化每个部分
  splitSections.value = sections.map(section => ({
    selected: false,
    title: section.title || '',
    content: section.content.trim(),
    type: section.type
  }))
  
  // 如果有场景，默认选择第一个
  if (props.scenes.length > 0) {
    selectedSceneId.value = props.scenes[0].id
  }
  
  showSplitModal.value = true
}

// 修改 Markdown 内容拆分函数
const splitMarkdownContent = (content) => {
  const sections = []
  
  // 按照空行分割段落
  const paragraphs = content.split(/\n\s*\n/)
  
  // 处理每个段落
  paragraphs.forEach((paragraph, index) => {
    const lines = paragraph.trim().split('\n')
    if (lines.length === 0 || !paragraph.trim()) return
    
    // 检查是否是代码块
    if (paragraph.startsWith('```')) {
      sections.push({
        title: '代码片段',
        content: paragraph.trim(),
        type: 'code'
      })
      return
    }
    
    // 检查是否以 Markdown 标题开始
    if (lines[0].startsWith('#')) {
      sections.push({
        title: lines[0].replace(/^#+\s*/, ''),
        content: lines.slice(1).join('\n').trim() || lines[0].replace(/^#+\s*/, ''),
        type: 'heading'
      })
      return
    }
    
    // 检查是否是列表
    if (lines[0].match(/^[-*+]\s|^\d+\.\s/)) {
      sections.push({
        title: `列表片段 ${index + 1}`,
        content: paragraph.trim(),
        type: 'list'
      })
      return
    }
    
    // 普通段落
    const title = lines[0].length > 30 ? lines[0].slice(0, 30) + '...' : lines[0]
    sections.push({
      title: `片段 ${index + 1}`,
      content: paragraph.trim(),
      type: 'text'
    })
  })
  
  //console.log('Split into sections:', sections)
  return sections
}

// 定义 emit
const emit = defineEmits(['add-cards-to-scene'])

// 添加 toast 相关的响应式变量
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// 添加显示 toast 的方法
const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// 修改保存方法
const saveSplitSections = () => {
  //console.log('Saving sections...') // 添加调试日志
  const selectedSections = splitSections.value.filter(s => s.selected)
  
  if (selectedSections.length === 0) {
    showToastMessage('请选择要保存的片段主人~', 'error')
    return
  }
  
  if (!selectedSceneId.value) {
    showToastMessage('请选择目标场景主人~', 'error')
    return
  }

  try {
    //console.log('Selected sections:', selectedSections) // 添加调试日志
    //console.log('Target scene:', selectedSceneId.value) // 添加调试日志
    
    // 创建新卡片
    const cards = selectedSections.map(section => ({
      id: Date.now() + Math.random(),
      title: section.title || '未命名片段',
      content: section.content,
      tags: [],
      height: '200px',
      timestamp: new Date().toISOString(),
      type: detectContentType(section.content)
    }))
    
    // 发出事件，将卡片添加到选中的场景
    emit('add-cards-to-scene', {
      sceneId: selectedSceneId.value,
      cards
    })
    
    showToastMessage('已成功添加到场景主人~')
    closeSplitModal()
  } catch (error) {
    console.error('保存片段失败:', error)
    showToastMessage('保存片段失败主人~: ' + error.message, 'error')
  }
}

// 添加内容类型检测函数
const detectContentType = (content) => {
  if (content.startsWith('```')) return 'code'
  if (/^[-*+]\s|^\d+\.\s/.test(content)) return 'list'
  if (/^#{1,6}\s/.test(content)) return 'heading'
  return 'text'
}

// 修改关闭模态框方法
const closeSplitModal = () => {
  showSplitModal.value = false
  splitSections.value = []
  selectedSceneId.value = ''
}

// 添加监听器
watch(selectedSceneId, (newValue) => {
  console.log('Selected scene changed:', newValue)
})

watch(splitSections, (newValue) => {
  console.log('Selected sections changed:', newValue.filter(s => s.selected).length)
}, { deep: true })

// 添加合并方法
const mergeToPrevious = (index) => {
  if (index <= 0 || index >= splitSections.value.length) return
  
  const currentSection = splitSections.value[index]
  const previousSection = splitSections.value[index - 1]
  
  // 合并内容
  previousSection.content = `${previousSection.content}\n\n${currentSection.content}`
  
  // 如果当前部分被选中,保持上一部分的选中状态
  if (currentSection.selected) {
    previousSection.selected = true
  }
  
  // 从数组中移除当前部分
  splitSections.value.splice(index, 1)
}

// 修改重新发送消息方法
const resendMessage = async (msg) => {
  if (!currentChat.value?.modelId) {
    showToastMessage('请先选择模型', 'error')
    return
  }

  try {
    // 设置请求状态
    isRequesting.value = true
    requestStartTime.value = Date.now()
    elapsedTime.value = 0  // 重置计时器
    
    // 启动计时器，每10毫秒更新一次
    timerInterval.value = setInterval(() => {
      elapsedTime.value = Date.now() - requestStartTime.value
    }, 10)
    
    abortController.value = new AbortController()

    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) throw new Error('未找到选择的模型')

    // 获取对话历史
    const context = []
    
    // 如果选择了提示词，添加为 system 消息
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        context.push({
          role: 'system',
          content: prompt.systemPrompt || prompt.template || prompt.userPrompt
        })
      }
    }

    // 添加历史消息
    context.push(...currentChat.value.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    })))
    context.pop()

    // 处理关键词检测
    let processedContent = msg.content
    if (currentChat.value.enableKeywords) {
      const keywords = allKeywords.value.filter(keyword => 
        msg.content.toLowerCase().includes(keyword.name.toLowerCase())
      )

      if (keywords.length > 0) {
        let keywordsContext = '检测到以下相关内容:\n\n'
        for (const keyword of keywords) {
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
        processedContent = keywordsContext + '用户问题:\n' + msg.content
      }
    }

    // 调用 API 获取回复
    const response = await sendToModel(model, processedContent, context)
    
    // 计算响应时间
    const endTime = Date.now()
    const responseTimeValue = endTime - requestStartTime.value
    
    // 清除计时器
    clearInterval(timerInterval.value)
    timerInterval.value = null
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      responseTime: responseTimeValue // 保存响应时间
    }

    currentChat.value.messages.push(assistantMessage)
    saveSessions()

    await nextTick()
    scrollToBottom()
    
    showToastMessage('消息已重新发送')
  } catch (error) {
    console.error('重新发送失败:', error)
    showToastMessage(error.message, 'error')
    // 发送失败时移除刚才添加的用户消息
    currentChat.value.messages.pop()
    saveSessions()
  } finally {
    isRequesting.value = false
    abortController.value = null
    elapsedTime.value = 0  // 重置计时器
    clearInterval(timerInterval.value)  // 确保清除计时器
    timerInterval.value = null
  }
}

// 添加拆分段落方法
const splitSection = (index) => {
  const section = splitSections.value[index]
  const content = section.content
  
  // 按照空行分割内容
  const parts = content.split(/\n\s*\n/).filter(part => part.trim())
  
  if (parts.length <= 1) {
    showToastMessage('当前段落无法拆分主人~', 'error')
    return
  }
  
  // 创建新的段落
  const newSections = parts.map((part, i) => ({
    selected: section.selected,
    title: `${section.title}_${i + 1}`,
    content: part.trim(),
    type: detectContentType(part)
  }))
  
  // 替换原来的段落
  splitSections.value.splice(index, 1, ...newSections)
  
  showToastMessage('段落已拆分主人~')
}

// 添加导出和导入方法
const exportChatSessions = () => {
  try {
    const data = JSON.stringify(chatSessions.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chat-sessions-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showToast('聊天记录导出成功', 'success')
  } catch (error) {
    console.error('导出聊天记录失败:', error)
    showToast('导出聊天记录失败: ' + error.message, 'error')
  }
}

const importChatSessions = (event) => {
  try {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result)
        
        // 更新聊天会话数据
        chatSessions.value = importedData
        
        // 立即保存到 localStorage
        localStorage.setItem('chatSessions', JSON.stringify(importedData))
        
        // 如果有聊天会话，设置当前会话为第一个
        if (importedData.length > 0) {
          currentChatId.value = importedData[0].id
        }
        
        showToast('聊天记录导入成功', 'success')
      } catch (error) {
        console.error('解析导入文件失败:', error)
        showToast('导入失败: 无效的文件格式', 'error')
      }
    }
    reader.readAsText(file)
    // 清除文件输入值，允许重复导入相同文件
    event.target.value = ''
  } catch (error) {
    console.error('导入聊天记录失败:', error)
    showToast('导入聊天记录失败: ' + error.message, 'error')
  }
}

// 添加格式化响应时间的方法
const formatResponseTime = (ms) => {
  if (ms < 1000) {
    return `${ms}毫秒`
  } else {
    const seconds = (ms / 1000).toFixed(2)
    return `${seconds}秒`
  }
}

// 添加格式化实时计时的方法
const formatElapsedTime = (ms) => {
  if (ms < 1000) {
    return `${ms}毫秒`
  } else {
    const seconds = (ms / 1000).toFixed(2)
    return `${seconds}秒`
  }
}

// 添加处理对话轮数变化的函数
const handleHistoryTurnsChange = () => {
  if (currentChat.value) {
    // 确保值在合理范围内
    let turns = parseInt(currentChat.value.historyTurns)
    if (isNaN(turns) || turns < 1) turns = 1
    if (turns > 1000) turns = 1000
    currentChat.value.historyTurns = turns
    saveSessions()
  }
}
</script>

<style scoped>
@import url("../styles/chatView.css");
</style> 