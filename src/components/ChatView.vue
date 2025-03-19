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
            :class="{ 'streaming': msg.isStreaming }"
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
import { ref, computed, onMounted, nextTick, watch, onUnmounted, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { showToastMessage, detectContentType, splitContent, showToast } from '../utils/common'
import { useCommon } from '../utils/composables/useCommon'
import { sendToModel } from '../utils/modelRequests'
import { chatService } from '../utils/services/chatService'
import { debugLog } from '../utils/debug'
import { dataService } from '../utils/services/dataService'

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
const models = ref([])
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
const dataLoaded = ref(false)

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

// 添加获取所有卡片的辅助方法
const getAllCards = () => {
  const allCards = []
  props.scenes.forEach(scene => {
    if (scene.cards && Array.isArray(scene.cards)) {
      allCards.push(...scene.cards)
    }
  })
  return allCards
}

// 添加根据ID查找卡片的辅助方法
const findCardById = (cardId) => {
  return getAllCards().find(card => card.id === cardId)
}

// 修改获取关键词内容的方法
const getKeywordContent = (keyword) => {
  const processedCards = new Set() // 避免循环引用

  const getCardContent = (card) => {
    if (!card || processedCards.has(card.id)) return null
    processedCards.add(card.id)

    let content = card.content || ''

    // 处理关联卡片
    if (card.links?.length > 0) {
      const linkedContents = []
      card.links.forEach(linkedCardId => {
        const linkedCard = findCardById(linkedCardId)
        if (linkedCard) {
          const linkedContent = getCardContent(linkedCard)
          if (linkedContent) {
            linkedContents.push(`关联内容「${linkedCard.title}」：\n${linkedContent}`)
          }
        }
      })

      if (linkedContents.length > 0) {
        content += '\n\n--- 关联内容 ---\n\n' + linkedContents.join('\n\n')
      }
    }

    return content
  }

  // 在所有卡片中查找匹配的卡片
  const allCards = getAllCards()
  const card = allCards.find(card => 
    card.title?.toLowerCase() === keyword.name.toLowerCase()
  )
  
  if (card) {
    return getCardContent(card)
  }
  return null
}

// 修改创建新对话的函数
const createNewChat = async () => {
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
  await saveSessions()
}

// 删除对话
const deleteChat = async (id) => {
  if (!confirm('确定要删除这个对话吗？')) return
  
  // 如果只有一个聊天会话，不允许删除
  if (chatSessions.value.length <= 1) {
    showToastMessage('至少保留一个对话', 'error')
    return
  }
  
  // 删除聊天会话
  chatSessions.value = chatSessions.value.filter(chat => chat.id !== id)
  
  // 如果删除的是当前聊天，切换到第一个聊天
  if (id === currentChatId.value) {
    currentChatId.value = chatSessions.value[0].id
  }
  
  // 保存到后端
  await saveSessions()
}

// 添加获取消息上下文的方法
const getMessageContext = () => {
  if (!currentChat.value) return []
  
  // 获取历史消息数量限制
  const historyTurns = currentChat.value.historyTurns || 20
  debugLog('historyTurns', historyTurns)
  // 获取最近的消息
  const recentMessages = currentChat.value.messages
    .slice(-historyTurns * 2) // 乘以2是因为每轮对话包含用户和助手的消息
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    debugLog('recentMessages', recentMessages)

  return recentMessages
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

  let assistantMessage = null

  try {
    // 获取完整的模型配置
    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) {
      throw new Error('未找到选择的模型')
    }

    // 检查模型配置
    console.log('Current model:', model)
    
    // 使用 apiUrl 作为 endpoint
    const endpoint = model.apiUrl
    console.log('endpoint', endpoint)
    if (!endpoint?.trim() && model.provider != 'gemini') {
      throw new Error('请先在设置中配置模型的 API 地址')
    }

    // 构建模型配置
    const modelConfig = {
      ...model, // 保留原始模型的所有属性
      provider: model.provider,
      endpoint: endpoint.trim(), // 确保设置正确的 endpoint
      apiKey: model.apiKey,
      modelId: model.modelId,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
        ...(model.headers || {})
      },
      parameters: {
        model: model.modelId,
        temperature: Number(model.temperature) || 0.7,
        max_tokens: Number(model.maxTokens) || 2000,
        top_p: Number(model.topP) || 1,
        frequency_penalty: Number(model.frequencyPenalty) || 0,
        presence_penalty: Number(model.presencePenalty) || 0,
        ...(model.parameters || {})
      }
    }

    //console.log('Sending request with config:', modelConfig)

    // 获取提示词模板
    let promptTemplate = null
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        promptTemplate = prompt.systemPrompt || prompt.template || prompt.userPrompt
      }
    }

    // 添加用户消息到聊天记录
    currentChat.value.messages.push(userMessage)
    inputMessage.value = ''
    await nextTick()
    scrollToBottom()

    // 开始计时
    isRequesting.value = true
    requestStartTime.value = Date.now()
    elapsedTimer = setInterval(() => {
      elapsedTime.value = Date.now() - requestStartTime.value
    }, 100)

    // 创建助手消息
    assistantMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }
    currentChat.value.messages.push(assistantMessage)

    // 发送请求
    const response = await chatService.sendStreamMessage(userMessage.content, {
      model: modelConfig,
      context: getMessageContext(),
      promptTemplate,
      enableKeywords: currentChat.value.enableKeywords,
      keywords: detectedKeywords.value,
      getKeywordContent,
      onChunk: (chunk) => {
        assistantMessage.content += chunk
        scrollToBottom()
      }
    })

    if (!response.success) {
      throw response.error
    }

    // 更新消息状态
    if (assistantMessage) {
      assistantMessage.responseTime = Date.now() - requestStartTime.value
      assistantMessage.isStreaming = false
    }

    chatService.saveChatSessions(chatSessions.value)
    await saveSessions()

  } catch (error) {
    console.error('发送失败:', error)
    
    // 如果是用户主动取消的请求，保留已生成的内容
    if (error.name === 'AbortError' || error.message === '请求已取消') {
      if (assistantMessage) {
        assistantMessage.isStreaming = false
        assistantMessage.responseTime = Date.now() - requestStartTime.value
      }
    } else {
      // 其他错误则移除失败的消息
      currentChat.value.messages = currentChat.value.messages.filter(msg => 
        msg.id !== userMessage.id && 
        (!assistantMessage || msg.id !== assistantMessage.id)
      )
    }
    
    showToastMessage(
      error.message || '发送失败，请检查模型配置和网络连接',
      'error'
    )
  } finally {
    isRequesting.value = false
    elapsedTime.value = 0
    
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    
    await nextTick()
    scrollToBottom()
  }
}

// 修改终止请求方法
const abortRequest = () => {
  try {
    if (chatService.abortRequest()) {
      isRequesting.value = false
      if (elapsedTimer) {
        clearInterval(elapsedTimer)
        elapsedTimer = null
      }
      elapsedTime.value = 0

      // 找到当前正在流式输出的消息
      const streamingMessage = currentChat.value.messages.find(msg => msg.isStreaming)
      if (streamingMessage) {
        // 保留已输出的内容，只是标记为非流式状态
        streamingMessage.isStreaming = false
        streamingMessage.responseTime = Date.now() - requestStartTime.value
      }

      showToastMessage('已终止回答', 'success')
      
      // 保存会话状态
      saveSessions()
    }
  } catch (error) {
    console.error('终止请求失败:', error)
    showToastMessage('终止请求失败: ' + error.message, 'error')
  }
}

// 修改格式化消息内容的方法
const formatMessage = (content) => {
  // 先处理换行和空格
  const preservedContent = content
    .replace(/\n/g, '<br>')  // 保留换行
    .replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length)) // 保留多个空格

  // 然后用 marked 处理 Markdown
  const html = marked(preservedContent, {
    breaks: true,  // 启用换行支持
    gfm: true      // 启用 GitHub 风格的 Markdown
  })

  // 使用 DOMPurify 清理 HTML
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'br', 'p', 'a', 'b', 'i', 'strong', 'em', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4',
      'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr', 'th',
      'td', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id']
  })
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

// 修改保存会话的方法，使用专用的保存方法
const saveSessions = async () => {
  // 如果数据尚未加载完成，不执行保存
  if (!dataLoaded.value) {
    console.log('数据尚未加载完成，跳过保存');
    return;
  }
  
  try {
    console.log('开始保存聊天会话到后端');
    
    // 使用专用方法保存聊天会话
    await dataService.saveChatSessions(chatSessions.value);
    
    console.log('聊天会话已成功保存到后端', {
      sessionCount: chatSessions.value.length,
      firstSessionId: chatSessions.value[0]?.id
    });
  } catch (error) {
    console.error('保存聊天会话失败:', error);
    showToast('保存聊天会话失败: ' + error.message, 'error');
  }
}

// 添加防抖保存函数
const debouncedSave = (() => {
  let timeout = null;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      saveSessions();
    }, 1000); // 1秒后执行保存
  };
})();

// 监听聊天会话变化，自动保存
watch(chatSessions, () => {
  if (dataLoaded.value) {
    console.log('聊天会话数据变化，准备保存');
    debouncedSave();
  }
}, { deep: true });

// 在组件卸载前保存数据
onBeforeUnmount(() => {
  if (dataLoaded.value) {
    console.log('组件即将卸载，保存数据');
    saveSessions();
  }
});

// 监听消息变化，自动滚动
watch(
  () => currentChat.value?.messages,
  () => nextTick(scrollToBottom),
  { deep: true }
)

// 添加 watch 来监听 scenes 的变化
watch(() => props.scenes, (newScenes) => {
  //console.log("scenes changed:", newScenes)
}, { deep: true })

// 修改 onMounted 钩子，使用专用的加载方法
onMounted(async () => {
  try {
    console.log('ChatView: 开始加载数据');
    
    // 使用专用方法加载聊天会话
    const chatSessionsData = await dataService.loadChatSessions();
    console.log('ChatView: 加载的聊天会话数据', chatSessionsData);
    
    if (Array.isArray(chatSessionsData) && chatSessionsData.length > 0) {
      chatSessions.value = chatSessionsData;
      currentChatId.value = chatSessionsData[0]?.id || null;
      console.log('ChatView: 已加载聊天会话', chatSessions.value.length);
    } else {
      console.log('ChatView: 没有找到聊天会话数据，创建默认聊天');
      // 如果后端没有聊天会话数据，创建默认聊天
      await createDefaultChat();
    }
    
    // 确保使用父组件传递的模型数据
    if (props.models && props.models.length > 0) {
      models.value = props.models;
      console.log('ChatView: 使用父组件传递的模型数据', models.value.length);
    }
    
    // 标记数据已加载
    dataLoaded.value = true;
  } catch (error) {
    console.error('ChatView: 加载聊天会话失败:', error);
    // 创建默认聊天
    await createDefaultChat();
    dataLoaded.value = true;
  }
  
  // 初始化完成后滚动到底部
  nextTick(scrollToBottom);
});

// 修改创建默认聊天的辅助函数
const createDefaultChat = async () => {
  const newChat = {
    id: Date.now(),
    title: '新对话',
    messages: [],
    modelId: '',
    promptId: '',
    enableKeywords: false,
    historyTurns: 20
  };
  
  chatSessions.value = [newChat];
  currentChatId.value = newChat.id;
  
  // 保存到后端
  await saveSessions();
}

// 添加消息编辑相关方法
const editMessage = (msg) => {
  msg.isEditing = true
  msg.editContent = msg.content
}

const saveMessageEdit = async (msg) => {
  msg.content = msg.editContent
  msg.isEditing = false
  delete msg.editContent
  await saveSessions()
}

const cancelMessageEdit = (msg) => {
  msg.isEditing = false
  delete msg.editContent
}

// 修改删除消息方法
const deleteMessage = async (msgId) => {
  if (!confirm('确定要删除这条消息吗？')) return;
  
  try {
    currentChat.value.messages = currentChat.value.messages.filter(m => m.id !== msgId);
    await saveSessions();
    console.log('消息已删除并保存');
  } catch (error) {
    console.error('删除消息失败:', error);
    showToast('删除消息失败: ' + error.message, 'error');
  }
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

    // 获取历史消息
    const context = currentChat.value.messages.map(m => ({
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
    await saveSessions()

    await nextTick()
    scrollToBottom()
    
    showToastMessage('消息已重新发送')
  } catch (error) {
    console.error('重新发送失败:', error)
    showToastMessage(error.message, 'error')
    // 发送失败时移除刚才添加的用户消息
    currentChat.value.messages.pop()
    await saveSessions()
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

// 修改导出和导入方法
const exportChatSessions = () => {
  exportData(chatSessions.value, 'chat-sessions')
}

// 修改导入方法，使用 dataService
const importChatSessions = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  importData(file, async (importedData) => {
    try {
      // 先保存到后端
      await dataService.saveItem('chatSessions', importedData);
      // 成功后更新本地状态
      chatSessions.value = importedData;
      showToastMessage('聊天记录导入成功', 'success');
    } catch (error) {
      console.error('保存导入的聊天会话失败:', error);
      // 保存到本地存储作为备份
      localStorage.setItem('chatSessions', JSON.stringify(importedData));
      chatSessions.value = importedData;
      showToastMessage('聊天记录已导入到本地（后端保存失败）', 'warning');
    }
    
    if (importedData.length > 0) {
      currentChatId.value = importedData[0].id;
    }
  });
  event.target.value = '';
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

// 修改处理对话轮数变化的函数
const handleHistoryTurnsChange = async () => {
  if (currentChat.value) {
    // 确保值在合理范围内
    let turns = parseInt(currentChat.value.historyTurns)
    if (isNaN(turns) || turns < 1) turns = 1
    if (turns > 1000) turns = 1000
    currentChat.value.historyTurns = turns
    await saveSessions()
  }
}

// 组件卸载时清理
onUnmounted(() => {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
})

</script>

<style scoped>
@import url("../styles/chatView.css");
</style> 