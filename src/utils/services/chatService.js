import { sendToModel } from '../modelRequests'
import { showToastMessage } from '../common'

export class ChatService {
  constructor() {
    this.abortController = null
  }

  // 发送消息
  async sendMessage(message, options) {
    const {
      model,
      context = [],
      promptTemplate = null,
      enableKeywords = false,
      keywords = [],
      getKeywordContent
    } = options

    try {
      // 处理关键词检测
      let processedContent = message
      if (enableKeywords && keywords.length > 0) {
        let keywordsContext = '检测到以下相关内容:\n\n'
        for (const keyword of keywords) {
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
        processedContent = keywordsContext + '用户问题:\n' + message
      }

      // 创建新的终止控制器
      this.abortController = new AbortController()

      // 发送请求
      const response = await sendToModel(
        model,
        processedContent,
        context,
        this.abortController,
        promptTemplate
      )
      //console.log('response', response)
      return {
        success: true,
        data: response
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      return {
        success: false,
        error: error
      }
    }
  }

  // 终止请求
  abortRequest() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
      return true
    }
    return false
  }

  // 保存聊天会话
  saveChatSessions(sessions) {
    try {
      localStorage.setItem('chatSessions', JSON.stringify(sessions))
      return true
    } catch (error) {
      console.error('保存聊天会话失败:', error)
      showToastMessage('保存聊天会话失败: ' + error.message, 'error')
      return false
    }
  }

  // 加载聊天会话
  loadChatSessions() {
    try {
      const saved = localStorage.getItem('chatSessions')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('加载聊天会话失败:', error)
      showToastMessage('加载聊天会话失败: ' + error.message, 'error')
      return []
    }
  }

  // 创建新的聊天会话
  createNewChat() {
    return {
      id: Date.now(),
      title: '新对话',
      messages: [],
      modelId: '',
      promptId: '',
      enableKeywords: false,
      historyTurns: 20
    }
  }
}

// 导出单例实例
export const chatService = new ChatService() 