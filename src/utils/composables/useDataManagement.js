import { ref } from 'vue'
import { showToast } from '../common'
import { dataService } from '../services/dataService'
import { debugLog } from '../debug'

export function useDataManagement() {
  const isLoading = ref(false)
  const dataLoaded = ref(false)
  
  // Sync data to backend with debounce
  const createDebounce = (fn, delay) => {
    let timer = null
    return (...args) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fn(...args)
        timer = null
      }, delay)
    }
  }
  
  const saveImmediately = async (data) => {
    try {
      isLoading.value = true

      const result = await dataService.saveAllData(data)
      
      if (!result.success) {
        throw new Error(result.error || '同步失败，未知错误')
      }

      showToast('保存成功', 'success')
      return true
    } catch (error) {
      console.error('立即保存失败:', error)
      showToast('保存失败: ' + error.message, 'error')
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  const loadAllData = async () => {
    try {
      isLoading.value = true
      
      const data = await dataService.loadAllData()
      
      dataLoaded.value = true
      return data
    } catch (error) {
      console.error('数据加载失败:', error)
      showToast('数据加载失败: ' + error.message, 'error')
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  const initializeData = (data = {}, config = {}) => {
    try {
      const safeData = data || {};
      
      if (Array.isArray(safeData.scenes)) {
        config.setScenes?.(safeData.scenes);
      } else {
        debugLog('Loading scene data is invalid:', safeData.scenes);
        config.setScenes?.([]);
      }
      
      if (Array.isArray(safeData.prompts)) {
        config.setPrompts?.(safeData.prompts);
      } else {
        debugLog('Loading prompt data is invalid:', safeData.prompts);
        config.setPrompts?.([]);
      }
      
      if (Array.isArray(safeData.tags)) {
        config.setTags?.(safeData.tags);
      } else {
        debugLog('Loading tag data is invalid:', safeData.tags);
        config.setTags?.([]);
      }

      if (safeData.config) {
        if (Array.isArray(safeData.config.models)) {
          config.setModels?.(safeData.config.models.map(model => ({
            ...model,
            provider: model.provider || 'custom',
            maxTokens: model.maxTokens || 2048,
            temperature: model.temperature || 0.7
          })));
        }
        
        if (safeData.config.notepadContent !== undefined) {
          config.setNotepadContent?.(safeData.config.notepadContent);
        }
        
        if (safeData.config.currentView) {
          config.setCurrentView?.(safeData.config.currentView);
        }
        
        if (Array.isArray(safeData.config.selectedTags)) {
          config.setSelectedTags?.(safeData.config.selectedTags);
        }
        
        const scenes = config.scenes || [];
        
        // Handle current scene
        if (safeData.config.currentSceneId && scenes.length > 0) {
          const scene = scenes.find(s => s.id === safeData.config.currentSceneId);
          if (scene) {
            config.setCurrentScene?.(scene);
          } else if (scenes.length > 0) {
            config.setCurrentScene?.(scenes[0]);
          }
        } else if (scenes.length > 0) {
          config.setCurrentScene?.(scenes[0]);
        }
        
        if (safeData.config.fontSizeLevel) {
          config.setFontSizeLevel?.(safeData.config.fontSizeLevel);
        }
        
        if (safeData.config.cardLayoutMode) {
          config.setCardLayoutMode?.(safeData.config.cardLayoutMode);
        }
        
        if (safeData.config.cardColumns) {
          config.setCardColumns?.(safeData.config.cardColumns);
        }
        
        if (typeof safeData.config.showKeywordDetectionModal === 'boolean') {
          config.setShowKeywordDetectionModal?.(safeData.config.showKeywordDetectionModal);
        }
      }
      
      return true;
    } catch (error) {
      console.error('初始化数据失败:', error);
      showToast('初始化数据失败: ' + error.message, 'error');
      return false;
    }
  }
  
  const handleFilesImport = async (event, currentScene, scenes, syncData) => {
    const files = event.target.files
    if (!files.length) return false

    try {
      isLoading.value = true
      
      for (const file of files) {
        let content = await file.text()
        
        if (file.name.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(content)
            if (Array.isArray(jsonData.cards)) {
              // Create new scene
              const newScene = {
                id: Date.now(),
                name: jsonData.name || file.name.replace('.json', ''),
                cards: jsonData.cards.map(card => ({
                  ...card,
                  id: Date.now() + Math.random(),
                  height: card.height || '120px',
                  tags: Array.isArray(card.tags) ? card.tags : []
                }))
              }
              scenes.value.push(newScene)
              currentScene.value = newScene
            } else if (Array.isArray(jsonData)) {
              const newCards = jsonData.map(item => ({
                id: Date.now() + Math.random(),
                title: typeof item === 'object' ? (item.title || '') : '',
                content: typeof item === 'object' ? (item.content || JSON.stringify(item)) : String(item),
                height: '120px',
                tags: []
              }))
              if (currentScene.value) {
                currentScene.value.cards.push(...newCards)
              }
            } else {
              const newCard = {
                id: Date.now() + Math.random(),
                title: '',
                content: JSON.stringify(jsonData, null, 2),
                height: '120px',
                tags: []
              }
              if (currentScene.value) {
                currentScene.value.cards.push(newCard)
              }
            }
          } catch (e) {
            console.warn('JSON parsing failed, treating as text')
            if (currentScene.value) {
              currentScene.value.cards.push({
                id: Date.now() + Math.random(),
                title: file.name,
                content: content,
                height: '120px',
                tags: []
              })
            }
          }
        }
      }
      
      await syncData()
      showToast('文件导入成功', 'success')
      return true
    } catch (error) {
      console.error('文件导入失败:', error)
      showToast('文件导入失败: ' + error.message, 'error')
      return false
    } finally {
      isLoading.value = false
      event.target.value = ''
    }
  }
  
  const createSyncFunction = (getData) => {
    return createDebounce(async () => {
      if (!dataLoaded.value) return

      try {
        isLoading.value = true
        
        const dataToSync = getData()

        const result = await dataService.saveAllData(dataToSync)
        
        if (!result.success) {
          throw new Error(result.error || '同步失败，未知错误')
        }
        
        return result
      } catch (error) {
        console.error('数据同步失败:', error)
        showToast(`数据同步失败: ${error.message}`, 'error')
        return { success: false, error: error.message }
      } finally {
        isLoading.value = false
      }
    }, 500) 
  }

  return {
    isLoading,
    dataLoaded,
    createSyncFunction,
    loadAllData,
    initializeData,
    handleFilesImport,
    saveImmediately
  }
} 