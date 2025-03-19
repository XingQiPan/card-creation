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

  // 保存到本地存储 - 仅作为备份
  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`保存${key}失败:`, error)
      // 不抛出错误，因为这只是备份
    }
  }

  // 从本地存储加载 - 仅作为备份
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
      // 准备同步到后端的数据
      const syncData = {
        scenes: data.scenes || [],
        prompts: data.prompts || [],
        tags: data.tags || [],
        config: {
          models: data.models || [],
          notepadContent: data.config?.notepadContent || '',
          currentSceneId: data.config?.currentSceneId || null,
          selectedTags: data.config?.selectedTags || [],
          currentView: data.config?.currentView || 'main'
        }
      }

      // 同步到后端
      const result = await this.syncToBackend(syncData)
      
      // 保存到本地存储作为备份
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          this.saveToLocalStorage(key, value)
        }
      })
      
      return result
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  // 加载所有数据 - 现在直接从后端加载
  async loadAllData() {
    try {
      // 尝试从后端加载数据
      return await this.loadBackendData()
    } catch (error) {
      console.error('加载数据失败:', error)
      // 从本地存储加载作为备份
      return this.loadFromLocalBackup()
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
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // 保存到本地存储作为备份
      this.saveToLocalStorage('allData', data)
      
      return data
    } catch (error) {
      console.error('从后端加载数据失败:', error)
      // 尝试从本地存储加载作为备份
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

    return processedData
  }

  // 从本地备份加载 - 仅作为后备方案
  async loadFromLocalBackup() {
    console.warn('从本地备份加载数据 - 这应该只在后端不可用时发生')
    
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
      // 返回空数据而不是抛出错误
      return {
        models: [],
        prompts: [],
        tags: [],
        scenes: [],
        config: {
          currentView: 'main',
          selectedTags: [],
          notepadContent: ''
        }
      }
    }
  }
  
  // 添加一个方法用于单个数据项的保存
  async saveItem(type, item) {
    try {
      // 先从后端获取最新数据
      const allData = await this.loadBackendData()
      
      // 更新特定类型的数据
      if (type === 'model') {
        const index = allData.models.findIndex(m => m.id === item.id)
        if (index !== -1) {
          allData.models[index] = item
        } else {
          allData.models.push(item)
        }
      } else if (type === 'prompt') {
        const index = allData.prompts.findIndex(p => p.id === item.id)
        if (index !== -1) {
          allData.prompts[index] = item
        } else {
          allData.prompts.push(item)
        }
      } else if (type === 'tag') {
        const index = allData.tags.findIndex(t => t.id === item.id)
        if (index !== -1) {
          allData.tags[index] = item
        } else {
          allData.tags.push(item)
        }
      } else if (type === 'scene') {
        const index = allData.scenes.findIndex(s => s.id === item.id)
        if (index !== -1) {
          allData.scenes[index] = item
        } else {
          allData.scenes.push(item)
        }
      }
      
      // 保存更新后的数据
      return await this.saveAllData(allData)
    } catch (error) {
      console.error(`保存${type}失败:`, error)
      throw error
    }
  }

  // 添加 syncData 方法
  async syncData(data) {
    try {
      const response = await fetch(`${this.baseUrl}/sync-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 错误响应:', errorText);
        
        try {
          // 尝试解析错误响应为 JSON
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `API 请求失败: ${response.status}`);
        } catch (jsonError) {
          // 如果不是有效的 JSON，使用原始错误文本
          throw new Error(`API 请求失败: ${response.status} - ${errorText || response.statusText}`);
        }
      }
      
      // 尝试解析响应为 JSON
      try {
        const result = await response.json();
        return result;
      } catch (jsonError) {
        console.warn('API 响应不是有效的 JSON:', jsonError);
        // 返回一个简单的成功对象
        return { success: true };
      }
    } catch (error) {
      console.error('同步数据到后端失败:', error);
      // 保存到本地存储作为备份
      this.saveToLocalStorage('allData', data);
      throw error;
    }
  }

  // 添加保存聊天会话的专用方法
  async saveChatSessions(chatSessions) {
    try {
      const response = await fetch(`${this.baseUrl}/chat-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatSessions)
      });
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('保存聊天会话失败:', error);
      throw error;
    }
  }

  // 添加加载聊天会话的专用方法
  async loadChatSessions() {
    try {
      const response = await fetch(`${this.baseUrl}/chat-sessions`);
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('加载聊天会话失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const dataService = new DataService() 