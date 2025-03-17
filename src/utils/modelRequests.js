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



  switch (model.provider) {
    case 'openai':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        max_tokens: model.maxTokens,
        temperature: Number(model.temperature) || 0.7
      }
    case 'mistral':
    case 'custom':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        max_tokens: model.maxTokens,
        temperature: Number(model.temperature) || 0.7
      }
    case 'stepfun':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        max_tokens: model.maxTokens,
        temperature: Number(model.temperature) || 0.7,
        stream: false
      }
    case 'gemini':
      return null
    case 'ollama':
      return {
        model: model.modelId,
        messages: [...context, ...messages],
        stream: true,
        options: {
          temperature: Number(model.temperature) || 0.7,
          //max_tokens: model.maxTokens
          max_tokens: 4096
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
    try {
      // 克隆响应以便可以多次读取
      const errorResponse = response.clone();
      const errorText = await errorResponse.text();
      console.error('API 错误响应原始内容:', errorText);
      
      try {
        // 尝试将响应解析为 JSON
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error?.code) {
          errorMessage = `服务器错误 (${errorData.error.code})`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (jsonError) {
        // 如果不是有效的 JSON，使用原始错误文本
        if (errorText && errorText.length < 200) {
          errorMessage = `请求失败: ${response.status} - ${errorText}`;
        }
      }
    } catch (error) {
      console.error('解析错误响应失败:', error);
    }
    
    if (model.provider === 'gemini' && response.status === 403) {
      errorMessage = "Gemini API 认证失败 (403)。请检查您的 API 密钥是否正确。";
    }
    
    throw new Error(errorMessage);
  }

  try {
    // 克隆响应以便可以多次读取
    const responseClone = response.clone();
    
    // 对于 Ollama，解析标准响应格式
    if (model.provider === 'ollama') {
      try {
        // 获取响应文本
        const responseText = await responseClone.text();
        console.log('Ollama 原始响应:', responseText.substring(0, 200) + '...');
        
        // 处理 Ollama 的流式响应格式
        // Ollama 返回的是多行 JSON，每行是一个独立的 JSON 对象
        const lines = responseText.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
          // 尝试解析最后一个完整的消息（通常包含完整回复）
          try {
            const lastLine = lines[lines.length - 1];
            const lastJson = JSON.parse(lastLine);
            
            if (lastJson.message?.content && lastJson.done === true) {
              return lastJson.message.content;
            }
          } catch (e) {
            console.warn('解析 Ollama 最后一行失败:', e);
          }
          
          // 如果无法解析最后一行，尝试拼接所有内容
          try {
            let fullContent = '';
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  fullContent += json.message.content;
                }
              } catch (e) {
                console.warn(`解析 Ollama 行失败: ${line}`, e);
              }
            }
            
            if (fullContent) {
              return fullContent;
            }
          } catch (e) {
            console.warn('拼接 Ollama 内容失败:', e);
          }
        }
        
        // 如果上述方法都失败，直接返回原始文本
        return responseText;
      } catch (error) {
        console.error('解析 Ollama 响应失败:', error);
        
        // 尝试读取原始响应文本
        try {
          const text = await response.clone().text();
          if (text) return text;
        } catch (textError) {
          console.error('读取 Ollama 响应文本失败:', textError);
        }
        
        throw new Error('无法解析 Ollama 响应');
      }
    }

    // 其他提供商使用 JSON 响应
    try {
      const responseText = await responseClone.text();
      console.log('API 响应原始内容:', responseText.substring(0, 200) + '...');
      
      // 尝试解析 JSON
      try {
        const result = JSON.parse(responseText);
        
        switch (model.provider) {
          case 'openai':
          case 'stepfun':
          case 'mistral':
          case 'custom':
            if (result.choices && result.choices[0]?.message?.content) {
              return result.choices[0].message.content;
            }
            // 尝试其他可能的响应格式
            if (result.content) {
              return result.content;
            }
            if (result.text) {
              return result.text;
            }
            break;
          case 'gemini':
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
              return result.candidates[0].content.parts[0].text;
            }
            break;
        }
        
        // 通用解析尝试
        if (result.content) return result.content;
        if (result.text) return result.text;
        if (result.message) return result.message;
        if (typeof result === 'string') return result;
      } catch (jsonError) {
        console.error('JSON 解析失败:', jsonError);
        // 如果 JSON 解析失败，直接返回响应文本
        return responseText;
      }
      
      // 如果所有解析尝试都失败，但有响应文本，则返回文本
      if (responseText) return responseText;
      
      throw new Error('无法从响应中提取内容');
    } catch (error) {
      console.error('解析响应失败:', error);
      
      // 最后尝试读取原始响应
      try {
        const text = await response.text();
        if (text) return text;
      } catch (finalError) {
        console.error('读取响应文本最终失败:', finalError);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('解析响应失败:', error);
    throw error;
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
      const history = [
        {
          role: 'user',
          parts: [{ text: promptTemplate }]
        },
        {
          role: 'model',
          parts: [{ text: '好的，我已理解系统提示。' }]
        }
      ];

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
    
    // 添加调试日志
    console.log('发送请求到模型:', {
      url,
      provider: model.provider,
      modelId: model.modelId,
      maxTokens: body?.max_tokens || (body?.options?.max_tokens),
      headers: { ...headers, Authorization: headers.Authorization ? '已设置' : '未设置' },
      bodyStructure: {
        hasModel: !!body?.model,
        messageCount: body?.messages?.length || 0,
        hasMaxTokens: !!body?.max_tokens,
        hasTemperature: !!body?.temperature
      }
    })
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortController?.signal
    })
    
    // 如果响应不成功，记录更多信息
    if (!response.ok) {
      console.error('API 响应错误:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      })
      
      // 尝试获取响应体
      const errorText = await response.text()
      console.error('API 错误响应体:', errorText)
      
      // 重置 response 以便后续处理
      const errorResponse = new Response(errorText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
      
      return await parseResponse(errorResponse, model)
    }
    
    return await parseResponse(response, model)
  } catch (error) {
    showToast(error.message, 'error')
    console.error('API 请求错误:', error)
    throw error
  }
} 