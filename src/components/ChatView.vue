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
        <select v-model="currentChat.modelId" class="model-select">
          <option value="">选择模型</option>
          <option 
            v-for="model in models" 
            :key="model.id" 
            :value="model.id"
          >
            {{ model.name }}
          </option>
        </select>
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
              <button class="icon-btn delete" @click="deleteMessage(msg.id)">
                <i class="fas fa-trash"></i>
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

// 创建新对话
const createNewChat = () => {
  const newChat = {
    id: Date.now(),
    title: '新对话',
    modelId: '',
    messages: []
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

// 发送消息
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

    // 调用 API 获取回复
    const response = await sendToModel(model, userMessage.content)
    
    const assistantMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    }
    
    currentChat.value.messages.push(assistantMessage)
    saveSessions()
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('发送消息失败:', error)
    alert('发送失败: ' + error.message)
  }
}

// 调用模型 API
const sendToModel = async (model, content) => {
  let response
  let result

  try {
    if (model.provider === 'openai') {
      response = await fetch(model.apiUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [{ role: 'user', content }],
          max_tokens: Number(model.maxTokens),
          temperature: Number(model.temperature)
        })
      })
      
      result = await response.json()
      return result.choices[0].message.content

    } else if (model.provider === 'gemini') {
      response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': model.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: content }] }],
          generationConfig: {
            temperature: Number(model.temperature),
            maxOutputTokens: Number(model.maxTokens),
          }
        })
      })
      
      result = await response.json()
      return result.candidates[0].content.parts[0].text

    } else if (model.provider === 'ollama') {
      response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            {
              role: "user",
              content: content
            }
          ],
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
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100%;
  background: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
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
  font-size: 1.1em;
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
  font-size: 0.95em;
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
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
}

.model-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 240px;
  font-size: 0.95em;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
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
  margin-bottom: 6px;
  gap: 8px;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.85em;
  background: #e3f2fd;
  color: #1976d2;
}

.message-time {
  font-size: 0.8em;
  color: #666;
}

.message-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-left: auto;
}

.message:hover .message-actions {
  opacity: 1;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  line-height: 1.5;
}

.user .message-content {
  background: #e3f2fd;
  color: #1976d2;
}

.assistant .message-content {
  background: #fff;
  color: #333;
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
  font-size: 0.95em;
  line-height: 1.5;
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
  padding: 12px;
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
</style> 