<template>
  <div class="editor-container" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 顶部导航栏 -->
    <div class="editor-header">
      <div class="header-left">
        <button class="icon-btn" @click="toggleSidebar" title="显示/隐藏侧边栏">
          <i class="fas fa-bars"></i>
        </button>
        <button class="tool-btn" @click="fontSettings.showModal = true" title="字体">
          <i class="fas fa-font"></i> 字体
        </button>
        <button class="tool-btn" @click="backgroundSettings.showModal = true" title="背景">
          <i class="fas fa-palette"></i> 背景
        </button>
        <button class="icon-btn" @click="undo" title="撤销 (Ctrl+Z)">
          <i class="fas fa-undo"></i>
        </button>
        <button class="icon-btn" @click="redo" title="重做 (Ctrl+Shift+Z 或 Ctrl+Y)">
          <i class="fas fa-redo"></i>
        </button>
        <button class="tool-btn" @click="formatContent" title="一键排版 (首行缩进2空格)">
          <i class="fas fa-align-left"></i> 排版
        </button>
        <button class="tool-btn" title="插入">
          <i class="fas fa-plus"></i> 插入
        </button>
      </div>
      <div class="header-right">
        <button class="icon-btn" @click="saveCurrentChapter" title="保存 (Ctrl+S)">
          <i class="fas fa-save"></i>
        </button>
        <button class="icon-btn" @click="toggleFullscreen" title="全屏">
          <i class="fas fa-expand"></i>
        </button>
        <button class="icon-btn" title="查找" @click="searchState.showModal = true">
          <i class="fas fa-search"></i>
        </button>
        <button class="icon-btn" title="取名">
          <i class="fas fa-user"></i>
        </button>
        <button class="icon-btn" title="历史">
          <i class="fas fa-history"></i>
        </button>
      </div>
    </div>

    <!-- 主体内容区 -->
    <div class="editor-body">
      <!-- 左侧章节列表 -->
      <div class="chapter-sidebar" :class="{ 'collapsed': !showSidebar }">
        <div class="sidebar-content">
          <div class="action-buttons">
            <button class="create-btn" @click="createNewChapter">新建章</button>
            <button class="create-btn light" @click="createNewVolume">新建卷</button>
          </div>
          
          <div class="chapter-list">
            <div class="chapter-category">
              <div><i class="fas fa-file-alt"></i> 作品相关</div>
              <span class="chapter-count">0篇章</span>
            </div>
            
            <div class="chapter-category">
              <div><i class="fas fa-book"></i> 第一卷</div>
              <span class="chapter-count">{{ chapters.length }}篇章</span>
            </div>
            
            <div 
              v-for="chapter in chapters" 
              :key="chapter.id"
              :class="['chapter-item', { 'active': chapter.id === currentChapterId }]"
              @click="openChapter(chapter.id)"
              @contextmenu.prevent="showContextMenu($event, chapter)"
            >
              <span class="chapter-title">{{ chapter.title }}</span>
              <span class="chapter-word-count">
                {{ calculateWordCount(chapter.content) }}字
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央编辑器区域 -->
      <div class="editor-content">
        <!-- 章节标题编辑区 -->
        <div class="chapter-title-container">
          <input 
            v-model="currentChapter.title" 
            class="chapter-title-input" 
            @input="titleChanged = true"
            placeholder="请输入章节标题" 
          />
          <div class="word-count-display">
            {{ wordCount }} 字
          </div>
        </div>
        
        <div 
          ref="editorContent" 
          class="content-editor" 
          contenteditable="true"
          @input="onContentUpdate"
          @keydown.tab.prevent="insertTab"
          @paste="onPaste"
        ></div>
      </div>
      
      <!-- 章节右键菜单 -->
      <div v-if="contextMenu.show" 
           class="context-menu" 
           :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">
        <div class="context-menu-item" @click="renameChapter">
          <i class="fas fa-edit"></i> 重命名
        </div>
        <div class="context-menu-item" @click="moveChapterUp">
          <i class="fas fa-arrow-up"></i> 上移
        </div>
        <div class="context-menu-item" @click="moveChapterDown">
          <i class="fas fa-arrow-down"></i> 下移
        </div>
        <div class="context-menu-item delete" @click="deleteChapter">
          <i class="fas fa-trash"></i> 删除
        </div>
      </div>
    </div>
  </div>

  <!-- Font Settings Modal -->
  <div v-if="fontSettings.showModal" class="settings-modal">
    <div class="modal-content">
      <h3>字体设置</h3>
      <div class="setting-group">
        <label>字体:</label>
        <select v-model="fontSettings.family">
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="SimSun">宋体</option>
          <option value="Microsoft YaHei">微软雅黑</option>
        </select>
      </div>
      <div class="setting-group">
        <label>大小:</label>
        <input type="range" v-model="fontSettings.size" min="12" max="36" step="1">
        <span>{{ fontSettings.size }}px</span>
      </div>
      <div class="setting-group">
        <label>颜色:</label>
        <input type="color" v-model="fontSettings.color">
      </div>
      <div class="modal-actions">
        <button @click="applyFontSettings">应用</button>
        <button @click="fontSettings.showModal = false">取消</button>
      </div>
    </div>
  </div>

  <!-- Background Settings Modal -->
  <div v-if="backgroundSettings.showModal" class="settings-modal">
    <div class="modal-content">
      <h3>背景设置</h3>
      <div class="setting-group">
        <label>类型:</label>
        <select v-model="backgroundSettings.type">
          <option value="color">纯色</option>
          <option value="image">图片</option>
        </select>
      </div>
      
      <div v-if="backgroundSettings.type === 'color'" class="setting-group">
        <label>颜色:</label>
        <input type="color" v-model="backgroundSettings.color">
      </div>
      
      <div v-else class="setting-group">
        <label>图片:</label>
        <input type="file" accept="image/*" @change="handleImageUpload">
        <div v-if="backgroundSettings.imageUrl" class="image-preview">
          <img :src="backgroundSettings.imageUrl" alt="背景预览">
        </div>
        <div class="setting-group">
          <label>透明度: {{ backgroundSettings.opacity }}</label>
          <input 
            type="range" 
            v-model="backgroundSettings.opacity" 
            min="0" 
            max="1" 
            step="0.1"
          >
        </div>
      </div>
      
      <div class="modal-actions">
        <button @click="applyBackgroundSettings">应用</button>
        <button @click="backgroundSettings.showModal = false">取消</button>
      </div>
    </div>
  </div>

  <!-- 查找替换模态框 -->
  <div v-if="searchState.showModal" class="search-modal">
    <div class="modal-content">
      <h3>查找替换</h3>
      <div class="search-group">
        <input v-model="searchState.searchText" placeholder="查找内容">
        <input v-model="searchState.replaceText" placeholder="替换为">
      </div>
      <div class="search-options">
        <label>
          <input type="checkbox" v-model="searchState.caseSensitive"> 区分大小写
        </label>
      </div>
      <div class="modal-actions">
        <button @click="findText">查找</button>
        <button @click="replaceText">替换</button>
        <button @click="searchState.showModal = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { debounce, showToast } from '../utils/common'

export default {
  name: 'Editor',
  props: {
    bookId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const route = useRoute()
    const bookId = ref(props.bookId || 'default')
    
    // 状态变量
    const isFullscreen = ref(false)
    const showSidebar = ref(true)
    const editorContent = ref(null)
    const chapters = ref([])
    const currentChapterId = ref(null)
    const currentChapter = reactive({
      id: null,
      title: '',
      content: ''
    })
    const contentChanged = ref(false)
    const titleChanged = ref(false)
    const wordCount = ref(0)
    const autoSaveTimeout = ref(null)
    const isLoading = ref(false)
    
    // 上下文菜单状态
    const contextMenu = reactive({
      show: false,
      x: 0,
      y: 0,
      targetChapter: null
    })

    // Add new state for font and background settings
    const fontSettings = reactive({
      showModal: false,
      family: 'Arial',
      size: 16,
      color: '#333333'
    })

    const backgroundSettings = reactive({
      showModal: false,
      type: 'color', // 'color' or 'image'
      color: '#ffffff',
      image: null,
      imageUrl: '',
      opacity: 0.8 // 新增透明度设置，默认0.8
    })

    // 添加撤销/重做状态
    const history = reactive({
      stack: [],
      index: -1,
      maxSize: 20
    })

    // 添加查找替换状态
    const searchState = reactive({
      showModal: false,
      searchText: '',
      replaceText: '',
      caseSensitive: false
    })

    // 添加快捷键支持
    const handleKeyDown = (event) => {
      // Save shortcut (Ctrl+S)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        saveCurrentChapter()
      }
      
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          undo()
          event.preventDefault()
        } else if ((event.key === 'Z' && event.shiftKey) || (event.key === 'y' && !event.shiftKey)) {
          redo()
          event.preventDefault()
        }
      }
    }

    // 计算属性
    const isEditing = computed(() => {
      return currentChapterId.value !== null
    })

    // 加载章节数据
    const loadChapters = async () => {
      try {
        const response = await fetch(`/api/books/${bookId.value}/chapters`)
        if (!response.ok) throw new Error('加载失败')
        const data = await response.json()
        chapters.value = data
      } catch (error) {
        console.error('加载章节出错:', error)
        showToast('加载章节失败', 'error')
      }
    }

    // 保存章节数据
    const saveChapters = async (manualSave = false) => {
      try {
        // 准备保存数据
        const data = chapters.value.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          content: chapter.content,
          order: chapter.order,
          isVolume: chapter.isVolume,
          createdAt: chapter.createdAt,
          updatedAt: new Date().toISOString()
        }))

        // 发送保存请求
        const response = await fetch(`/api/books/${bookId.value}/chapters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })

        if (!response.ok) throw new Error('保存失败')

        // 更新变更标志
        contentChanged.value = false
        titleChanged.value = false
        
        if (manualSave) {
          showToast('保存成功', 'success')
        }
      } catch (error) {
        console.error('保存章节出错:', error)
        showToast('保存章节失败', 'error')
      }
    }

    // 打开指定章节
    const openChapter = async (chapterId) => {
      // 如果有未保存的更改，先保存当前章节
      if ((contentChanged.value || titleChanged.value) && currentChapterId.value) {
        await saveCurrentChapter()
      }
      
      // 查找并加载新章节
      const chapter = chapters.value.find(c => c.id === chapterId)
      if (chapter) {
        currentChapterId.value = chapter.id
        
        // 使用reactive对象更新当前章节数据
        currentChapter.id = chapter.id
        currentChapter.title = chapter.title
        currentChapter.content = chapter.content
        
        // 更新编辑器内容
        nextTick(() => {
          if (editorContent.value) {
            editorContent.value.innerHTML = chapter.content || ''
            calculateWordCount()
          }
        })
        
        // 重置变更标志
        contentChanged.value = false
        titleChanged.value = false
        
        // 初始化历史记录
        history.stack = [{
          content: chapter.content || '',
          title: chapter.title,
          timestamp: new Date().getTime()
        }]
        history.index = 0
      }
    }

    // 增强保存当前章节的方法
    const saveCurrentChapter = async () => {
      try {
        if (!currentChapterId.value) return
        
        // 确保章节数据是最新的
        if (editorContent.value) {
          currentChapter.content = editorContent.value.innerHTML
        }
        
        // 找到当前章节索引
        const index = chapters.value.findIndex(c => c.id === currentChapterId.value)
        if (index === -1) return
        
        // 更新章节数据
        chapters.value[index] = {
          ...chapters.value[index],
          title: currentChapter.title,
          content: currentChapter.content,
          updatedAt: new Date().toISOString()
        }
        
        // 调用保存方法
        await saveChapters(true) // true表示手动保存
        showToast('章节保存成功', 'success')
      } catch (error) {
        console.error('保存章节失败:', error)
        showToast('保存章节失败', 'error')
      }
    }

    // 创建新章节
    const createNewChapter = async () => {
      try {
        // 确保 chapters.value 是数组
        if (!Array.isArray(chapters.value)) {
          chapters.value = []
        }
        
        const newChapter = {
          id: uuidv4(),
          title: '新建章节',
          content: '',
          order: chapters.value.length,
          isVolume: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        chapters.value.push(newChapter)
        openChapter(newChapter.id)
        
        // 立即保存到服务器
        await saveChapters()
        showToast('章节创建成功', 'success')
      } catch (error) {
        console.error('创建章节失败:', error)
        showToast('创建章节失败', 'error')
      }
    }

    // 创建新卷
    const createNewVolume = async () => {
      try {
        if (!Array.isArray(chapters.value)) {
          chapters.value = []
        }
        
        const newVolume = {
          id: uuidv4(),
          title: '新建卷',
          content: '',
          order: chapters.value.length,
          isVolume: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        chapters.value.push(newVolume)
        openChapter(newVolume.id)
        
        // 立即保存到服务器
        await saveChapters()
        showToast('卷创建成功', 'success')
      } catch (error) {
        console.error('创建卷失败:', error)
        showToast('创建卷失败', 'error')
      }
    }

    // 删除章节
    const deleteChapter = () => {
      if (!contextMenu.targetChapter) return
      
      const targetId = contextMenu.targetChapter.id
      const index = chapters.value.findIndex(c => c.id === targetId)
      
      if (index !== -1) {
        // 从章节列表中移除
        chapters.value.splice(index, 1)
        
        // 如果删除的是当前章节，切换到另一个章节
        if (currentChapterId.value === targetId) {
          if (chapters.value.length > 0) {
            // 尝试切换到下一个章节，如果没有则切换到前一个
            const nextIndex = index < chapters.value.length ? index : index - 1
            openChapter(chapters.value[nextIndex].id)
          } else {
            // 如果没有章节了，创建一个新章节
            createNewChapter()
          }
        }
        
        saveChapters()
      }
      
      // 关闭上下文菜单
      closeContextMenu()
    }

    // 上移章节
    const moveChapterUp = () => {
      if (!contextMenu.targetChapter) return
      
      const targetId = contextMenu.targetChapter.id
      const index = chapters.value.findIndex(c => c.id === targetId)
      
      if (index > 0) {
        // 交换当前章节与上一个章节
        [chapters.value[index], chapters.value[index - 1]] = 
        [chapters.value[index - 1], chapters.value[index]]
        
        // 更新顺序字段
        chapters.value.forEach((chapter, idx) => {
          chapter.order = idx
        })
        
        saveChapters()
      }
      
      closeContextMenu()
    }

    // 下移章节
    const moveChapterDown = () => {
      if (!contextMenu.targetChapter) return
      
      const targetId = contextMenu.targetChapter.id
      const index = chapters.value.findIndex(c => c.id === targetId)
      
      if (index < chapters.value.length - 1) {
        // 交换当前章节与下一个章节
        [chapters.value[index], chapters.value[index + 1]] = 
        [chapters.value[index + 1], chapters.value[index]]
        
        // 更新顺序字段
        chapters.value.forEach((chapter, idx) => {
          chapter.order = idx
        })
        
        saveChapters()
      }
      
      closeContextMenu()
    }

    // 重命名章节
    const renameChapter = () => {
      if (!contextMenu.targetChapter) return
      
      // 打开章节并聚焦到标题输入框
      openChapter(contextMenu.targetChapter.id)
      nextTick(() => {
        const titleInput = document.querySelector('.chapter-title-input')
        if (titleInput) {
          titleInput.focus()
          titleInput.select()
        }
      })
      
      closeContextMenu()
    }

    // 显示上下文菜单
    const showContextMenu = (event, chapter) => {
      contextMenu.show = true
      contextMenu.x = event.clientX
      contextMenu.y = event.clientY
      contextMenu.targetChapter = chapter
      
      // 添加点击事件监听器以关闭菜单
      document.addEventListener('click', closeContextMenuOnOutsideClick)
    }

    // 关闭上下文菜单
    const closeContextMenu = () => {
      contextMenu.show = false
      document.removeEventListener('click', closeContextMenuOnOutsideClick)
    }

    // 在菜单外点击时关闭菜单
    const closeContextMenuOnOutsideClick = (event) => {
      const menu = document.querySelector('.context-menu')
      if (menu && !menu.contains(event.target)) {
        closeContextMenu()
      }
    }

    // 内容更新处理
    const onContentUpdate = () => {
      contentChanged.value = true
      calculateWordCount()
      recordHistory()
    }

    // 计算字数
    const calculateWordCount = () => {
      if (editorContent.value) {
        // 获取纯文本内容
        const content = editorContent.value.innerText || ''
        // 移除空白字符并计算长度
        wordCount.value = content.replace(/\s+/g, '').length
      } else {
        wordCount.value = 0
      }
    }

    // 插入Tab
    const insertTab = () => {
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;')
    }

    // 处理粘贴事件
    const onPaste = (event) => {
      // 阻止默认粘贴行为
      event.preventDefault()
      
      // 获取纯文本内容
      const text = (event.clipboardData || window.clipboardData).getData('text/plain')
      
      // 将纯文本插入编辑器
      document.execCommand('insertText', false, text)
    }

    // 全屏切换
    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value
      if (isFullscreen.value) {
        document.documentElement.requestFullscreen().catch(err => {
          showToast(`无法进入全屏: ${err}`, 'error')
        })
      } else {
        document.exitFullscreen().catch(err => {
          showToast(`无法退出全屏: ${err}`, 'error')
        })
      }
      showToast(isFullscreen.value ? '已进入全屏模式' : '已退出全屏模式', 'success')
    }

    // 侧边栏切换
    const toggleSidebar = () => {
      showSidebar.value = !showSidebar.value
    }

    // 监听标题变更
    watch(() => currentChapter.title, (newTitle) => {
      if (currentChapterId.value) {
        const index = chapters.value.findIndex(c => c.id === currentChapterId.value)
        if (index !== -1) {
          chapters.value[index].title = newTitle
          titleChanged.value = true
          
          // 设置自动保存定时器
          if (autoSaveTimeout.value) {
            clearTimeout(autoSaveTimeout.value)
          }
          
          autoSaveTimeout.value = setTimeout(() => {
            saveCurrentChapter()
          }, 1000) // 一秒后自动保存
        }
      }
    })

    // Add new methods for font and background handling
    const applyFontSettings = () => {
      if (editorContent.value) {
        editorContent.value.style.fontFamily = fontSettings.family
        editorContent.value.style.fontSize = `${fontSettings.size}px`
        editorContent.value.style.color = fontSettings.color
      }
    }

    const applyBackgroundSettings = () => {
      const editorContainer = document.querySelector('.editor-container')
      if (editorContainer) {
        if (backgroundSettings.type === 'color') {
          editorContainer.style.background = backgroundSettings.color
          editorContainer.style.backgroundImage = 'none'
        } else {
          // 使用rgba设置背景色作为底色，配合透明度
          editorContainer.style.backgroundColor = `rgba(255, 255, 255, ${1 - backgroundSettings.opacity})`
          editorContainer.style.backgroundImage = `url(${backgroundSettings.imageUrl})`
          editorContainer.style.backgroundSize = 'cover'
          editorContainer.style.backgroundAttachment = 'fixed'
          editorContainer.style.backgroundBlendMode = 'overlay' // 混合模式让效果更好
        }
      }
    }

    const handleImageUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        backgroundSettings.image = file
        backgroundSettings.imageUrl = URL.createObjectURL(file)
      }
    }

    // 记录历史状态
    const recordHistory = debounce(() => {
      if (!editorContent.value) return
      
      const content = editorContent.value.innerHTML
      const title = currentChapter.title
      
      // 如果内容没有变化，则不记录
      if (history.stack[history.index]?.content === content && 
          history.stack[history.index]?.title === title) {
        return
      }
      
      // 如果当前不是最新状态，则丢弃后面的历史
      if (history.index < history.stack.length - 1) {
        history.stack = history.stack.slice(0, history.index + 1)
      }
      
      // 添加新记录
      history.stack.push({
        content,
        title,
        timestamp: new Date().getTime()
      })
      
      // 限制历史记录数量
      if (history.stack.length > history.maxSize) {
        history.stack.shift()
      } else {
        history.index = history.stack.length - 1
      }
    }, 500)

    // 撤销功能
    const undo = () => {
      if (history.index <= 0) {
        showToast('已到达最早记录', 'info')
        return
      }
      
      history.index--
      applyHistoryState()
    }

    // 重做功能
    const redo = () => {
      if (history.index >= history.stack.length - 1) {
        showToast('已到达最新记录', 'info')
        return
      }
      
      history.index++
      applyHistoryState()
    }

    // 应用历史状态
    const applyHistoryState = () => {
      const state = history.stack[history.index]
      if (!state || !editorContent.value) return
      
      currentChapter.title = state.title
      editorContent.value.innerHTML = state.content
      calculateWordCount()
    }

    // 一键排版
    const formatContent = () => {
      const editor = editorContent.value
      if (!editor) return
      
      // Get current selection
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      
      // If text is selected, format only the selection
      if (selectedText) {
        formatSelectedText(range, selectedText)
      } else {
        // Format the entire content
        formatAllContent(editor)
      }
      
      // Trigger content update
      onContentUpdate()
      showToast('排版完成', 'success')
    }

    // Helper method to format selected text
    const formatSelectedText = (range, text) => {
      const formattedText = text.split('\n').map(line => {
        // Remove all leading whitespace
        const trimmed = line.replace(/^\s+/, '')
        // Add exactly two spaces if line is not empty
        return trimmed ? '  ' + trimmed : ''
      }).join('\n')
      
      // Replace the selected text
      range.deleteContents()
      range.insertNode(document.createTextNode(formattedText))
    }

    // Helper method to format all content
    const formatAllContent = (editor) => {
      // Process each paragraph (p element) in the content
      const paragraphs = editor.querySelectorAll('p')
      paragraphs.forEach(p => {
        // Get the text content
        const text = p.textContent || ''
        
        // Remove all leading whitespace
        const trimmed = text.replace(/^\s+/, '')
        
        // Clear the paragraph
        p.innerHTML = ''
        
        // Add exactly two spaces if line is not empty
        if (trimmed) {
          p.appendChild(document.createTextNode('  ' + trimmed))
        }
      })
    }

    // 查找方法
    const findText = () => {
      if (!searchState.searchText) return
      
      const editor = editorContent.value
      const content = editor.innerHTML
      const flags = searchState.caseSensitive ? 'g' : 'gi'
      const regex = new RegExp(searchState.searchText, flags)
      
      editor.innerHTML = content.replace(regex, match => 
        `<span class="search-highlight">${match}</span>`
      )
    }

    // 替换方法
    const replaceText = () => {
      if (!searchState.searchText) return
      
      const editor = editorContent.value
      const flags = searchState.caseSensitive ? 'g' : 'gi'
      const regex = new RegExp(searchState.searchText, flags)
      
      editor.innerHTML = editor.innerHTML.replace(
        /<span class="search-highlight">(.*?)<\/span>/g, 
        searchState.replaceText
      ).replace(regex, searchState.replaceText)
      
      showToast(`已替换所有匹配项`, 'success')
    }

    // 组件挂载
    onMounted(async () => {
      // 添加关闭窗口前保存的事件监听
      window.addEventListener('beforeunload', beforeUnloadHandler)
      
      // 加载章节
      await loadChapters()
      
      // 默认打开第一个章节
      if (chapters.value.length > 0 && !currentChapterId.value) {
        openChapter(chapters.value[0].id)
      }
      
      // 初始化时添加事件监听
      window.addEventListener('keydown', handleKeyDown)
    })

    // 组件卸载
    onBeforeUnmount(() => {
      // 保存当前编辑的内容
      if (contentChanged.value || titleChanged.value) {
        saveCurrentChapter()
      }
      
      // 移除事件监听器
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      document.removeEventListener('click', closeContextMenuOnOutsideClick)
      
      // 清除自动保存定时器
      if (autoSaveTimeout.value) {
        clearTimeout(autoSaveTimeout.value)
      }
      
      // 组件卸载时移除事件监听
      window.removeEventListener('keydown', handleKeyDown)
    })

    // 关闭窗口前保存
    const beforeUnloadHandler = (event) => {
      if (contentChanged.value || titleChanged.value) {
        // Only show confirmation for unsaved changes
        event.preventDefault()
        event.returnValue = '您有未保存的更改，确定要离开吗？'
        return event.returnValue
      }
    }

    // 修改自动保存逻辑
    watch([() => currentChapter.content, () => currentChapter.title], () => {
      if (autoSaveTimeout.value) {
        clearTimeout(autoSaveTimeout.value)
      }
      
      autoSaveTimeout.value = setTimeout(() => {
        saveCurrentChapter() // 改为调用saveCurrentChapter而不是saveChapters
      }, 5000)
    })

    // 返回组件暴露的属性和方法
    return {
      isFullscreen,
      showSidebar,
      editorContent,
      chapters,
      currentChapterId,
      currentChapter,
      wordCount,
      contextMenu,
      isLoading,
      openChapter,
      saveCurrentChapter,
      createNewChapter,
      createNewVolume,
      showContextMenu,
      deleteChapter,
      moveChapterUp,
      moveChapterDown,
      renameChapter,
      onContentUpdate,
      insertTab,
      onPaste,
      toggleFullscreen,
      toggleSidebar,
      fontSettings,
      backgroundSettings,
      applyFontSettings,
      applyBackgroundSettings,
      handleImageUpload,
      undo,
      redo,
      history,
      formatContent,
      searchState,
      findText,
      replaceText,
      calculateWordCount
    }
  }
}
</script>

<style>
@import url('../styles/editor.css');
</style> 