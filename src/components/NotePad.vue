<template>
  <div class="notepad-container">
    <!-- 左侧卡片列表 -->
    <div class="notes-list">
      <div class="list-header">
        <h3>笔记列表</h3>
        <button @click="createNewNote" class="primary-btn">
          <i class="fas fa-plus"></i> 新建笔记
        </button>
      </div>
      
      <div class="notes">
        <div 
          v-for="note in notes" 
          :key="note.id"
          :class="['note-card', { active: currentNoteId === note.id }]"
          @click="currentNoteId = note.id"
        >
          <div class="note-card-content">
            <div class="note-title">{{ note.title || '无标题笔记' }}</div>
            <div class="note-preview">{{ getPreview(note.content) }}</div>
            <div class="note-info">
              <span class="note-time">{{ formatTime(note.updatedAt) }}</span>
              <span class="word-count">{{ getWordCount(note.content) }} 字</span>
            </div>
            <div class="note-actions">
              <button 
                @click.stop="moveNoteToScene(note)" 
                class="icon-btn move"
                type="button"
              >
                <i class="fas fa-share"></i>
              </button>
              <button @click.stop="deleteNote(note.id)" class="icon-btn delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧编辑/预览区域 -->
    <div class="note-editor" v-if="currentNote">
      <div class="editor-header">
        <input 
          v-model="currentNote.title" 
          placeholder="输入标题..."
          class="title-input"
          @input="handleTitleChange"
        />
        <div class="editor-toolbar">
          <button 
            :class="['mode-btn', { active: !isEditing }]" 
            @click="toggleEditMode"
          >
            <i class="fas fa-eye"></i> 预览
          </button>
          <button 
            :class="['mode-btn', { active: isEditing }]" 
            @click="toggleEditMode"
          >
            <i class="fas fa-edit"></i> 编辑
          </button>
          <button 
            :class="['mode-btn', { active: isAutoWriting }]"
            @click="toggleAutoWriting"
          >
            <i class="fas fa-magic"></i> 续写
          </button>
          <button 
            class="mode-btn"
            @click="formatNovelStyle"
          >
            <i class="fas fa-indent"></i> 格式化
          </button>
          <div class="editor-info">
            <span class="word-count">{{ getWordCount(currentNote.content) }} 字</span>
            <span class="generation-status" v-if="isAutoWriting">
              {{ isGenerating ? `续写中 (${(generationTime / 1000).toFixed(1)}s)` : '续写完成' }}
            </span>
            <span class="last-updated">最后更新: {{ formatTime(currentNote.updatedAt) }}</span>
          </div>
        </div>
      </div>
      
      <div class="editor-content">
        <div class="content-wrapper">
          <!-- 编辑模式 -->
          <div v-if="isEditing" class="editor-area">
            <div class="scroll-container">
              <textarea 
                v-model="currentNote.content"
                placeholder="开始输入内容... (支持 Markdown 格式)"
                class="content-textarea"
                @input="handleContentChange"
                @keydown="handleKeyDown"
                ref="textarea"
              ></textarea>
            </div>
          </div>
          
          <!-- 预览模式 -->
          <div v-else class="preview-area">
            <div 
              class="markdown-preview"
              v-html="renderMarkdown(currentNote.content)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-else class="empty-state">
      <i class="fas fa-book"></i>
      <p>选择或创建一个笔记开始编辑</p>
    </div>

    <!-- 添加场景选择模态框 -->
    <div v-if="showMoveModal" class="modal" @click="closeMoveModal">
      <div class="modal-content" @click.stop>
        <h3>移动到场景</h3>
        <div class="scene-list">
          <div v-if="props.scenes && props.scenes.length > 0">
            <div 
              v-for="scene in props.scenes"
              :key="scene.id"
              class="scene-item"
              @click="moveNoteToSelectedScene(noteToMove, scene)"
            >
              <span>{{ scene.name }}</span>
              <i class="fas fa-chevron-right"></i>
            </div>
          </div>
          <div v-else class="empty-scenes">
            暂无可用场景
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeMoveModal">取消</button>
        </div>
      </div>
    </div>

    <!-- 修改模态框内容部分 -->
    <div v-if="showPromptModal" class="modal" @click="closePromptModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>选择续写提示词</h3>
          <button class="close-btn" @click="closePromptModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="prompt-list">
          <div 
            v-for="prompt in props.prompts"
            :key="prompt.id"
            class="prompt-item"
          >
            <div class="prompt-header">
              <span class="prompt-title">{{ prompt.title }}</span>
              <select v-model="prompt.selectedModel" class="model-select">
                <option value="">选择模型</option>
                <option 
                  v-for="model in props.models" 
                  :key="model.id" 
                  :value="model.id"
                >
                  {{ model.name }}
                </option>
              </select>
            </div>
            <div class="prompt-content">
              <p>{{ prompt.template }}</p>
              <div class="prompt-actions">
                <button 
                  @click="selectPrompt(prompt)"
                  :disabled="!prompt.selectedModel"
                  class="use-prompt-btn"
                >
                  使用此提示词
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useCommon } from '../utils/composables/useCommon'
import { chatService } from '../utils/services/chatService'

// 修改 props
const props = defineProps({
  scenes: {
    type: Array,
    required: true,
    default: () => []
  },
  initialContent: {
    type: String,
    default: ''
  },
  prompts: {
    type: Array,
    required: true,
    default: () => []
  },
  models: {  // 添加模型配置
    type: Array,
    required: true,
    default: () => []
  }
})

// 添加调试日志
//console.log('Available scenes:', props.scenes)

// 基础状态
const notes = ref([])
const currentNoteId = ref(null)
const isEditing = ref(true)
const isAutoWriting = ref(false)

// 当前笔记
const currentNote = computed(() => 
  notes.value.find(note => note.id === currentNoteId.value)
)

// 注入场景相关方法
const moveToScene = inject('moveToScene')

// 添加一个 ref 来跟踪上一次的内容
const lastContent = ref('')

// 添加光标位置跟踪
const cursorPosition = ref(0)

// 添加请求锁
const isGenerating = ref(false)

// 修改为毫秒计时
const generationTime = ref(0)
const generationTimer = ref(null)

// 使用通用方法
const {
  isLoading,
  saveToStorage,
  loadFromStorage,
  formatTime,
  truncateText
} = useCommon()

// 使用通用方法
const saveNotes = () => {
  saveToStorage('notes', notes.value)
}

const loadNotes = () => {
  notes.value = loadFromStorage('notes', [])
}

// 修改标题输入的处理
const handleTitleChange = () => {
  if (currentNote.value) {
    currentNote.value.updatedAt = new Date()
    saveNotes()
  }
}

// 修改防抖函数，使其返回一个可以在组件中重用的函数
const createDebouncedFunction = (fn, delay) => {
  let timeoutId
  const debouncedFn = (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
  // 添加取消方法
  debouncedFn.cancel = () => {
    clearTimeout(timeoutId)
  }
  return debouncedFn
}

// 修改生成续写内容的函数
const generateCompletion = async (context) => {
  if (!selectedPrompt.value || !selectedPrompt.value.selectedModel || !isAutoWriting.value) {
    console.log('Conditions not met for generation')
    return null
  }
  
  const model = props.models.find(m => m.id === selectedPrompt.value.selectedModel)
  if (!model) {
    console.log('Model not found')
    return null
  }

  try {
    isGenerating.value = true
    generationTime.value = 0
    const startTime = Date.now()
    
    generationTimer.value = setInterval(() => {
      generationTime.value = Date.now() - startTime
    }, 100)

    // 使用 chatService 进行流式生成
    const result = await chatService.sendStreamMessage(context, {
      model,
      promptTemplate: selectedPrompt.value.template,
      onChunk: (chunk) => {
        if (currentNote.value) {
          currentNote.value.content += chunk
          
          // 更新光标位置到末尾
          nextTick(() => {
            if (textarea.value) {
              const newPosition = currentNote.value.content.length
              textarea.value.selectionStart = newPosition
              textarea.value.selectionEnd = newPosition
              cursorPosition.value = newPosition
            }
          })
        }
      }
    })

    if (!result.success) {
      throw result.error || new Error('生成失败')
    }

    return true
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request aborted')
    } else {
      console.error('生成续写内容失败:', error)
      showToast('续写失败，请重试', 'error')
      // 出错时停止续写
      stopAutoWriting()
    }
    return null
  } finally {
    isGenerating.value = false
    if (generationTimer.value) {
      clearInterval(generationTimer.value)
      generationTimer.value = null
    }
  }
}

// 修改自动续写逻辑
const startAutoWriting = () => {
  if (!selectedPrompt.value || !isEditing.value) {
    console.log('Cannot start auto writing: not in edit mode or no prompt selected')
    return
  }
  
  console.log('Starting auto writing...')
  isAutoWriting.value = true
  
  // 立即生成一次
  generateCompletion(currentNote.value.content)
  
  // 设置新的定时器，每10秒生成一次
  autoWriteTimer.value = setInterval(async () => {
    if (!currentNote.value || !isEditing.value || !isAutoWriting.value) {
      console.log('Conditions not met for auto writing')
      return
    }
    if (!isGenerating.value) {
      generateCompletion(currentNote.value.content)
    }
  }, 10000)
}

// 修改内容变化处理
const handleContentChange = () => {
  if (!currentNote.value) return
  
  // 更新光标位置
  if (textarea.value) {
    cursorPosition.value = textarea.value.selectionEnd
    requestAnimationFrame(updateSuggestionPosition)
  }
  
  currentNote.value.updatedAt = new Date()
  saveNotes()

  // 如果正在续写，使用防抖触发新的生成
  if (isAutoWriting.value && !isGenerating.value) {
    debouncedGenerate()
  }
}

// 修改创建新笔记的方法
const createNewNote = () => {
  const newNote = {
    id: Date.now(),
    title: '',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  notes.value.unshift(newNote)  // 手动创建的笔记添加到顶部
  currentNoteId.value = newNote.id
  isEditing.value = true
  saveNotes()
}

// 删除笔记
const deleteNote = (id) => {
  
  notes.value = notes.value.filter(note => note.id !== id)
  if (currentNoteId.value === id) {
    currentNoteId.value = notes.value[0]?.id || null
  }
  saveNotes()
}

// 组件挂载时加载笔记
onMounted(() => {
  loadNotes()
  showToast("加载成功！")
  if (textarea.value) {
    textarea.value.addEventListener('scroll', () => {
      requestAnimationFrame(updateSuggestionPosition)
    })
    textarea.value.addEventListener('click', handleSelect)
    textarea.value.addEventListener('keyup', handleSelect)
  }
  showSuggestion.value = false
  suggestion.value = ''
  isAutoWriting.value = false
  if (textarea.value) {
    textarea.value.addEventListener('click', () => {
      cursorPosition.value = textarea.value.selectionEnd
    })
    textarea.value.addEventListener('keyup', () => {
      cursorPosition.value = textarea.value.selectionEnd
    })
  }
  if (textarea.value) {
    textarea.value.addEventListener('scroll', () => {
      const suggestionElement = document.querySelector('.suggestion-content')
      if (suggestionElement) {
        suggestionElement.style.top = `${textarea.value.scrollTop}px`
      }
    })
  }
})

// 监听卡片传输的内容，添加更多调试日志
watch(() => props.initialContent, (newContent, oldContent) => {
  // 确保笔记已加载
  if (!notes.value) {
    loadNotes()
  }
  // 只有当新内容不为空且与上一次的内容不同时才创建新笔记
  if (newContent && newContent.trim() && newContent !== oldContent) {
    
    // 从格式化内容中提取标题和内容
    const lines = newContent.split('\n')
    const title = lines[0].startsWith('# ') ? lines[0].slice(2) : ''
    const content = lines.slice(2).join('\n')
    
    // 创建新笔记
    const newNote = {
      id: Date.now(),
      title: title,
      content: content,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 使用 push 将新笔记添加到数组末尾
    if (Array.isArray(notes.value)) {
      notes.value.push(newNote)
      currentNoteId.value = newNote.id
      saveNotes()
    } else {
      console.error('notes.value is not an array:', notes.value)
      notes.value = [newNote]
      currentNoteId.value = newNote.id
      saveNotes()
    }
  }
}, { immediate: false })

// 获取预览文本
const getPreview = (content) => {
  return content?.slice(0, 50) || '空笔记'
}

// Markdown 渲染
const renderMarkdown = (content) => {
  if (!content) return ''
  const rawHtml = marked(content)
  return DOMPurify.sanitize(rawHtml)
}

// 移动相关状态
const showMoveModal = ref(false)
const noteToMove = ref(null)

// 修改移动笔记方法，添加调试日志
const moveNoteToScene = (note) => {
  //console.log('Moving note:', note)
  //console.log('Available scenes:', props.scenes)
  noteToMove.value = note
  showMoveModal.value = true
}

const moveNoteToSelectedScene = (note, targetScene) => {
  //console.log('Selected scene:', targetScene)
  if (moveToScene) {
    moveToScene({
      title: note.title || '无标题笔记',
      content: note.content,
      height: '200px',
      tags: [],
      insertedContents: []
    }, targetScene.id)
  }
  closeMoveModal()
}

const closeMoveModal = () => {
  showMoveModal.value = false
  noteToMove.value = null
}


// 修改提示框实现
const showToast = (message, type = 'success') => {
  // 先移除可能存在的旧提示框
  const existingToast = document.querySelector('.toast-notification')
  if (existingToast) {
    document.body.removeChild(existingToast)
  }

  // 创建提示框容器
  const toastContainer = document.createElement('div')
  toastContainer.className = 'toast-notification'
  toastContainer.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%) translateY(-100%);
    background: white;
    border-radius: 4px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    opacity: 0;
    transition: all 0.3s ease;
    min-width: 200px;
    justify-content: center;
    border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
  `

  // 创建图标
  const icon = document.createElement('i')
  icon.className = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation-circle'
  icon.style.color = type === 'success' ? '#10b981' : '#ef4444'

  // 创建文本
  const text = document.createElement('span')
  text.textContent = message
  text.style.fontSize = '14px'

  // 组装提示框
  toastContainer.appendChild(icon)
  toastContainer.appendChild(text)
  document.body.appendChild(toastContainer)

  // 显示动画
  requestAnimationFrame(() => {
    toastContainer.style.transform = 'translateX(-50%) translateY(0)'
    toastContainer.style.opacity = '1'
  })

  // 2秒后消失
  setTimeout(() => {
    toastContainer.style.transform = 'translateX(-50%) translateY(-100%)'
    toastContainer.style.opacity = '0'
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (toastContainer.parentNode) {
        document.body.removeChild(toastContainer)
      }
    }, 300)
  }, 2000)
}

// 添加字数统计函数
const getWordCount = (text) => {
  if (!text) return 0
  // 移除空格和换行符，然后计算字符数
  return text.replace(/\s+/g, '').length
}

// 续写相关的状态
const showPromptModal = ref(false)
const selectedPrompt = ref(null)
const showSuggestion = ref(false)
const suggestion = ref('')
const autoWriteTimer = ref(null)
const textarea = ref(null)


// 修改获取建议样式的方法
const getSuggestionStyle = () => {
  if (!textarea.value) return {}
  
  const content = currentNote.value.content
  const lines = content.split('\n')
  const lineCount = lines.length
  const lastLineLength = lines[lines.length - 1].length
  
  const lineHeight = parseInt(getComputedStyle(textarea.value).lineHeight)
  const charWidth = parseInt(getComputedStyle(textarea.value).fontSize) * 0.6
  const scrollTop = textarea.value.scrollTop
  
  return {
    position: 'absolute',
    top: `${((lineCount - 1) * lineHeight) - scrollTop}px`,
    left: `${lastLineLength * charWidth + 20}px`, // 根据最后一行文字长度计算位置
    paddingRight: '20px',
    color: '#999',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap'
  }
}

// 修改建议内容的显示逻辑
const updateSuggestionPosition = () => {
  if (!textarea.value || !showSuggestion.value) return
  
  const suggestionElement = document.querySelector('.suggestion-content')
  if (suggestionElement) {
    const style = getSuggestionStyle()
    Object.assign(suggestionElement.style, style)
  }
}

// 监听滚动事件
onMounted(() => {
  if (textarea.value) {
    textarea.value.addEventListener('scroll', () => {
      requestAnimationFrame(updateSuggestionPosition)
    })
    textarea.value.addEventListener('click', handleSelect)
    textarea.value.addEventListener('keyup', handleSelect)
  }
})

// 修改 Tab 键处理
const handleKeyDown = (e) => {
  // 移除 Tab 键处理逻辑，因为不再需要预览
}

// 监听光标位置变化
const handleSelect = () => {
  if (textarea.value) {
    cursorPosition.value = textarea.value.selectionEnd
  }
}

// 在组件卸载时清理
onUnmounted(() => {
  stopAutoWriting()
  debouncedGenerate.cancel()
  if (textarea.value) {
    textarea.value.removeEventListener('scroll', () => {})
    textarea.value.removeEventListener('click', () => {})
    textarea.value.removeEventListener('keyup', () => {})
  }
  if (generationTimer.value) {
    clearInterval(generationTimer.value)
  }
})

// 添加请求控制器
const currentController = ref(null)

// 修改切换编辑模式的方法
const toggleEditMode = () => {
  isEditing.value = !isEditing.value
  
  // 如果切换到预览模式，停止续写
  if (!isEditing.value && isAutoWriting.value) {
    stopAutoWriting()
  }
  
  // 如果切换回编辑模式，恢复之前的续写状态
  if (isEditing.value && selectedPrompt.value) {
    nextTick(() => {
      if (textarea.value) {
        textarea.value.focus()
      }
    })
  }
}

// 修改切换续写模式的方法
const toggleAutoWriting = () => {
  if (!isEditing.value) {
    showToast('请先切换到编辑模式', 'error')
    return
  }
  
  console.log('Toggling auto writing, current state:', isAutoWriting.value)
  
  if (!isAutoWriting.value) {
    showPromptModal.value = true
  } else {
    stopAutoWriting()
  }
}

// 修改停止续写的方法
const stopAutoWriting = () => {
  console.log('Stopping auto writing...')
  isAutoWriting.value = false
  showSuggestion.value = false
  suggestion.value = ''
  
  if (currentController.value) {
    currentController.value.abort()
    currentController.value = null
  }
  
  if (autoWriteTimer.value) {
    clearInterval(autoWriteTimer.value)
    autoWriteTimer.value = null
  }
  
  if (generationTimer.value) {
    clearInterval(generationTimer.value)
    generationTimer.value = null
  }
}

// 修改选择提示词的方法
const selectPrompt = (prompt) => {
  if (!prompt.selectedModel) {
    showToast('请先选择模型', 'error')
    return
  }
  
  // 先停止之前的续写
  stopAutoWriting()
  
  // 重置状态并开始新的续写
  selectedPrompt.value = prompt
  showPromptModal.value = false
  isAutoWriting.value = true
  
  // 立即开始续写
  startAutoWriting()
}

// 添加调试日志
watch(() => isAutoWriting.value, (newVal) => {
  console.log('Auto writing state changed:', newVal)
})

watch(() => showSuggestion.value, (newVal) => {
  console.log('Suggestion visibility changed:', newVal)
})

watch(() => suggestion.value, (newVal) => {
  console.log('Suggestion content changed:', newVal ? 'has content' : 'empty')
})

// 监听笔记数组变化
watch(notes, () => {
  saveNotes()
}, { deep: true })

// 监听当前笔记ID变化
watch(currentNoteId, (newId) => {
  if (newId && notes.value) {
    const note = notes.value.find(n => n.id === newId)
    if (note) {
      currentNote.value = note
    }
  }
})

// 创建防抖的生成函数
const debouncedGenerate = createDebouncedFunction(() => {
  if (currentNote.value && currentNote.value.content) {
    generateCompletion(currentNote.value.content)
  }
}, 1000) // 1秒的防抖延迟

// 修改关闭提示词模态框的方法
const closePromptModal = () => {
  showPromptModal.value = false
  selectedPrompt.value = null
  isAutoWriting.value = false
  showSuggestion.value = false
  suggestion.value = ''
  
  // 停止所有相关的计时器和请求
  if (autoWriteTimer.value) {
    clearInterval(autoWriteTimer.value)
    autoWriteTimer.value = null
  }
  
  if (generationTimer.value) {
    clearInterval(generationTimer.value)
    generationTimer.value = null
  }
  
  if (currentController.value) {
    currentController.value.abort()
    currentController.value = null
  }
  
  showToast('已取消续写主人~', 'success')
}

// 修改格式化方法
const formatNovelStyle = () => {
  if (!currentNote.value || !currentNote.value.content) return
  
  let content = currentNote.value.content
  
  // 1. 处理多余的空行，只保留一个换行
  content = content.replace(/\n\s*\n\s*\n/g, '\n')
  
  // 2. 处理段落，确保每个段落都有两个空格的缩进
  content = content.split('\n').map(paragraph => {
    // 跳过空行
    if (!paragraph.trim()) return ''
    
    // 处理对话段落
    if (paragraph.trim().startsWith('"') || paragraph.trim().startsWith('"')) {
      return '  ' + paragraph.trim()  // 添加两个空格缩进
    }
    
    // 普通段落添加两个空格缩进
    return '  ' + paragraph.trim()
  }).join('\n')  // 只用一个换行符分隔段落
  
  // 3. 更新内容
  currentNote.value.content = content
  
  // 4. 显示提示
  showToast('格式化完成主人~')
}

</script>

<style scoped>
@import url("../styles/notePad.css");
</style> 


