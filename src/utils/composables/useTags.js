import { ref } from 'vue'
import { showToast } from '../common'

export function useTags(syncData, scenes) {
  const tags = ref([])
  const selectedTags = ref([])
  const showTagModal = ref(false)
  const newTagName = ref('')
  
  // Add a new tag
  const addTag = async () => {
    if (newTagName.value.trim()) {
      const tag = {
        id: Date.now(),
        name: newTagName.value.trim(),
        isKeyword: false
      }
      tags.value.push(tag)
      await syncData()
      newTagName.value = '' // Clear input
      showToast('标签添加成功', 'success')
      return tag
    }
    return null
  }
  
  // Delete a tag
  const deleteTag = async (tagId) => {
    try {
      // Confirm deletion
      if (!confirm('确定要删除这个标签吗？')) return false
      
      // Remove from tags list
      tags.value = tags.value.filter(tag => tag.id !== tagId)
      
      // Remove references from all cards in all scenes
      scenes.value.forEach(scene => {
        if (scene.cards && Array.isArray(scene.cards)) {
          scene.cards.forEach(card => {
            if (card.tags && Array.isArray(card.tags)) {
              card.tags = card.tags.filter(id => id !== tagId)
            }
            // Handle cards in card groups
            if (card.type === 'group' && card.cards && Array.isArray(card.cards)) {
              card.cards.forEach(groupCard => {
                if (groupCard.tags && Array.isArray(groupCard.tags)) {
                  groupCard.tags = groupCard.tags.filter(id => id !== tagId)
                }
              })
            }
          })
        }
      })
      
      // Remove from selected tags
      selectedTags.value = selectedTags.value.filter(id => id !== tagId)
      
      // Sync data
      await syncData()
      
      showToast('标签删除成功', 'success')
      return true
    } catch (error) {
      console.error('删除标签失败:', error)
      showToast('删除标签失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Toggle tag's keyword status
  const toggleTagKeyword = (tagId) => {
    const tag = tags.value.find(t => t.id === tagId)
    if (tag) {
      tag.isKeyword = !tag.isKeyword
      syncData()
      return true
    }
    return false
  }
  
  // Toggle tag selection
  const toggleTagSelection = (tagId) => {
    const index = selectedTags.value.indexOf(tagId)
    if (index === -1) {
      selectedTags.value.push(tagId)
    } else {
      selectedTags.value.splice(index, 1)
    }
    syncData()
  }
  
  // Check if a tag is selected
  const isTagSelected = (tagId) => {
    return selectedTags.value.includes(tagId)
  }
  
  // Get tag by ID
  const getTagById = (tagId) => {
    return tags.value.find(tag => tag.id === tagId)
  }
  
  // Get tag name by ID
  const getTagNameById = (tagId) => {
    const tag = getTagById(tagId)
    return tag ? tag.name : ''
  }
  
  // Filter cards by selected tags
  const filterCardsByTags = (cards) => {
    if (selectedTags.value.length === 0) {
      return cards
    }
    
    return cards.filter(card => {
      if (!card.tags || !Array.isArray(card.tags)) {
        return false
      }
      
      // Check if card has at least one of the selected tags
      return card.tags.some(tagId => selectedTags.value.includes(tagId))
    })
  }
  
  return {
    tags,
    selectedTags,
    showTagModal,
    newTagName,
    addTag,
    deleteTag,
    toggleTagKeyword,
    toggleTagSelection,
    isTagSelected,
    getTagById,
    getTagNameById,
    filterCardsByTags
  }
} 