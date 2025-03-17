import { sendToModel } from '../modelRequests'
import { showToastMessage } from '../common'
import { debugLog } from '../debug'

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

      // 检查是否为 Gemini 模型
      const isGemini = model.provider === 'gemini' || 
                      (model.parameters?.model || '').includes('gemini')

      if (isGemini) {
        // 获取纯 API key，移除可能存在的 Bearer 前缀
        const apiKey = model.apiKey?.replace('Bearer ', '') || 
                      model.headers?.Authorization?.replace('Bearer ', '') || 
                      ''
                      
        if (!apiKey) {
          throw new Error('Gemini API key not found')
        }

        const { GoogleGenerativeAI } = await import("@google/generative-ai")
        const genAI = new GoogleGenerativeAI(apiKey)
        
        // 获取正确的模型 ID
        const modelId = model.parameters?.model || model.modelId || "gemini-1.5-pro"
        
        const genModel = genAI.getGenerativeModel({ 
          model: modelId,
          generationConfig: {
            maxOutputTokens: Number(model.parameters?.max_tokens) || 2048,
            temperature: Number(model.parameters?.temperature) || 0.7,
            topP: Number(model.parameters?.top_p) || 1
          }
        })

        try {
          // 确保处理后的内容不为空
          if (!processedContent || processedContent.trim() === '') {
            processedContent = "请回答我的问题";
          }
          
          // 参考 modelRequests.js 中的方法
          // 创建初始历史，包含系统提示
          let history = [];
          
          if (promptTemplate) {
            console.log('为 Gemini 添加系统提示词:', promptTemplate.substring(0, 50) + '...');
            history = [
              {
                role: 'user',
                parts: [{ text: promptTemplate }]
              },
              {
                role: 'model',
                parts: [{ text: '好的，我已理解系统提示。' }]
              }
            ];
          }
          
          // 创建聊天会话
          const chat = genModel.startChat({
            history: history,
            generationConfig: {
              maxOutputTokens: Number(model.parameters?.max_tokens) || 2048,
              temperature: Number(model.parameters?.temperature) || 0.7
            }
          });
          
          console.log('发送到 Gemini 的用户内容:', processedContent.substring(0, 100) + '...');
          
          // 发送消息并获取流式响应
          const result = await chat.sendMessageStream(processedContent);
          
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              onChunk(chunkText);
            }
          }

          return { success: true };
        } catch (error) {
          console.error('Gemini API error:', error);
          throw error;
        }
      } else {
        // 确保使用正确的 endpoint
        if (!model.endpoint) {
          throw new Error('模型配置错误：未设置 endpoint')
        }
        
        // 确保提示词被正确传递
        console.log('发送请求到模型，提示词:', promptTemplate ? promptTemplate.substring(0, 50) + '...' : '无');
        
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
    console.log('提示词模板:', promptTemplate ? '已设置' : '未设置')

    if (!endpoint) {
      throw new Error('模型配置错误：未设置 endpoint')
    }

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      ...buildHeaders(model)
    }

    // 处理上下文和提示词
    let finalContext = [...context]  // 创建上下文的副本
    if (promptTemplate) {
      // 将系统提示词添加到上下文的开头
      finalContext = [
        { role: 'system', content: promptTemplate },
        ...finalContext
      ]
      console.log('已添加系统提示词到请求:', promptTemplate.substring(0, 50) + '...');
    }

    // 检查 API URL 是否包含 siliconflow
    const isSiliconFlow = (model.apiUrl && model.apiUrl.includes('siliconflow')) || 
                          (endpoint && endpoint.includes('siliconflow'));
    
    // 设置安全的 max_tokens 值
    let maxTokens = Number(model.parameters?.max_tokens) || 2048;
    
    // 针对 siliconflow API 特殊处理
    if (isSiliconFlow) {
      // 对于 siliconflow API，强制限制为 4000 (略小于4096以确保安全)
      maxTokens = Math.min(maxTokens, 4000);
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
          max_tokens: maxTokens,
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
            max_tokens: maxTokens
          }
        }
        break
      default:
        // 对于其他提供商，使用通用参数但确保 max_tokens 在安全范围内
        requestBody = {
          ...requestBody,
          ...model.parameters,
          max_tokens: maxTokens
        }
    }

    const requestConfig = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: this.abortController?.signal
    }
    
    // 添加更详细的日志
    debugLog('model', model);
    debugLog('url', formatApiUrl(model));
    debugLog('请求体:', {
      modelId: requestBody.model,
      max_tokens: requestBody.max_tokens,
      isSiliconFlow: isSiliconFlow,
      messageCount: requestBody.messages.length,
      hasSystemPrompt: finalContext.length > context.length
    });
    
    const response = await fetch(formatApiUrl(model), requestConfig)
    debugLog('response', response);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '未知错误')
      throw new Error(`请求失败 (${response.status}): ${errorText}`)
    }

    const reader = response.body.getReader()
    debugLog('reader', reader);
    const decoder = new TextDecoder()
    let buffer = ''

    // 特殊处理 Ollama 的响应
    if (model.provider === 'ollama') {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          // 按行分割
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''  // 保留最后一个不完整的行
          
          for (const line of lines) {
            if (line.trim() === '') continue
            
            try {
              const data = JSON.parse(line)
              if (data.message?.content) {
                onChunk(data.message.content)
              }
            } catch (e) {
              console.warn('解析 Ollama 数据块失败:', e, line)
            }
          }
        }
        
        // 处理缓冲区中剩余的数据
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer)
            if (data.message?.content) {
              onChunk(data.message.content)
            }
          } catch (e) {
            console.warn('解析 Ollama 最后数据块失败:', e)
          }
        }
        
        return { success: true }
      } catch (error) {
        console.error('Ollama 流式处理失败:', error)
        throw error
      }
    } else {
      // 原有的处理逻辑
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