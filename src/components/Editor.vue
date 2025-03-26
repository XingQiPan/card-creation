<template>
  <div class="editor-container" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 顶部导航栏 -->
    <div class="editor-header">
      <div class="header-left">
        <button class="icon-btn" @click="toggleSidebar" title="显示/隐藏侧边栏">
          <i class="fas fa-bars"></i>
        </button>
        <button class="tool-btn" title="字体">
          <i class="fas fa-font"></i> 字体
        </button>
        <button class="tool-btn" title="背景">
          <i class="fas fa-palette"></i> 背景
        </button>
        <button class="icon-btn" title="撤销">
          <i class="fas fa-undo"></i>
        </button>
        <button class="icon-btn" title="重做">
          <i class="fas fa-redo"></i>
        </button>
        <button class="tool-btn" title="排版">
          <i class="fas fa-paragraph"></i> 排版
        </button>
        <button class="tool-btn" title="插入">
          <i class="fas fa-plus"></i> 插入
        </button>
      </div>
      <div class="header-right">
        <button class="icon-btn" @click="toggleFullscreen" title="全屏">
          <i class="fas fa-expand"></i>
        </button>
        <button class="icon-btn" title="保存" @click="saveCurrentChapter">
          <i class="fas fa-save"></i>
        </button>
        <button class="icon-btn" title="查找">
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
          <div class="search-container">
            <input type="text" placeholder="全书" class="search-input">
          </div>
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
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'

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

    // 计算属性
    const isEditing = computed(() => {
      return currentChapterId.value !== null
    })

    // 加载所有章节
    const loadChapters = async () => {
      try {
        isLoading.value = true
        // 从后端加载书籍章节数据
        const response = await fetch(`http://localhost:3000/api/books/${bookId.value}/chapters`)
        if (response.ok) {
          const data = await response.json()
          chapters.value = data
          
          // 如果没有章节，创建一个默认章节
          if (chapters.value.length === 0) {
            const defaultChapter = {
              id: uuidv4(),
              title: '第一章',
              content: '',
              order: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            chapters.value.push(defaultChapter)
            saveChapters()
          }
          
          // 如果没有当前章节ID，默认打开第一个章节
          if (!currentChapterId.value && chapters.value.length > 0) {
            openChapter(chapters.value[0].id)
          }
        } else {
          console.error('加载章节失败', await response.text())
          // 从本地存储加载备份
          const localChapters = localStorage.getItem(`book-${bookId.value}-chapters`)
          if (localChapters) {
            chapters.value = JSON.parse(localChapters)
          }
        }
      } catch (error) {
        console.error('加载章节出错:', error)
        // 创建一个默认的章节列表
        if (chapters.value.length === 0) {
          chapters.value = [{
            id: uuidv4(),
            title: '第一章',
            content: '',
            order: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      } finally {
        isLoading.value = false
      }
    }

    // 保存所有章节
    const saveChapters = async () => {
      try {
        // 更新本章节的时间戳
        const currentIndex = chapters.value.findIndex(c => c.id === currentChapterId.value)
        if (currentIndex >= 0) {
          chapters.value[currentIndex].updatedAt = new Date().toISOString()
        }
        
        // 保存到后端
        const response = await fetch(`http://localhost:3000/api/books/${bookId.value}/chapters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chapters.value)
        })
        
        if (!response.ok) {
          throw new Error(`保存失败: ${response.status}`)
        }
        
        // 同时保存到本地作为备份
        localStorage.setItem(`book-${bookId.value}-chapters`, JSON.stringify(chapters.value))
        
        // 重置变更标志
        contentChanged.value = false
        titleChanged.value = false
        
        console.log('章节保存成功')
      } catch (error) {
        console.error('保存章节失败:', error)
        // 仍然保存到本地存储作为备份
        localStorage.setItem(`book-${bookId.value}-chapters`, JSON.stringify(chapters.value))
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
      }
    }

    // 保存当前章节
    const saveCurrentChapter = async () => {
      if (!currentChapterId.value) return
      
      // 更新当前章节内容（从编辑器获取最新内容）
      if (editorContent.value) {
        currentChapter.content = editorContent.value.innerHTML
      }
      
      // 在章节列表中更新当前章节
      const index = chapters.value.findIndex(c => c.id === currentChapterId.value)
      if (index !== -1) {
        // 更新章节数据
        chapters.value[index].title = currentChapter.title
        chapters.value[index].content = currentChapter.content
        chapters.value[index].updatedAt = new Date().toISOString()
        
        // 保存所有章节
        await saveChapters()
      }
    }

    // 创建新章节
    const createNewChapter = () => {
      const newChapter = {
        id: uuidv4(),
        title: `第${chapters.value.length + 1}章`,
        content: '',
        order: chapters.value.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      chapters.value.push(newChapter)
      saveChapters()
      openChapter(newChapter.id)
    }

    // 创建新卷
    const createNewVolume = () => {
      // 目前处理为创建一个标记为"卷"的特殊章节
      const newVolume = {
        id: uuidv4(),
        title: `第${Math.ceil(chapters.value.length / 10) + 1}卷`,
        content: '<!-- 这是一个卷分隔符 -->',
        order: chapters.value.length,
        isVolume: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      chapters.value.push(newVolume)
      saveChapters()
      openChapter(newVolume.id)
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
      // 标记内容已修改
      contentChanged.value = true
      
      // 计算字数
      calculateWordCount()
      
      // 设置自动保存定时器
      if (autoSaveTimeout.value) {
        clearTimeout(autoSaveTimeout.value)
      }
      
      autoSaveTimeout.value = setTimeout(() => {
        saveCurrentChapter()
      }, 2000) // 两秒后自动保存
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

    // 组件挂载
    onMounted(async () => {
      console.log('Editor mounted with bookId:', props.bookId)
      
      // 添加关闭窗口前保存的事件监听
      window.addEventListener('beforeunload', beforeUnloadHandler)
      
      // 加载章节
      await loadChapters()
      
      // 默认打开第一个章节
      if (chapters.value.length > 0 && !currentChapterId.value) {
        openChapter(chapters.value[0].id)
      }
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
    })

    // 关闭窗口前保存
    const beforeUnloadHandler = (event) => {
      if (contentChanged.value || titleChanged.value) {
        // 尝试保存
        saveCurrentChapter()
        
        // 显示确认对话框
        event.preventDefault()
        event.returnValue = '您有未保存的更改，确定要离开吗？'
        return event.returnValue
      }
    }

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
      toggleSidebar
    }
  }
}
</script>

<style>
/* 基础样式重置与变量 */
:root {
  --primary-color: #646cff;
  --primary-light: rgba(100, 108, 255, 0.08);
  --text-color: #333;
  --text-secondary: #666;
  --text-light: #999;
  --border-color: #eaeaea;
  --bg-color: #fff;
  --bg-secondary: #f9f9fa;
  --bg-sidebar: #f9f9fa;
  --border-radius: 4px;
  --box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  --transition: all 0.2s ease;
}

/* 编辑器容器 */
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
}

/* 顶部导航栏 */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  height: 40px;
  background-color: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--box-shadow);
  z-index: 10;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.editor-tools {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

/* 工具按钮 */
.tool-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--border-radius);
  transition: var(--transition);
  height: 32px;
}

.tool-btn:hover {
  background-color: var(--bg-secondary);
}

.icon-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-size: 16px;
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
}

.icon-btn:hover {
  background-color: var(--bg-secondary);
}

/* 编辑器主体区域 */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.chapter-sidebar {
  width: 220px;
  height: 100%;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  transition: width 0.3s ease;
}

.chapter-sidebar.collapsed {
  width: 0;
  overflow: hidden;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 搜索框 */
.search-container {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 14px;
  background-color: white;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  padding: 12px;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.create-btn {
  padding: 6px 12px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  font-size: 14px;
  cursor: pointer;
  flex: 1;
  transition: var(--transition);
}

.create-btn:hover {
  background-color: #5258cc;
}

.create-btn.light {
  background-color: white;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.create-btn.light:hover {
  background-color: var(--primary-light);
}

/* 章节列表 */
.chapter-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.chapter-category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.chapter-count {
  font-size: 12px;
  color: var(--text-light);
}

.chapter-item {
  padding: 8px 12px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: 14px;
  display: flex;
  align-items: center;
  height: 36px;
}

.chapter-item:hover {
  background-color: #f9f9fa;
}

.chapter-item.active {
  background-color: #eef0ff;
  color: #646cff;
}

.chapter-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 章节标题编辑 */
.chapter-title-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.chapter-title-input {
  font-size: 18px;
  font-weight: 500;
  padding: 8px 0;
  border: none;
  outline: none;
  width: 80%;
  background: transparent;
}

.word-count-display {
  font-size: 14px;
  color: var(--text-light);
  background-color: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: var(--border-radius);
}

/* 内容编辑区 */
.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: white;
}

.content-editor {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 16px;
  outline: none;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* 右侧工具栏 */
.right-sidebar {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 5px;
  background: transparent;
  z-index: 5;
}

.right-sidebar .icon-btn {
  color: #666;
  background-color: white;
  border: 1px solid #eaeaea;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  width: 36px;
  height: 36px;
}

.right-sidebar .icon-btn:hover {
  background-color: #f5f5f5;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 150px;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-item:hover {
  background-color: var(--bg-secondary);
}

.context-menu-item.delete {
  color: #ff4d4f;
}

.context-menu-item.delete:hover {
  background-color: #fff1f0;
}

/* 全屏模式 */
.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: var(--bg-color);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tool-btn span {
    display: none;
  }
  
  .content-editor {
    padding: 16px;
  }
  
  .chapter-sidebar {
    position: absolute;
    left: 0;
    top: 40px;
    bottom: 0;
    z-index: 20;
    box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  }
}

/* 写作区域预设样式 */
.content-editor h1, .content-editor h2, .content-editor h3 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.content-editor h1 {
  font-size: 1.5em;
}

.content-editor h2 {
  font-size: 1.3em;
}

.content-editor h3 {
  font-size: 1.1em;
}

.content-editor p {
  margin-top: 0;
  margin-bottom: 16px;
}

.content-editor ul, .content-editor ol {
  padding-left: 2em;
  margin-bottom: 16px;
}
</style> 