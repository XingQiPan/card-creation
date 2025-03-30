<template>
  <div class="scene">
    <!-- 添加快速删除提示 -->
    <div v-if="isCtrlPressed" class="quick-delete-hint">
      <i class="fas fa-exclamation-circle"></i>
      点击删除按钮直接删除卡片、卡组
    </div>
    
    <div 
      class="content-panel"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <div class="panel-header">
        <h2>{{ scene.name }}</h2>
        <div class="header-actions">
          <div class="create-buttons">
            <button @click="createNewCard">
              <i class="fas fa-plus"></i> 新建卡片
            </button>
            <button @click="createNewCardGroup">
              <i class="fas fa-folder-plus"></i> 新建卡组
            </button>
          </div>
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
          <div v-if="card.type === 'group'"
               class="card-group"
               :class="{ 
                 'is-dragging': drag,
                 'is-dropping': isDropTarget === card.id
               }"
               draggable="false"
               @dragover.prevent="handleGroupDragOver($event, card)"
               @dragleave="handleGroupDragLeave(card)"
               @drop.stop="handleGroupDrop($event, card)">
            <div class="group-header">
              <input v-model="card.title" 
                     placeholder="卡组名称..."
                     class="group-title"
                     @input="$emit('update-card', card)" />
              <div class="group-actions">
                <span class="card-count">{{ card.cards?.length || 0 }}</span>
                <button @click.stop="showAddCardsToGroup(card)" title="添加卡片">
                  <i class="fas fa-plus"></i>
                </button>
                <button @click.stop="handleDeleteCard(card)" class="delete-btn">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <div class="group-cards">
              <div v-for="groupCard in card.cards" 
                   :key="groupCard.id" 
                   class="group-card-item"
                   @dblclick="viewCardDetail(groupCard)"
                   @click.alt="handleAltClick($event, groupCard)">
                <span class="group-card-title">{{ groupCard.title || '未命名卡片' }}</span>
                <div class="group-card-actions">
                  <button @click.stop="showTagSelector(groupCard)" 
                          class="group-card-tag-btn" 
                          :class="{ 'has-tags': groupCard.tags?.length }">
                    <i class="fas fa-tag"></i>
                    <span v-if="groupCard.tags?.length" class="tag-count">
                      {{ groupCard.tags.length }}
                    </span>
                  </button>
                  <button @click.stop="removeFromGroup(card, groupCard)" class="remove-from-group">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div 
            v-else-if="!selectedTags.length || (card.tags && selectedTags.some(tagId => card.tags.includes(tagId)))"
            class="text-card"
            :class="{ 
              'is-dragging': drag,
              'is-linked': hasLinks(card),
              'is-selected': selectedForLink.includes(card.id)
            }"
            draggable="true"
            @dragstart="handleDragStart($event, card)"
            @click.ctrl="toggleCardSelection(card)"
            @click.alt="handleAltClick($event, card)"
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
              <button @click.stop="handleDeleteCard(card)" class="delete-btn">
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

    <!-- 添加卡片到卡组的模态框 -->
    <div v-if="showAddToGroupModal" class="modal add-to-group-modal" @click="closeAddToGroupModal">
      <div class="modal-content" @click.stop>
        <h3>添加卡片到卡组</h3>
        <div class="select-all-container">
          <label>
            <input type="checkbox" 
                   :checked="isAllSelected"
                   @change="toggleSelectAll">
            全选
          </label>
        </div>
        <div class="cards-list">
          <div v-for="card in availableCards" 
               :key="card.id"
               class="card-select-item">
            <label>
              <input type="checkbox"
                     v-model="selectedCards"
                     :value="card.id">
              {{ card.title || '未命名卡片' }}
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="confirmAddToGroup" class="confirm-btn">
            确认添加 ({{ selectedCards.length }})
          </button>
          <button @click="closeAddToGroupModal" class="cancel-btn">取消</button>
        </div>
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
const isDropTarget = ref(null)

// 添加新的响应式变量
const showAddToGroupModal = ref(false)
const selectedCards = ref([])
const currentGroup = ref(null)

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

// 修改处理数据保存的方法
const saveSceneData = async () => {
  try {
    // 获取所有场景
    const allScenes = [...props.scenes]
    // 找到当前场景的索引
    const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
    
    if (sceneIndex !== -1) {
      // 确保卡组数据完整性
      const updatedScene = {
        ...props.scene,
        cards: props.scene.cards.map(card => ({
          ...card,
          type: card.type || 'normal',
          cards: card.type === 'group' ? (card.cards || []) : undefined
        }))
      }
      
      allScenes[sceneIndex] = updatedScene
      
      // 保存到后端
      await dataService.saveItem('scenes', allScenes)
    }
  } catch (error) {
    console.error('保存场景数据失败:', error)
    showToast('保存场景数据失败，但已在本地更新', 'warning')
  }
}

// 创建新卡组
const createNewCardGroup = async () => {
  if (!props.scene.cards) {
    props.scene.cards = []
  }
  
  const newGroup = {
    id: generateUUID(),
    title: '新建卡组',
    type: 'group',
    cards: [],
    expanded: true
  }
  
  const updatedScene = {
    ...props.scene,
    cards: [...props.scene.cards, newGroup]
  }
  
  emit('update:scene', updatedScene)
  
  // 保存更新后的场景数据
  await saveSceneData()
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

// 修改拖放处理方法
const handleDrop = async (event) => {
  event.preventDefault()
  event.stopPropagation()
  
  // 处理文件拖放
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
      
      try {
        const allScenes = [...props.scenes]
        const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
        if (sceneIndex !== -1) {
          allScenes[sceneIndex] = updatedScene
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
    return
  }

  // 处理拖放数据
  try {
    const draggedData = event.dataTransfer.getData('text/plain')
    if (!draggedData) return

    // 尝试解析为JSON格式的卡片数据
    try {
      const cardData = JSON.parse(draggedData)
      // 处理卡片数据
      console.log('拖放的卡片数据:', cardData)
      // 这里可以添加处理卡片拖放的逻辑
    } catch (e) {
      // 如果解析JSON失败，说明可能是标签数据
      console.log('拖放的标签数据:', draggedData)
      // 这里可以添加处理标签拖放的逻辑
    }
  } catch (error) {
    console.error('处理拖放数据失败:', error)
  }
}

// 为卡片添加拖动开始事件处理
const handleDragStart = (event, card) => {
  if (!card) return
  
  try {
    // 添加一个类型标识
    const cardData = {
      type: 'card',
      id: card.id,
      title: card.title || '',
      content: card.content || '',
      height: card.height || '120px'
    }
    event.dataTransfer.setData('text/plain', JSON.stringify(cardData))
  } catch (error) {
    console.error('设置拖动数据失败:', error)
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

// 处理卡组的拖放
const handleGroupDragOver = (event, group) => {
  event.preventDefault()
  isDropTarget.value = group.id
}

const handleGroupDragLeave = (group) => {
  if (isDropTarget.value === group.id) {
    isDropTarget.value = null
  }
}

const handleGroupDrop = async (event, group) => {
  event.preventDefault()
  isDropTarget.value = null
  
  try {
    const cardDataStr = event.dataTransfer.getData('text/plain')
    if (!cardDataStr) return

    let cardData
    try {
      cardData = JSON.parse(cardDataStr)
    } catch (e) {
      console.error('解析卡片数据失败:', e)
      return
    }

    // 避免重复添加或添加自身
    if (cardData.id === group.id || group.cards?.some(c => c.id === cardData.id)) {
      return
    }

    // 从场景中移除卡片
    const updatedSceneCards = props.scene.cards.filter(c => c.id !== cardData.id)
    const cardToAdd = props.scene.cards.find(c => c.id === cardData.id)

    if (cardToAdd) {
      // 确保卡组的 cards 数组存在
      if (!group.cards) {
        group.cards = []
      }
      
      // 添加到卡组
      group.cards.push({
        ...cardToAdd,
        id: cardToAdd.id
      })

      // 更新场景的卡片列表，移除已添加到卡组的卡片
      props.scene.cards = updatedSceneCards

      // 更新场景
      const updatedScene = {...props.scene}
      emit('update:scene', updatedScene)
      
      // 保存更新后的场景数据
      await saveSceneData()
      
      showToast('已添加到卡组')
    }
  } catch (error) {
    console.error('添加到卡组失败:', error)
    showToast('添加到卡组失败', 'error')
  }
}

// 显示添加卡片模态框
const showAddCardsToGroup = (group) => {
  currentGroup.value = group
  showAddToGroupModal.value = true
  selectedCards.value = [] // 重置选择
}

// 关闭模态框
const closeAddToGroupModal = () => {
  showAddToGroupModal.value = false
  currentGroup.value = null
  selectedCards.value = []
}

// 计算可用的卡片（排除已在组内和卡组类型的卡片）
const availableCards = computed(() => {
  if (!currentGroup.value) return []
  return props.scene.cards.filter(card => 
    card.type !== 'group' && 
    !currentGroup.value.cards?.some(groupCard => groupCard.id === card.id)
  )
})

// 全选状态
const isAllSelected = computed(() => {
  return availableCards.value.length > 0 && 
         selectedCards.value.length === availableCards.value.length
})

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedCards.value = []
  } else {
    selectedCards.value = availableCards.value.map(card => card.id)
  }
}

// 确认添加到卡组
const confirmAddToGroup = async () => {
  if (!currentGroup.value || selectedCards.value.length === 0) return

  try {
    // 获取选中的卡片数据
    const cardsToAdd = props.scene.cards.filter(card => 
      selectedCards.value.includes(card.id)
    )

    // 初始化卡组的cards数组
    if (!currentGroup.value.cards) {
      currentGroup.value.cards = []
    }

    // 更新场景卡片列表，移除已添加到卡组的卡片
    props.scene.cards = props.scene.cards.filter(card => 
      !selectedCards.value.includes(card.id)
    )

    // 添加卡片到卡组
    currentGroup.value.cards.push(...cardsToAdd)

    // 更新场景
    emit('update:scene', {...props.scene})

    // 保存数据
    try {
      const allScenes = [...props.scenes]
      const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
      if (sceneIndex !== -1) {
        allScenes[sceneIndex] = props.scene
        await dataService.saveItem('scenes', allScenes)
      }
    } catch (error) {
      console.error('保存场景数据失败:', error)
      showToast('保存场景数据失败，但已在本地更新', 'warning')
    }

    showToast(`已添加 ${selectedCards.value.length} 张卡片到卡组`)
    closeAddToGroupModal()
  } catch (error) {
    console.error('添加卡片到卡组失败:', error)
    showToast('添加卡片到卡组失败', 'error')
  }
}

// 从卡组中移除卡片
const removeFromGroup = async (group, card) => {
  try {
    // 从卡组中移除卡片
    const index = group.cards.findIndex(c => c.id === card.id)
    if (index !== -1) {
      // 移除卡片
      const removedCard = group.cards.splice(index, 1)[0]
      
      // 将卡片添加回场景
      props.scene.cards.push({
        ...removedCard,
        id: removedCard.id
      })
      
      // 更新场景
      emit('update:scene', {...props.scene})
      
      // 保存数据
      const allScenes = [...props.scenes]
      const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id)
      if (sceneIndex !== -1) {
        allScenes[sceneIndex] = props.scene
        await dataService.saveItem('scenes', allScenes)
      }

      showToast('已从卡组移除卡片')
    }
  } catch (error) {
    console.error('从卡组移除卡片失败:', error)
    showToast('从卡组移除卡片失败', 'error')
  }
}

// 添加监听卡组内卡片数量变化
const updateGroupScroll = (group) => {
  if (group && group.cards) {
    const container = document.querySelector(`[data-group-id="${group.id}"] .group-cards`)
    if (container) {
      container.classList.toggle('scrollable', group.cards.length > 4)
    }
  }
}

// 在卡片添加/移除时更新滚动状态
watch(() => currentGroup.value?.cards?.length, (newLength) => {
  if (currentGroup.value) {
    updateGroupScroll(currentGroup.value)
  }
})

// 在组件挂载后初始化滚动状态
onMounted(() => {
  if (props.scene.cards) {
    props.scene.cards.forEach(card => {
      if (card.type === 'group') {
        updateGroupScroll(card)
      }
    })
  }
})

// 添加处理卡片删除的函数
const handleDeleteCard = async (card) => {
  try {
    // 如果按住了ctrl键,跳过确认直接删除
    if (!isCtrlPressed.value) {
      // 原有的确认逻辑
      if (card.type === 'group' && card.cards?.length > 0) {
        if (!confirm(`确定要删除此卡组吗？卡组内的 ${card.cards.length} 张卡片将会移动到场景中。`)) {
          return
        }
        props.scene.cards.push(...card.cards)
      } else if (!confirm('确定要删除此卡片吗？')) {
        return
      }
    } else if (card.type === 'group' && card.cards?.length > 0) {
      // ctrl快速删除卡组时,仍需要处理其中的卡片
      props.scene.cards.push(...card.cards)
    }

    // 从场景中删除卡片/卡组
    props.scene.cards = props.scene.cards.filter(c => c.id !== card.id);
    
    // 更新场景
    const updatedScene = {...props.scene};
    emit('delete-card', card.id);
    emit('update:scene', updatedScene);
    
    // 保存数据
    try {
      const allScenes = [...props.scenes];
      const sceneIndex = allScenes.findIndex(s => s.id === props.scene.id);
      if (sceneIndex !== -1) {
        allScenes[sceneIndex] = updatedScene;
        await dataService.saveItem('scenes', allScenes);
      }
      showToast(card.type === 'group' ? '卡组已删除' : '卡片已删除');
    } catch (error) {
      console.error('保存删除操作失败:', error);
      showToast('保存删除操作失败，但已在本地更新', 'warning');
    }
  } catch (error) {
    console.error('删除失败:', error);
    showToast('删除失败', 'error');
  }
};

// 添加 Ctrl 键状态追踪
const isCtrlPressed = ref(false)

// 监听 Ctrl 键
const handleKeyDown = (e) => {
  if (e.key === 'Control') {
    isCtrlPressed.value = true
  } else if (e.key === 'Alt') {
    isAltPressed.value = true
  }
}

const handleKeyUp = (e) => {
  if (e.key === 'Control') {
    isCtrlPressed.value = false
  } else if (e.key === 'Alt') {
    isAltPressed.value = false
  }
}

// 处理 Alt 点击事件
const handleAltClick = (event, card) => {
  // 如果点击的是按钮，不触发插入功能
  if (event.target.closest('button')) {
    return
  }
  
  // 复用现有的插入提示词功能
  handleInsertPrompt(card)
}

// 在组件挂载时添加事件监听
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  isCtrlPressed.value = false
  isAltPressed.value = false
})

// 添加 Alt 键状态管理
const isAltPressed = ref(false)

// 监听键盘事件
onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
      isAltPressed.value = true
    }
  })
  
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
      isAltPressed.value = false
    }
  })
})

// 在组件卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
      isAltPressed.value = true
    }
  })
  
  window.removeEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
      isAltPressed.value = false
    }
  })
})
</script>

<style scoped>
@import url("../styles/scene.css");

/* 添加卡组相关样式 */
.create-buttons {
  display: flex;
  gap: 8px;
}

.card-group {
  width: 80%;
  height: 380px; /* 固定高度 */
  min-height: unset; /* 移除最小高度限制 */
  background: var(--card-bg-color);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative; /* 添加相对定位 */
  user-select: none; /* 防止文本选择 */
  pointer-events: auto; /* 确保可以接收拖放事件 */
  display: flex;
  flex-direction: column; /* 确保内容垂直布局 */
}

.card-group.is-dropping {
  background: var(--card-hover-bg-color);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.group-header {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-start; /* 改为靠左对齐 */
  align-items: center;
  margin-bottom: 8px;
  gap: 8px; /* 添加间距 */
}

.group-title {
  width: 200px; /* 限制输入框宽度 */
  font-size: 1.1em;
  font-weight: bold;
  border: none;
  background: transparent;
  padding: 4px;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto; /* 确保按钮靠左 */
}

.group-actions button {
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary-color);
  transition: color 0.2s ease;
}

.group-actions button:hover {
  color: var(--text-primary-color);
}

.group-cards {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  overflow-y: auto;
  padding: 8px; /* 增加内边距 */
  padding-right: 16px;
  background-color: white; /* 添加白色背景 */
  border-radius: 4px; /* 添加圆角 */
  mask-image: linear-gradient(to bottom, 
    transparent,
    black 8px,
    black calc(100% - 8px),
    transparent
  );
}

/* 自定义滚动条样式 */
.group-cards::-webkit-scrollbar {
  width: 6px;
}

.group-cards::-webkit-scrollbar-track {
  background: var(--scroll-track-color, rgba(0, 0, 0, 0.1));
  border-radius: 3px;
}

.group-cards::-webkit-scrollbar-thumb {
  background: var(--scroll-thumb-color, rgba(0, 0, 0, 0.2));
  border-radius: 3px;
}

.group-cards::-webkit-scrollbar-thumb:hover {
  background: var(--scroll-thumb-hover-color, rgba(0, 0, 0, 0.3));
}

/* 当卡片数量少于等于4个时隐藏滚动条 */
.group-cards:has(.group-card-item:nth-child(-n+3):last-child) {
  overflow-y: hidden;
}

.group-card-item {
  flex: 0 0 auto; /* 防止卡片被压缩 */
  min-height: 30px; /* 设置最小高度 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--card-item-bg-color);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.group-card-item:hover {
  background: var(--card-item-hover-bg-color);
}

.group-card-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-from-group {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.group-card-item:hover .remove-from-group {
  opacity: 1;
}

/* 确保卡组和卡片具有相同的网格尺寸 */
.card-group {
  grid-column: span 1;
  height: var(--card-height, auto);
}

/* 添加新的样式 */
.add-to-group-modal .modal-content {
  max-width: 400px;
  max-height: 80vh;
}

.select-all-container {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.cards-list {
  max-height: 50vh;
  overflow-y: auto;
  padding: 12px;
}

.card-select-item {
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}

.card-select-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.card-select-item:last-child {
  border-bottom: none;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 12px;
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
}

.confirm-btn {
  background: var(--primary-color);
  color: white;
}

.cancel-btn {
  background: var(--secondary-bg-color);
}

/* 新增卡片数量指示器样式 */
.cards-count-indicator {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: var(--primary-color);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card-group:hover .cards-count-indicator {
  opacity: 1;
}

/* 确保卡组在网格中保持固定尺寸 */
.cards-grid > .card-group {
  width: 95%;
  height: 360px !important; /* 强制固定高度 */
}

/* 添加快速删除提示样式 */
.quick-delete-hint {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 87, 34, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 0 0 4px 4px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  animation: slideDown 0.3s ease-out;
}

.quick-delete-hint i {
  font-size: 16px;
}

@keyframes slideDown {
  from {
    transform: translate(-50%, -100%);
  }
  to {
    transform: translate(-50%, 0);
  }
}

/* 添加卡组卡片标签按钮样式 */
.group-card-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.group-card-item:hover .group-card-actions {
  opacity: 1;
}

.group-card-tag-btn {
  position: relative;
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary-color);
  transition: all 0.2s ease;
}

.group-card-tag-btn:hover {
  color: var(--primary-color);
}

.group-card-tag-btn.has-tags {
  color: var(--primary-color);
}

.tag-count {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--primary-color);
  color: white;
  font-size: 0.7em;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.remove-from-group {
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary-color);
  transition: color 0.2s ease;
}

.remove-from-group:hover {
  color: var(--danger-color);
}

/* 调整卡组卡片项布局 */
.group-card-item {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-card-title {
  margin-right: auto;
  padding-right: 8px;
}

/* 当按住 Alt 键时，为卡片添加视觉提示 */
.text-card:has(:root[data-alt-pressed="true"]:not(:has(button:hover))),
.group-card-item:has(:root[data-alt-pressed="true"]:not(:has(button:hover))) {
  cursor: copy;
  position: relative;
}

.text-card:has(:root[data-alt-pressed="true"]:not(:has(button:hover)))::after,
.group-card-item:has(:root[data-alt-pressed="true"]:not(:has(button:hover)))::after {
  content: '点击插入到提示词';
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
}
</style>