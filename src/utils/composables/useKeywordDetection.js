import { ref, computed } from 'vue'
import { debugLog } from '../debug'

export function useKeywordDetection(tags, scenes) {
  const showKeywordModal = ref(false)
  const keywordMatches = ref([])
  const keywordModalResolve = ref(null)
  const showKeywordDetectionModal = ref(true) // Default enabled
  
  // Computed property to check if all matches are selected
  const isAllSelected = computed(() => {
    return keywordMatches.value.length > 0 && 
           keywordMatches.value.every(match => match.selected)
  })
  
  // Toggle all matches selection
  const toggleAll = (checked) => {
    keywordMatches.value.forEach(match => match.selected = checked)
  }
  
  // Close keyword modal
  const closeKeywordModal = () => {
    showKeywordModal.value = false
    if (keywordModalResolve.value) {
      keywordModalResolve.value(null)
    }
  }
  
  // Confirm keyword selection
  const confirmKeywordSelection = () => {
    showKeywordModal.value = false
    if (keywordModalResolve.value) {
      const selectedMatches = keywordMatches.value.filter(match => match.selected)
      keywordModalResolve.value(selectedMatches)
    }
  }
  
  // Process keywords in text
  const processKeywords = async (text) => {
    const processedCards = new Set()
    let matches = []
    const keywordTags = tags.value.filter(tag => tag.isKeyword)
    
    // Get all cards from all scenes
    const getAllCards = () => {
      const allCards = []
      scenes.value.forEach(scene => {
        if (scene.cards && Array.isArray(scene.cards)) {
          allCards.push(...scene.cards)
        }
      })
      return allCards
    }
  
    // Find card by ID
    const findCardById = (cardId) => {
      return getAllCards().find(card => card.id === cardId)
    }
    
    // Recursively process card and its linked cards
    const processCard = (card) => {
      if (!card || processedCards.has(card.id)) return // Avoid circular references and empty cards
      processedCards.add(card.id)
      
      debugLog('Processing card:', card.title)
      
      // Check if card has keyword tags
      const hasKeywordTag = card.tags?.some(tagId => 
        keywordTags.some(tag => tag.id === tagId)
      )
  
      // Check if text includes card title (improved matching logic)
      const titleIncluded = card.title && text.toLowerCase().includes(card.title.toLowerCase())
      
      // Add more matching conditions: check if text includes key phrases from card content
      const contentKeywords = card.content ? extractKeyPhrases(card.content) : []
      const contentMatched = contentKeywords.some(phrase => 
        text.toLowerCase().includes(phrase.toLowerCase())
      )
      
      debugLog('titleIncluded', titleIncluded)
      debugLog('contentMatched', contentMatched)
      
      if ((hasKeywordTag && (titleIncluded || contentMatched)) || (titleIncluded && card.title.length > 3)) {
        // Collect linked card content
        const linkedContents = []
        
        // Process linked cards
        if (card.links?.length > 0) {
          debugLog('Found linked cards:', card.links)
          card.links.forEach(linkedCardId => {
            const linkedCard = findCardById(linkedCardId)
            if (linkedCard) {
              debugLog('Processing linked card:', linkedCard.title)
              linkedContents.push(`关联内容「${linkedCard.title}」：\n${linkedCard.content || '无内容'}`)
              processCard(linkedCard) // Continue processing linked card's links
            }
          })
        }
  
        // Avoid adding duplicate cards
        const isDuplicate = matches.some(
          match => match.title === card.title
        )
        
        if (!isDuplicate) {
          let content = card.content || '无内容'
          
          // If there are linked contents, add them after main content
          if (linkedContents.length > 0) {
            content += '\n\n--- 关联内容 ---\n\n' + linkedContents.join('\n\n')
          }
  
          matches.push({
            keyword: card.title,
            title: card.title,
            content: content,
            type: card.type || 'normal',
            cards: card.type === 'group' ? card.cards : undefined,
            selected: false,
            selectedCards: []
          })
        }
      }
    }
  
    // Extract key phrases from content
    const extractKeyPhrases = (content) => {
      if (!content) return []
      
      // Split into sentences
      const sentences = content.split(/[.!?。！？]/g)
        .map(s => s.trim())
        .filter(s => s.length > 5 && s.length < 100) // Filter sentences that are too short or too long
      
      // Select the most representative sentences (simple implementation, can be improved)
      return sentences.slice(0, 5) // Take first 5 sentences as key phrases
    }
  
    // Process all cards in all scenes
    getAllCards().forEach(card => {
      processCard(card)
    })
  
    // If keyword matches found, decide whether to show selection modal based on settings
    if (matches.length > 0) {
      // Decide whether to show selection modal
      if (showKeywordDetectionModal.value) {
        keywordMatches.value = matches
        showKeywordModal.value = true
        const result = await new Promise(resolve => {
          keywordModalResolve.value = resolve
        })
        
        if (!result) return text
  
        // Process selected content
        const selectedContents = result.map(match => {
          if (match.type === 'group' && match.selectedCards?.length > 0) {
            return `关键词[${match.keyword}]：\n`+match.selectedCards.map(card => "【"+card.title+'】：\n```\n'+card.content+'\n```').join('\n\n')
          } else {
            return "【"+match.title+'】：\n```\n'+match.content+'\n```'
          }
        })
        
        const contextInfo = selectedContents.join('\n\n---\n\n')
        return `有关内容：\n${contextInfo}\n\n---\n\n${text}`
      } else {
         // If selection modal is disabled, process all matched content
         const allContents = matches.map(match => {
          if (match.type === 'group') {
            // If card group, use all cards in the group
            return `关键词[${match.keyword}]：\n`+match.cards?.map(card => "【"+card.title+'】：\n```\n'+card.content+'\n```').join('\n\n') || match.content
          } else {
            return "【"+match.title+'】：\n```\n'+match.content+'\n```'
          }
        })
        
        const contextInfo = allContents.join('\n\n---\n\n')
        return `有关内容：\n${contextInfo}\n\n---\n\n${text}`
      }
    }
  
    return text
  }
  
  // Handle match selection
  const handleMatchSelection = (match) => {
    if (match.type === 'group' && match.selected) {
      // If group is selected and not edited before, select all cards by default
      if (!match.selectedCards || match.selectedCards.length === 0) {
        match.selectedCards = [...(match.cards || [])]
      }
    }
  }
  
  // Toggle keyword detection modal setting
  const toggleKeywordDetectionModal = () => {
    showKeywordDetectionModal.value = !showKeywordDetectionModal.value
    return showKeywordDetectionModal.value
  }
  
  return {
    showKeywordModal,
    keywordMatches,
    showKeywordDetectionModal,
    isAllSelected,
    toggleAll,
    closeKeywordModal,
    confirmKeywordSelection,
    processKeywords,
    handleMatchSelection,
    toggleKeywordDetectionModal
  }
} 