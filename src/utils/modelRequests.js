// 格式化API URL
const formatApiUrl = (model) => {
  switch (model.provider) {
    case 'openai':
      return `${model.apiUrl.replace(/\/+$/, '')}/chat/completions`
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent`
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
  switch (model.provider) {
    case 'openai':
    case 'stepfun':
    case 'mistral':
    case 'custom':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        max_tokens: Number(model.maxTokens) || 2048,
        temperature: Number(model.temperature) || 0.7
      }
    case 'gemini':
      const contents = []
      for (const msg of [...context, ...messages]) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })
      }
      return {
        contents,
        generationConfig: {
          maxOutputTokens: Number(model.maxTokens) || 2048,
          temperature: Number(model.temperature) || 0.7
        }
      }
    case 'ollama':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        options: {
          temperature: Number(model.temperature) || 0.7
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
        // Gemini 使用 URL 参数传递 API key
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
    case 'ollama':
      return result.message?.content || result.response
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
  promptTemplate = null // 新增提示词模板参数
) => {
  try {
    let url = formatApiUrl(model)
    
    if (model.provider === 'gemini') {
      url += `?key=${model.apiKey}`
    }

    const headers = buildHeaders(model)
    
    // 如果有提示词模板，添加到上下文开头
    let finalContext = context
    if (promptTemplate) {
      finalContext = [
        { role: 'system', content: promptTemplate },
        ...context
      ]
    }

    const body = buildRequestBody(model, [{ role: 'user', content: finalMessage }], finalContext)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortController?.signal
    })

    return await parseResponse(response, model)
  } catch (error) {
    console.error('API 请求错误:', error)
    throw error
  }
} 