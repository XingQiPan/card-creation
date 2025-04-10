import { apiUtils } from '../common'
import { debugLog } from '../debug'

const API_BASE_URL = 'http://localhost:3000/api'

export class DataService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // 同步数据到后端
  async syncToBackend(data) {
    try {
      debugLog('正在同步数据到后端...')
      const startTime = performance.now()
      
      const response = await fetch(`${this.baseUrl}/sync-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result = await apiUtils.handleResponse(response)
      
      const endTime = performance.now()
      debugLog(`数据同步完成，耗时: ${endTime - startTime}ms`)
      
      return result
    } catch (error) {
      console.error('后端同步失败:', error)
      throw error
    }
  }

  // 保存所有数据
  async saveAllData(data) {
    try {
      // 确保数据结构一致性
      const normalizedData = { ...data }
      
      if (!normalizedData.config) {
        normalizedData.config = {}
      }
      
      // 检查models是否直接挂在data下，而不是在config.models中
      if (Array.isArray(normalizedData.models) && !Array.isArray(normalizedData.config.models)) {
        normalizedData.config.models = normalizedData.models
        delete normalizedData.models
      } else if (!Array.isArray(normalizedData.config.models)) {
        normalizedData.config.models = []
      }
      
      // 准备同步到后端的数据
      const syncData = {
        scenes: normalizedData.scenes || [],
        prompts: normalizedData.prompts || [],
        tags: normalizedData.tags || [],
        knowledgeBases: normalizedData.knowledgeBases || [],
        chatSessions: normalizedData.chatSessions || [],
        config: {
          models: normalizedData.config.models || [],
          notepadContent: normalizedData.config.notepadContent || '',
          currentSceneId: normalizedData.config.currentSceneId || null,
          selectedTags: normalizedData.config.selectedTags || [],
          currentView: normalizedData.config.currentView || 'main',
          fontSizeLevel: normalizedData.config.fontSizeLevel,
          cardLayoutMode: normalizedData.config.cardLayoutMode,
          cardColumns: normalizedData.config.cardColumns,
          showKeywordDetectionModal: normalizedData.config.showKeywordDetectionModal
        }
      }

      // 同步到后端
      const result = await this.syncToBackend(syncData)
      
      return result
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  // 加载所有数据 - 直接从后端加载
  async loadAllData() {
    try {
      debugLog('正在从后端加载数据...')
      const startTime = performance.now()
      
      const response = await fetch(`${this.baseUrl}/get-all-data`)
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      const endTime = performance.now()
      debugLog(`数据加载完成，耗时: ${endTime - startTime}ms`)
      
      return data
    } catch (error) {
      console.error('从后端加载数据失败:', error)
      // 返回空数据结构
      return {
        scenes: [],
        prompts: [],
        tags: [],
        knowledgeBases: [],
        chatSessions: [],
        config: {
          models: [],
          notepadContent: '',
          currentSceneId: null,
          selectedTags: [],
          currentView: 'main'
        }
      }
    }
  }
  
  // 添加一个方法用于单个数据项的保存
  async saveItem(type, item) {
    try {
      debugLog(`保存${type}数据...`)
      
      // 根据数据类型构建请求路径
      let endpoint
      
      switch(type) {
        case 'scene':
        case 'scenes':
          endpoint = '/save-scenes'
          break
        case 'prompt':
        case 'prompts':
          endpoint = '/save-prompts'
          break
        case 'tag':
        case 'tags':
          endpoint = '/save-tags'
          break
        case 'knowledgeBases':
          // 使用同步API保存知识库数据
          return this.syncToBackend({ knowledgeBases: item })
        case 'chatSessions':
          endpoint = '/chat-sessions'
          break
        case 'bookScenes':
          endpoint = '/save-book-scenes'
          break
        case 'config':
          endpoint = '/save-config'
          break
        default:
          // 对于其他类型，使用通用同步API
          const data = {}
          data[type] = item
          return this.syncToBackend(data)
      }
      
      if (endpoint) {
        // 对于有专用API的数据类型，使用对应的API
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        })
        
        return await apiUtils.handleResponse(response)
      }
      
      return { success: true }
    } catch (error) {
      console.error(`保存${type}失败:`, error)
      throw error
    }
  }

  // 加载聊天会话的专用方法
  async loadChatSessions() {
    try {
      const response = await fetch(`${this.baseUrl}/chat-sessions`)
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('加载聊天会话失败:', error)
      throw error
    }
  }
  
  // 保存聊天会话的专用方法
  async saveChatSessions(chatSessions) {
    try {
      debugLog('正在保存聊天会话...')
      
      return await this.saveItem('chatSessions', chatSessions)
    } catch (error) {
      console.error('保存聊天会话失败:', error)
      throw error
    }
  }
}

// 导出单例实例
export const dataService = new DataService() 