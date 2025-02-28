import { apiUtils } from '../common'

const API_BASE_URL = 'http://localhost:3000/api'

export class DataService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // 同步数据到后端
  async syncToBackend(data) {
    try {
      const response = await fetch(`${this.baseUrl}/sync-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      return await apiUtils.handleResponse(response)
    } catch (error) {
      console.error('后端同步失败:', error)
      throw error
    }
  }

  // 保存到本地存储
  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`保存${key}失败:`, error)
      throw error
    }
  }

  // 从本地存储加载
  loadFromLocalStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch (error) {
      console.error(`加载${key}失败:`, error)
      return defaultValue
    }
  }

  // 保存所有数据
  async saveAllData(data) {
    try {
      // 保存到本地存储
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          this.saveToLocalStorage(key, value)
        }
      })

      // 同步到后端
      await this.syncToBackend(data)
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  // 加载所有数据
  async loadAllData() {
    try {
      // 从本地存储加载数据
      const data = {
        scenes: this.loadFromLocalStorage('scenes', []),
        prompts: this.loadFromLocalStorage('prompts', []),
        tags: this.loadFromLocalStorage('tags', []),
        config: this.loadFromLocalStorage('config', {})
      }

      return data
    } catch (error) {
      console.error('加载数据失败:', error)
      throw error
    }
  }

  // 初始化数据
  async initializeData(data) {
    const defaultData = {
      scenes: [],
      prompts: [],
      tags: [],
      config: {
        models: [],
        notepadContent: '',
        currentView: 'main',
        selectedTags: [],
        currentSceneId: null
      }
    }

    return {
      ...defaultData,
      ...data
    }
  }

  // 加载后端数据
  async loadBackendData() {
    try {
      const response = await fetch(`${this.baseUrl}/get-all-data`)
      const result = await apiUtils.handleResponse(response)
      
      if (!result.success || !result.data) {
        throw new Error('后端数据加载失败')
      }
      
      return this.processBackendData(result.data)
    } catch (error) {
      console.error('从后端加载数据失败:', error)
      // 尝试从本地存储加载
      return this.loadFromLocalBackup()
    }
  }

  // 处理后端数据
  processBackendData(backendData) {
    const processedData = {
      models: [],
      prompts: [],
      tags: [],
      scenes: [],
      config: {}
    }

    // 处理模型配置
    if (backendData.config?.models) {
      processedData.models = backendData.config.models.map(model => ({
        ...model,
        provider: model.provider || 'custom',
        maxTokens: model.maxTokens || 512,
        temperature: model.temperature || 0.7
      }))
    }

    // 处理其他数据
    if (Array.isArray(backendData.prompts)) {
      processedData.prompts = backendData.prompts
    }
    
    if (Array.isArray(backendData.tags)) {
      processedData.tags = backendData.tags
    }
    
    if (Array.isArray(backendData.scenes)) {
      processedData.scenes = backendData.scenes
    }

    // 处理配置
    if (backendData.config) {
      processedData.config = {
        notepadContent: backendData.config.notepadContent || '',
        currentView: backendData.config.currentView || 'main',
        selectedTags: backendData.config.selectedTags || [],
        currentSceneId: backendData.config.currentSceneId
      }
    }

    // 保存到本地存储作为备份
    this.saveToLocalStorage('models', processedData.models)
    this.saveToLocalStorage('prompts', processedData.prompts)

    return processedData
  }

  // 从本地备份加载
  async loadFromLocalBackup() {
    try {
      const models = this.loadFromLocalStorage('models', []).map(model => ({
        ...model,
        provider: model.provider || 'custom',
        maxTokens: model.maxTokens || 512,
        temperature: model.temperature || 0.7
      }))

      const prompts = this.loadFromLocalStorage('prompts', [])
      const tags = this.loadFromLocalStorage('tags', [])
      const scenes = this.loadFromLocalStorage('scenes', [])
      const config = this.loadFromLocalStorage('config', {
        currentView: 'main',
        selectedTags: [],
        notepadContent: ''
      })

      return { models, prompts, tags, scenes, config }
    } catch (error) {
      console.error('从本地备份加载失败:', error)
      throw error
    }
  }
}

// 导出单例实例
export const dataService = new DataService() 