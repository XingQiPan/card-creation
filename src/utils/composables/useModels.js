import { ref } from 'vue'
import { showToast } from '../common'

// Define provider types
const PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  OLLAMA: 'ollama',
  CUSTOM: 'custom',
  EMBEDDING: 'embedding'
}

export function useModels(syncData) {
  const models = ref([])
  const showSettings = ref(false)
  
  // Create default model configuration
  const createDefaultModel = () => ({
    id: Date.now().toString(), // Ensure ID is string type
    name: '新模型',
    provider: 'custom',
    apiUrl: '',
    apiKey: '',
    modelId: '',
    maxTokens: 2048,
    temperature: 0.7,
    availableModels: [],
    organizationId: ''
  })
  
  // Add a new model
  const addModel = () => {
    const newModel = createDefaultModel()
    models.value.push(newModel)
    return newModel
  }
  
  // Delete a model by ID
  const deleteModel = (id) => {
    models.value = models.value.filter(model => model.id !== id)
    syncData()
    return true
  }
  
  // Save models
  const saveModels = async () => {
    try {
      await syncData()
      showToast('模型配置保存成功')
      return true
    } catch (error) {
      console.error('保存模型失败:', error)
      showToast('保存模型失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Fetch model list from provider API
  const fetchModelList = async (model) => {
    try {
      if (model.provider === 'ollama') {
        const response = await fetch(`${model.apiUrl}/api/tags`)
        
        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`)
        }
        
        const result = await response.json()
        // Ollama returns an array of objects, need to parse correctly
        return result.models.map(model => {
          // Handle string or object case
          if (typeof model === 'string') {
            return {
              id: model,
              name: model
            }
          }
          // If object format, parse info
          return {
            id: model.name || model.model,
            name: model.name || model.model,
            digest: model.digest,
            size: model.size,
            modified_at: model.modified_at
          }
        })
      }
      else if(model.provider === 'openai'){
        const response = await fetch(`${model.apiUrl}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${model.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`)
        }
        
        const result = await response.json()
        // OpenAI returns an array of objects, need to parse correctly
        return result.data.map(model => {
          // Handle string or object case
          if (typeof model === 'string') {
            return {
              id: model,
              name: model
            }
          }
          // If object format, return correct model info
          return {
            id: model.id,
            name: model.id,
            created: model.created,
            owned_by: model.owned_by
          }
        })
      }
      return []
    } catch (error) {
      console.error('获取模型列表失败:', error)
      showToast('获取模型列表失败: ' + error.message, 'error')
      return []
    }
  }
  
  // Refresh model list
  const refreshModelList = async (model) => {
    try {
      // Custom type doesn't need API Key validation
      if (model.provider !== 'ollama' && model.provider !== 'custom' && !model.apiKey) {
        throw new Error('请先填写 API Key')
      }
      
      // Custom type must have model ID
      if (model.provider === 'custom') {
        if (!model.modelId) {
          throw new Error('请填写模型ID')
        }
        // Directly use manually entered model ID
        model.availableModels = [{
          id: model.modelId,
          name: model.modelId
        }]
        showToast('已设置自定义模型')
        return true
      }

      // Other types need API URL validation
      if (!model.apiUrl) {
        throw new Error('请先填写 API 地址')
      }
      
      // Ensure API URL format is correct
      let apiUrl = model.apiUrl.trim()
      apiUrl = apiUrl.replace(/\/$/, '')
      
      // Ollama and custom types don't need v1 path removal
      if (model.provider !== 'ollama' && model.provider !== 'custom') {
        apiUrl = apiUrl.replace(/\/(?:api\/)?v1$/, '')
      }
      
      model.apiUrl = apiUrl

      const modelList = await fetchModelList(model)
      if (modelList.length > 0) {
        model.availableModels = modelList
        showToast('获取模型列表成功主人~')
        return true
      } else {
        throw new Error('未获取到任何可用模型')
      }
    } catch (error) {
      console.error('获取模型列表失败:', error)
      showToast('获取模型列表失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Find model by ID
  const findModelById = (modelId) => {
    return models.value.find(model => model.id === modelId)
  }
  
  // Update model
  const updateModel = (updatedModel) => {
    const index = models.value.findIndex(model => model.id === updatedModel.id)
    if (index !== -1) {
      models.value[index] = { ...updatedModel }
      return true
    }
    return false
  }

  return {
    models,
    showSettings,
    PROVIDERS,
    createDefaultModel,
    addModel,
    deleteModel,
    saveModels,
    fetchModelList,
    refreshModelList,
    findModelById,
    updateModel
  }
} 