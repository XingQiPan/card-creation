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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { showToastMessage, detectContentType, splitContent } from '../utils/common'
import { useCommon } from '../utils/composables/useCommon'
import { sendToModel } from '../utils/modelRequests'

// Props 定义
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

// Emits 定义
const emit = defineEmits(['add-cards-to-scene'])

// 从 useCommon 中导入所需方法
const {
  isLoading,
  exportData,
  importData,
  saveToStorage,
  loadFromStorage,
  formatTime,
  formatResponseTime,
  truncateText
} = useCommon()

// 响应式数据声明
const chatSessions = ref([])
const currentChatId = ref(null)
const inputMessage = ref('')
const messagesContainer = ref(null)
const isRequesting = ref(false)
const elapsedTime = ref(0)
const showSplitModal = ref(false)
const splitSections = ref([])
const selectedSceneId = ref('')
const expandedKeywords = ref([])
const abortController = ref(null)
const requestStartTime = ref(0)

// 添加计时器
let elapsedTimer = null

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

// 添加终止请求方法
const abortRequest = () => {
  try {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
      isRequesting.value = false
      
      // 清除计时器
      if (elapsedTimer) {
        clearInterval(elapsedTimer)
        elapsedTimer = null
      }
      
      elapsedTime.value = 0
      showToastMessage('已终止回答', 'success')
    }
  } catch (error) {
    console.error('终止请求失败:', error)
    showToastMessage('终止请求失败: ' + error.message, 'error')
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
  
  await nextTick()
  scrollToBottom()
  
  try {
    isRequesting.value = true
    requestStartTime.value = Date.now()
    elapsedTime.value = 0
    
    elapsedTimer = setInterval(() => {
      elapsedTime.value = Date.now() - requestStartTime.value
    }, 100)
    
    abortController.value = new AbortController()
    
    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) throw new Error('未找到选择的模型')

    // 获取提示词模板
    let promptTemplate = null
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        promptTemplate = prompt.systemPrompt || prompt.template || prompt.userPrompt
      }
    }

    // 获取对话历史，过滤掉 system 消息
    const historyTurns = currentChat.value.historyTurns || 20
    const context = currentChat.value.messages
      .filter(msg => msg.role !== 'system')  // 添加这行，过滤掉 system 消息
      .slice(-(historyTurns * 2))
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    context.pop() // 移除最后一条消息，因为它会作为主要输入

    // 处理关键词检测
    let processedContent = userMessage.content
    if (currentChat.value.enableKeywords) {
      const keywords = allKeywords.value.filter(keyword => 
        userMessage.content.toLowerCase().includes(keyword.name.toLowerCase())
      )

      if (keywords.length > 0) {
        let keywordsContext = '检测到以下相关内容:\n\n'
        for (const keyword of keywords) {
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
        processedContent = keywordsContext + '用户问题:\n' + userMessage.content
      }
    }

    // 调用 sendToModel 发送请求
    const response = await sendToModel(
      model,
      processedContent,
      context,
      abortController.value,
      promptTemplate
    )
    
    const endTime = Date.now()
    const responseTimeValue = endTime - requestStartTime.value
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      responseTime: responseTimeValue
    }

    currentChat.value.messages.push(assistantMessage)
    saveSessions()

    await nextTick()
    scrollToBottom()

  } catch (error) {
    console.error('发送失败:', error)
    
    if (error.name === 'AbortError') {
      currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== userMessage.id)
      return
    }
    
    currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== userMessage.id)
    showToastMessage(error.message, 'error')
  } finally {
    isRequesting.value = false
    abortController.value = null
    elapsedTime.value = 0
    
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    
    await nextTick()
    scrollToBottom()
  }
}

// 格式化消息内容（支持 Markdown）
const formatMessage = (content) => {
  const html = marked(content)
  return DOMPurify.sanitize(html)
}


// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
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

// 切换关键词内容显示
const toggleKeywordContent = (keyword) => {
  const index = expandedKeywords.value.indexOf(keyword.id)
  if (index === -1) {
    expandedKeywords.value.push(keyword.id)
  } else {
    expandedKeywords.value.splice(index, 1)
  }
}

// 修改拆分消息方法
const splitMessage = (msg) => {
  try {
    const sections = splitContent(msg.content)
    if (sections.length <= 1) {
      showToastMessage('当前内容无法拆分主人~', 'error')
      return
    }
    
    splitSections.value = sections
    showSplitModal.value = true
  } catch (error) {
    console.error('拆分消息失败:', error)
    showToastMessage('拆分失败: ' + error.message, 'error')
  }
}

// 修改保存方法
const saveSplitSections = async () => {
  try {
    if (!selectedSceneId.value) {
      showToastMessage('请选择目标场景主人~', 'error')
      return
    }

    const selectedSections = splitSections.value.filter(s => s.selected)
    if (selectedSections.length === 0) {
      showToastMessage('请选择要保存的片段主人~', 'error')
      return
    }

    // 找到目标场景
    const targetScene = props.scenes.find(s => Number(s.id) === Number(selectedSceneId.value))
    if (!targetScene) {
      throw new Error('目标场景不存在')
    }

    // 创建新卡片
    const cards = selectedSections.map(section => ({
      id: Date.now() + Math.random(),
      title: section.title || '未命名片段',
      content: section.content,
      tags: [],
      height: '200px',
      timestamp: new Date().toISOString(),
      type: detectContentType(section.content),
      selected: false // 添加选中状态属性
    }))

    // 发出事件，将卡片添加到选中的场景
    emit('add-cards-to-scene', {
      sceneId: selectedSceneId.value,
      cards: cards
    })

    showToastMessage(`已成功添加 ${cards.length} 个卡片到场景主人~`, 'success')
    closeSplitModal()
  } catch (error) {
    console.error('保存片段失败:', error)
    showToastMessage('保存片段失败主人~: ' + error.message, 'error')
  }
}

// 修改关闭模态框方法
const closeSplitModal = () => {
  showSplitModal.value = false
  splitSections.value = []
  selectedSceneId.value = ''
}

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
    isRequesting.value = true
    requestStartTime.value = Date.now()
    elapsedTime.value = 0
    
    abortController.value = new AbortController()

    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) throw new Error('未找到选择的模型')

    // 获取提示词模板
    let promptTemplate = null
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        promptTemplate = prompt.systemPrompt || prompt.template || prompt.userPrompt
      }
    }

    // 获取历史消息，过滤掉 system 消息
    const context = currentChat.value.messages
      .filter(msg => msg.role !== 'system')  // 添加这行，过滤掉 system 消息
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
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

    const response = await sendToModel(
      model,
      processedContent,
      context,
      abortController.value,
      promptTemplate
    )
    
    const endTime = Date.now()
    const responseTimeValue = endTime - requestStartTime.value
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      responseTime: responseTimeValue
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
    elapsedTime.value = 0
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
  exportData(chatSessions.value, 'chat-sessions')
}

const importChatSessions = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  importData(file, (importedData) => {
    chatSessions.value = importedData
    saveToStorage('chatSessions', importedData)
    if (importedData.length > 0) {
      currentChatId.value = importedData[0].id
    }
  })
  event.target.value = ''
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

// 组件卸载时清理
onUnmounted(() => {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
})

// 不需要显式的 return 语句，setup script 会自动暴露声明的变量和方法
</script>

<style scoped>
@import url("../styles/chatView.css");
</style> 