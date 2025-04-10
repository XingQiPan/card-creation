import { ref, computed } from 'vue'
import { showToast } from '../common'

export function useUISettings(syncData) {
  const fontSizeLevel = ref(3) // Default level 3 (medium size)
  const cardLayoutMode = ref('auto') // Default to adaptive layout
  const cardColumns = ref(3) // Default to 3 columns
  const promptPanelWidth = ref(300)
  const isResizing = ref(false)
  const startX = ref(0)
  const startWidth = ref(0)
  
  // Compute base font size
  const baseFontSize = computed(() => {
    // Base font sizes from 14px to 128px, 10 levels
    const sizes = {
      1: 14, // Extra small
      2: 16, // Small
      3: 18, // Medium (default)
      4: 20, // Large
      5: 22, // Extra large
      6: 32, // Huge
      7: 48, // Extra huge
      8: 64, // Gigantic
      9: 96, // Extra gigantic
      10: 128, // Maximum
    }
    return sizes[fontSizeLevel.value] || 18
  })
  
  // Increase font size
  const increaseFontSize = () => {
    if (fontSizeLevel.value < 10) {
      fontSizeLevel.value++
      applyFontSize()
    }
  }
  
  // Decrease font size
  const decreaseFontSize = () => {
    if (fontSizeLevel.value > 1) {
      fontSizeLevel.value--
      applyFontSize()
    }
  }
  
  // Apply font size to document
  const applyFontSize = () => {
    document.documentElement.style.setProperty('--base-font-size', `${baseFontSize.value}px`)
    syncData()
  }
  
  // Increase columns
  const increaseColumns = () => {
    if (cardColumns.value < 6) { // Set maximum columns to 6
      cardColumns.value++
      applyCardLayout()
    }
  }
  
  // Decrease columns
  const decreaseColumns = () => {
    if (cardColumns.value > 1) { // Minimum columns is 1
      cardColumns.value--
      applyCardLayout()
    }
  }
  
  // Apply card layout settings
  const applyCardLayout = () => {
    document.documentElement.style.setProperty('--card-layout-mode', cardLayoutMode.value)
    document.documentElement.style.setProperty('--card-columns', cardColumns.value)
    // Save settings
    syncData()
  }
  
  // Start panel resize
  const startPanelResize = (e) => {
    isResizing.value = true
    startX.value = e.clientX
    startWidth.value = promptPanelWidth.value
  
    document.addEventListener('mousemove', handlePanelResize)
    document.addEventListener('mouseup', stopPanelResize)
  }
  
  // Handle panel resize
  const handlePanelResize = (e) => {
    if (!isResizing.value) return
    const diff = e.clientX - startX.value
    promptPanelWidth.value = Math.max(200, Math.min(600, startWidth.value + diff))
  }
  
  // Stop panel resize
  const stopPanelResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handlePanelResize)
    document.removeEventListener('mouseup', stopPanelResize)
  }
  
  // Prevent text selection during drag
  const preventTextSelection = (prevent) => {
    document.body.style.userSelect = prevent ? 'none' : ''
  }
  
  // Toggle preview mode
  const isPreview = ref(false)
  const togglePreview = () => {
    isPreview.value = !isPreview.value
    return isPreview.value
  }
  
  return {
    fontSizeLevel,
    baseFontSize,
    cardLayoutMode,
    cardColumns,
    promptPanelWidth,
    isResizing,
    isPreview,
    increaseFontSize,
    decreaseFontSize,
    applyFontSize,
    increaseColumns,
    decreaseColumns,
    applyCardLayout,
    startPanelResize,
    handlePanelResize,
    stopPanelResize,
    preventTextSelection,
    togglePreview
  }
} 