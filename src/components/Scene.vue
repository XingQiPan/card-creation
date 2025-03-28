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
          <div class="card-size-control">
            <button @click="decreaseCardSize" title="减小卡片尺寸">
              <i class="fas fa-search-minus"></i>
            </button>
            <button @click="increaseCardSize" title="增大卡片尺寸">
              <i class="fas fa-search-plus"></i>
            </button>
          </div>
          <button @click="deleteScene" class="delete-scene-btn">
            <i class="fas fa-trash"></i> 删除场景
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
              <button 
                @click.stop="handleInsertPrompt(card)"
                title="插入到提示词"
              >
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
            <div 
              v-if="card.insertedContents?.length" 
              class="inserted-contents"
            >
              <div 
                v-for="(content, index) in card.insertedContents" 
                :key="index"
                class="inserted-content"
              >
                <div class="inserted-header">
                  <span>已插入到: {{ content.promptTitle }}</span>
                  <button 
                    @click.stop="removeInsertedContent(card, index)"
                    class="remove-btn"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="processed-content">
                  <div class="content-label">处理后的内容:</div>
                  <div class="content-text">{{ content.processedContent }}</div>
                </div>
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
        <span v-if="selectedForLink.length === 0">
          请选择要关联的卡片
        </span>
        <span v-else-if="selectedForLink.length === 1">
          已选择 1 张卡片，请选择要关联的另一张卡片
        </span>
        <button @click="isLinkMode = false" class="cancel-btn">
          取消关联
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, reactive, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { debugLog } from '../utils/debug'
import { showToast } from '../utils/common'
import { dataService } from '../utils/services/dataService'

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
  },
  selectedPrompt: Object
})

const emit = defineEmits([
  'update:scene',
  'view-card',
  'delete-card',
  'update-card',
  'insert-prompt',
  'update-card-tags',
  'move-card',
  'add-to-notepad',
  'delete-scene',
  'remove-inserted-content'
])

const drag = ref(false)
const showTagModal = ref(false)
const currentCard = ref(null)
const showMoveModal = ref(false)
const cardToMove = ref(null)
const isLinkMode = ref(false)
const selectedForLink = ref([])

// 添加 UUID 生成函数
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 修改卡片创建方法，添加数据保存
const createNewCard = async () => {
  if (!props.scene.cards) {
    props.scene.cards = []
  }
  
  const newCard = {
    id: generateUUID(),
    title: '新建卡片',
    content: '',
    height: '120px',
    tags: [],
    insertedContents: []
  }
  
  // 更新场景
  const updatedScene = {
    ...props.scene,
    cards: [...props.scene.cards, newCard]
  }
  
  // 发出更新事件
  emit('update:scene', updatedScene)
  
  // 保存数据
  try {
    // 获取所有场景
    const allScenes = [...props.scenes]
    // 找到当前场景的索引
    const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
    // 更新场景
    if (sceneIndex !== -1) {
      allScenes[sceneIndex] = updatedScene
      // 保存到后端
      await dataService.saveItem('scenes', allScenes)
    }
  } catch (error) {
    console.error('保存卡片失败:', error)
    showToast('保存卡片失败，但已在本地更新', 'warning')
  }
}

// 优化卡片过滤方法
const taggedCardsMap = computed(() => {
  const map = new Map()
  props.selectedTags.forEach(tagId => {
    props.scene.cards.forEach(card => {
      if (card.tags?.includes(tagId)) {
        map.set(card.id, card)
      }
    })
  })
  return map
})


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
      
      // 更新场景
      const updatedScene = {...props.scene}
      emit('update:scene', updatedScene)
      
      // 保存数据
      try {
        // 获取所有场景
        const allScenes = [...props.scenes]
        // 找到当前场景的索引
        const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
        // 更新场景
        if (sceneIndex !== -1) {
          allScenes[sceneIndex] = updatedScene
          // 保存到后端
          await dataService.saveItem('scenes', allScenes)
        }
      } catch (error) {
        console.error('保存导入的卡片失败:', error)
        showToast('保存导入的卡片失败，但已在本地更新', 'warning')
      }
    } catch (error) {
      console.error('文件导入错误:', error)
      showToast('文件导入失败: ' + error.message, 'error')
    }
  }
}

// 改进卡片调整大小的处理
const startCardResize = (e, card) => {
  e.stopPropagation()
  const textarea = e.target.parentElement.querySelector('textarea')
  const startY = e.clientY
  const startHeight = textarea.offsetHeight

  const handleMouseMove = (e) => {
    const diff = e.clientY - startY
    const newHeight = Math.max(120, startHeight + diff)
    card.height = `${newHeight}px`
    emit('update-card', {...card})
  }

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

// 标签相关方法
const toggleCardTag = async (card, tagId) => {
  if (!card.tags) {
    card.tags = []
  }
  const index = card.tags.indexOf(tagId)
  if (index === -1) {
    card.tags.push(tagId)
  } else {
    card.tags.splice(index, 1)
  }
  
  // 更新卡片
  emit('update-card', card)
  
  // 保存数据
  try {
    // 获取所有场景
    const allScenes = [...props.scenes]
    // 找到当前场景的索引
    const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
    // 更新场景中的卡片
    if (sceneIndex !== -1) {
      const cardIndex = allScenes[sceneIndex].cards.findIndex(c => c.id === card.id)
      if (cardIndex !== -1) {
        allScenes[sceneIndex].cards[cardIndex] = card
        // 保存到后端
        await dataService.saveItem('scenes', allScenes)
      }
    }
  } catch (error) {
    console.error('保存卡片标签失败:', error)
    showToast('保存卡片标签失败，但已在本地更新', 'warning')
  }
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
  return props.scenes.filter(scene => scene.id !== props.scene.id)
})

// 显示移动卡片模态框
const showMoveCardModal = (card) => {
  cardToMove.value = card
  showMoveModal.value = true
}

// 关闭移动卡片模态框
const closeMoveModal = () => {
  showMoveModal.value = false
  cardToMove.value = null
}

// 移动卡片到选定场景
const moveCardToScene = async (card, targetScene) => {
  emit('move-card', {
    card,
    sourceSceneId: props.scene.id,
    targetSceneId: targetScene.id
  })
  
  // 保存数据
  try {
    // 获取所有场景
    const allScenes = [...props.scenes]
    // 找到源场景和目标场景
    const sourceSceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
    const targetSceneIndex = allScenes.findIndex(s => s.id === targetScene.id)
    
    if (sourceSceneIndex !== -1 && targetSceneIndex !== -1) {
      // 从源场景中移除卡片
      const cardIndex = allScenes[sourceSceneIndex].cards.findIndex(c => c.id === card.id)
      if (cardIndex !== -1) {
        const movedCard = allScenes[sourceSceneIndex].cards.splice(cardIndex, 1)[0]
        // 添加到目标场景
        if (!allScenes[targetSceneIndex].cards) {
          allScenes[targetSceneIndex].cards = []
        }
        allScenes[targetSceneIndex].cards.push(movedCard)
        
        // 保存到后端
        await dataService.saveItem('scenes', allScenes)
      }
    }
  } catch (error) {
    console.error('保存卡片移动失败:', error)
    showToast('保存卡片移动失败，但已在本地更新', 'warning')
  }
  
  closeMoveModal()
}

// 切换关联模式
const toggleLinkMode = (card) => {
  if (!isLinkMode.value) {
    // 进入关联模式
    isLinkMode.value = true
    selectedForLink.value = [card.id]
  } else {
    // 退出关联模式
    isLinkMode.value = false
    selectedForLink.value = []
  }
}

// 切换卡片选择
const toggleCardSelection = (card) => {
  if (!isLinkMode.value) return

  const index = selectedForLink.value.indexOf(card.id)
  if (index === -1) {
    selectedForLink.value.push(card.id)
  } else {
    selectedForLink.value.splice(index, 1)
  }

  // 如果选择了两张卡片，创建关联
  if (selectedForLink.value.length === 2) {
    createCardLink()
  }
}

// 创建卡片关联
const createCardLink = async () => {
  const [cardId1, cardId2] = selectedForLink.value
  const card1 = props.scene.cards.find(c => c.id === cardId1)
  const card2 = props.scene.cards.find(c => c.id === cardId2)

  if (card1 && card2) {
    // 初始化links数组（如果不存在）
    if (!card1.links) card1.links = []
    if (!card2.links) card2.links = []

    // 添加相互关联
    if (!card1.links.includes(cardId2)) {
      card1.links.push(cardId2)
    }
    if (!card2.links.includes(cardId1)) {
      card2.links.push(cardId1)
    }

    // 更新卡片
    emit('update-card', card1)
    emit('update-card', card2)

    // 保存数据
    try {
      // 获取所有场景
      const allScenes = [...props.scenes]
      // 找到当前场景的索引
      const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
      // 更新场景中的卡片
      if (sceneIndex !== -1) {
        const card1Index = allScenes[sceneIndex].cards.findIndex(c => c.id === card1.id)
        const card2Index = allScenes[sceneIndex].cards.findIndex(c => c.id === card2.id)
        
        if (card1Index !== -1 && card2Index !== -1) {
          allScenes[sceneIndex].cards[card1Index] = card1
          allScenes[sceneIndex].cards[card2Index] = card2
          
          // 保存到后端
          await dataService.saveItem('scenes', allScenes)
        }
      }
    } catch (error) {
      console.error('保存卡片关联失败:', error)
      showToast('保存卡片关联失败，但已在本地更新', 'warning')
    }

    // 退出关联模式
    isLinkMode.value = false
    selectedForLink.value = []
    
    showToast('卡片关联成功')
  }
}

// 检查卡片是否有关联
const hasLinks = (card) => {
  return card.links && card.links.length > 0
}

// 获取关联的卡片
const getLinkedCards = (card) => {
  if (!card.links) return []
  return props.scene.cards.filter(c => card.links.includes(c.id))
}

// 取消单个卡片关联
const unlinkCards = async (card1, card2) => {
  // 移除相互关联
  if (card1.links) {
    card1.links = card1.links.filter(id => id !== card2.id)
  }
  if (card2.links) {
    card2.links = card2.links.filter(id => id !== card1.id)
  }

  // 更新卡片
  emit('update-card', card1)
  emit('update-card', card2)
  
  // 保存数据
  try {
    // 获取所有场景
    const allScenes = [...props.scenes]
    // 找到当前场景的索引
    const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
    // 更新场景中的卡片
    if (sceneIndex !== -1) {
      const card1Index = allScenes[sceneIndex].cards.findIndex(c => c.id === card1.id)
      const card2Index = allScenes[sceneIndex].cards.findIndex(c => c.id === card2.id)
      
      if (card1Index !== -1 && card2Index !== -1) {
        allScenes[sceneIndex].cards[card1Index] = card1
        allScenes[sceneIndex].cards[card2Index] = card2
        
        // 保存到后端
        await dataService.saveItem('scenes', allScenes)
      }
    }
  } catch (error) {
    console.error('保存取消卡片关联失败:', error)
    showToast('保存取消卡片关联失败，但已在本地更新', 'warning')
  }
  
  showToast('已取消卡片关联')
}

// 取消所有关联
const unlinkAllCards = (card) => {
  if (!card.links || card.links.length === 0) return

  // 获取所有关联的卡片
  const linkedCards = getLinkedCards(card)
  
  // 移除所有关联
  card.links = []
  linkedCards.forEach(linkedCard => {
    if (linkedCard.links) {
      linkedCard.links = linkedCard.links.filter(id => id !== card.id)
      emit('update-card', linkedCard)
    }
  })

  // 更新当前卡片
  emit('update-card', card)
  
  showToast('已取消所有关联')
}

// 文本截断辅助函数
const truncateText = (text, length) => {
  if (!text) return '未命名'
  return text.length > length ? text.slice(0, length) + '...' : text
}

// 查看卡片详情
const viewCardDetail = (card) => {
  emit('view-card', card)
}
const preventTextSelection = (prevent) => {
  document.body.style.userSelect = prevent ? 'none' : ''
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
  emit('add-to-notepad', {
    id: card.id,
    title: card.title,
    content: card.content
  })
}

// 添加场景删除方法
const deleteScene = async () => {
  try {
    if (!props.scene || !props.scene.id) {
      throw new Error('场景不存在或ID无效')
    }
    
    // 如果这是最后一个场景，不允许删除
    if (props.scenes.length <= 1) {
      throw new Error('无法删除最后一个场景')
    }
    
    // 如果场景中有卡片，需要确认
    if (props.scene.cards && props.scene.cards.length > 0) {
      if (!confirm(`确定要删除场景"${props.scene.name}"吗？这将删除场景中的所有卡片！`)) {
        return
      }
    }
    
    // 发出删除事件
    emit('delete-scene', props.scene.id)
    
    // 保存数据
    try {
      // 获取所有场景
      const allScenes = [...props.scenes]
      // 移除当前场景
      const updatedScenes = allScenes.filter(s => s.id !== props.scene.id)
      // 保存到后端
      await dataService.saveItem('scenes', updatedScenes)
    } catch (error) {
      console.error('保存场景删除失败:', error)
      showToast('保存场景删除失败，但已在本地更新', 'warning')
    }
  } catch (error) {
    console.error('删除场景失败:', error)
    showToast(error.message, 'error')
  }
}

// 处理插入提示词
const handleInsertPrompt = (card) => {
  console.log('Scene: 发出插入请求', card)
  emit('insert-prompt', card)
}

// 移除已插入内容
const removeInsertedContent = (card, index) => {
  emit('remove-inserted-content', { card, index })
}

// 添加卡片尺寸控制
const cardSizeLevel = ref(3) // 默认为中等尺寸
const cardSizeClass = computed(() => `card-size-${cardSizeLevel.value}`)

// 增大卡片尺寸
const increaseCardSize = () => {
  if (cardSizeLevel.value < 10) { // 增加最大值到10
    cardSizeLevel.value++
    applyCardSize()
  }
}

// 减小卡片尺寸
const decreaseCardSize = () => {
  if (cardSizeLevel.value > 1) {
    cardSizeLevel.value--
    applyCardSize()
  }
}

// 应用卡片尺寸
const applyCardSize = () => {
  // 使用 CSS 变量设置卡片尺寸
  document.documentElement.style.setProperty('--card-size-level', cardSizeLevel.value)
}

// 在组件挂载时应用卡片尺寸
onMounted(() => {
  applyCardSize()
})
</script>

<style scoped>
@import url("../styles/scene.css");
</style>