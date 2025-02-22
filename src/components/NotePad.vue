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
            <div class="note-time">{{ formatTime(note.updatedAt) }}</div>
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
          @input="saveNotes"
        />
        <div class="editor-toolbar">
          <button 
            :class="['mode-btn', { active: !isEditing }]" 
            @click="isEditing = false"
          >
            <i class="fas fa-eye"></i> 预览
          </button>
          <button 
            :class="['mode-btn', { active: isEditing }]" 
            @click="isEditing = true"
          >
            <i class="fas fa-edit"></i> 编辑
          </button>
          <div class="last-updated">
            最后更新: {{ formatTime(currentNote.updatedAt) }}
          </div>
        </div>
      </div>
      
      <div class="editor-content">
        <!-- 编辑模式 -->
        <textarea 
          v-if="isEditing"
          v-model="currentNote.content"
          placeholder="开始输入内容... (支持 Markdown 格式)"
          class="content-textarea"
          @input="handleContentChange"
        ></textarea>
        
        <!-- 预览模式 -->
        <div 
          v-else
          class="markdown-preview"
          v-html="renderMarkdown(currentNote.content)"
        ></div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 正确定义 props
const props = defineProps({
  scenes: {
    type: Array,
    required: true,
    default: () => []
  },
  initialContent: {
    type: String,
    default: ''
  }
})

// 添加调试日志
console.log('Available scenes:', props.scenes)

// 笔记列表
const notes = ref([])
const currentNoteId = ref(null)
const isEditing = ref(true)

// 当前笔记
const currentNote = computed(() => 
  notes.value.find(note => note.id === currentNoteId.value)
)

// 注入场景相关方法
const moveToScene = inject('moveToScene')

// 监听 initialContent 的变化
watch(() => props.initialContent, (newContent) => {
  if (newContent) {
    // 创建新笔记并添加内容
    const newNote = {
      id: Date.now(),
      title: '从卡片导入的笔记',
      content: newContent,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    notes.value.unshift(newNote)
    currentNoteId.value = newNote.id
    isEditing.value = false // 默认显示预览模式
    saveNotes()
  }
}, { immediate: true })

// 创建新笔记
const createNewNote = () => {
  const newNote = {
    id: Date.now(),
    title: '',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  notes.value.unshift(newNote)
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

// 获取预览文本
const getPreview = (content) => {
  return content?.slice(0, 50) || '空笔记'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

// 处理内容变化
const handleContentChange = () => {
  if (currentNote.value) {
    currentNote.value.updatedAt = new Date()
    saveNotes()
  }
}

// 保存笔记到本地存储
const saveNotes = () => {
  localStorage.setItem('notes', JSON.stringify(notes.value))
}

// 加载笔记
const loadNotes = () => {
  const savedNotes = localStorage.getItem('notes')
  if (savedNotes) {
    notes.value = JSON.parse(savedNotes)
    // 如果有笔记，默认选中第一个
    if (notes.value.length > 0) {
      currentNoteId.value = notes.value[0].id
    }
  }
}

// 组件挂载时加载笔记
onMounted(() => {
  loadNotes()
})

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
  console.log('Moving note:', note)
  console.log('Available scenes:', props.scenes)
  noteToMove.value = note
  showMoveModal.value = true
}

const moveNoteToSelectedScene = (note, targetScene) => {
  console.log('Selected scene:', targetScene)
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
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-time {
  font-size: 0.8em;
  color: #999;
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

.last-updated {
  margin-left: auto;
  color: #999;
  font-size: 0.9em;
}

.editor-content {
  flex: 1;
  overflow-y: hidden;
  position: relative;
}

.content-textarea {
  width: 95%;
  height: 100%;
  padding: 20px;
  border: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 1.2em;
  line-height: 1.6;
  background: #fff;
}

.content-textarea:focus {
  outline: none;
}

.markdown-preview {
  padding: 20px;
  line-height: 1.6;
  color: #24292e;
  height: 100%;
  overflow-y: auto;
}

/* Markdown 预览样式 */
.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-preview h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-preview h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

.markdown-preview h3 {
  font-size: 1.25em;
}

.markdown-preview code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27,31,35,0.05);
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.markdown-preview pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin: 16px 0;
}

.markdown-preview pre code {
  padding: 0;
  margin: 0;
  background-color: transparent;
  border: 0;
}

.markdown-preview blockquote {
  margin: 0;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview table {
  border-spacing: 0;
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
}

.markdown-preview table th,
.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview table tr {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

.markdown-preview table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.markdown-preview img {
  max-width: 100%;
  box-sizing: border-box;
}

.markdown-preview p {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
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
</style> 