<template>
  <div class="scene">
    <div 
      class="content-panel"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <div class="panel-header">
        <h2>{{ scene.name }}</h2>
        <div class="header-actions">
          <button @click="createNewCard">
            <i class="fas fa-plus"></i> 新建卡片
          </button>
          <label class="import-btn">
            <input 
              type="file" 
              multiple 
              accept=".txt,.md,.json"
              @change="handleFilesImport"
              ref="fileInput"
            >
            <i class="fas fa-file-import"></i> 导入文件
          </label>
          <button @click="exportToJsonl">
            <i class="fas fa-file-export"></i> 导出
          </button>
        </div>
      </div>
      <div class="drop-zone" v-if="scene.cards.length === 0">
        <div class="drop-message">
          <i class="fas fa-file-upload"></i>
          <p>拖放文件到这里，或点击上方按钮选择文件</p>
        </div>
      </div>
      <draggable 
        v-model="scene.cards"
        class="cards-grid"
        item-key="id"
        @start="drag=true" 
        @end="drag=false"
      >
        <template #item="{ element: card }">
          <div 
            v-if="!selectedTags.length || (card.tags && selectedTags.some(tagId => card.tags.includes(tagId)))"
            class="text-card"
            :class="{ 
              'is-dragging': drag,
              'is-linked': hasLinks(card),
              'is-selected': selectedForLink.includes(card.id)
            }"
            @click.ctrl="toggleCardSelection(card)"
          >
            <div class="card-header">
              <input 
                v-model="card.title" 
                placeholder="输入标题..."
                class="card-title"
                @input="$emit('update-card', card)"
              />
            </div>
            <div class="card-content">
              <textarea 
                v-model="card.content"
                @input="$emit('update-card', card)"
                placeholder="输入文本内容..."
                :style="{ height: card.height || '120px' }"
              ></textarea>
              <div class="resize-handle" @mousedown="startCardResize($event, card)"></div>
            </div>
            <div class="card-tags">
              <div 
                v-for="tag in tags" 
                :key="tag.id"
                class="card-tag"
                :class="{ 
                  active: card.tags?.includes(tag.id),
                  'is-keyword': tag.isKeyword && card.tags?.includes(tag.id)
                }"
                @click.stop="toggleCardTag(card, tag.id)"
              >
                <i v-if="tag.isKeyword" class="fas fa-key"></i>
                {{ tag.name }}
              </div>
              <button class="add-tag-btn" @click.stop="showTagSelector(card)">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <div class="card-actions">
              <button @click.stop="toggleLinkMode(card)" :class="{ active: isLinkMode }">
                <i class="fas fa-link"></i>
              </button>
              <button @click.stop="$emit('insert-prompt-at-cursor', card)">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button @click.stop="$emit('view-card', card)">
                <i class="fas fa-expand"></i>
              </button>
              <button @click.stop="showMoveCardModal(card)">
                <i class="fas fa-exchange-alt"></i>
              </button>
              <button @click.stop="addToNotepad(card)" title="添加到记事本">
                <i class="fas fa-book"></i>
              </button>
              <button @click.stop="$emit('delete-card', card.id)" class="delete-btn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="inserted-prompts" v-if="card.insertedContents?.length">
              <div v-for="(content, index) in card.insertedContents" 
                   :key="index" 
                   class="inserted-prompt">
                <span>已插入到提示词</span>
                <button @click.stop="removeInsertedPrompt(card, index)" 
                        class="remove-prompt-btn">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div v-if="hasLinks(card)" class="linked-cards">
              <div class="linked-count">
                已关联 {{ getLinkedCards(card).length }} 张卡片
                <button class="unlink-all-btn" @click.stop="unlinkAllCards(card)">
                  <i class="fas fa-unlink"></i> 取消所有关联
                </button>
              </div>
              <div class="linked-preview">
                <div 
                  v-for="linkedCard in getLinkedCards(card)" 
                  :key="linkedCard.id"
                  class="linked-card-item"
                >
                  <span @click.stop="viewCardDetail(linkedCard)">
                    {{ truncateText(linkedCard.title || '未命名卡片', 15) }}
                  </span>
                  <button 
                    class="unlink-btn" 
                    @click.stop="unlinkCards(card, linkedCard)"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- 标签选择弹窗 -->
    <div v-if="showTagModal" class="tag-selector-modal" @click="closeTagSelector">
      <div class="tag-selector-content" @click.stop>
        <h3>选择标签</h3>
        <div class="tag-list">
          <div 
            v-for="tag in tags" 
            :key="tag.id"
            class="tag-item"
            :class="{ active: currentCard?.tags?.includes(tag.id) }"
            @click="toggleCardTag(currentCard, tag.id)"
          >
            <span>{{ tag.name }}</span>
            <i class="fas fa-check" v-if="currentCard?.tags?.includes(tag.id)"></i>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeTagSelector">完成</button>
        </div>
      </div>
    </div>

    <!-- 添加移动卡片的模态框 -->
    <div v-if="showMoveModal" class="modal" @click="closeMoveModal">
      <div class="modal-content" @click.stop>
        <h3>移动卡片到其他场景</h3>
        <div class="scene-list">
          <div 
            v-for="scene in availableScenes"
            :key="scene.id"
            class="scene-item"
            @click="moveCardToScene(cardToMove, scene)"
          >
            <span>{{ scene.name }}</span>
            <i class="fas fa-chevron-right"></i>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeMoveModal">取消</button>
        </div>
      </div>
    </div>

    <!-- Add link mode indicator -->
    <div v-if="isLinkMode" class="link-mode-indicator">
      <div class="indicator-content">
        <i class="fas fa-link"></i>
        选择要关联的卡片 (已选择 {{ selectedForLink.length }} 张)
        <button @click="confirmLink" :disabled="selectedForLink.length < 2">
          确认关联
        </button>
        <button @click="cancelLink" class="cancel-btn">
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch, onUnmounted } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps({
  scene: {
    type: Object,
    required: true
  },
  scenes: {
    type: Array,
    required: true
  },
  textCards: {
    type: Array,
    required: true
  },
  selectedCards: {
    type: Array,
    required: true
  },
  prompts: {
    type: Array,
    required: true
  },
  insertablePrompts: {
    type: Array,
    required: true
  },
  models: {
    type: Array,
    required: true
  },
  tags: {
    type: Array,
    required: true
  },
  selectedTags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:scene',
  'view-card',
  'delete-card',
  'update-card',
  'insert-prompt-at-cursor',
  'update-card-tags',
  'move-card',
  'add-to-notepad'
])

const drag = ref(false)
const showTagModal = ref(false)
const currentCard = ref(null)
const showMoveModal = ref(false)
const cardToMove = ref(null)
const isLinkMode = ref(false)
const selectedForLink = ref([])
const sourceCard = ref(null)

// 添加计算属性来过滤卡片
const filteredCards = computed(() => {
  if (!props.selectedTags.length) {
    return props.scene.cards
  }
  
  return props.scene.cards.filter(card => {
    if (!card.tags) return false
    return props.selectedTags.some(tagId => card.tags.includes(tagId))
  })
})

// 添加对场景变化的监听
watch(() => props.scene, (newScene) => {
  if (newScene) {
    // 确保场景中的cards属性存在
    if (!newScene.cards) {
      newScene.cards = []
    }
    // 发出更新事件
    emit('update:scene', newScene)
  }
}, { deep: true })

// 修改卡片创建方法
const createNewCard = () => {
  if (!props.scene.cards) {
    props.scene.cards = []
  }
  
  const newCard = {
    id: Date.now(),
    title: '新建卡片',
    content: '',
    height: '120px',
    tags: [],
    insertedContents: []
  }
  
  props.scene.cards.push(newCard)
  emit('update:scene', {...props.scene})
}

// 添加新的方法来处理提示词插入
const insertPromptContent = (card, prompt) => {
  if (!card.insertedContents) {
    card.insertedContents = []
  }
  
  // Get content from the card and its linked cards
  const contents = [card.content]
  if (card.links) {
    const linkedContents = getLinkedCards(card)
      .map(linkedCard => linkedCard.content)
      .filter(Boolean)
    contents.push(...linkedContents)
  }
  
  // Add all contents to the prompt
  contents.forEach(content => {
    if (content) {
      card.insertedContents.push(content)
    }
  })
  
  emit('update-card', card)
}

// 修改现有的 removeInsertedPrompt 方法
const removeInsertedPrompt = (card, index) => {
  if (!card.insertedContents) {
    card.insertedContents = []
    return
  }
  
  card.insertedContents.splice(index, 1)
  emit('update-card', card)
}

// 修改文件导入方法
const handleFilesImport = async (event) => {
  const files = event.target.files
  if (!files.length) return

  try {
    if (!props.scene.cards) {
      props.scene.cards = []
    }

    for (const file of files) {
      const content = await file.text()
      const newCard = {
        id: Date.now() + Math.random(),
        title: file.name,
        content: content.trim(),
        height: '200px',
        tags: [],
        insertedContents: []
      }
      props.scene.cards.push(newCard)
    }

    emit('update:scene', {...props.scene})
    event.target.value = ''

  } catch (error) {
    console.error('文件导入错误:', error)
    alert('导入失败: ' + error.message)
  }
}

// 拖放处理
const handleDragOver = (event) => {
  event.preventDefault()
  event.stopPropagation()
}
const handleDrop = async (event) => {
  event.preventDefault()
  event.stopPropagation()
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    try {
      if (!props.scene.cards) {
        props.scene.cards = []
      }

      for (const file of files) {
        const content = await file.text()
        const newCard = {
          id: Date.now() + Math.random(),
          title: file.name,
          content: content.trim(),
          height: '200px',
          tags: [],
          insertedContents: []
        }
        props.scene.cards.push(newCard)
      }
      
      emit('update:scene', {...props.scene})
    } catch (error) {
      console.error('文件导入错误:', error)
      alert('文件导入失败: ' + error.message)
    }
  }
}

// 修改导出方法
const exportToJsonl = () => {
  if (!props.scene.cards.length) {
    alert('没有可导出的卡片')
    return
  }

  try {
    // 将每个卡片转换为 JSON 行
    const jsonlContent = props.scene.cards
      .map(card => JSON.stringify(card))
      .join('\n')

    // 创建下载
    const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.scene.name || 'cards'}.jsonl`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出错误:', error)
    alert('导出失败: ' + error.message)
  }
}

const startCardResize = (e, card) => {
    e.stopPropagation()
    const textarea = e.target.parentElement.querySelector('textarea')
    const startY = e.clientY
    const startHeight = textarea.offsetHeight

    const handleMouseMove = (e) => {
        const diff = e.clientY - startY
        const newHeight = Math.max(120, startHeight + diff)
        card.height = `${newHeight}px`
    }

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
}

// 标签相关方法
const toggleCardTag = (card, tagId) => {
  if (!card.tags) {
    card.tags = []
  }
  const index = card.tags.indexOf(tagId)
  if (index === -1) {
    card.tags.push(tagId)
  } else {
    card.tags.splice(index, 1)
  }
  emit('update-card', card)
}

const showTagSelector = (card) => {
  currentCard.value = card
  showTagModal.value = true
}

const closeTagSelector = () => {
  showTagModal.value = false
  currentCard.value = null
}

// 计算可用的目标场景（排除当前场景）
const availableScenes = computed(() => {
  return props.scenes.filter(s => s.id !== props.scene.id)
})

// 显示移动卡片模态框
const showMoveCardModal = (card) => {
  console.log('Opening move modal for card:', card)
  cardToMove.value = card
  showMoveModal.value = true
}

// 关闭移动卡片模态框
const closeMoveModal = () => {
  showMoveModal.value = false
  cardToMove.value = null
}

// 移动卡片到选定场景
const moveCardToScene = (card, targetScene) => {
  console.log('Moving card to scene:', targetScene)
  emit('move-card', {
    card,
    sourceSceneId: props.scene.id,
    targetSceneId: targetScene.id
  })
  closeMoveModal()
}

// Add new methods for card linking
const toggleLinkMode = (card) => {
  if (!isLinkMode.value) {
    isLinkMode.value = true
    sourceCard.value = card
    selectedForLink.value = [card.id]
  }
}

const toggleCardSelection = (card) => {
  if (!isLinkMode.value) return
  
  const index = selectedForLink.value.indexOf(card.id)
  if (index === -1) {
    selectedForLink.value.push(card.id)
  } else {
    selectedForLink.value.splice(index, 1)
  }
}

const confirmLink = () => {
  if (selectedForLink.value.length < 2) return
  
  // Create or update links for all selected cards
  selectedForLink.value.forEach(cardId => {
    const card = props.scene.cards.find(c => c.id === cardId)
    if (card) {
      if (!card.links) card.links = []
      // Add all other selected cards as links
      selectedForLink.value.forEach(linkId => {
        if (linkId !== cardId && !card.links.includes(linkId)) {
          card.links.push(linkId)
        }
      })
    }
  })
  
  emit('update:scene', {...props.scene})
  cancelLink()
}

const cancelLink = () => {
  isLinkMode.value = false
  selectedForLink.value = []
  sourceCard.value = null
}

const hasLinks = (card) => {
  return card.links?.length > 0
}

const getLinkedCards = (card) => {
  if (!card.links) return []
  return props.scene.cards.filter(c => card.links.includes(c.id))
}

const viewCardDetail = (card) => {
  emit('view-card', card)
}

const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...'
  }
  return text
}

// Add new methods for unlinking cards
const unlinkCards = (card1, card2) => {
  // Remove link from card1
  if (card1.links) {
    card1.links = card1.links.filter(id => id !== card2.id)
  }
  
  // Remove link from card2
  if (card2.links) {
    card2.links = card2.links.filter(id => id !== card1.id)
  }
  
  emit('update:scene', {...props.scene})
}

const unlinkAllCards = (card) => {
  if (!card.links) return
  
  // Get all linked cards
  const linkedCards = getLinkedCards(card)
  
  // Remove this card's ID from all linked cards
  linkedCards.forEach(linkedCard => {
    if (linkedCard.links) {
      linkedCard.links = linkedCard.links.filter(id => id !== card.id)
    }
  })
  
  // Clear all links from this card
  card.links = []
  
  emit('update:scene', {...props.scene})
}

// Add new method to prevent text selection during drag
const preventTextSelection = (prevent) => {
  document.body.style.userSelect = prevent ? 'none' : ''
  document.body.style.webkitUserSelect = prevent ? 'none' : ''
}

// Modify draggable events
watch(drag, (isDragging) => {
  preventTextSelection(isDragging)
})

// Clean up when component is unmounted
onUnmounted(() => {
  preventTextSelection(false)
})

// 修改卡片传输到笔记本的方法，添加调试日志
const addToNotepad = (card) => {
  console.log('Adding card to notepad:', card)
  // 确保发送完整的卡片内容
  emit('add-to-notepad', {
    title: card.title || '无标题',
    content: card.content || '',
    height: card.height || '200px',
    tags: card.tags || [],
    insertedContents: card.insertedContents || []
  })
}
</script>

<style scoped>
.scene {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* 确保内容不会超出容器 */
}

.content-panel {
  display: flex;
  flex-direction: column;
  flex: 1; /* 占据剩余空间 */
  overflow: auto; /* 使内容面板可垂直滚动 */
  height: 0; /* 关键：让 flex-grow 生效 */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-bottom: 1px solid #eee;
  flex-shrink: 0; /* 防止头部被压缩 */
}


.header-actions {
  display: flex;
  gap: 12px;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.import-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

.drop-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ddd;
  margin: 20px 0;
  border-radius: 8px;
  background: #f8f9fa;
}

.drop-message {
  text-align: center;
  color: #666;
}

.drop-message i {
  font-size: 48px;
  margin-bottom: 16px;
  color: #999;
}

.drop-message p {
  margin: 0;
  font-size: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
}

.text-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-normal);
  user-select: none; /* Prevent text selection on card headers and actions */
}

.card-header {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.card-title {
  width: 90%;
  padding: 4px 8px;
  font-size: var(--font-size-medium);
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  user-select: text; /* Allow text selection in title */
}

.card-title:hover,
.card-title:focus {
  border-color: #ddd;
  background: #fff;
}

.card-content {
  position: relative;
  flex: 1;
  padding: 0;
  user-select: text; /* Allow text selection in textarea */
}

.card-content textarea {
  width: 100%;
  height: 100%;
  min-height: 120px;
  padding: 12px;
  border: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
}

.card-actions button {
  padding: 6px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  transition: all 0.2s ease;
}

.card-actions button:hover {
  background: #e9ecef;
  color: #333;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: row-resize;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.05));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.text-card:hover .resize-handle {
  opacity: 1;
}

.text-card.is-dragging {
  opacity: 0.7;
  transform: scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.delete-btn {
    background-color: red;
}

.inserted-prompts {
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
}

.inserted-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 12px;
  color: #1976d2;
}

.remove-prompt-btn {
  padding: 2px;
  background: none;
  border: none;
  color: #d32f2f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-prompt-btn:hover {
  color: #b71c1c;
}

/* 卡片标签样式 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
}

.card-tag {
  padding: 4px 12px;
  background: #f0f0f0;
  border-radius: 16px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-tag:hover {
  background: #e0e0e0;
}

.card-tag.active {
  background: #646cff;
  color: white;
}

.card-tag.is-keyword {
  background: #fff3e0;
  color: #f57c00;
  border: 1px solid #f57c00;
}

.card-tag.is-keyword i {
  font-size: 12px;
  margin-right: 4px;
  color: #f57c00;
}

.add-tag-btn {
  padding: 4px 8px;
  background: transparent;
  border: 1px dashed #ccc;
  border-radius: 16px;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-tag-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

/* 标签选择器模态框样式 */
.tag-selector-modal {
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

.tag-selector-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.tag-selector-content h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-item:hover {
  background: #e9ecef;
}

.tag-item.active {
  background: #646cff;
  color: white;
}

.tag-item i {
  font-size: 14px;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 8px 20px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-actions button:hover {
  background: #5058cc;
}

/* 确保卡片内容区域可以正确调整大小 */
.card-content {
  position: relative;
  flex: 1;
  min-height: 120px;
  display: flex;
  flex-direction: column;
}

.card-content textarea {
  flex: 1;
  width: 90%;
  min-height: 120px;
  padding: 12px;
  border: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

/* 添加移动卡片模态框的样式 */
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
  max-height: 80vh;
  overflow-y: auto;
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

.scene-item i {
  color: #666;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #f0f0f0;
  cursor: pointer;
}

.modal-actions button:hover {
  background: #e0e0e0;
}

.text-card.is-linked {
  border: 1px solid #646cff;
}

.text-card.is-selected {
  background: #f0f2ff;
  border: 2px solid #646cff;
}

.linked-cards {
  padding: 8px 12px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
}

.linked-count {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.unlink-all-btn {
  padding: 2px 8px;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.unlink-all-btn:hover {
  color: #c82333;
}

.linked-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.linked-card-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.unlink-btn {
  padding: 2px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.linked-card-item:hover .unlink-btn {
  opacity: 1;
}

.unlink-btn:hover {
  color: #dc3545;
}

.link-mode-indicator {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #646cff;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 1000;
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.indicator-content button {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  background: white;
  color: #646cff;
  cursor: pointer;
}

.indicator-content button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.indicator-content .cancel-btn {
  background: transparent;
  color: white;
  border: 1px solid white;
}

.card-actions button.active {
  background: #646cff;
  color: white;
}
</style>