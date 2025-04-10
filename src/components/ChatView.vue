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
          
          <!-- 修改引用卡片标签部分 -->
          <div 
            v-if="msg.role === 'assistant' && getMessageKeywords(msg).length > 0" 
            class="reference-tag" 
            @click.stop="toggleReferencePopup($event, msg.id)"
            :key="'ref-tag-' + msg.id"
          >
            <i class="fas fa-link"></i> 引用了相关卡片 ({{ getMessageKeywords(msg).length }})
          </div>
          
          <!-- 修改引用卡片弹窗，使用动态定位 -->
          <div 
            v-if="msg.role === 'assistant' && activeReferencePopup === msg.id" 
            class="reference-popup"
            :style="popupStyle"
            @click.stop
          >
            <div class="reference-popup-header">
              <span>引用卡片</span>
              <button @click.stop="closeReferencePopup" class="close-btn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="reference-popup-content">
              <div 
                v-for="keyword in getMessageKeywords(msg)"
                :key="keyword.id"
                class="reference-card"
              >
                <div class="reference-card-header" @click.stop="toggleReferenceCard(keyword.id)">
                  <span>{{ keyword.name }}</span>
                  <span v-if="keyword.isGroup" class="group-badge">卡组</span>
                  <i :class="['fas', expandedReferenceCards.includes(keyword.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </div>
                <div class="reference-card-content" v-if="expandedReferenceCards.includes(keyword.id)">
                  <template v-if="keyword.isGroup && keyword.card.cards?.length > 0">
                    <div v-for="groupCard in keyword.card.cards" :key="groupCard.id" class="group-card">
                      <div class="group-card-title">{{ groupCard.title }}</div>
                      <div class="group-card-content">{{ truncateText(groupCard.content, 100) }}</div>
                    </div>
                  </template>
                  <template v-else>
                    {{ getKeywordContent(keyword) }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 在聊天输入区域上方添加关键词检测结果 -->
      <div class="chat-input-container">
        <div v-if="currentChat?.enableKeywords && inputDetectedKeywords.length" class="keywords-area input-keywords-area">
          <div class="keywords-header" @click="toggleInputKeywordsArea">
            <div class="header-left">
              <i class="fas fa-link"></i> 检测到相关卡片 ({{ inputDetectedKeywords.length }})
            </div>
            <div class="keywords-toggle">
              <i :class="['fas', inputKeywordsAreaCollapsed ? 'fa-chevron-down' : 'fa-chevron-up']"></i>
            </div>
          </div>
          
          <!-- 根据折叠状态显示或隐藏整个内容区域 -->
          <div v-if="!inputKeywordsAreaCollapsed" class="keywords-content">
            <div class="keywords-list">
              <!-- 主卡片或卡组 -->
              <div 
                v-for="keyword in inputDetectedKeywords" 
                :key="keyword.id"
                class="keyword-card"
              >
                <div class="keyword-title" @click="toggleKeywordContent(keyword)">
                  <span>{{ keyword.name }}</span>
                  <span v-if="keyword.isGroup" class="group-badge">卡组</span>
                  <i :class="['fas', expandedKeywords.includes(keyword.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </div>
                <div 
                  v-if="expandedKeywords.includes(keyword.id)"
                  class="keyword-content"
                >
                  <!-- 卡组内容展示 -->
                  <template v-if="keyword.isGroup && keyword.card.cards?.length > 0">
                    <div v-for="groupCard in keyword.card.cards" :key="groupCard.id" class="group-card">
                      <div class="group-card-title">{{ groupCard.title }}</div>
                      <div class="group-card-content">{{ truncateText(groupCard.content, 100) }}</div>
                    </div>
                  </template>
                  <template v-else>
                    {{ getKeywordContent(keyword) }}
                  </template>
                </div>
                
                <!-- 关联卡片 -->
                <div v-if="keyword.linkedCards && keyword.linkedCards.length" class="linked-cards-container">
                  <div class="linked-cards-header" @click="toggleLinkedCardsArea(keyword.id)">
                    <i class="fas fa-sitemap"></i> 关联卡片 ({{ keyword.linkedCards.length }})
                    <i :class="['fas', isLinkedCardsCollapsed(keyword.id) ? 'fa-chevron-down' : 'fa-chevron-up']" class="collapse-icon"></i>
                  </div>
                  <div class="linked-cards-list" v-show="!isLinkedCardsCollapsed(keyword.id)">
                    <div 
                      v-for="linkedCard in keyword.linkedCards"
                      :key="linkedCard.id"
                      class="linked-card"
                    >
                      <div class="linked-card-title" @click="toggleLinkedCardContent(keyword.id, linkedCard.id)">
                        <span>{{ linkedCard.title }}</span>
                        <i :class="['fas', isLinkedCardExpanded(keyword.id, linkedCard.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                      </div>
                      <div 
                        v-if="isLinkedCardExpanded(keyword.id, linkedCard.id)"
                        class="linked-card-content"
                      >
                        {{ getLinkedCardContent(linkedCard) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <div class="role-selector">
            <button 
              class="role-toggle-btn"
              :class="{
                'assistant': inputRole === 'assistant',
                'visitor': inputRole === 'visitor'
              }"
              @click="toggleInputRole"
              :title="getRoleTitle()"
            >
              {{ getRoleText() }}
            </button>
          </div>
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

// 添加控制关联卡片区域折叠状态的变量
const linkedCardsCollapsed = ref({})

// 添加计时器
let elapsedTimer = null

// 当前聊天会话
const currentChat = computed(() => 
  chatSessions.value.find(c => c.id === currentChatId.value)
)

// 获取所有卡片标题作为关键词
const allKeywords = computed(() => {
  const keywords = new Set()
  props.scenes.forEach(scene => {
    scene.cards?.forEach(card => {
      if (card.title?.trim()) {
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

// 修改检测关键词的计算属性，增加关联卡片信息
const detectedKeywords = computed(() => {
  if (!currentChat.value?.enableKeywords || !currentChat.value?.messages.length) {
    return []
  }

  // 获取最新的用户消息
  const latestMessage = currentChat.value.messages
    .filter(msg => msg.role === 'user')
    .slice(-1)[0]

  if (!latestMessage) return []

  // 存储已处理的卡片ID，避免重复显示
  const processedCardIds = new Set()
  
  // 改进关键词匹配逻辑，更精确地匹配整个词或短语
  const result = []
  
  allKeywords.value.forEach(keyword => {
    if (!keyword.name || keyword.name.length < 2) return
    
    // 转换为小写进行比较
    const content = latestMessage.content.toLowerCase()
    const keywordText = keyword.name.toLowerCase()
    
    // 检查是否完整包含关键词
    if (content.includes(keywordText)) {
      // 找到匹配的卡片
      const matchedCard = getAllCards().find(card => 
        card.title?.toLowerCase() === keyword.name.toLowerCase()
      )
      
      if (matchedCard && !processedCardIds.has(matchedCard.id)) {
        processedCardIds.add(matchedCard.id)
        
        // 获取关联卡片
        const linkedCards = []
        if (matchedCard.links && matchedCard.links.length > 0) {
          matchedCard.links.forEach(linkId => {
            const linkedCard = findCardById(linkId)
            if (linkedCard && !processedCardIds.has(linkedCard.id)) {
              processedCardIds.add(linkedCard.id)
              linkedCards.push(linkedCard)
            }
          })
        }
        
        // 添加主卡片和关联卡片信息
        result.push({
          id: matchedCard.id,
          name: matchedCard.title,
          card: matchedCard,
          linkedCards: linkedCards
        })
      }
    }
  })
  
  return result
})

// 修改获取关键词内容的方法，只返回主卡片内容
const getKeywordContent = (keyword) => {
  if (!keyword.card) return null
  
  // 如果是卡组，返回卡组内所有卡片的标题列表
  if (keyword.isGroup && keyword.card.cards?.length > 0) {
    return `卡组包含 ${keyword.card.cards.length} 张卡片`
  }
  
  return keyword.card.content || ''
}

// 新增获取关联卡片内容的方法
const getLinkedCardContent = (card) => {
  return card.content || ''
}

// 新增切换关联卡片内容显示的方法
const toggleLinkedCardContent = (keywordId, cardId) => {
  const expandKey = `${keywordId}-${cardId}`
  const index = expandedKeywords.value.indexOf(expandKey)
  if (index === -1) {
    expandedKeywords.value.push(expandKey)
  } else {
    expandedKeywords.value.splice(index, 1)
  }
}

// 新增检查关联卡片是否展开的方法
const isLinkedCardExpanded = (keywordId, cardId) => {
  const expandKey = `${keywordId}-${cardId}`
  return expandedKeywords.value.includes(expandKey)
}

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
  
  // 获取最近的消息并处理内容
  const recentMessages = currentChat.value.messages
    .slice(-historyTurns * 2) // 乘以2是因为每轮对话包含用户和助手的消息
    .map(msg => ({
      role: msg.role,
      // 如果存在处理后的内容且是用户消息，则使用处理后的内容
      content: (msg.role === 'user' && msg.processedContent) ? msg.processedContent : msg.content
    }))

  return recentMessages
}

// 修改角色选择状态
const inputRole = ref('user')

// 修改角色切换方法
const toggleInputRole = () => {
  if (inputRole.value === 'user') {
    inputRole.value = 'assistant'
  } else if (inputRole.value === 'assistant') {
    inputRole.value = 'visitor'
  } else {
    inputRole.value = 'user'
  }
}

// 添加获取角色文本的方法
const getRoleText = () => {
  switch (inputRole.value) {
    case 'user': return '用户'
    case 'assistant': return '助手'
    case 'visitor': return '游客'
    default: return '用户'
  }
}

// 添加获取角色提示的方法
const getRoleTitle = () => {
  switch (inputRole.value) {
    case 'user': return '点击切换为助手模式'
    case 'assistant': return '点击切换为游客模式'
    case 'visitor': return '点击切换为用户模式'
    default: return '点击切换角色'
  }
}

// 修改发送消息方法
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return
  if (inputRole.value === 'user' && !currentChat.value?.modelId) return

  // 保存原始用户输入
  const originalContent = inputMessage.value.trim()
  
  // 处理关键词检测
  let processedContent = originalContent
  if (currentChat.value?.enableKeywords && inputRole.value === 'user') {
    const detectedKeywords = inputDetectedKeywords.value
    if (detectedKeywords.length > 0) {
      let keywordsContext = '检测到以下相关内容:\n\n'
      for (const keyword of detectedKeywords) {
        if (keyword.isGroup && keyword.card.cards?.length > 0) {
          // 处理卡组，参考app.vue的卡组处理代码
          keywordsContext += `关键词[${keyword.name}]：\n` + 
            keyword.card.cards.map(card => 
              "【" + card.title + '】：\n```\n' + card.content + '\n```'
            ).join('\n\n') + '\n\n'
        } else {
          // 处理普通卡片
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
      }
      // 使用统一格式
      processedContent = keywordsContext + '【用户问题】:\n' + originalContent
    }
  }

  const newMessage = {
    id: Date.now(),
    role: inputRole.value === 'user' ? 'user' : 
          inputRole.value === 'assistant' ? 'assistant' : 
          'user', // 游客模式下发送 user 角色消息
    content: originalContent, // 前端显示原始内容
    timestamp: new Date(),
    // 只有当内容被处理过时才添加processedContent属性
    ...(processedContent !== originalContent ? { processedContent } : {})
  }

  let assistantMessage = null

  try {
    // 添加消息到聊天记录
    currentChat.value.messages.push(newMessage)
    inputMessage.value = ''
    await nextTick()
    scrollToBottom()

    // 如果是助手消息或游客消息，直接保存并返回
    if (inputRole.value === 'assistant' || inputRole.value === 'visitor') {
      await saveSessions()
      return
    }

    // 以下是用户消息处理逻辑
    // 获取完整的模型配置
    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) {
      throw new Error('未找到选择的模型')
    }

    // 构建模型配置
    const modelConfig = {
      ...model,
      provider: model.provider,
      endpoint: model.apiUrl?.trim(),
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

    if (!modelConfig.endpoint && model.provider !== 'gemini') {
      throw new Error('请先在设置中配置模型的 API 地址')
    }
    
    // 获取提示词模板
    let promptTemplate = null
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        promptTemplate = prompt.systemPrompt || prompt.template || prompt.userPrompt
      }
    }

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

    // 构建历史上下文 - 不包含当前消息
    const previousMessages = currentChat.value.messages
      .slice(0, -2) // 排除最后两条消息（刚刚添加的用户消息和空的助手消息）
      .slice(-(currentChat.value.historyTurns || 20) * 2) // 限制历史消息条数
      .map(msg => ({
        role: msg.role,
        content: (msg.role === 'user' && msg.processedContent) ? msg.processedContent : msg.content
      }));

    // 发送请求 - 只发送处理后的当前消息内容，不从getMessageContext()获取上下文
    const response = await chatService.sendStreamMessage(processedContent, {
      model: modelConfig,
      context: previousMessages, // 使用不包含当前消息的历史上下文
      promptTemplate,
      enableKeywords: false, // 已经在消息中包含了关键词，不需要再次处理
      onChunk: (chunk) => {
        if (assistantMessage) {
          assistantMessage.content += chunk
          scrollToBottom()
        }
      }
    })

    if (!response.success) {
      throw response.error
    }

    // 更新消息状态
    if (assistantMessage) {
      assistantMessage.responseTime = Date.now() - requestStartTime.value
      assistantMessage.isStreaming = false
      
      // 消息完成后立即检测关键词
      if (currentChat.value.enableKeywords) {
        // 强制清除消息关键词缓存
        delete messageKeywordsMap.value[assistantMessage.id]
        
        // 立即检测新消息中的关键词
        getMessageKeywords(assistantMessage)
      }
    }

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
      if (assistantMessage) {
        currentChat.value.messages = currentChat.value.messages.filter(msg => 
          msg.id !== assistantMessage.id
        )
      }
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
        
        // 中止请求后也检测关键词
        if (currentChat.value.enableKeywords) {
          delete messageKeywordsMap.value[streamingMessage.id]
          getMessageKeywords(streamingMessage)
        }
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
    return;
  }
  
  try {
    // 保存到全局变量，使App.vue能够获取
    window.chatSessions = chatSessions.value;
    
    // 使用专用方法保存聊天会话
    await dataService.saveChatSessions(chatSessions.value);
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

// 合并后的监听器
watch(
  [
    () => chatSessions.value,
    () => currentChat.value?.messages,
    () => props.scenes
  ],
  ([sessions, messages, scenes]) => {
    // 1. 聊天会话变化时自动保存
    if (dataLoaded.value) {
      debouncedSave();
    }

    // 2. 消息变化时自动滚动
    if (messages) {
      nextTick(scrollToBottom);
    }

  },
  { deep: true }
);

// 在组件卸载前保存数据
onBeforeUnmount(() => {
  if (dataLoaded.value) {
    saveSessions();
  }
});


// 修改 onMounted 钩子，使用专用的加载方法
onMounted(async () => {
  try {
    
    // 使用专用方法加载聊天会话
    const chatSessionsData = await dataService.loadChatSessions();
    
    if (Array.isArray(chatSessionsData) && chatSessionsData.length > 0) {
      chatSessions.value = chatSessionsData;
      // 将聊天会话同步到全局变量，确保 App.vue 能获取到
      window.chatSessions = chatSessionsData;
      currentChatId.value = chatSessionsData[0]?.id || null;
    } else {
      // 如果后端没有聊天会话数据，创建默认聊天
      await createDefaultChat();
    }
    
    // 确保使用父组件传递的模型数据
    if (props.models && props.models.length > 0) {
      models.value = props.models;
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
  
  showToastMessage('段落已拆分主人~')
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
    
    // 启动计时器
    elapsedTimer = setInterval(() => {
      elapsedTime.value = Date.now() - requestStartTime.value
    }, 100)

    abortController.value = new AbortController()

    const model = props.models.find(m => m.id === currentChat.value.modelId)
    if (!model) throw new Error('未找到选择的模型')

    // 1. 先移除之前的回复消息
    const lastMessage = currentChat.value.messages[currentChat.value.messages.length - 1]
    if (lastMessage.role === 'assistant') {
      currentChat.value.messages.pop()
    }

    // 获取提示词模板
    let promptTemplate = null
    if (currentChat.value.promptId) {
      const prompt = props.prompts.find(p => p.id === currentChat.value.promptId)
      if (prompt) {
        promptTemplate = prompt.systemPrompt || prompt.template || prompt.userPrompt
      }
    }

    // 构建历史上下文 - 不包含当前消息
    const msgIndex = currentChat.value.messages.findIndex(m => m.id === msg.id);
    const previousMessages = currentChat.value.messages
      .slice(0, msgIndex) // 只包含当前消息之前的消息
      .slice(-(currentChat.value.historyTurns || 20) * 2) // 限制历史消息条数
      .map(m => ({
        role: m.role,
        content: (m.role === 'user' && m.processedContent) ? m.processedContent : m.content
      }));

    // 处理关键词检测 - 使用与新消息发送相同的检测逻辑
    let processedContent = msg.content
    if (currentChat.value.enableKeywords) {
      // 重新检测当前消息中的关键词，而不是使用之前的缓存
      const detectedKeywords = []
      allKeywords.value.forEach(keyword => {
        if (!keyword.name || keyword.name.length < 2) return
        
        // 转换为小写进行比较
        const messageContent = msg.content.toLowerCase()
        const keywordText = keyword.name.toLowerCase()
        
        // 检查是否完整包含关键词
        if (messageContent.includes(keywordText)) {
          // 找到匹配的卡片
          const matchedCard = getAllCards().find(card => 
            card.title?.toLowerCase() === keyword.name.toLowerCase()
          )
          
          if (matchedCard) {
            detectedKeywords.push({
              id: matchedCard.id,
              name: matchedCard.title,
              card: matchedCard
            })
          }
        }
      })

      if (detectedKeywords.length > 0) {
        let keywordsContext = '检测到以下相关内容:\n\n'
        for (const keyword of detectedKeywords) {
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
        // 使用统一格式
        processedContent = keywordsContext + '【用户问题】:\n' + msg.content
        
        // 保存处理后的内容，但不更新显示
        msg.processedContent = processedContent
      }
    }

    // 2. 创建新的流式回复消息
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      responseTime: 0,
      isPartial: false
    }
    currentChat.value.messages.push(assistantMessage)
    await nextTick()
    scrollToBottom()

    // 3. 使用流式API发送请求
    const response = await chatService.sendStreamMessage(processedContent, {
      model: {
        ...model,
        endpoint: model.apiUrl,
        apiKey: model.apiKey,
        parameters: {
          model: model.modelId,
          temperature: Number(model.temperature) || 0.7,
          max_tokens: Number(model.maxTokens) || 2000,
          stream: true
        }
      },
      context: previousMessages, // 使用不包含当前消息的历史上下文
      promptTemplate,
      enableKeywords: false, // 已经处理过关键词，不需要再次处理
      onChunk: (chunk) => {
        assistantMessage.content += chunk
        scrollToBottom()
      },
      abortSignal: abortController.value?.signal,
      onAbort: () => {
        // 中止时保留已接收内容
        assistantMessage.isStreaming = false
        assistantMessage.isPartial = true
        assistantMessage.responseTime = Date.now() - requestStartTime.value
        showToastMessage('请求已停止，保留已接收内容', 'info')
        return { success: true } // 标记为成功中止
      }
    })

    if (!response.success) {
      throw response.error
    }

    // 更新消息状态
    assistantMessage.isStreaming = false
    assistantMessage.responseTime = Date.now() - requestStartTime.value
    
    // 消息完成后立即检测关键词
    if (currentChat.value.enableKeywords) {
      // 强制清除消息关键词缓存
      delete messageKeywordsMap.value[assistantMessage.id]
      
      // 立即检测新消息中的关键词
      getMessageKeywords(assistantMessage)
    }

    await saveSessions()
    showToastMessage('消息已重新发送')
  } catch (error) {
    // 只处理非中止错误
    if (error.name !== 'AbortError' && error.message !== '请求已取消') {
      console.error('重新发送失败:', error)
      showToastMessage(error.message, 'error')
      // 只有非中止错误才移除消息
      const lastMessage = currentChat.value.messages[currentChat.value.messages.length - 1]
      if (lastMessage.role === 'assistant') {
        currentChat.value.messages.pop()
      }
    }
    await saveSessions()
  } finally {
    isRequesting.value = false
    abortController.value = null
    elapsedTime.value = 0
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
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

// 切换特定关键词的关联卡片区域的折叠状态
const toggleLinkedCardsArea = (keywordId) => {
  linkedCardsCollapsed.value[keywordId] = !linkedCardsCollapsed.value[keywordId]
}

// 检查特定关键词的关联卡片区域是否折叠
const isLinkedCardsCollapsed = (keywordId) => {
  // 默认折叠状态为true（折叠）
  return linkedCardsCollapsed.value[keywordId] !== false
}

// 确保关键词区域折叠状态的变量初始化为true（默认折叠）
const keywordsAreaCollapsed = ref(true)

// 切换关键词区域的折叠状态
const toggleKeywordsArea = () => {
  keywordsAreaCollapsed.value = !keywordsAreaCollapsed.value
}

// 添加输入框关键词检测相关的响应式变量
const inputDetectedKeywords = ref([])
const inputKeywordsAreaCollapsed = ref(true)

// 监听输入框内容变化，实时检测关键词
watch(inputMessage, (newValue) => {
  if (currentChat.value?.enableKeywords && newValue) {
    detectKeywordsInInput(newValue)
  } else {
    inputDetectedKeywords.value = []
  }
})

// 添加检测输入框关键词的方法
const detectKeywordsInInput = (content) => {
  if (!content || !currentChat.value?.enableKeywords) {
    inputDetectedKeywords.value = []
    return
  }
  
  // 存储已处理的卡片ID，避免重复显示
  const processedCardIds = new Set()
  const result = []
  
  allKeywords.value.forEach(keyword => {
    if (!keyword.name || keyword.name.length < 2) return
    
    // 转换为小写进行比较
    const inputContent = content.toLowerCase()
    const keywordText = keyword.name.toLowerCase()
    
    // 检查是否完整包含关键词
    if (inputContent.includes(keywordText)) {
      // 找到匹配的卡片或卡组
      const matchedItem = getAllCards().find(card => 
        card.title?.toLowerCase() === keyword.name.toLowerCase()
      )
      
      if (matchedItem && !processedCardIds.has(matchedItem.id)) {
        processedCardIds.add(matchedItem.id)
        
        // 获取关联卡片
        const linkedCards = []
        if (matchedItem.links && matchedItem.links.length > 0) {
          matchedItem.links.forEach(linkId => {
            const linkedCard = findCardById(linkId)
            if (linkedCard && !processedCardIds.has(linkedCard.id)) {
              processedCardIds.add(linkedCard.id)
              linkedCards.push(linkedCard)
            }
          })
        }
        
        // 处理卡组内的卡片
        const groupCards = []
        if (matchedItem.type === 'group' && matchedItem.cards?.length > 0) {
          matchedItem.cards.forEach(card => {
            if (!processedCardIds.has(card.id)) {
              processedCardIds.add(card.id)
              groupCards.push(card)
            }
          })
        }
        
        // 添加主卡片/卡组和关联卡片信息
        result.push({
          id: matchedItem.id,
          name: matchedItem.title,
          card: matchedItem,
          linkedCards: linkedCards,
          isGroup: matchedItem.type === 'group',
          groupCards: groupCards
        })
      }
    }
  })
  
  inputDetectedKeywords.value = result
}

// 切换输入框关键词区域的折叠状态
const toggleInputKeywordsArea = () => {
  inputKeywordsAreaCollapsed.value = !inputKeywordsAreaCollapsed.value
}

// 监听当前聊天的enableKeywords变化
watch(() => currentChat.value?.enableKeywords, (newValue) => {
  if (!newValue) {
    // 如果关闭了关键词检测，清空输入框检测到的关键词
    inputDetectedKeywords.value = []
  } else if (inputMessage.value) {
    // 如果开启了关键词检测且输入框有内容，立即检测关键词
    detectKeywordsInInput(inputMessage.value)
  }
})

// 添加引用卡片相关的响应式变量
const activeReferencePopup = ref(null)
const expandedReferenceCards = ref([])
const messageKeywordsMap = ref({})

// 获取消息中引用的关键词
const getMessageKeywords = (msg, forceRecheck = false) => {
  if (!currentChat.value?.enableKeywords || !msg.content) return []
  
  // 如果已经缓存了该消息的关键词且不是强制重新检测，直接返回
  if (!forceRecheck && messageKeywordsMap.value[msg.id]) {
    return messageKeywordsMap.value[msg.id]
  }
  
  const content = msg.content.toLowerCase()
  const result = []
  const processedCardIds = new Set()
  
  allKeywords.value.forEach(keyword => {
    if (!keyword.name || keyword.name.length < 2) return
    
    const keywordText = keyword.name.toLowerCase()
    if (content.includes(keywordText)) {
      // 找到匹配的卡片或卡组
      const matchedItem = getAllCards().find(card => 
        card.title?.toLowerCase() === keyword.name.toLowerCase()
      )
      
      if (matchedItem && !processedCardIds.has(matchedItem.id)) {
        processedCardIds.add(matchedItem.id)
        
        // 添加卡片或卡组信息
        result.push({
          id: matchedItem.id,
          name: matchedItem.title,
          card: matchedItem,
          isGroup: matchedItem.type === 'group'
        })
      }
    }
  })
  
  // 缓存结果
  messageKeywordsMap.value[msg.id] = result
  return result
}

// 添加弹窗位置样式的响应式变量
const popupStyle = ref({})

// 修改切换引用卡片弹窗的方法，添加事件参数用于获取点击位置
const toggleReferencePopup = (event, msgId) => {
  // 阻止事件冒泡
  event.stopPropagation()
  
  if (activeReferencePopup.value === msgId) {
    activeReferencePopup.value = null
  } else {
    activeReferencePopup.value = msgId
    
    // 计算弹窗位置
    const rect = event.target.getBoundingClientRect()
    
    // 设置弹窗位置样式
    popupStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 10}px`,
      left: `${rect.left}px`,
      // 确保弹窗不会超出窗口右侧边界
      maxWidth: `${window.innerWidth - rect.left - 20}px`
    }
    
    // 延迟一下，确保弹窗已渲染后再调整位置
    setTimeout(() => {
      const popup = document.querySelector('.reference-popup')
      if (popup) {
        // 检查是否会超出底部边界
        const popupRect = popup.getBoundingClientRect()
        if (popupRect.bottom > window.innerHeight) {
          // 如果会超出底部，则改为显示在标签上方
          popupStyle.value.top = `${rect.top - popupRect.height - 10}px`
        }
      }
    }, 0)
  }
}

// 确保关闭弹窗方法也阻止事件冒泡
const closeReferencePopup = (event) => {
  if (event) event.stopPropagation()
  activeReferencePopup.value = null
}

// 切换引用卡片展开状态也需要阻止事件冒泡
const toggleReferenceCard = (cardId, event) => {
  if (event) event.stopPropagation()
  
  const index = expandedReferenceCards.value.indexOf(cardId)
  if (index === -1) {
    expandedReferenceCards.value.push(cardId)
  } else {
    expandedReferenceCards.value.splice(index, 1)
  }
}

// 在消息内容变化时清除缓存的关键词
watch(() => currentChat.value?.messages, () => {
  messageKeywordsMap.value = {}
}, { deep: true })

// 添加点击文档其他地方关闭弹窗的功能
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (activeReferencePopup.value !== null) {
      closeReferencePopup()
    }
  })
})

</script>

<style scoped>
@import url("../styles/chatView.css");

/* 在现有样式后添加 */
.chat-input {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.role-selector {
  display: flex;
  align-items: center;
}

.role-toggle-btn {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.role-toggle-btn:hover {
  background: #f5f5f5;
}

.role-toggle-btn.assistant {
  background: #e6f4ff;
  border-color: #1890ff;
  color: #1890ff;
}

.input-textarea {
  flex: 1;
  /* 保留原有样式 */
}

.role-toggle-btn.visitor {
  background: #f6ffed;
  border-color: #52c41a;
  color: #52c41a;
}

.chat-input-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.input-keywords-area {
  margin-bottom: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 引用标签样式 */
.reference-tag {
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  padding: 4px 8px;
  background-color: #f0f7ff;
  border: 1px solid #d0e3ff;
  border-radius: 4px;
  font-size: 12px;
  color: #1976d2;
  cursor: pointer;
  transition: all 0.2s;
}

.reference-tag:hover {
  background-color: #d0e3ff;
}

.reference-tag i {
  margin-right: 4px;
}

/* 修改引用卡片弹窗样式 */
.reference-popup {
  width: 300px;
  max-height: 400px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000; /* 增加z-index确保弹窗显示在最上层 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.reference-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.reference-popup-content {
  padding: 10px;
  overflow-y: auto;
  flex: 1;
}

.reference-card {
  margin-bottom: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.reference-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f9f9f9;
  cursor: pointer;
}

.reference-card-content {
  padding: 10px;
  max-height: 200px;
  overflow-y: auto;
  background-color: #fff;
  white-space: pre-wrap;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

/* 为消息添加相对定位，使弹窗定位正确 */
.message {
  position: relative;
}

/* 添加卡组相关样式 */
.group-badge {
  font-size: 12px;
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.group-card {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  margin-bottom: 8px;
  padding: 8px;
  background-color: #fafafa;
}

.group-card-title {
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}

.group-card-content {
  font-size: 12px;
  color: #666;
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>