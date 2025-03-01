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

  // 修改流式消息发送方法
  async sendStreamMessage(content, options) {
    const {
      model,
      context,
      promptTemplate,
      enableKeywords,
      keywords,
      getKeywordContent,
      onChunk
    } = options

    try {
      // 处理关键词内容
      let processedContent = content
      if (enableKeywords && keywords?.length > 0) {
        let keywordsContext = '检测到以下相关内容:\n\n'
        for (const keyword of keywords) {
          const content = getKeywordContent(keyword)
          if (content) {
            keywordsContext += `【${keyword.name}】:\n${content}\n\n`
          }
        }
        processedContent = keywordsContext + '用户问题:\n' + content
      }

      // 创建新的终止控制器
      this.abortController = new AbortController()

      //console.log('Processing model config:', model)

      // 检查是否为 Gemini 模型
      const isGemini = model.provider === 'gemini' || 
                      (model.parameters?.model || '').includes('gemini')
      //console.log('isGemini', isGemini)

      if (isGemini) {
        // 获取纯 API key，移除可能存在的 Bearer 前缀
        const apiKey = model.apiKey?.replace('Bearer ', '') || 
                      model.headers?.Authorization?.replace('Bearer ', '') || 
                      ''
                      
        if (!apiKey) {
          throw new Error('Gemini API key not found')
        }

       // console.log('Using API key:', apiKey)
        const { GoogleGenerativeAI } = await import("@google/generative-ai")
        const genAI = new GoogleGenerativeAI(apiKey)
        
        // 获取正确的模型 ID
        const modelId = model.parameters?.model || model.modelId || "gemini-1.5-pro"
        //console.log('Using Gemini model:', modelId)
        
        const genModel = genAI.getGenerativeModel({ 
          model: modelId,
          generationConfig: {
            maxOutputTokens: Number(model.parameters?.max_tokens) || 2048,
            temperature: Number(model.parameters?.temperature) || 0.7,
            topP: Number(model.parameters?.top_p) || 1
          }
        })

        // 转换上下文格式
        const history = [...(context || [])].map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))

        // 添加系统提示词
        if (promptTemplate) {
          history.unshift({
            role: 'model',
            parts: [{ text: promptTemplate }]
          })
        }

        console.log('Sending message to Gemini:', {
          content: processedContent,
          history: history
        })

        try {
          // 直接发送消息，不使用聊天历史
          const result = await genModel.generateContentStream([
            { text: processedContent }
          ])

          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            if (chunkText) {
              onChunk(chunkText)
            }
          }

          return { success: true }
        } catch (error) {
          console.error('Gemini API error:', error)
          throw error
        }
      } else {
        // 确保使用正确的 endpoint
        if (!model.endpoint) {
          throw new Error('模型配置错误：未设置 endpoint')
        }
        
        return await this.handleRegularStream(processedContent, {
          model,
          context,
          promptTemplate,
          onChunk
        })
      }
    } catch (error) {
      //console.error('流式消息发送失败:', error)
      return { 
        success: false, 
        error: error.name === 'AbortError' ? 
          new Error('请求已取消') : 
          error 
      }
    } finally {
      this.abortController = null
    }
  }

  // 处理常规流式请求
  async handleRegularStream(content, { model, context, promptTemplate, onChunk }) {
    const endpoint = model.endpoint
    //console.log('Using endpoint:', endpoint)

    if (!endpoint) {
      throw new Error('模型配置错误：未设置 endpoint')
    }

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      ...buildHeaders(model)
    }

    // 处理上下文和提示词
    let finalContext = context
    if (promptTemplate) {
      finalContext = [
        { role: 'system', content: promptTemplate },
        ...context
      ]
    }

    // 根据不同的提供商构建请求体
    let requestBody = {
      messages: [
        ...finalContext,
        { role: 'user', content: content }
      ],
      stream: true
    }

    // 添加模型特定的参数
    switch (model.provider) {
      case 'openai':
      case 'mistral':
      case 'custom':
        requestBody = {
          ...requestBody,
          model: model.modelId,
          max_tokens: Number(model.parameters?.max_tokens) || 2048,
          temperature: Number(model.parameters?.temperature) || 0.7
        }
        break
      case 'ollama':
        requestBody = {
          model: model.modelId,
          messages: requestBody.messages,
          stream: true,
          options: {
            temperature: Number(model.parameters?.temperature) || 0.7,
            max_tokens: Number(model.parameters?.max_tokens) || 2048
          }
        }
        break
      default:
        // 对于其他提供商，使用通用参数
        requestBody = {
          ...requestBody,
          ...model.parameters
        }
    }

    const requestConfig = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: this.abortController?.signal
    }

    const response = await fetch(endpoint, requestConfig)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '未知错误')
      throw new Error(`请求失败 (${response.status}): ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.trim() === '') continue
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const chunk = JSON.parse(data)
            // 根据不同的提供商解析响应
            let content = ''
            if (model.provider === 'ollama') {
              content = chunk.message?.content || ''
            } else {
              content = chunk.choices?.[0]?.delta?.content || ''
            }
            if (content) {
              onChunk(content)
            }
          } catch (e) {
            console.warn('解析数据块失败:', e)
          }
        }
      }
    }

    return { success: true }
  }
}

// 从 modelRequests.js 导入的辅助函数
const formatApiUrl = (model) => {
  switch (model.provider) {
    case 'openai':
      return `${model.apiUrl.replace(/\/+$/, '')}/v1/chat/completions`
    case 'ollama':
      return 'http://localhost:11434/api/chat'
    case 'custom':
      return model.apiUrl || model.endpoint
    default:
      return model.apiUrl || model.endpoint
  }
}

const buildHeaders = (model) => {
  const headers = {}

  if (model.apiKey) {
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
      case 'custom':
        headers['Authorization'] = `Bearer ${model.apiKey}`
        break
    }
  }

  // 添加自定义 headers
  if (model.headers) {
    Object.assign(headers, model.headers)
  }

  return headers
}

// 导出单例实例
export const chatService = new ChatService() 