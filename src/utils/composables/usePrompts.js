import { ref, computed } from 'vue'
import { showToast } from '../common'
import { sendToModel } from '../modelRequests'
import { debugLog } from '../debug'

export function usePrompts(syncData, scenes, currentScene) {
  const prompts = ref([])
  const showPromptModal = ref(false)
  const showPromptSelectModal = ref(false)
  const editingPrompt = ref(null)
  const selectedPrompt = ref(null)
  const showPromptDetailModal = ref(false)
  const cardToInsert = ref(null)
  const showPlaceholderModal = ref(false)
  const currentPlaceholders = ref([])
  const categories = ref(['扩写', '润色', '续写', '改写', '大纲相关', '细纲生成', '概要生成', '优化建议', '灵感迸发', '拆书', '金手指生成', '黄金开篇生成', '写作要求', '简介生成', '书名生成', '取名生成', '人设生成', '审稿'])
  const selectedCategory = ref('')
  const showBuiltInPrompts = ref(false)
  const builtInPrompts = ref([])
  
  // Form for prompt editing
  const promptForm = ref({
    title: '',
    systemPrompt: '',
    userPrompt: '',
    defaultModel: '',
    detectKeywords: true,
    category: ''
  })
  
  // Compute filtered prompts by category
  const filteredPrompts = computed(() => {
    return prompts.value.filter(prompt => {
      return selectedCategory.value ? prompt.category === selectedCategory.value : true
    })
  })
  
  // Compute insertable prompts
  const insertablePrompts = computed(() => {
    return prompts.value.filter(prompt => getInsertCount(prompt.userPrompt) > 0)
  })
  
  // Create a new prompt
  const createNewPrompt = () => {
    showPromptModal.value = true
    editingPrompt.value = null // Clear editing state
    promptForm.value = {
      title: '',
      systemPrompt: '',
      userPrompt: '', 
      defaultModel: '',
      detectKeywords: true,
      category: ''
    }
  }
  
  // Edit an existing prompt
  const editPrompt = (prompt) => {
    editingPrompt.value = prompt
    promptForm.value = { ...prompt }
    showPromptModal.value = true
  }
  
  // Close prompt modal
  const closePromptModal = () => {
    showPromptModal.value = false
    editingPrompt.value = null
    // Reset form
    promptForm.value = {
      title: '',
      systemPrompt: '',
      userPrompt: '{{text}}',
      defaultModel: '',
      detectKeywords: true,
      category: ''
    }
  }
  
  const savePrompt = async () => {
    if (!promptForm.value.title || !promptForm.value.userPrompt) {
      showToast('请填写标题和用户提示词', 'error')
      return false
    }

    try {
      const newPrompt = {
        id: editingPrompt.value?.id || Date.now(),
        title: promptForm.value.title,
        systemPrompt: promptForm.value.systemPrompt || '',
        userPrompt: promptForm.value.userPrompt,
        defaultModel: promptForm.value.defaultModel || '',
        insertedContents: editingPrompt.value?.insertedContents || [],
        selectedModel: promptForm.value.defaultModel || '',
        detectKeywords: promptForm.value.detectKeywords,
        category: promptForm.value.category
      }

      if (editingPrompt.value) {
        const index = prompts.value.findIndex(p => p.id === editingPrompt.value.id)
        if (index !== -1) {
          prompts.value[index] = newPrompt
        }
      } else {
        prompts.value.push(newPrompt)
      }

      // Sync to backend
      await syncData()
      
      closePromptModal()
      showToast('提示词保存成功', 'success')
      return true
    } catch (error) {
      console.error('保存提示词失败:', error)
      showToast('保存提示词失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Send prompt request
  const sendPromptRequest = async (prompt, processKeywords, models) => {
    if (!prompt.userPrompt.trim()) {
      showToast('请输入提示词内容', 'error')
      return null
    }

    const model = models.find(m => m.id === prompt.selectedModel)
    if (!model) {
      showToast('请选择有效的模型', 'error')
      return null
    }

    try {
      let processedTemplate = prompt.userPrompt

      // Process inserted content replacement
      if (prompt.insertedContents?.length > 0) {
        const insertedTexts = prompt.insertedContents
          .filter(item => item && item.content)
          .map(item => item.content)
          .join('\n')
        processedTemplate = processedTemplate.replace(/{{text}}/g, insertedTexts)
      }

      // Only execute keyword detection if enabled
      if (prompt.detectKeywords) {
        processedTemplate = await processKeywords(processedTemplate)
      }
      
      showToast('正在发送请求...')
      // Use sendToModel to send request
      const content = await sendToModel(
        model,
        processedTemplate,
        [], // Empty context array
        null, // No abortController
        prompt.systemPrompt // System prompt as template
      )

      debugLog('content', content)

      // Create new card
      const newCard = {
        id: Date.now(),
        content,
        title: prompt.title ? `来自提示词「${prompt.title}」的回复` : '生成的内容',
        height: '200px',
        tags: []
      }
      
      debugLog('newCard', newCard)

      if (currentScene.value) {
        currentScene.value.cards.push(newCard)
        
        // Update scene in scenes array
        const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
        if (sceneIndex !== -1) {
          scenes.value[sceneIndex] = {
            ...currentScene.value,
            cards: [...currentScene.value.cards]
          }
        }
      }

      showToast('回复成功！')
      return newCard
    } catch (error) {
      console.error('API 请求错误:', error)
      showToast(error.message, 'error')
      return null
    }
  }
  
  // Import prompts
  const importPrompts = async (event) => {
    const files = event.target.files
    if (!files.length) return 0

    try {
      let importedCount = 0
      
      for (const file of files) {
        let content = await file.text()
        
        if (file.name.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(content)
            
            // Handle array format
            if (Array.isArray(jsonData)) {
              for (const item of jsonData) {
                if (typeof item === 'object') {
                  prompts.value.push({
                    id: Date.now() + Math.random(),
                    title: item.title || file.name,
                    systemPrompt: item.systemPrompt || '',
                    userPrompt: item.userPrompt || item.template || item.content || '{{text}}',
                    defaultModel: item.defaultModel || '',
                    selectedModel: item.defaultModel || '',
                    insertedContents: [],
                    detectKeywords: item.detectKeywords !== false
                  })
                  importedCount++
                }
              }
            } 
            // Handle single object format
            else if (typeof jsonData === 'object') {
              prompts.value.push({
                id: Date.now() + Math.random(),
                title: jsonData.title || file.name,
                systemPrompt: jsonData.systemPrompt || '',
                userPrompt: jsonData.userPrompt || jsonData.template || jsonData.content || '{{text}}',
                defaultModel: jsonData.defaultModel || '',
                selectedModel: jsonData.defaultModel || '',
                insertedContents: [],
                detectKeywords: jsonData.detectKeywords !== false
              })
              importedCount++
            }
          } catch (e) {
            console.warn('JSON 解析失败，作为普通文本处理', e)
            // Process as plain text
            prompts.value.push({
              id: Date.now() + Math.random(),
              title: file.name,
              systemPrompt: '',
              userPrompt: content.trim(),
              defaultModel: '',
              selectedModel: '',
              insertedContents: [],
              detectKeywords: true
            })
            importedCount++
          }
        } else {
          // Handle plain text files
          prompts.value.push({
            id: Date.now() + Math.random(),
            title: file.name,
            systemPrompt: '',
            userPrompt: content.trim(),
            defaultModel: '',
            selectedModel: '',
            insertedContents: [],
            detectKeywords: true
          })
          importedCount++
        }
      }

      // Clear file input
      event.target.value = ''
      
      // Sync to backend
      await syncData()
      
      showToast(`成功导入 ${importedCount} 个提示词模板`)
      return importedCount
    } catch (error) {
      console.error('提示词导入错误:', error)
      showToast('提示词导入失败: ' + error.message, 'error')
      // Clear file input
      event.target.value = ''
      return 0
    }
  }
  
  // Export prompts
  const exportPrompts = () => {
    try {
      if (prompts.value.length === 0) {
        showToast('没有可导出的提示词', 'error')
        return false
      }

      // Prepare export data
      const exportData = prompts.value.map(prompt => ({
        title: prompt.title || '',
        systemPrompt: prompt.systemPrompt || '',
        userPrompt: prompt.userPrompt || '',
        defaultModel: prompt.defaultModel || '',
        detectKeywords: prompt.detectKeywords !== false
      }))

      // Convert to JSON string
      const jsonStr = JSON.stringify(exportData, null, 2)
      
      // Create download link
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prompts_export_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('提示词导出成功')
      return true
    } catch (error) {
      console.error('导出提示词失败:', error)
      showToast('导出提示词失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Delete prompt
  const deletePrompt = async (promptId) => {
    try {
      if (!confirm('确定要删除这个提示词吗？')) return false
      
      prompts.value = prompts.value.filter(p => p.id !== promptId)
      await syncData()
      showToast('提示词删除成功', 'success')
      return true
    } catch (error) {
      console.error('删除提示词失败:', error)
      showToast('删除提示词失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Insert content to prompt
  const insertContentToPrompt = (card) => {
    cardToInsert.value = card
    showPromptSelectModal.value = true
  }
  
  // Check if prompt has inserted content
  const hasInsertedContent = (prompt) => {
    return Array.isArray(prompt?.insertedContents) && prompt.insertedContents.length > 0
  }
  
  // Remove inserted content
  const removeInsertedContent = (prompt, index) => {
    prompt.insertedContents.splice(index, 1)
    syncData()
  }
  
  // Select prompt for insertion
  const selectPrompt = (prompt) => {
    selectedPrompt.value = prompt
  }
  
  // Helper function to calculate placeholder count
  const getInsertCount = (promptTemplate) => {
    if (!promptTemplate) return 0
    return (promptTemplate.match(/{{text}}/g) || []).length
  }
  
  // Check if prompt can insert text
  const canInsertText = (prompt) => {
    if (!prompt?.userPrompt) return false
    return getInsertCount(prompt.userPrompt) > 0
  }
  
  // Check if prompt can send request
  const canSendRequest = (prompt) => {
    if (!prompt?.userPrompt) return false
    return prompt.userPrompt.trim().length > 0
  }
  
  // Select prompt and check for placeholders
  const selectPromptAndCheck = async (prompt) => {
    selectedPrompt.value = prompt
    const placeholders = findPlaceholders(prompt.userPrompt)
    
    if (placeholders.length === 0) {
      showToast('该提示词模板中没有可插入的占位符', 'error')
      return false
    }
    
    if (placeholders.length === 1) {
      // Single placeholder case
      const existingContent = prompt.insertedContents?.[0]
      if (existingContent) {
        if (await confirmReplace()) {
          handleInsertContent(prompt, 0)
        }
      } else {
        handleInsertContent(prompt, 0)
      }
    } else {
      // Multiple placeholders case
      currentPlaceholders.value = placeholders.map((_, index) => ({
        hasContent: !!prompt.insertedContents?.[index],
        content: prompt.insertedContents?.[index]?.content || ''
      }))
      showPlaceholderModal.value = true
    }
    return true
  }
  
  // Handle placeholder selection
  const handlePlaceholderSelect = async (index) => {
    if (currentPlaceholders.value[index].hasContent) {
      if (await confirmReplace()) {
        handleInsertContent(selectedPrompt.value, index)
      }
    } else {
      handleInsertContent(selectedPrompt.value, index)
    }
    closePlaceholderModal()
  }
  
  // Confirm replace content
  const confirmReplace = () => {
    return new Promise(resolve => {
      if (confirm('该提示词已有插入内容，是否替换？')) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  }
  
  // Close placeholder modal
  const closePlaceholderModal = () => {
    showPlaceholderModal.value = false
    currentPlaceholders.value = []
  }
  
  // Find placeholders in template
  const findPlaceholders = (template) => {
    if (!template) return []
    const matches = template.match(/{{text}}/g) || []
    return matches
  }
  
  // Get placeholder preview
  const getPlaceholderPreview = (template, index) => {
    if (!template) return ''
    const parts = template.split(/{{text}}/)
    let preview = ''
    for (let i = 0; i <= index + 1 && i < parts.length; i++) {
      preview += parts[i]
      if (i === index) {
        preview += '【插入位置】'
      } else if (i < index) {
        preview += '...'
      }
    }
    return preview.length > 100 ? preview.substring(0, 97) + '...' : preview
  }
  
  // Handle insert content
  const handleInsertContent = (prompt, index) => {
    if (!cardToInsert.value) return
    
    if (!prompt.insertedContents) {
      prompt.insertedContents = []
    }
    
    prompt.insertedContents[index] = {
      id: Date.now(),
      content: cardToInsert.value.content,
      cardId: cardToInsert.value.id
    }
    
    const promptIndex = prompts.value.findIndex(p => p.id === prompt.id)
    if (promptIndex !== -1) {
      prompts.value[promptIndex] = { ...prompt }
    }
    
    showPromptSelectModal.value = false
    showPlaceholderModal.value = false
    
    cardToInsert.value = null
    
    showToast('内容已插入到提示词')
    
    syncData()
  }
  
  // Fetch built-in prompts
  const fetchBuiltInPrompts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/built-in-prompts')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.success) {
        builtInPrompts.value = data.data
        return true
      } else {
        throw new Error(data.error || '获取数据失败')
      }
    } catch (error) {
      console.error('获取内置提示词失败:', error)
      showToast('获取内置提示词失败: ' + error.message, 'error')
      return false
    }
  }
  
  // Check if prompt is imported
  const isPromptImported = (builtInId) => {
    return prompts.value.some(p => p.builtInId === builtInId)
  }
  
  // Import built-in prompt
  const importBuiltInPrompt = (builtInPrompt) => {
    if (isPromptImported(builtInPrompt.id)) return false
    
    const newPrompt = {
      ...builtInPrompt,
      id: Date.now(),
      builtInId: builtInPrompt.id,
      selectedModel: '',
      insertedContents: []
    }
    
    prompts.value.push(newPrompt)
    showToast(`已导入提示词：${builtInPrompt.title}`, 'success')
    syncData()
    return true
  }

  return {
    prompts,
    filteredPrompts,
    insertablePrompts,
    showPromptModal,
    showPromptSelectModal,
    showPromptDetailModal,
    showPlaceholderModal,
    editingPrompt,
    selectedPrompt,
    promptForm,
    cardToInsert,
    currentPlaceholders,
    categories,
    selectedCategory,
    showBuiltInPrompts,
    builtInPrompts,
    createNewPrompt,
    editPrompt,
    closePromptModal,
    savePrompt,
    sendPromptRequest,
    importPrompts,
    exportPrompts,
    deletePrompt,
    insertContentToPrompt,
    hasInsertedContent,
    removeInsertedContent,
    selectPrompt,
    getInsertCount,
    canInsertText,
    canSendRequest,
    selectPromptAndCheck,
    handlePlaceholderSelect,
    closePlaceholderModal,
    getPlaceholderPreview,
    fetchBuiltInPrompts,
    isPromptImported,
    importBuiltInPrompt
  }
} 