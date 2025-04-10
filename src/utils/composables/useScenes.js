import { ref, computed } from 'vue'
import { showToast } from '../common'

export function useScenes(syncData) {
  const scenes = ref([])
  const currentScene = ref(null)
  
  // Create a new scene
  const createNewScene = async () => {
    try {
      const newScene = {
        id: Date.now(),
        name: `场景 ${scenes.value.length + 1}`,
        cards: []
      }
      
      scenes.value.push(newScene)
      
      // Switch to the new scene
      switchScene(newScene)
      
      // Save changes
      await syncData()
      showToast('新场景创建成功', 'success')
      return newScene
    } catch (error) {
      console.error('创建场景失败:', error)
      showToast('创建场景失败: ' + error.message, 'error')
      return null
    }
  }

  const deleteScene = async (sceneId) => {
    if (!confirm('确定要删除这个场景吗？')) return false
    
    try {
      const index = scenes.value.findIndex(s => s.id === sceneId)
      if (index === -1) {
        throw new Error('场景不存在')
      }
      
      // If only one scene remains, don't allow deletion
      if (scenes.value.length <= 1) {
        throw new Error('至少需要保留一个场景')
      }
      
      // If deleting the current scene, switch to another scene first
      if (currentScene.value?.id === sceneId) {
        const nextScene = scenes.value[index + 1] || scenes.value[index - 1]
        switchScene(nextScene)
      }
      
      // Delete the scene
      scenes.value.splice(index, 1)
      
      // Save changes
      await syncData()
      showToast('场景删除成功', 'success')
      return true
    } catch (error) {
      console.error('删除场景失败:', error)
      showToast('删除场景失败: ' + error.message, 'error')
      return false
    }
  }

  const editSceneName = async (scene) => {
    const newName = prompt('请输入新的场景名称:', scene.name)
    if (newName && newName.trim()) {
      try {
        // 找到场景在数组中的位置
        const index = scenes.value.findIndex(s => s.id === scene.id)
        if (index === -1) {
          throw new Error('场景不存在')
        }
        
        // 更新场景名称
        scenes.value[index].name = newName.trim()
        
        // 如果当前场景就是被修改的场景，也更新currentScene
        if (currentScene.value && currentScene.value.id === scene.id) {
          currentScene.value.name = newName.trim()
        }
        
        // 保存更改
        const result = await syncData()
        
        if (result && !result.success) {
          throw new Error(result.error || '保存失败')
        }
        
        showToast('场景名称修改成功', 'success')
        return true
      } catch (error) {
        console.error('修改场景名称失败:', error)
        showToast('修改场景名称失败: ' + error.message, 'error')
        return false
      }
    }
    return false
  }

  const switchScene = (scene) => {
    try {
      if (!scene || !scene.id) {
        throw new Error('无效的场景')
      }
      
      // 找到原始场景数据
      const originalScene = scenes.value.find(s => s.id === scene.id)
      if (!originalScene) {
        throw new Error('场景不存在')
      }
      
      // Create deep copy and ensure card data integrity
      const clonedScene = JSON.parse(JSON.stringify({
        ...originalScene,
        cards: processCards(originalScene.cards || [])
      }))
      
      // Update current scene
      currentScene.value = clonedScene
      
      // Sync data
      syncData()
      
      return true
    } catch (error) {
      console.error('切换场景失败:', error)
      showToast('切换场景失败: ' + error.message, 'error')
      return false
    }
  }

  const exportScene = () => {
    try {
      if (!currentScene.value) {
        showToast('没有可导出的场景', 'error')
        return
      }
  
      const sceneData = {
        name: currentScene.value.name,
        cards: currentScene.value.cards.map(card => ({
          title: card.title || '',
          content: card.content || '',
          tags: card.tags || [],
          height: card.height || '120px'
        }))
      }
  
      const jsonStr = JSON.stringify(sceneData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentScene.value.name || 'scene'}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
  
      showToast('场景导出成功')
      return true
    } catch (error) {
      console.error('导出失败:', error)
      showToast('导出失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Helper function to process cards
  const processCards = (cards) => {
    return cards.map(card => {
      // If it's a card group type
      if (card.type === 'group') {
        return {
          ...card,
          // Recursively process cards within the group
          cards: card.cards ? processCards(card.cards) : [],
          // Ensure card IDs in the group don't appear in the outer layer
          containedCardIds: (card.cards || []).map(c => c.id)
        }
      }
      // Regular card
      return {
        ...card,
        type: 'normal'
      }
    }).filter((card, index, self) => {
      // Filter out cards that are already in a group
      if (card.type === 'normal') {
        const isContainedInGroup = self.some(c => 
          c.type === 'group' && 
          c.containedCardIds && 
          c.containedCardIds.includes(card.id)
        )
        return !isContainedInGroup
      }
      return true
    })
  }
  
  // Handle scene update
  const handleSceneUpdate = async (updatedScene) => {
    try {
      // Update local scene data
      const index = scenes.value.findIndex(s => s.id === updatedScene.id)
      if (index !== -1) {
        // Create a new scene array to trigger reactive update
        scenes.value = [
          ...scenes.value.slice(0, index),
          updatedScene,
          ...scenes.value.slice(index + 1)
        ]
      }
      
      await syncData()
      return true
    } catch (error) {
      console.error('更新场景失败:', error)
      showToast('更新场景失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Add cards to scene
  const addCardsToScene = async ({ sceneId, cards }) => {
    try {
      // Find target scene
      const targetScene = scenes.value.find(s => Number(s.id) === Number(sceneId))
      if (!targetScene) {
        throw new Error(`目标场景不存在 (ID: ${sceneId})`)
      }

      // Ensure scene has cards array
      if (!Array.isArray(targetScene.cards)) {
        targetScene.cards = []
      }

      // Add cards to target scene
      targetScene.cards.push(...cards)

      // Save changes
      await syncData()

      showToast(`成功添加 ${cards.length} 个卡片到场景：${targetScene.name}`, 'success')
      return true
    } catch (error) {
      console.error('添加卡片到场景失败:', error)
      showToast('添加卡片失败: ' + error.message, 'error')
      return false
    }
  }

  return {
    scenes,
    currentScene,
    createNewScene,
    deleteScene,
    editSceneName,
    switchScene,
    exportScene,
    processCards,
    handleSceneUpdate,
    addCardsToScene
  }
} 