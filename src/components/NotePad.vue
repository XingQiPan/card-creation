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
              <div 
                v-if="showSuggestion && suggestion" 
                class="suggestion-content"
                :style="getSuggestionStyle()"
              >{{ suggestion }}</div>
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

    <!-- 简化提示词选择模态框 -->
    <div v-if="showPromptModal" class="modal" @click="closePromptModal">
      <div class="modal-content" @click.stop>
        <h3>选择续写提示词</h3>
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
        <div class="modal-actions">
          <button @click="closePromptModal">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

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

// 修改保存笔记的方法
const saveNotes = () => {
  if (!notes.value) return
  try {
    localStorage.setItem('notes', JSON.stringify(notes.value))
  } catch (error) {
    console.error('Failed to save notes:', error)
  }
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
    
    // 使用更精确的计时器
    generationTimer.value = setInterval(() => {
      generationTime.value = Date.now() - startTime
    }, 100) // 每100ms更新一次
    
    if (currentController.value) {
      currentController.value.abort()
      currentController.value = null
    }
    
    currentController.value = new AbortController()

    console.log('Sending request with model:', model.provider)
    
    let response
    let result
    let completion

    // 构建请求体
    const messages = [
      {
        role: 'system',
        content: selectedPrompt.value.template
      },
      {
        role: 'user',
        content: context
      }
    ]

    console.log('Sending request...')

    if (model.provider === 'openai') {
      response = await fetch(model.apiUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages,
          max_tokens: Number(model.maxTokens),
          temperature: Number(model.temperature)
        }),
        signal: currentController.value.signal
      })
      
      result = await response.json()
      completion = result.choices[0].message.content

    } else if (model.provider === 'gemini') {
      const contents = messages.map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'user' ? 'user' : 'model'
      }))

      response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': model.apiKey
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: Number(model.temperature),
            maxOutputTokens: Number(model.maxTokens),
          }
        }),
        signal: currentController.value.signal
      })
      
      result = await response.json()
      completion = result.candidates[0].content.parts[0].text

    } else if (model.provider === 'ollama') {
      response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.modelId,
          messages,
          stream: false,
          options: {
            temperature: Number(model.temperature),
            num_predict: Number(model.maxTokens)
          }
        }),
        signal: currentController.value.signal
      })
      
      result = await response.json()
      completion = result.message?.content
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!result) {
      throw new Error('响应格式错误')
    }

    completion = completion.trim()

    // 如果返回的内容包含原文，尝试提取新内容
    if (completion.includes(context)) {
      completion = completion.slice(context.length).trim()
    }

    console.log('Got new completion with length:', completion.length)

    // 修改建议内容显示逻辑
    if (completion && completion.length > 0) {
      suggestion.value = completion
      showSuggestion.value = true
      
      // 确保建议内容可见
      await nextTick()
      if (textarea.value) {
        const cursorPos = textarea.value.selectionEnd
        const text = textarea.value.value
        const lines = text.substr(0, cursorPos).split('\n')
        const currentLine = lines.length
        const lineHeight = parseInt(getComputedStyle(textarea.value).lineHeight)
        
        // 计算光标位置
        const cursorTop = (currentLine - 1) * lineHeight
        const visibleHeight = textarea.value.clientHeight
        const scrollTop = textarea.value.scrollTop
        
        // 如果光标位置不在可视区域，滚动到合适位置
        if (cursorTop < scrollTop || cursorTop > scrollTop + visibleHeight - lineHeight * 2) {
          textarea.value.scrollTop = Math.max(0, cursorTop - visibleHeight / 2)
        }
      }
    }

    return completion
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request aborted')
    } else {
      console.error('\n 生成续写内容失败:', error)
      showToast('续写失败，请重试', 'error')
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
  
  // 设置新的定时器
  autoWriteTimer.value = setInterval(() => {
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
  //if (!confirm('确定要删除这个笔记吗？')) return
  
  notes.value = notes.value.filter(note => note.id !== id)
  if (currentNoteId.value === id) {
    currentNoteId.value = notes.value[0]?.id || null
  }
  saveNotes()
}

// 加载笔记
const loadNotes = () => {
  const savedNotes = localStorage.getItem('notes')
  if (savedNotes) {
    try {
      notes.value = JSON.parse(savedNotes)
      // 如果有笔记，默认选中第一个
      if (notes.value.length > 0 && !currentNoteId.value) {
        currentNoteId.value = notes.value[0].id
      }
    } catch (error) {
      console.error('Failed to parse saved notes:', error)
      notes.value = []
    }
  } else {
    notes.value = []
  }
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
  //console.log('Watch triggered:', { newContent, oldContent })
  
  // 确保笔记已加载
  if (!notes.value) {
    loadNotes()
  }
  
  // 只有当新内容不为空且与上一次的内容不同时才创建新笔记
  if (newContent && newContent.trim() && newContent !== oldContent) {
    //console.log('Creating new note with content:', newContent)
    
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
    
    //console.log('New note to be created:', newNote)
    
    // 使用 push 将新笔记添加到数组末尾
    if (Array.isArray(notes.value)) {
      notes.value.push(newNote)
      currentNoteId.value = newNote.id
      saveNotes()
      //console.log('New note created and saved:', newNote)
      //console.log('Current notes after save:', notes.value)
    } else {
      console.error('notes.value is not an array:', notes.value)
      notes.value = [newNote]
      currentNoteId.value = newNote.id
      saveNotes()
    }
  } else {
    //console.log('Content not changed or empty:', {
    //  newContent,
    //  oldContent,
    //  isEmpty: !newContent || !newContent.trim()
    //})
  }
}, { immediate: false })

// 获取预览文本
const getPreview = (content) => {
  return content?.slice(0, 50) || '空笔记'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
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
const suggestionPosition = ref({ top: 0, left: 0 })
const autoWriteTimer = ref(null)
const textarea = ref(null)

// 添加文本选择相关状态
const selectedText = ref('')
const selectionStart = ref(0)
const selectionEnd = ref(0)

// 检查提示词是否可以插入文本
const canInsertText = (prompt) => {
  return prompt.template.includes('{{text}}')
}

// 获取需要插入的文本数量
const getInsertCount = (template) => {
  return (template.match(/{{text}}/g) || []).length
}

// 截断文本显示
const truncateText = (text, length = 30) => {
  if (!text) return ''
  return text.length > length ? text.slice(0, length) + '...' : text
}

// 处理文本选择
const handleTextSelection = () => {
  if (!textarea.value) return
  
  const start = textarea.value.selectionStart
  const end = textarea.value.selectionEnd
  
  if (start !== end) {
    selectedText.value = textarea.value.value.substring(start, end)
    selectionStart.value = start
    selectionEnd.value = end
  }
}

// 插入当前选中的文本
const insertCurrentSelection = (prompt) => {
  if (!selectedText.value) {
    showToast('请先选择要插入的文本', 'error')
    return
  }
  
  if (!prompt.insertedContents) {
    prompt.insertedContents = []
  }
  
  prompt.insertedContents.push(selectedText.value)
}

// 移除已插入的文本
const removeInsertedContent = (prompt, index) => {
  prompt.insertedContents.splice(index, 1)
}

// 检查提示词是否可以使用
const canUsePrompt = (prompt) => {
  if (!prompt.selectedModel) return false
  if (!canInsertText(prompt)) return true
  return prompt.insertedContents?.length === getInsertCount(prompt.template)
}

// 修改获取建议样式的方法
const getSuggestionStyle = () => {
  if (!textarea.value) return {}
  
  const textBeforeCursor = currentNote.value.content.slice(0, cursorPosition.value)
  const lines = textBeforeCursor.split('\n')
  const lineCount = lines.length
  const lastLineLength = lines[lines.length - 1].length
  
  const lineHeight = parseInt(getComputedStyle(textarea.value).lineHeight)
  const charWidth = parseInt(getComputedStyle(textarea.value).fontSize) * 0.6
  const scrollTop = textarea.value.scrollTop
  
  return {
    position: 'absolute',
    top: `${((lineCount - 1) * lineHeight) - scrollTop - 10}px`, // 微调下移
    left: `${lastLineLength * charWidth}px`,
    paddingRight: '20px',
    color: '#999',
    pointerEvents: 'none'
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
  if (e.key === 'Tab' && showSuggestion.value && suggestion.value) {
    e.preventDefault()
    
    // 在光标位置插入建议内容，添加换行
    const text = currentNote.value.content
    const before = text.slice(0, cursorPosition.value)
    const after = text.slice(cursorPosition.value)
    
    currentNote.value.content = before + '\n' + suggestion.value + after
    
    // 更新光标位置到插入内容之后
    nextTick(() => {
      if (textarea.value) {
        const newPosition = cursorPosition.value + suggestion.value.length + 1 // +1 for newline
        textarea.value.selectionStart = newPosition
        textarea.value.selectionEnd = newPosition
        cursorPosition.value = newPosition
      }
    })
    
    // 清除建议
    suggestion.value = ''
    showSuggestion.value = false
  }
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
  
  console.log('Selecting prompt:', prompt)
  
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

</script>

<style scoped>
.notepad-container {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.notes-list {
  width: 300px;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  margin: 0;
  color: #333;
}

.notes {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.note-card {
  padding: 16px;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border: 1px solid #e8e8e8;
}

.note-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.note-card.active {
  border-color: #646cff;
  background: #f0f7ff;
}

.note-card-content {
  flex: 1;
  margin-right: 12px;
}

.note-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.note-preview {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 8px;
  display: -webkit-box;
/*   -webkit-line-clamp: 2; */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8em;
  color: #999;
  margin-top: 8px;
}

.note-time {
  color: #646cff;
  font-weight: 500;
}

.word-count {
  color: #646cff;
  font-weight: 500;
}

.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.editor-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fff;
}

.title-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1.5em;
  border: none;
  border-bottom: 2px solid #e8e8e8;
  margin-bottom: 16px;
  transition: border-color 0.3s ease;
  background: transparent;
}

.title-input:focus {
  outline: none;
  border-color: #646cff;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-btn {
  padding: 8px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fff;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background: #f5f5f5;
}

.mode-btn.active {
  background: #646cff;
  color: #fff;
  border-color: #646cff;
}

.editor-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 0.9em;
}

.editor-info .word-count {
  padding: 4px 8px;
  background: #f0f7ff;
  border-radius: 4px;
}

.editor-info .generation-status {
  color: #646cff;
  font-size: 0.9em;
  margin: 0 12px;
}

.editor-info .last-updated {
  color: #999;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.content-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
}

.editor-area {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scroll-container {
  width: 100%;
  position: relative;
  height: 100%;
  
  overflow-y: auto;
}

.content-textarea {
  width: 100%;
  height: 100%;
  resize: none;
  border: none;
  padding: 20px;
  font-size: 1.1em;
  line-height: 1.6;
  background: transparent;
  outline: none;
  position: relative;
  overflow-x: hidden;
  z-index: 1;
}

.suggestion-content {
  position: absolute;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  pointer-events: none;
  z-index: 2;
  background: transparent;
  padding: 0;
  margin: 0;
  color: #999;
  transform: translateY(2px);
}

.preview-area {
  width: 95%;
  height: calc(100% - 60px);
  padding: 20px;
  overflow-y: auto;
}

.markdown-preview {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
}

.markdown-preview :deep(h1) {
  font-size: 2em;
  margin: 0.67em 0;
}

.markdown-preview :deep(h2) {
  font-size: 1.5em;
  margin: 0.75em 0;
}

.markdown-preview :deep(h3) {
  font-size: 1.17em;
  margin: 0.83em 0;
}

.markdown-preview :deep(p) {
  margin: 1em 0;
}

.markdown-preview :deep(code) {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.markdown-preview :deep(pre) {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-preview :deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid #ddd;
  color: #666;
}

.markdown-preview :deep(ul), 
.markdown-preview :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-state i {
  font-size: 3em;
  margin-bottom: 16px;
}

.primary-btn {
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;
}

.primary-btn:hover {
  background: #5058cc;
}

.icon-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #999;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: #f5f5f5;
}

.icon-btn.delete:hover {
  color: #dc3545;
  background: #ffebee;
}

.icon-btn.move:hover {
  color: #646cff;
  background: #f0f7ff;
}

/* 添加模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
}

.scene-list {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scene-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scene-item:hover {
  background: #e9ecef;
}

.empty-scenes {
  text-align: center;
  color: #999;
}

.prompt-list {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-item {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prompt-item:hover {
  background: #e9ecef;
}

.suggestion-container {
  width: 100%;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.suggestion-content {
  padding: 12px 20px;
}

.suggestion-text {
  color: #666;
  font-size: 1.1em;
  line-height: 1.6;
  font-style: italic;
}

.suggestion-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  text-align: right;
}

.prompt-list {
  max-height: 300px;
  overflow-y: auto;
  margin: 16px 0;
}

.prompt-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.prompt-item:hover {
  background: #f5f5f5;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.prompt-title {
  font-weight: 500;
  color: #333;
}

.model-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}

.prompt-content {
  cursor: pointer;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.prompt-content:hover {
  background: #e9ecef;
}

.insert-slots {
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.inserted-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 4px;
}

.inserted-content button {
  padding: 2px 6px;
  color: #dc3545;
  background: none;
  border: none;
  cursor: pointer;
}

.insert-btn {
  padding: 4px 8px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.use-prompt-btn {
  margin-top: 8px;
  width: 100%;
  padding: 8px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.use-prompt-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.continuation-suggestion {
  margin-top: 8px;
  padding: 8px;
  color: #666;
  background: #f8f9fa;
  border-left: 3px solid #646cff;
  font-style: italic;
}
</style> 


