import { showToast } from './common'

// 格式化API URL
const formatApiUrl = (model) => {
  switch (model.provider) {
    case 'openai':
      return `${model.apiUrl.replace(/\/+$/, '')}/v1/chat/completions`
    case 'ollama':
      return 'http://localhost:11434/api/chat'
    case 'custom':
      return model.apiUrl
    default:
      return model.apiUrl
  }
}

// 构建请求体
const buildRequestBody = (model, messages, context = []) => {
  // 限制最大 token 为 16k
  const MAX_TOKENS = 16000

  // 获取模型设置的 maxTokens，如果超过限制则使用限制值
  const maxTokens = Math.min(Number(model.maxTokens) || 2048, MAX_TOKENS)

  switch (model.provider) {
    case 'openai':
    case 'mistral':
    case 'custom':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        max_tokens: maxTokens,
        temperature: Number(model.temperature) || 0.7
      }
    case 'stepfun':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        max_tokens: maxTokens,
        temperature: Number(model.temperature) || 0.7,
        stream: false
      }
    case 'gemini':
      return null
    case 'ollama':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        stream: false,
        options: {
          temperature: Number(model.temperature) || 0.7,
          max_tokens: maxTokens
        }
      }
    default:
      throw new Error(`不支持的模型提供商: ${model.provider}`)
  }
}

// 构建请求头
const buildHeaders = (model) => {
  const headers = {
    'Content-Type': 'application/json'
  }

  if (model.apiKey) {
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
      case 'custom':
        headers['Authorization'] = `Bearer ${model.apiKey}`
        break
      case 'gemini':
        break
    }
  }

  return headers
}

// 解析响应
const parseResponse = async (response, model) => {
  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`
    const errorData = await response.json().catch(() => ({}))
    
    if (errorData.error?.message) {
      errorMessage = errorData.error.message
    } else if (errorData.error?.code) {
      errorMessage = `服务器错误 (${errorData.error.code})`
    }
    
    if (model.provider === 'gemini' && response.status === 403) {
      errorMessage = "Gemini API 认证失败 (403)。请检查您的 API 密钥是否正确。"
    }
    
    throw new Error(errorMessage)
  }

  // 对于 Ollama，解析标准响应格式
  if (model.provider === 'ollama') {
    const result = await response.json()
    if (result.message?.content) {
      return result.message.content
    }
    throw new Error('无法从 Ollama 响应中提取内容')
  }

  // 其他提供商使用 JSON 响应
  const result = await response.json()
  
  switch (model.provider) {
    case 'openai':
    case 'stepfun':
    case 'mistral':
    case 'custom':
      return result.choices[0].message.content
    case 'gemini':
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text
      }
      throw new Error('无法解析 Gemini 响应')
    default:
      throw new Error(`不支持的模型提供商: ${model.provider}`)
  }
}


// 修改发送请求到模型的方法，添加提示词支持
export const sendToModel = async (
  model, 
  message, 
  context = [], 
  abortController = null,
  promptTemplate = null
) => {
  try {
    if (model.provider === 'gemini') {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(model.apiKey);
      const genModel = genAI.getGenerativeModel({ model: model.modelId });
            
      // Convert context and messages to Gemini format
      const history = [...context, ...messages].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const chat = genModel.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: Number(model.maxTokens) || 2048,
          temperature: Number(model.temperature) || 0.7
        }
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    }

    // Handle other providers as before
    let url = formatApiUrl(model)
    const headers = buildHeaders(model)
    
    let finalContext = context
    if (promptTemplate) {
      finalContext = [
        { role: 'system', content: promptTemplate },
        ...context
      ]
    }

    const body = buildRequestBody(model, [{ role: 'user', content: message }], finalContext)
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortController?.signal
    })
    return await parseResponse(response, model)
  } catch (error) {
    showToast(error.message, 'error')
    console.error('API 请求错误:', error)
    throw error
  }
} 