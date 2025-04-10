import { ref } from 'vue'
import { showToast } from '../common'

export function useCards(syncData, scenes, currentScene) {
  const selectedCard = ref(null)
  const showCardDetailModal = ref(false)
  
  // Delete a card
  const deleteCard = async (id) => {
    try {
      if (!currentScene.value) return false

      // Remove the card from the current scene
      currentScene.value.cards = currentScene.value.cards.filter(card => card.id !== id)

      // Update the scene in the scenes array
      const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
      if (sceneIndex !== -1) {
        scenes.value[sceneIndex] = {
          ...currentScene.value,
          cards: [...currentScene.value.cards]
        }
      }

      // Close card detail modal if the deleted card is selected
      if (selectedCard.value?.id === id) {
        showCardDetailModal.value = false
        selectedCard.value = null
      }

      // Sync data to the backend
      await syncData()
      
      showToast('卡片删除成功', 'success')
      return true
    } catch (error) {
      console.error('删除卡片失败:', error)
      showToast('删除卡片失败: ' + error.message, 'error')
      return false
    }
  }

  // Update a card
  const updateCard = async (card) => {
    try {
      if (!currentScene.value) return false

      const cardIndex = currentScene.value.cards.findIndex(c => c.id === card.id)
      if (cardIndex !== -1) {
        currentScene.value.cards[cardIndex] = {
          ...card,
          insertedContents: card.insertedContents || []
        }

        // Update the scene
        const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
        if (sceneIndex !== -1) {
          scenes.value[sceneIndex] = {
            ...currentScene.value,
            cards: [...currentScene.value.cards]
          }
        }

        // Sync data to the backend
        await syncData()
        return true
      }
      return false
    } catch (error) {
      console.error('更新卡片失败:', error)
      showToast('更新卡片失败: ' + error.message, 'error')
      return false
    }
  }

  // View card details
  const viewCardDetail = (card) => {
    selectedCard.value = card
    showCardDetailModal.value = true
  }

  // Move a card between scenes
  const moveCardToScene = async ({ card, sourceSceneId, targetSceneId }) => {
    try {
      const sourceSceneIndex = scenes.value.findIndex(s => s.id === sourceSceneId)
      const targetSceneIndex = scenes.value.findIndex(s => s.id === targetSceneId)
      
      if (sourceSceneIndex === -1 || targetSceneIndex === -1) {
        throw new Error('场景不存在')
      }
      
      const newScenes = [...scenes.value]
      
      newScenes[sourceSceneIndex].cards = newScenes[sourceSceneIndex].cards.filter(c => c.id !== card.id)
      
      newScenes[targetSceneIndex].cards.push({ ...card })
      
      scenes.value = newScenes
      
      if (currentScene.value?.id === sourceSceneId) {
        currentScene.value = newScenes[sourceSceneIndex]
      }
      
      await syncData()
      
      showToast(`已将卡片移动到「${newScenes[targetSceneIndex].name}」`)
      return true
    } catch (error) {
      console.error('移动卡片失败:', error)
      showToast('移动卡片失败: ' + error.message, 'error')
      return false
    }
  }

  const addToNotepad = (cardData, setNotepadContent, setCurrentView) => {
    setCurrentView('note')
    
    const formattedContent = `# ${cardData.title}\n\n${cardData.content}`
    
    setNotepadContent('')
    setTimeout(() => {
      setNotepadContent(formattedContent)
    }, 10)
    
    showToast('已添加到记事本')
  }

  const insertMdSyntax = (card, prefix, suffix, editorTextarea) => {
    const textarea = editorTextarea
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = card.content
    const selectedText = text.substring(start, end)
    
    const newText = text.substring(0, start) + 
                   prefix + selectedText + suffix +
                   text.substring(end)
    
    const updatedCard = {
      ...card,
      content: newText
    }
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      )
    }, 10)
    
    return updatedCard
  }

  return {
    selectedCard,
    showCardDetailModal,
    deleteCard,
    updateCard,
    viewCardDetail,
    moveCardToScene,
    addToNotepad,
    insertMdSyntax
  }
} 