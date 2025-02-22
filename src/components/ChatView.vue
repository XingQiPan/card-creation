<template>
  <div class="chat-container">
    <!-- 左侧聊天记录列表 -->
    <div class="chat-list">
      <div class="list-header">
        <h3>聊天记录</h3>
        <button @click="createNewChat" class="primary-btn">
          <i class="fas fa-plus"></i> 新对话
        </button>
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
            <div class="message-actions">
              <button class="icon-btn" @click="editMessage(msg)">
                <i class="fas fa-edit"></i>
              </button>
              <button class="icon-btn" @click="resendMessage(msg)" v-if="msg.role === 'user'">
                <i class="fas fa-redo"></i>
              </button>
              <button class="icon-btn delete" @click="deleteMessage(msg.id)">
                <i class="fas fa-trash"></i>
              </button>
              <button class="icon-btn" @click="splitMessage(msg)" v-if="msg.role === 'assistant'">
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
        ></textarea>
        <button 
          @click="sendMessage"
          :disabled="!currentChat.modelId || !inputMessage.trim()"
          class="send-btn"
        >
          发送
        </button>
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
          >
            <div class="section-header">
              <input 
                type="checkbox" 
                v-model="section.selected"
                :id="'section-' + index"
              >
              <input 
                v-model="section.title"
                class="section-title-input"
                placeholder="输入标题..."
              >
            </div>
            <div class="section-preview" v-html="formatMessage(section.content)"></div>
          </div>
        </div>
        <div class="scene-selector">
          <label>选择目标场景：</label>
          <select v-model="selectedSceneId">
            <option v-for="scene in scenes" :key="scene.id" :value="scene.id">
              {{ scene.name }}
            </option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="saveSplitSections" :disabled="!canSaveSections">保存选中片段</button>
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
  console.log("scenes:", props.scenes) // 打印整个 scenes 数据
  const keywords = new Set()
  props.scenes.forEach(scene => {
    console.log("scene:", scene) // 打印每个场景
    scene.cards?.forEach(card => {
      console.log("card:", card) // 打印每个卡片
      if (card.title?.trim()) {
        console.log("found title:", card.title.trim())
        keywords.add(card.title.trim())
      }
    })
  })
  const result = Array.from(keywords).map(title => ({
    id: title,
    name: title
  }))
  console.log("all keywords:", result) // 打印最终的关键词列表
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

// 创建新对话
const createNewChat = () => {
  const newChat = {
    id: Date.now(),
    title: '新对话',
    messages: [],
    modelId: '',
    promptId: '',
    enableKeywords: false
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
          content: prompt.template
        })
      }
    }

    // 添加历史消息
    context.push(...currentChat.value.messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })))
    context.pop() // 移除最后一条消息，因为它会作为当前消息发送

    // 处理关键词检测
    let processedContent = userMessage.content
    console.log(processedContent)
    console.log(currentChat.value.enableKeywords)
    if (currentChat.value.enableKeywords) {
      console.log("message content:", userMessage.content) // 打印用户消息
      console.log("all keywords available:", allKeywords.value) // 打印可用的关键词

      // 检测关键词
      const keywords = allKeywords.value.filter(keyword => {
        const found = userMessage.content.toLowerCase().includes(keyword.name.toLowerCase())
        console.log(`checking keyword: ${keyword.name}, found: ${found}`) // 打印每个关键词的检测结果
        return found
      })

      console.log(keywords)

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
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    }

    currentChat.value.messages.push(assistantMessage)
    saveSessions()

    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }

  } catch (error) {
    console.error('发送失败:', error)
    currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== userMessage.id)
    alert(error.message)
  }
}

// 调用模型 API
const sendToModel = async (model, content, context = []) => {
  let response
  let result

  try {
    if (model.provider === 'openai') {
      // 构建完整的消息历史
      const messages = [
        ...context,
        { role: 'user', content }
      ]

      response = await fetch(model.apiUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages,
          max_tokens: Number(model.maxTokens),
          temperature: Number(model.temperature)
        })
      })
      
      result = await response.json()
      return result.choices[0].message.content

    } else if (model.provider === 'gemini') {
      // 构建 Gemini 格式的历史消息
      const contents = context.map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'user' ? 'user' : 'model'
      }))
      
      // 添加当前消息
      contents.push({
        parts: [{ text: content }],
        role: 'user'
      })

      response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': model.apiKey
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: Number(model.temperature),
            maxOutputTokens: Number(model.maxTokens),
          }
        })
      })
      
      result = await response.json()
      return result.candidates[0].content.parts[0].text

    } else if (model.provider === 'ollama') {
      // 构建 Ollama 格式的消息历史
      const messages = [
        ...context,
        { role: "user", content }
      ]

      response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.modelId,
          messages,
          stream: false,
          options: {
            temperature: Number(model.temperature),
            num_predict: Number(model.maxTokens)
          }
        })
      })
      
      result = await response.json()
      return result.message?.content
    }

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }

    if (!result) {
      throw new Error('响应格式错误')
    }

  } catch (error) {
    console.error('API 请求错误:', error)
    throw new Error(`发送失败: ${error.message}`)
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

// 添加计算属性
const canSaveSections = computed(() => {
  return splitSections.value.some(s => s.selected) && selectedSceneId.value
})

// 修改拆分消息方法
const splitMessage = (msg) => {
  // 使用正则表达式匹配 Markdown 标题和内容块
  const sections = splitMarkdownContent(msg.content)
  
  // 初始化每个部分
  splitSections.value = sections.map(section => ({
    selected: false,
    title: section.title || '',
    content: section.content.trim()
  }))
  
  // 如果有场景，默认选择第一个
  if (props.scenes.length > 0) {
    selectedSceneId.value = props.scenes[0].id
  }
  
  showSplitModal.value = true
}

// 修改 Markdown 内容拆分函数
const splitMarkdownContent = (content) => {
  // 将内容按行分割
  const lines = content.split('\n')
  const sections = []
  let currentSection = {
    title: '',
    content: []
  }
  
  // 正则表达式定义
  const headerRegex = /^(#{1,6}|\*\*\d+\.|\d+\.)\s+(.+?)[\*\#]*$/  // 匹配 Markdown 标题和加粗的数字标题
  const listStartRegex = /^[-*+]\s+\*\*/   // 列表开始（带加粗）
  const codeBlockRegex = /^```/            // 代码块
  
  let inCodeBlock = false
  let inList = false
  let hasContent = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    const headerMatch = line.match(headerRegex)
    const isCodeBlockMarker = codeBlockRegex.test(line)
    const isListStart = listStartRegex.test(line)
    const isCurrentLineEmpty = !line.trim()
    
    // 处理代码块
    if (isCodeBlockMarker) {
      inCodeBlock = !inCodeBlock
      currentSection.content.push(line)
      continue
    }
    
    if (inCodeBlock) {
      currentSection.content.push(line)
      continue
    }
    
    // 处理新的标题段落
    if (headerMatch && hasContent) {
      // 保存当前段落
      sections.push({
        title: currentSection.title,
        content: currentSection.content.join('\n').trim()
      })
      // 开始新段落
      currentSection = {
        title: headerMatch[2].replace(/\*\*/g, '').trim(),
        content: []
      }
      hasContent = false
      inList = false
    }
    // 处理段落的第一个标题
    else if (headerMatch && !hasContent) {
      currentSection.title = headerMatch[2].replace(/\*\*/g, '').trim()
    }
    // 处理列表开始
    else if (isListStart) {
      inList = true
      currentSection.content.push(line)
      hasContent = true
    }
    // 处理列表内容或普通内容
    else {
      if (line.trim()) {
        hasContent = true
      }
      currentSection.content.push(line)
    }
  }
  
  // 添加最后一个段落
  if (hasContent) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.join('\n').trim()
    })
  }
  
  // 后处理：清理标题中的特殊字符
  return sections.map(section => {
    // 清理标题中的 Markdown 标记
    section.title = section.title
      .replace(/^\*\*|\*\*$/g, '')  // 移除首尾的加粗标记
      .replace(/^#+\s*/, '')        // 移除开头的 # 号
      .trim()
    
    // 如果没有标题，使用内容的第一行
    if (!section.title && section.content) {
      const firstLine = section.content.split('\n')[0].trim()
      section.title = firstLine
        .replace(/^[-*+]\s+/, '')  // 移除列表标记
        .replace(/^\*\*|\*\*$/g, '') // 移除加粗标记
        .slice(0, 30) + (firstLine.length > 30 ? '...' : '')
    }
    
    return section
  })
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

// 修改保存选中片段的方法
const saveSplitSections = () => {
  const selectedSections = splitSections.value.filter(s => s.selected)
  
  if (!selectedSceneId.value) {
    showToastMessage('请选择目标场景', 'error')
    return
  }

  // 创建新卡片，添加更多元数据
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
  
  showToastMessage('已成功添加到场景')
  closeSplitModal()
}

// 添加内容类型检测函数
const detectContentType = (content) => {
  if (content.startsWith('```')) return 'code'
  if (/^[-*+]\s|^\d+\.\s/.test(content)) return 'list'
  if (/^#{1,6}\s/.test(content)) return 'heading'
  return 'text'
}

// 关闭模态框
const closeSplitModal = () => {
  showSplitModal.value = false
  splitSections.value = []
  selectedSceneId.value = ''
}

// 修改重新发送消息方法
const resendMessage = async (msg) => {
  // 删除这条消息之后的所有消息
  const msgIndex = currentChat.value.messages.findIndex(m => m.id === msg.id)
  currentChat.value.messages = currentChat.value.messages.slice(0, msgIndex)
  
  // 添加用户消息
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: msg.content,
    timestamp: new Date()
  }
  currentChat.value.messages.push(userMessage)
  
  // 重新发送消息
  try {
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
          content: prompt.template
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
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
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
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100%;
  background: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
}

.chat-list {
  width: 280px;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2em;
  font-weight: 600;
}

.chat-sessions {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.chat-session {
  padding: 12px 16px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.chat-session:hover {
  background: #edf2f7;
}

.chat-session.active {
  background: #e3f2fd;
}

.chat-title-input {
  border: none;
  background: transparent;
  flex: 1;
  margin-right: 8px;
  font-size: 1em;
  color: #333;
  padding: 4px;
}

.chat-title-input:focus {
  outline: none;
  background: #fff;
  border-radius: 4px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.model-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95em;
  color: #333;
  min-width: 200px;
}

.prompt-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95em;
  color: #333;
  min-width: 200px;
}

.keyword-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.keyword-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.keyword-toggle label {
  font-size: 0.95em;
  color: #666;
  user-select: none;
  cursor: pointer;
}

.keywords-area {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.keywords-header {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  width: auto;
  min-width: 120px;
  max-width: 200px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.keyword-card:hover {
  border-color: #2196f3;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
}

.keyword-title {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1976d2;
  font-size: 0.95em;
}

.keyword-title i {
  font-size: 0.8em;
  color: #666;
}

.keyword-content {
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  font-size: 0.9em;
  color: #666;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.message {
  margin: 16px 0;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
}

.message.user {
  margin-left: auto;
}

.message.assistant {
  margin-right: auto;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.85em;
  background: #e3f2fd;
  color: #1976d2;
}

.message-time {
  font-size: 0.85em;
  color: #999;
}

.message-actions {
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-actions {
  opacity: 1;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  line-height: 1.6;
  font-size: 1.2em;
}

.user .message-content {
  background: #e3f2fd;
  color: #1976d2;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e8e8e8;
  background: #fff;
  display: flex;
  gap: 12px;
}

.input-textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  resize: none;
  font-size: 1em;
  line-height: 1.6;
  font-family: inherit;
  transition: border-color 0.3s ease;
}

.input-textarea:focus {
  outline: none;
  border-color: #2196f3;
}

.send-btn {
  padding: 0 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 0.95em;
}

.send-btn:hover {
  background: #1976d2;
}

.send-btn:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
}

.icon-btn {
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #666;
  transition: color 0.2s ease;
}

.icon-btn:hover {
  color: #2196f3;
}

.icon-btn.delete:hover {
  color: #f44336;
}

.edit-textarea {
  width: 100%;
  height: 500px;
  padding: 12px;
  font-size: 1em;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 8px 0;
  resize: vertical;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.small-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  background: #e3f2fd;
  color: #1976d2;
  transition: all 0.2s ease;
}

.small-btn:hover {
  background: #1976d2;
  color: #fff;
}

.primary-btn {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.primary-btn:hover {
  background: #1976d2;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.split-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.split-modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
}

.split-sections {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.split-section {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.split-section:hover {
  border-color: #646cff;
  box-shadow: 0 2px 8px rgba(100, 108, 255, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.section-header input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.section-title-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.section-title-input:focus {
  border-color: #646cff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.1);
}

.section-preview {
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  font-size: 14px;
  line-height: 1.6;
}

/* 添加代码块样式 */
.section-preview pre {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

/* 添加列表样式 */
.section-preview ul,
.section-preview ol {
  padding-left: 20px;
}

/* 添加引用样式 */
.section-preview blockquote {
  border-left: 4px solid #ddd;
  margin: 0;
  padding-left: 16px;
  color: #666;
}

.scene-selector {
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.scene-selector select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.modal-actions button:first-child {
  background: #646cff;
  color: white;
}

.modal-actions button:first-child:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.modal-actions button:last-child {
  background: #f0f0f0;
}

.modal-actions button:hover:not(:disabled) {
  opacity: 0.9;
}

/* 添加 Toast 样式 */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  z-index: 1100;
  animation: slideIn 0.3s ease;
}

.toast-success {
  background: #4caf50;
}

.toast-error {
  background: #f44336;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 添加重新发送按钮的悬停样式 */
.icon-btn:hover i.fa-redo {
  color: #4caf50;
}
</style> 