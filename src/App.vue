<template>
  <div class="container">
    <div class="content-area">
      <!-- 主要内容区域 -->
      <div v-if="currentView === 'main'" class="main-content">
        <!-- 左侧提示词模板区 -->
        <div class="prompt-panel" :style="{ width: promptPanelWidth + 'px' }">
          <div class="panel-header">
            <h2>提示词模板</h2>
            <div class="header-actions">
              <button @click="showTagModal = true">
                <i class="fas fa-tags"></i> 管理标签
              </button>
              <button @click="createNewPrompt">
                <i class="fas fa-plus"></i> 新建模板
              </button>
              <button @click="showSettings = true">
                <i class="fas fa-cog"></i>
              </button>
            </div>
          </div>
          <div class="prompt-panel-header">
            <div class="header-actions">
              <button @click="showPromptModal = true">
                <i class="fas fa-plus"></i> 新建提示词
              </button>
              <label class="import-btn">
                <input 
                  type="file" 
                  multiple
                  accept=".txt,.md,.json,.text"
                  @change="importPrompts"
                  ref="promptFileInput"
                >
                <i class="fas fa-file-import"></i> 导入提示词
              </label>
            </div>
          </div>
          <div class="prompt-list">
            <div 
              v-for="prompt in prompts" 
              :key="prompt.id"
              class="prompt-item"
              :class="{ 
                'can-insert': canInsertText(prompt),
                'has-content': hasInsertedContent(prompt)
              }"
            >
              <div class="prompt-content">
                <h3>{{ prompt.title }}</h3>
                <div class="template-preview" @click="showPromptDetail(prompt)">
                  {{ truncateText(prompt.template, 200) }}
                  <span v-if="prompt.template.length > 200" class="show-more" style="color: #999;">
                    点击查看更多...
                  </span>
                </div>
                <div class="prompt-info">
                  <template v-if="canInsertText(prompt)">
                    <span>可插入数量: {{ getInsertCount(prompt.template) }}</span>
                    <div v-if="prompt.insertedContents?.length" class="inserted-contents">
                      <div v-for="(content, index) in prompt.insertedContents" 
                           :key="index" 
                           class="inserted-content">
                        <span>插入 {{index + 1}}: {{ truncateText(content) }}</span>
                        <button @click.stop="removeInsertedContent(prompt, index)">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <div class="card-footer">
                <div class="model-select">
                  <select v-model="prompt.selectedModel">
                    <option value="">选择模型</option>
                    <option 
                      v-for="model in models" 
                      :key="model.id" 
                      :value="model.id"
                    >
                      {{ model.name }}
                    </option>
                  </select>
                </div>
                <div class="action-buttons">
                  <button @click.stop="editPrompt(prompt)" class="edit-btn">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click.stop="deletePrompt(prompt.id)" class="delete-btn">
                    <i class="fas fa-trash"></i>
                  </button>
                  <button 
                    @click.stop="sendPromptRequest(prompt)"
                    :disabled="!canSendRequest(prompt) || !prompt.selectedModel"
                    class="send-btn"
                    :class="{ 'ready': canSendRequest(prompt) && prompt.selectedModel }"
                  >
                    <i class="fas fa-paper-plane"></i>
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- 面板调整器 -->
          <div 
            class="panel-resizer"
            @mousedown="startPanelResize"
          ></div>
        </div>

        <!-- 右侧内容区改为场景管理 -->
        <div class="scenes-container">
          <div class="scenes-header">
            <draggable 
              v-model="scenes"
              class="scene-tabs"
              item-key="id"
              handle=".scene-name"
              @start="dragScene=true"
              @end="dragScene=false"
            >
              <template #item="{ element: scene }">
                <div 
                  class="scene-tab"
                  :class="{ 
                    active: currentScene?.id === scene.id,
                    'is-dragging': dragScene && currentScene?.id === scene.id
                  }"
                >
                  <span class="scene-name" @click="switchScene(scene)">
                    <i class="fas fa-grip-lines"></i>
                    {{ scene.name }}
                  </span>
                  <div class="scene-actions">
                    <button 
                      class="edit-name-btn"
                      @click.stop="editSceneName(scene)"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button 
                      v-if="scenes.length > 1"
                      @click.stop="deleteScene(scene.id)"
                      class="delete-scene-btn"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </template>
            </draggable>
            <div class="tag-filters">
              <div 
                v-for="tag in tags" 
                :key="tag.id"
                class="tag-filter"
                :class="{ active: selectedTags.includes(tag.id) }"
                @click="toggleTagFilter(tag.id)"
              >
                {{ tag.name }}
              </div>
            </div>
            <button @click="createNewScene" class="new-scene-btn">
              <i class="fas fa-plus"></i> 新场景
            </button>
          </div>
          
          <Scene
            v-if="currentScene"
            v-model:scene="currentScene"
            :scenes="scenes"
            :text-cards="textCards"
            :selected-cards="selectedCards"
            :prompts="prompts"
            :insertable-prompts="insertablePrompts"
            :models="models"
            :tags="tags"
            :selected-tags="selectedTags"
            @view-card="viewCardDetail"
            @delete-card="deleteCard"
            @update-card="updateCard"
            @insert-prompt-at-cursor="insertPromptAtCursor"
            @move-card="handleMoveCard"
            @merge-cards="handleMergeCards"
            @add-to-notepad="handleAddToNotepad"
            @delete-scene="handleDeleteScene"
            :scene="currentScene"
            :selected-prompt="selectedPrompt"
            @insert-to-prompt="handleInsertToPrompt"
            @remove-inserted-content="handleRemoveInsertedContent"
            @select-prompt="selectPrompt"
            @insert-prompt="handleInsertPrompt"
          />
        </div>
      </div>

      <BookSplitter 
        v-else-if="currentView === 'book'"
        :prompts="prompts"
        :models="models"
        :scenes="scenes"
      />
      <ChatView
        v-else-if="currentView === 'chat'"
        :models="models"
        :scenes="scenes"
        :prompts="prompts"
        @add-cards-to-scene="handleAddCardsToScene"
      />
      <NotePad 
        v-if="currentView === 'note'" 
        :scenes="scenes"
        :initial-content="notepadInitialContent"
        :prompts="prompts"
        :models="models"
      />
    </div>

    <!-- 视图切换按钮 -->
    <div class="view-switcher">
      <button 
        :class="{ active: currentView === 'main' }"
        @click="currentView = 'main'"
      >
        <i class="fas fa-home"></i>
      </button>
      <button 
        :class="{ active: currentView === 'book' }"
        @click="currentView = 'book'"
      >
        <i class="fas fa-book"></i>
      </button>
      <button 
        :class="{ active: currentView === 'chat' }"
        @click="currentView = 'chat'"
      >
        <i class="fas fa-comments"></i>
      </button>
      <button 
        :class="{ active: currentView === 'note' }"
        @click="currentView = 'note'"
      >
        <i class="fas fa-sticky-note"></i>
      </button>
    </div>
  </div>

  
    <!-- 提示词选择模态框 -->
    <Teleport to="body">
      <div v-if="showPromptSelectModal" class="modal" @click="showPromptSelectModal = false">
        <div class="modal-content" @click.stop>
          <h3>选择提示词模板</h3>
          <div class="prompt-list">
            <div 
              v-for="prompt in prompts" 
              :key="prompt.id"
              class="prompt-item"
              @click="selectPromptAndInsert(prompt)"
            >
              <h4>{{ prompt.title }}</h4>
              <p class="prompt-template">{{ truncateText(prompt.template, 100) }}</p>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showPromptSelectModal = false" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 提示词编辑模态框 -->
    <div v-if="showPromptModal" class="modal">
      <div class="modal-content">
        <h3>{{ editingPrompt ? '编辑提示词' : '新建提示词' }}</h3>
        <div class="form-group">
          <label>标题</label>
          <input v-model="promptForm.title" placeholder="输入标题" />
        </div>
        <div class="form-group">
          <label>模板 (使用 {{text}} 表示文本插入位置)</label>
          <textarea 
            v-model="promptForm.template" 
            placeholder="输入提示词模板"
            class="template-input"
          ></textarea>
        </div>
        <div class="form-group">
          <label>默认模型</label>
          <select v-model="promptForm.defaultModel">
            <option value="">选择默认模型</option>
            <option 
              v-for="model in models" 
              :key="model.id" 
              :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
        </div>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="promptForm.detectKeywords"
              class="custom-checkbox"
            />
            <span class="checkbox-text">检测关键词</span>
            <span class="checkbox-description">
              启用后将自动检测提示词中的关键词并添加相关上下文
            </span>
          </label>
        </div>
        <div class="modal-actions">
          <button @click="showPromptModal = false">取消</button>
          <button @click="savePrompt">保存</button>
        </div>
      </div>
    </div>

    <!-- 设置模态框 -->
    <div v-if="showSettings" class="modal">
      <div class="modal-content settings-modal">
        <div class="modal-header">
          <h3>API 设置</h3>
          <button @click="showSettings = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="settings-body">
          <div class="models-list">
            <div 
              v-for="model in models" 
              :key="model.id"
              class="model-item"
            >
              <div class="model-info">
                <div class="form-group">
                  <label>模型名称</label>
                  <input v-model="model.name" placeholder="模型显示名称"/>
                </div>
                <div class="form-group">
                  <label>提供商</label>
                  <select v-model="model.provider">
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="stepfun">阶跃星辰</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="ollama">Ollama</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>API 地址</label>
                  <input v-model="model.apiUrl" placeholder="API 地址"/>
                </div>
                <div class="form-group">
                  <label>API Key</label>
                  <input 
                    v-model="model.apiKey" 
                    type="password" 
                    placeholder="API Key"
                    :disabled="model.provider === 'ollama'"
                  />
                </div>
                <div class="form-group">
                  <label>模型选择</label>
                  <div class="model-actions">
                    <!-- 自定义类型、Gemini 时显示输入框 -->
                    <template v-if="model.provider === 'custom' || model.provider === 'gemini'">
                      <input 
                        v-model="model.modelId"
                        :placeholder="model.provider === 'gemini' ? 'gemini-pro' : '输入模型ID'"
                        class="model-input"
                      />
                    </template>
                    <!-- Ollama 和其他类型显示下拉选择 -->
                    <template v-else>
                      <select v-model="model.modelId" class="model-select">
                        <option value="">选择模型</option>
                        <option 
                          v-for="m in model.availableModels" 
                          :key="m.id" 
                          :value="m.id"
                        >
                          {{ m.name }}
                          <template v-if="model.provider === 'ollama' && m.digest">
                            ({{ m.digest.substring(0, 8) }})
                          </template>
                        </option>
                      </select>
                      <button 
                        @click="refreshModelList(model)"
                        class="refresh-btn"
                        :disabled="!model.apiUrl"
                      >
                        <i class="fas fa-sync-alt"></i>
                        刷新
                      </button>
                    </template>
                  </div>
                </div>
                <div class="form-group">
                  <label>最大 Tokens</label>
                  <input v-model="model.maxTokens" type="number" placeholder="512"/>
                </div>
                <div class="form-group">
                  <label>Temperature</label>
                  <input 
                    v-model="model.temperature" 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="1" 
                    placeholder="0.7"
                  />
                </div>
              </div>
              <button @click="deleteModel(model.id)" class="delete-model-btn">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="settings-actions">
            <button @click="addModel" class="add-btn">
              <i class="fas fa-plus"></i> 添加模型
            </button>
            <button @click="saveModels" class="save-btn">
              <i class="fas fa-save"></i> 保存设置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示词详情模态框 -->
    <div v-if="showPromptDetailModal" class="modal">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <h3>{{ selectedPrompt.title }}</h3>
          <button @click="showPromptDetailModal = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <pre class="template-detail">{{ selectedPrompt.template }}</pre>
        </div>
      </div>
    </div>

    <!-- 卡片详情模态框 -->
    <div v-if="showCardDetailModal" class="modal">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <div class="card-title-input">
            <input 
              v-model="selectedCard.title" 
              placeholder="输入标题..."
              class="title-input"
            />
          </div>
          <div class="modal-actions">
            <button @click="togglePreview" class="preview-btn">
              <i :class="isPreview ? 'fas fa-edit' : 'fas fa-eye'"></i>
              {{ isPreview ? '编辑' : '预览' }}
            </button>
            <button @click="showCardDetailModal = false" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="modal-body">
          <div v-if="!isPreview" class="editor-container">
            <div class="editor-toolbar">
              <button @click="insertMdSyntax('**', '**')" title="粗体">
                <i class="fas fa-bold"></i>
              </button>
              <button @click="insertMdSyntax('*', '*')" title="斜体">
                <i class="fas fa-italic"></i>
              </button>
              <button @click="insertMdSyntax('### ', '')" title="标题">
                <i class="fas fa-heading"></i>
              </button>
              <button @click="insertMdSyntax('- ', '')" title="列表">
                <i class="fas fa-list"></i>
              </button>
              <button @click="insertMdSyntax('[', '](url)')" title="链接">
                <i class="fas fa-link"></i>
              </button>
              <button @click="insertMdSyntax('```\n', '\n```')" title="代码块">
                <i class="fas fa-code"></i>
              </button>
            </div>
            <textarea 
              v-model="selectedCard.content"
              class="card-detail-content"
              @input="updateCard(selectedCard)"
              ref="editorTextarea"
            ></textarea>
          </div>
          <div v-else class="preview-container markdown-body" v-html="renderedContent"></div>
        </div>
      </div>
    </div>

    <!-- 添加标签管理模态框 -->
    <div v-if="showTagModal" class="modal">
      <div class="modal-content tag-modal">
        <div class="modal-header">
          <h3>标签管理</h3>
          <button @click="showTagModal = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="tag-form">
          <div class="form-group">
            <input 
              v-model="newTagName" 
              placeholder="输入新标签名称"
              @keyup.enter="addTag"
            />
            <button @click="addTag" class="add-tag-btn">
              <i class="fas fa-plus"></i> 添加
            </button>
          </div>
        </div>
        <div class="tags-list">
          <div v-for="tag in tags" :key="tag.id" class="tag-item">
            <span>{{ tag.name }}</span>
            <div class="tag-actions">
              <button 
                class="toggle-keyword-btn"
                :class="{ 'is-keyword': tag.isKeyword }"
                @click="toggleTagKeyword(tag.id)"
                title="设为关键词标签"
              >
                <i class="fas fa-key"></i>
              </button>
              <button 
                class="delete-tag-btn"
                @click="deleteTag(tag.id)"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 组件 -->
    <Teleport to="body">
      <div 
        v-if="toast.show" 
        class="toast"
        :class="toast.type"
      >
        {{ toast.message }}
      </div>
    </Teleport>
</template>


<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'
import draggable from 'vuedraggable'
import Scene from './components/Scene.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import BookSplitter from './components/BookSplitter.vue'
import ChatView from './components/ChatView.vue'
import NotePad from './components/NotePad.vue'

// 将状态声明移到最前面
const currentView = ref('main') // 添加视图切换状态
const prompts = ref([])
const textCards = ref([])
const selectedCards = ref([])
const selectedPrompt = ref(null)
const showPromptModal = ref(false)
const showPromptSelectModal = ref(false)
const editingPrompt = ref(null)
const currentEditingCard = ref(null)
const drag = ref(false)
const notepadInitialContent = ref('')
const promptForm = ref({
  title: '',
  template: '',
  apiEndpoint: ''
})
const showSettings = ref(false)
const models = ref([
  {
    id: 'default',
    name: 'OpenAI',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelId: 'gpt-3.5-turbo',
    maxTokens: 512,
    temperature: 0.7
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'gemini',
    apiUrl: '', // 用户自己填写 API 地址
    apiKey: '',
    modelId: '', // 用户自己填写模型 ID
    maxTokens: 2048,
    temperature: 0.7
  },
  {
    id: 'stepfun',
    name: '阶跃星辰',
    provider: 'stepfun',
    apiUrl: 'https://platform.stepfun.com/v1',
    apiKey: '',
    modelId: 'step-1',
    maxTokens: 512,
    temperature: 0.7
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    provider: 'mistral',
    apiUrl: 'https://api.mistral.ai',
    apiKey: '',
    modelId: 'mistral-small',
    maxTokens: 512,
    temperature: 0.7,
    availableModels: [
      { id: 'mistral-tiny', name: 'Mistral Tiny' },
      { id: 'mistral-small', name: 'Mistral Small' },
      { id: 'mistral-medium', name: 'Mistral Medium' },
      { id: 'mistral-large', name: 'Mistral Large' }
    ]
  }
])
const promptPanelWidth = ref(300)
const showPromptDetailModal = ref(false)
const showCardDetailModal = ref(false)
const selectedCard = ref(null)
const showSuccessNotification = ref(false)
const scenes = ref([])
const currentScene = ref(null)
const tags = ref([])
const selectedTags = ref([])
const showTagModal = ref(false)
const newTagName = ref('')
const toasts = ref([])
const dragScene = ref(false)
const isPreview = ref(false)
const editorTextarea = ref(null)

// Toast 相关
const toast = ref({
  show: false,
  message: '',
  type: 'info'
})

// 渲染 Markdown 内容
const renderedContent = computed(() => {
  if (!selectedCard.value?.content) return ''
  const rawHtml = marked(selectedCard.value.content)
  return DOMPurify.sanitize(rawHtml)
})

// 切换预览模式
const togglePreview = () => {
  isPreview.value = !isPreview.value
}

// 插入 Markdown 语法
const insertMdSyntax = (prefix, suffix) => {
  const textarea = editorTextarea.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = selectedCard.value.content
  const selectedText = text.substring(start, end)
  
  const newText = text.substring(0, start) + 
                 prefix + selectedText + suffix +
                 text.substring(end)
  
  selectedCard.value.content = newText
  
  // 更新选区位置
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(
      start + prefix.length,
      end + prefix.length
    )
  })
}

// 添加后端API基础URL
const API_BASE_URL = 'http://localhost:3000/api'

// 添加防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 修改数据服务层
const dataService = {
  async syncToBackend(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/sync-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`同步失败: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('后端同步失败:', error)
      throw error
    }
  },

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`保存到本地存储失败 (${key}):`, error)
      throw error
    }
  },

  loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`从本地存储加载失败 (${key}):`, error)
      return null
    }
  }
}

// 减少防抖时间到500ms，提高响应速度
const syncData = debounce(async () => {
  try {
    // 准备要保存的数据
    const dataToSave = {
      scenes: scenes.value,
      prompts: prompts.value,
      tags: tags.value,
      config: {
        models: models.value,
        notepadContent: notepadInitialContent.value,
        currentSceneId: currentScene.value?.id,
        selectedTags: selectedTags.value,
        currentView: currentView.value
      }
    }

    // 立即保存到本地存储
    Object.entries(dataToSave).forEach(([key, value]) => {
      if (value !== undefined) {
        dataService.saveToLocalStorage(key, value)
      }
    })

    // 异步同步到后端
    dataService.syncToBackend(dataToSave).catch(error => {
      console.error('后端同步失败:', error)
    })
    
  } catch (error) {
    showToast(`数据保存失败: ${error.message}`, 'error')
  }
}, 500) // 减少防抖时间到500ms

// 添加立即保存方法，用于重要操作
const saveImmediately = async () => {
  try {
    const dataToSave = {
      scenes: scenes.value,
      prompts: prompts.value,
      tags: tags.value,
      config: {
        models: models.value,
        notepadContent: notepadInitialContent.value,
        currentSceneId: currentScene.value?.id,
        selectedTags: selectedTags.value,
        currentView: currentView.value
      }
    }

    // 立即保存到本地存储
    Object.entries(dataToSave).forEach(([key, value]) => {
      if (value !== undefined) {
        dataService.saveToLocalStorage(key, value)
      }
    })
  } catch (error) {
    console.error('立即保存失败:', error)
    showToast(`保存失败: ${error.message}`, 'error')
  }
}

// 修改数据加载逻辑 - 优先使用本地数据
const loadAllData = async () => {
  try {
    // 1. 先从本地存储加载
    const localData = {
      scenes: dataService.loadFromLocalStorage('scenes'),
      prompts: dataService.loadFromLocalStorage('prompts'),
      tags: dataService.loadFromLocalStorage('tags'),
      config: dataService.loadFromLocalStorage('config')
    }

    // 2. 如果本地有数据，直接使用本地数据
    if (localData.scenes?.length || localData.prompts?.length || localData.tags?.length) {
      initializeData(localData)
      return
    }

    // 3. 只有在本地没有数据时，才从后端加载
    try {
      const response = await fetch(`${API_BASE_URL}/get-all-data`)
      if (!response.ok) {
        throw new Error(`加载失败: ${response.status}`)
      }
      const { data: backendData } = await response.json()
      initializeData(backendData)
    } catch (error) {
      console.error('从后端加载数据失败:', error)
      // 如果后端加载失败，创建默认数据
      initializeData({
        scenes: [createDefaultScene()],
        prompts: [],
        tags: [],
        config: {
          models: [],
          notepadContent: '',
          currentSceneId: null,
          selectedTags: [],
          currentView: 'main'
        }
      })
    }
  } catch (error) {
    console.error('数据加载失败:', error)
    showToast('数据加载失败: ' + error.message, 'error')
  }
}

// 初始化数据的方法保持不变
const initializeData = (data) => {
  // 初始化场景
  if (data.scenes?.length) {
    scenes.value = data.scenes
    currentScene.value = scenes.value.find(s => s.id === data.config?.currentSceneId) || scenes.value[0]
  } else {
    const defaultScene = createDefaultScene()
    scenes.value = [defaultScene]
    currentScene.value = defaultScene
  }

  // 初始化其他数据
  if (data.prompts) prompts.value = data.prompts
  if (data.tags) tags.value = data.tags
  if (data.config?.models) models.value = data.config.models
  if (data.config?.selectedTags) selectedTags.value = data.config.selectedTags
  if (data.config?.currentView) currentView.value = data.config.currentView
}

// 5. 优化场景更新方法
const updateScene = (updatedScene) => {
  if (!updatedScene?.id) return

  const index = scenes.value.findIndex(s => s.id === updatedScene.id)
  if (index !== -1) {
    // 深拷贝并确保数据结构完整
    const processedScene = {
      ...updatedScene,
      cards: (updatedScene.cards || []).map(card => ({
        ...card,
        id: card.id,
        title: card.title || '',
        content: card.content || '',
        height: card.height || '120px',
        tags: Array.isArray(card.tags) ? card.tags : []
      }))
    }

    scenes.value[index] = processedScene
    
    if (currentScene.value?.id === updatedScene.id) {
      currentScene.value = JSON.parse(JSON.stringify(processedScene))
    }

    // 触发数据同步
    syncData()
  }
}

// 6. 添加数据监听
watch(
  [scenes, currentScene, prompts, tags, models, selectedTags, currentView],
  () => {
    syncData()
  },
  { deep: true }
)


// 修改保存到本地存储的方法
const saveToLocalStorage = () => {
  try {
    if (!scenes.value?.length) {
      console.warn('No valid scenes data to save')
      return
    }

    // 确保场景数据的完整性
    const scenesToSave = scenes.value.map(scene => ({
      ...scene,
      id: scene.id,
      name: scene.name,
      cards: Array.isArray(scene.cards) ? 
        scene.cards.map(card => ({
          ...card,
          id: card.id,
          title: card.title || '',
          content: card.content || '',
          height: card.height || '120px',
          tags: Array.isArray(card.tags) ? card.tags : []
        })) : []
    }))

    console.log('Saving scenes to localStorage:', scenesToSave)
    
    localStorage.setItem('scenes', JSON.stringify(scenesToSave))
    localStorage.setItem('currentSceneId', currentScene.value?.id?.toString())
    localStorage.setItem('prompts', JSON.stringify(prompts.value || []))
    localStorage.setItem('tags', JSON.stringify(tags.value || []))
    localStorage.setItem('aiModels', JSON.stringify(models.value || []))
  } catch (error) {
    console.error('保存到本地存储失败:', error)
    showToast('保存到本地存储失败: ' + error.message, 'error')
  }
}

// 修改场景切换方法
const switchScene = (scene) => {
  if (!scene) return
  
  // 保存当前场景的更改
  const currentIndex = scenes.value.findIndex(s => s.id === currentScene.value?.id)
  if (currentIndex !== -1) {
    scenes.value[currentIndex] = JSON.parse(JSON.stringify(currentScene.value))
  }
  
  // 切换到新场景
  const targetScene = scenes.value.find(s => s.id === scene.id)
  if (targetScene) {
    currentScene.value = JSON.parse(JSON.stringify(targetScene))
    localStorage.setItem('currentSceneId', targetScene.id.toString())
  }
  
  // 保存更改
  saveToLocalStorage()
}

// 修改场景更新方法，确保正确保存卡片数据
const saveScenes = async () => {
  try {
    // 优先保存到本地
    dataService.saveToLocalStorage('scenes', scenes.value)
    
    // 触发数据同步
    await syncData()
  } catch (error) {
    console.error('保存场景失败:', error)
    showToast('保存场景失败: ' + error.message, 'error')
  }
}

// 修改保存提示词的方法
const savePrompts = async () => {
  localStorage.setItem('prompts', JSON.stringify(prompts.value))
  await syncData() // 改为使用 syncData
}

// 修改保存标签的方法
const saveTags = async () => {
  localStorage.setItem('tags', JSON.stringify(tags.value))
  await syncData() // 改为使用 syncData
}

// 修改保存模型的方法
const saveModels = async () => {
  localStorage.setItem('aiModels', JSON.stringify(models.value))
  await syncData() // 改为使用 syncData
}

// 在组件挂载时加载数据
onMounted(async () => {
  await loadAllData()
  setInterval(syncData, 30000) // 30秒自动同步一次
  const savedInsertedContents = localStorage.getItem('promptInsertedContents')
  if (savedInsertedContents) {
    promptInsertedContents.value = JSON.parse(savedInsertedContents)
  }
})

// 监听数据变化并保存
watch(
  [scenes, currentScene, prompts, tags, models],
  async () => {
    await syncData() // 改为使用 syncData
  },
  { deep: true }
)

// 工具函数
const getInsertCount = (template) => {
  return (template.match(/{{text}}/g) || []).length
}

const canInsertText = (prompt) => {
  return getInsertCount(prompt.template) > 0
}

const canSendRequest = (prompt) => {
  // 只要有模板内容就可以发送
  return prompt.template.trim().length > 0
}

// const getRemainingInserts = () => {
//   if (!selectedPrompt.value) return 0
//   return getInsertCount(selectedPrompt.value.template) - selectedCards.value.length
// }

const canInsertSelected = () => {
  if (!selectedPrompt.value) return false
  return selectedCards.value.length === getInsertCount(selectedPrompt.value.template)
}
// 提示词相关方法
const createNewPrompt = () => {
  showPromptModal.value = true
  promptForm.value = {
    title: '',
    template: '',
    defaultModel: '',
    insertedContents: [],
    selectedModel: '',
    detectKeywords: true  // 默认启用关键词检测
  }
}

const editPrompt = (prompt) => {
  editingPrompt.value = prompt
  promptForm.value = { ...prompt }
  showPromptModal.value = true
}

const savePrompt = () => {
  if (!promptForm.value.title || !promptForm.value.template) {
    alert('请填写标题和模板')
    return
  }

  const newPrompt = {
    id: editingPrompt.value?.id || Date.now(),
    title: promptForm.value.title,
    template: promptForm.value.template,
    defaultModel: promptForm.value.defaultModel,
    insertedContents: [],
    selectedModel: promptForm.value.defaultModel,
    detectKeywords: promptForm.value.detectKeywords  // 保存检测关键词设置
  }

  if (editingPrompt.value) {
    const index = prompts.value.findIndex(p => p.id === editingPrompt.value.id)
    if (index !== -1) {
      prompts.value[index] = newPrompt
    }
  } else {
    prompts.value.push(newPrompt)
  }

  showPromptModal.value = false
  editingPrompt.value = null
  promptForm.value = {}
}
const clearSelection = () => {
  selectedCards.value = []
  selectedPrompt.value = null
}

// 定义提供商类型
const PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  OLLAMA: 'ollama',
  CUSTOM: 'custom'  // 添加自定义类型
}

// 修改发送提示词请求的方法
const sendPromptRequest = async (prompt) => {
  if (!prompt.template.trim()) {
    showToast('请输入提示词内容', 'error')
    return
  }

  const model = models.value.find(m => m.id === prompt.selectedModel)
  if (!model) {
    showToast('请选择有效的模型', 'error')
    return
  }

  try {
    let processedTemplate = prompt.template
    let response
    let content

    showToast('发送成功！')
    // 自定义类型的处理
    if (model.provider === PROVIDERS.CUSTOM) {
      try {
        response = await fetch(model.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(model.apiKey && { 'Authorization': `Bearer ${model.apiKey}` })
          },
          body: JSON.stringify({
            model: model.modelId,
            messages: [
              {
                role: "user",
                content: processedTemplate
              }
            ],
            max_tokens: Number(model.maxTokens),
            temperature: Number(model.temperature)
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`请求失败: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        content = result.choices?.[0]?.message?.content || 
                 result.choices?.[0]?.content ||
                 result.content ||
                 result.response ||
                 result.output ||
                 result.text

        if (!content) {
          throw new Error('无法从响应中获取内容')
        }
      } catch (error) {
        throw new Error(`自定义API请求失败: ${error.message}`)
      }
    } else if (model.provider === PROVIDERS.OLLAMA) {
      try {
        response = await fetch(`${model.apiUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model.modelId,
            messages: [{
              role: "user",
              content: processedTemplate
            }],
            stream: false,
            options: {
              temperature: Number(model.temperature)
            }
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`请求失败: ${response.status} ${errorText}`)
        }

        const result = await response.json()
        content = result.message?.content || result.response

        if (!content) {
          throw new Error('响应格式错误')
        }
      } catch (error) {
        throw new Error(`Ollama请求失败: ${error.message}`)
      }
    } else {
      // OpenAI 接口格式的处理
      response = await fetch(`${model.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            {
              role: "user",
              content: processedTemplate
            }
          ],
          max_tokens: Number(model.maxTokens),
          temperature: Number(model.temperature)
        })
      })

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      const result = await response.json()
      content = result.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('响应格式错误')
      }
    }

    showToast('数据返回成功', 'success')
    
    // 创建新卡片
    const newCard = {
      id: Date.now(),
      content,
      title: '生成的内容',
      height: '200px',
      tags: []
    }
    
    if (currentScene.value) {
      currentScene.value.cards.push(newCard)
    }
    
    // 清理状态
    prompt.insertedContents = []
    prompt.selectedModel = prompt.defaultModel || ''

  } catch (error) {
    console.error('API 请求错误:', error)
    showToast(error.message, 'error')
  }
}

// const insertSelectedCards = () => {
//   if (!selectedPrompt.value || !canInsertSelected()) return

//   let resultTemplate = selectedPrompt.value.template
//   const selectedTexts = selectedCards.value.map(id =>
//     textCards.value.find(card => card.id === id)?.content
//   )

//   selectedTexts.forEach(text => {
//     resultTemplate = resultTemplate.replace('{{text}}', text)
//   })

//   textCards.value.push({
//     id: Date.now(),
//     content: resultTemplate,
//     isResult: true
//   })

//   clearSelection()
// }


// 简化的文件导入处理
const importPrompts = async (event) => {
  const files = event.target.files
  if (!files.length) return

  try {
    for (const file of files) {
      let content = await file.text()
      
      // 根据文件类型处理内容
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content)
          // 如果是数组，直接添加；如果是单个对象，包装成数组
          const newPrompts = Array.isArray(jsonData) ? jsonData : [jsonData]
          
          newPrompts.forEach(prompt => {
            prompt.id = Date.now() + Math.random()
            prompts.value.push(prompt)
          })
        } catch (e) {
          console.warn('JSON 解析失败，作为普通文本处理')
          // 如果 JSON 解析失败，作为普通文本处理
          prompts.value.push({
            id: Date.now() + Math.random(),
            title: file.name,
            template: content.trim(),
            defaultModel: models.value[0]?.id || ''
          })
        }
      } else {
        // 处理 .txt, .md 等其他文本文件
        prompts.value.push({
          id: Date.now() + Math.random(),
          title: file.name,
          template: content.trim(),
          defaultModel: models.value[0]?.id || ''
        })
      }
    }

    event.target.value = ''
    savePrompts() // 保存到本地存储
    showToast('提示词导入成功')

  } catch (error) {
    console.error('提示词导入错误:', error)
    showToast('提示词导入失败: ' + error.message, 'error')
  }
}

// 添加文件拖放支持
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
      for (const file of files) {
        let content = await file.text()
        
        if (file.name.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(content)
            content = JSON.stringify(jsonData, null, 2)
          } catch (e) {
            console.warn('JSON 解析失败，作为普通文本处理')
          }
        }

        textCards.value.push({
          id: Date.now() + Math.random(),
          content: content.trim(),
          title: file.name,
          height: '200px'
        })
      }
    } catch (error) {
      console.error('文件导入错误:', error)
      alert('文件导入失败: ' + error.message)
    }
  }
}

const exportToJsonl = () => {
  const jsonl = textCards.value
    .map(card => JSON.stringify({ content: card.content }))
    .join('\n')
  
  const blob = new Blob([jsonl], { type: 'application/x-json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cards.json'
  a.click()
  URL.revokeObjectURL(url)
}

// 新增的插入提示词相关方法
const insertPromptAtCursor = (card) => {
  currentEditingCard.value = card
  showPromptSelectModal.value = true
}

const insertPromptToCard = (prompt) => {
  if (!currentEditingCard.value) return
  
  const insertCount = getInsertCount(prompt.template)
  if (insertCount === 0) return
  
  // 初始化插入内容数组
  if (!prompt.insertedContents) {
    prompt.insertedContents = []
  }
  
  // 检查是否还能插入更多内容
  if (prompt.insertedContents.length >= insertCount) {
    alert('已达到最大插入数量')
    return
  }
  
  // 添加插入的内容
  prompt.insertedContents.push(currentEditingCard.value.content)
  
  showPromptSelectModal.value = false
  currentEditingCard.value = null
}

const removeInsertedContent = (prompt, index) => {
  prompt.insertedContents.splice(index, 1)
}

const hasInsertedContent = (prompt) => {
  return prompt.insertedContents?.length > 0
}

const truncateText = (text, length = 20) => {
  return text.length > length ? text.slice(0, length) + '...' : text
}

// 计算可插入的提示词
const insertablePrompts = computed(() => {
  return prompts.value.filter(prompt => getInsertCount(prompt.template) > 0)
})

// 模型管理方法
const addModel = () => {
  const newModel = {
    id: Date.now(),
    name: '',
    provider: 'custom',
    apiUrl: '',
    apiKey: '',
    modelId: '',
    maxTokens: 512,
    temperature: 0.7,
    availableModels: []
  }
  models.value.push(newModel)
}

const deleteModel = (id) => {
  models.value = models.value.filter(model => model.id !== id)
  saveModels()
}

// 添加获取模型列表的方法
const fetchModelList = async (model) => {
  try {
    if (model.provider === 'ollama') {
      const response = await fetch(`${model.apiUrl}/api/tags`)
      
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }
      
      const result = await response.json()
      // Ollama 返回的是一个对象数组，需要正确解析
      return result.models.map(model => {
        // 处理可能是字符串或对象的情况
        if (typeof model === 'string') {
          return {
            id: model,
            name: model
          }
        }
        // 如果是对象格式，解析其中的信息
        return {
          id: model.name || model.model,
          name: model.name || model.model,
          digest: model.digest,
          size: model.size,
          modified_at: model.modified_at
        }
      })
    }
    // ... 其他提供商的代码 ...
  } catch (error) {
    console.error('获取模型列表失败:', error)
    showToast('获取模型列表失败: ' + error.message, 'error')
    return []
  }
}

// 修改创建默认模型的方法，添加自定义类型
const createDefaultModel = () => ({
  id: Date.now(),
  name: '',
  apiUrl: '',
  modelId: '',  // 自定义类型时手动填写
  apiKey: '',
  maxTokens: 512,
  temperature: 0.7,
  provider: 'custom', // 默认使用自定义类型
  availableModels: [],
  organizationId: ''
})

// 修改刷新模型列表的方法
const refreshModelList = async (model) => {
  try {
    // 自定义类型不需要验证 API Key
    if (model.provider !== 'ollama' && model.provider !== 'custom' && !model.apiKey) {
      throw new Error('请先填写 API Key')
    }
    
    // 自定义类型必须填写模型ID
    if (model.provider === 'custom') {
      if (!model.modelId) {
        throw new Error('请填写模型ID')
      }
      // 直接使用手动填写的模型ID
      model.availableModels = [{
        id: model.modelId,
        name: model.modelId
      }]
      showToast('已设置自定义模型')
      return
    }

    // 其他类型需要验证 API URL
    if (!model.apiUrl) {
      throw new Error('请先填写 API 地址')
    }
    
    // 确保 API URL 格式正确
    let apiUrl = model.apiUrl.trim()
    apiUrl = apiUrl.replace(/\/$/, '')
    
    // Ollama 和自定义类型不需要移除 v1 路径
    if (model.provider !== 'ollama' && model.provider !== 'custom') {
      apiUrl = apiUrl.replace(/\/(?:api\/)?v1$/, '')
    }
    
    model.apiUrl = apiUrl

    const modelList = await fetchModelList(model)
    if (modelList.length > 0) {
      model.availableModels = modelList
      showToast('获取模型列表成功主人~')
    } else {
      throw new Error('未获取到任何可用模型')
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    showToast('获取模型列表失败: ' + error.message, 'error')
  }
}

// 添加 API URL 验证
const validateApiUrl = (url) => {
  return url.startsWith('https://') || url.startsWith('http://')
}

// 修改默认的 Gemini 模型配置
const defaultGeminiModel = {
  id: 'gemini',
  name: 'Gemini',
  provider: PROVIDERS.GEMINI,
  apiUrl: '', // 用户自己填写 API 地址
  modelId: '', // 用户自己填写模型 ID
  apiKey: '',
  maxTokens: 2048,
  temperature: 0.7
}

// 面板宽度调整
const startPanelResize = (e) => {
  isResizing = true
  startX = e.clientX
  startWidth = promptPanelWidth.value

  document.addEventListener('mousemove', handlePanelResize)
  document.addEventListener('mouseup', stopPanelResize)
}

const handlePanelResize = (e) => {
  if (!isResizing) return
  const diff = e.clientX - startX
  promptPanelWidth.value = Math.max(200, Math.min(600, startWidth + diff))
}

const stopPanelResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', handlePanelResize)
  document.removeEventListener('mouseup', stopPanelResize)
}

// 卡片高度调整
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

// 显示提示词详情
const showPromptDetail = (prompt) => {
  selectedPrompt.value = prompt
  showPromptDetailModal.value = true
}

// 显示卡片详情
const viewCardDetail = (card) => {
  selectedCard.value = card
  showCardDetailModal.value = true
}

// 场景操作方法
const createNewScene = async () => {
  const newScene = {
    id: Date.now(),
    name: `场景 ${scenes.value.length + 1}`,
    cards: []
  }
  scenes.value.push(newScene)
  currentScene.value = newScene
  
  // 使用新的保存方法
  await saveImmediately()
  showToast('新场景创建成功', 'success')
}

const deleteScene = async (sceneId) => {
  if (!confirm('确定要删除这个场景吗？')) return
  
  try {
    const index = scenes.value.findIndex(s => s.id === sceneId)
    if (index !== -1) {
      scenes.value.splice(index, 1)
      if (currentScene.value.id === sceneId) {
        currentScene.value = scenes.value[0]
      }
      
      // 使用新的保存方法
      await saveImmediately()
      showToast('场景删除成功', 'success')
    }
  } catch (error) {
    console.error('删除场景失败:', error)
    showToast('删除场景失败: ' + error.message, 'error')
  }
}

// 添加场景名称编辑功能
const editSceneName = (scene) => {
  const newName = prompt('请输入新的场景名称:', scene.name)
  if (newName && newName.trim()) {
    scene.name = newName.trim()
    saveScenes() // 保存更改
  }
}

// 添加标签相关的方法
const addTag = () => {
  if (newTagName.value.trim()) {
    const tag = {
      id: Date.now(),
      name: newTagName.value.trim(),
      isKeyword: false // 添加关键词标记
    }
    tags.value.push(tag)
    saveTags()
    newTagName.value = ''
  }
}

const deleteTag = (tagId) => {
  tags.value = tags.value.filter(tag => tag.id !== tagId)
  // 同时从所有卡片中移除该标签
  currentScene.value.cards.forEach(card => {
    if (card.tags) {
      card.tags = card.tags.filter(tag => tag !== tagId)
    }
  })
  saveTags()
}

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
  saveScenes()
}

const toggleTagFilter = (tagId) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index === -1) {
    selectedTags.value.push(tagId)
  } else {
    selectedTags.value.splice(index, 1)
  }
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

// 切换标签的关键词状态
const toggleTagKeyword = (tagId) => {
  const tag = tags.value.find(t => t.id === tagId)
  if (tag) {
    tag.isKeyword = !tag.isKeyword
    saveTags()
  }
}

// 加载标签
const loadTags = () => {
  const savedTags = localStorage.getItem('tags')
  if (savedTags) {
    tags.value = JSON.parse(savedTags)
  }
}

// 在 prompts 相关方法中添加删除提示词的方法
const deletePrompt = (promptId) => {
  if (confirm('确定要删除这个提示词吗？')) {
    prompts.value = prompts.value.filter(p => p.id !== promptId)
    // 保存到本地存储
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
  }
}

// 修改场景加载方法
const loadScenes = () => {
  try {
    // 优先从本地存储加载
    const savedScenes = localStorage.getItem('scenes')
    const savedPrompts = localStorage.getItem('prompts')
    const savedTags = localStorage.getItem('tags')
    const savedModels = localStorage.getItem('aiModels')

    console.log('Loading saved scenes:', savedScenes) // 调试用

    // 只在没有保存的场景数据时创建默认场景
    if (!savedScenes) {
      const defaultScene = {
        id: Date.now(),
        name: '默认场景',
        cards: []
      }
      scenes.value = [defaultScene]
      currentScene.value = defaultScene
      
      // 保存默认场景到本地存储
      localStorage.setItem('scenes', JSON.stringify(scenes.value))
    } else {
      // 加载保存的场景数据
      const parsedScenes = JSON.parse(savedScenes)
      scenes.value = parsedScenes.map(scene => ({
        ...scene,
        cards: Array.isArray(scene.cards) ? scene.cards : []
      }))
      
      // 恢复之前的当前场景
      if (scenes.value.length > 0) {
        const savedCurrentSceneId = localStorage.getItem('currentSceneId')
        if (savedCurrentSceneId) {
          currentScene.value = scenes.value.find(s => s.id === parseInt(savedCurrentSceneId))
        }
        // 如果找不到保存的当前场景，使用第一个场景
        if (!currentScene.value) {
          currentScene.value = scenes.value[0]
        }
      }
    }

    // 加载其他数据
    if (savedPrompts) prompts.value = JSON.parse(savedPrompts)
    if (savedTags) tags.value = JSON.parse(savedTags)
    if (savedModels) models.value = JSON.parse(savedModels)

    // 打印加载后的数据（调试用）
    console.log('Loaded scenes:', scenes.value)
    console.log('Current scene:', currentScene.value)

    // 异步同步到后端
    syncToBackend()
  } catch (error) {
    console.error('加载场景失败:', error)
    showToast('加载场景失败: ' + error.message, 'error')
  }
}

// 修改处理移动卡片的方法
const handleMoveCard = ({ card, sourceSceneId, targetSceneId }) => {
  try {
    const sourceSceneIndex = scenes.value.findIndex(s => s.id === sourceSceneId)
    const targetSceneIndex = scenes.value.findIndex(s => s.id === targetSceneId)
    
    if (sourceSceneIndex === -1 || targetSceneIndex === -1) {
      throw new Error('场景不存在')
    }
    
    // 创建新的场景数组以保持响应性
    const newScenes = [...scenes.value]
    
    // 从源场景移除卡片
    newScenes[sourceSceneIndex].cards = newScenes[sourceSceneIndex].cards.filter(c => c.id !== card.id)
    
    // 添加到目标场景
    newScenes[targetSceneIndex].cards.push({ ...card })
    
    // 更新场景数组
    scenes.value = newScenes
    
    // 如果当前场景是源场景，更新 currentScene
    if (currentScene.value?.id === sourceSceneId) {
      currentScene.value = newScenes[sourceSceneIndex]
    }
    
    // 保存更改
    saveScenes()
    
    showToast(`已将卡片移动到「${newScenes[targetSceneIndex].name}」`)
  } catch (error) {
    console.error('移动卡片失败:', error)
    showToast('移动卡片失败: ' + error.message, 'error')
  }
}

// 修改提供的移动到场景方法
provide('moveToScene', (cardData, targetSceneId) => {
  console.log('Moving to scene:', { cardData, targetSceneId }) // 添加调试日志
  const targetScene = scenes.value.find(s => s.id === targetSceneId)
  if (!targetScene) {
    console.error('Target scene not found:', targetSceneId)
    return
  }
  
  const newCard = {
    id: Date.now(),
    ...cardData
  }
  
  targetScene.cards.push(newCard)
  scenes.value = [...scenes.value]
  
  showToast(`已添加到场景「${targetScene.name}」`)
})

// 添加处理添加卡片到场景的方法
const handleAddCardsToScene = ({ sceneId, cards }) => {
  const targetScene = scenes.value.find(scene => scene.id === sceneId)
  if (!targetScene) {
    console.error('Target scene not found:', sceneId)
    return
  }

  // 确保场景有 cards 属性
  if (!targetScene.cards) {
    targetScene.cards = []
  }

  // 添加卡片到目标场景
  targetScene.cards.push(...cards)
  
  // 确保更新响应式
  scenes.value = [...scenes.value]
  
  // 保存到本地存储
  saveScenes()
}

// 添加合并卡片的方法
const handleMergeCards = (cards) => {
  // 合并卡片的逻辑
  console.log('Merging cards:', cards)
  // 这里可以添加合并卡片的逻辑
}

// 修改创建新卡片的逻辑
const createNewCard = () => {
  if (!currentScene.value) return
  
  const newCard = {
    id: Date.now(),
    title: '新建卡片',
    content: '',
    height: '120px',
    tags: []
  }
  
  if (!currentScene.value.cards) {
    currentScene.value.cards = []
  }
  
  currentScene.value.cards.push(newCard)
  updateScene(currentScene.value)
}


// Add new method to prevent text selection during scene drag
const preventTextSelection = (prevent) => {
  document.body.style.userSelect = prevent ? 'none' : ''
  document.body.style.webkitUserSelect = prevent ? 'none' : ''
}

// Watch scene drag state
watch(dragScene, (isDragging) => {
  preventTextSelection(isDragging)
})

// Clean up when component is unmounted
onUnmounted(() => {
  preventTextSelection(false)
})

// 修改处理添加到笔记本的方法
const handleAddToNotepad = (cardData) => {
  //console.log('Handling add to notepad:', cardData)
  // 先切换到笔记本视图
  
  showToast('已添加到记事本')
  currentView.value = 'note'
  // 使用 nextTick 确保视图更新后再设置内容
  nextTick(() => {
    // 设置笔记本初始内容，包含标题和完整信息
    const formattedContent = `# ${cardData.title}\n\n${cardData.content}`
    //console.log('Formatted content for notepad:', formattedContent)
    
    // 重置后设置新值
    notepadInitialContent.value = ''
    setTimeout(() => {
      notepadInitialContent.value = formattedContent
    }, 10)
  })
}

// 修改删除场景的方法
const handleDeleteScene = async (sceneId) => {
  try {
    // 找到要删除的场景索引
    const index = scenes.value.findIndex(s => s.id === sceneId)
    if (index === -1) {
      throw new Error('场景不存在')
    }

    // 如果只剩一个场景，不允许删除
    if (scenes.value.length <= 1) {
      throw new Error('至少需要保留一个场景')
    }

    // 如果要删除的是当前场景，先切换到其他场景
    if (currentScene.value.id === sceneId) {
      // 如果有下一个场景就切换到下一个，否则切换到上一个
      const nextScene = scenes.value[index + 1] || scenes.value[index - 1]
      currentScene.value = nextScene
    }

    // 从数组中移除场景
    scenes.value.splice(index, 1)

    // 保存更改到本地存储
    saveScenes()

    // 显示成功提示
    showToast('场景已删除')
  } catch (error) {
    console.error('删除场景失败:', error)
    showToast(error.message, 'error')
  }
}

// 添加保存当前场景ID的逻辑
watch(currentScene, (newScene) => {
  if (newScene) {
    localStorage.setItem('currentSceneId', newScene.id.toString())
  }
}, { deep: true })

// 修改关键操作的保存方法
const deleteCard = async (id) => {
  try {
    if (!currentScene.value) return

    // 从当前场景中删除卡片
    currentScene.value.cards = currentScene.value.cards.filter(card => card.id !== id)

    // 更新scenes数组中的场景
    const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
    if (sceneIndex !== -1) {
      scenes.value[sceneIndex] = {
        ...currentScene.value,
        cards: [...currentScene.value.cards]
      }
    }

    // 关闭卡片详情模态框
    if (selectedCard.value?.id === id) {
      showCardDetailModal.value = false
      selectedCard.value = null
    }

    // 保存到localStorage
    localStorage.setItem('scenes', JSON.stringify(scenes.value))
    
    showToast('卡片删除成功', 'success')
  } catch (error) {
    console.error('删除卡片失败:', error)
    showToast('删除卡片失败: ' + error.message, 'error')
  }
}

// 修改数据监听，增加即时性
watch(
  [scenes, currentScene],
  async () => {
    await saveImmediately() // 场景变化立即保存
  },
  { deep: true }
)

// 其他数据变化使用防抖同步
watch(
  [prompts, tags, models, selectedTags, currentView],
  () => {
    syncData()
  },
  { deep: true }
)

// 减少自动同步间隔到30秒
onMounted(async () => {
  await loadAllData()
  setInterval(syncData, 30000) // 30秒自动同步一次
  const savedInsertedContents = localStorage.getItem('promptInsertedContents')
  if (savedInsertedContents) {
    promptInsertedContents.value = JSON.parse(savedInsertedContents)
  }
})

// 修改保存卡片的方法
const saveCard = async (card) => {
  try {
    if (!currentScene.value) {
      throw new Error('没有选择场景')
    }

    // 确保卡片有完整的数据结构
    const processedCard = {
      id: card.id || Date.now(),
      title: card.title || '',
      content: card.content || '',
      height: card.height || '120px',
      tags: Array.isArray(card.tags) ? card.tags : []
    }

    // 更新或添加卡片到当前场景
    const cardIndex = currentScene.value.cards.findIndex(c => c.id === processedCard.id)
    if (cardIndex !== -1) {
      // 更新现有卡片
      currentScene.value.cards[cardIndex] = processedCard
    } else {
      // 添加新卡片
      currentScene.value.cards.push(processedCard)
    }

    // 更新scenes数组中的场景
    const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
    if (sceneIndex !== -1) {
      scenes.value[sceneIndex] = {
        ...currentScene.value,
        cards: [...currentScene.value.cards]
      }
    }

    // 保存到localStorage
    localStorage.setItem('scenes', JSON.stringify(scenes.value))
    localStorage.setItem('currentSceneId', currentScene.value.id.toString())

    showToast('卡片保存成功', 'success')

  } catch (error) {
    console.error('保存卡片失败:', error)
    showToast('保存卡片失败: ' + error.message, 'error')
  }
}

// 修改卡片内容更新方法
const updateCardContent = async (card, newContent) => {
  try {
    if (!currentScene.value) return

    // 更新卡片内容
    const cardIndex = currentScene.value.cards.findIndex(c => c.id === card.id)
    if (cardIndex !== -1) {
      currentScene.value.cards[cardIndex] = {
        ...currentScene.value.cards[cardIndex],
        content: newContent
      }

      // 更新scenes数组中的场景
      const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
      if (sceneIndex !== -1) {
        scenes.value[sceneIndex] = {
          ...currentScene.value,
          cards: [...currentScene.value.cards]
        }
      }

      // 保存到localStorage
      localStorage.setItem('scenes', JSON.stringify(scenes.value))
    }
  } catch (error) {
    console.error('更新卡片内容失败:', error)
    showToast('更新卡片内容失败: ' + error.message, 'error')
  }
}

// 修改卡片标题更新方法
const updateCardTitle = async (card, newTitle) => {
  try {
    if (!currentScene.value) return

    // 更新卡片标题
    const cardIndex = currentScene.value.cards.findIndex(c => c.id === card.id)
    if (cardIndex !== -1) {
      currentScene.value.cards[cardIndex] = {
        ...currentScene.value.cards[cardIndex],
        title: newTitle
      }

      // 更新scenes数组中的场景
      const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
      if (sceneIndex !== -1) {
        scenes.value[sceneIndex] = {
          ...currentScene.value,
          cards: [...currentScene.value.cards]
        }
      }

      // 保存到localStorage
      localStorage.setItem('scenes', JSON.stringify(scenes.value))
    }
  } catch (error) {
    console.error('更新卡片标题失败:', error)
    showToast('更新卡片标题失败: ' + error.message, 'error')
  }
}

// 修改卡片标签更新方法
const updateCardTags = async (card, newTags) => {
  try {
    if (!currentScene.value) return

    // 更新卡片标签
    const cardIndex = currentScene.value.cards.findIndex(c => c.id === card.id)
    if (cardIndex !== -1) {
      currentScene.value.cards[cardIndex] = {
        ...currentScene.value.cards[cardIndex],
        tags: newTags
      }

      // 更新scenes数组中的场景
      const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
      if (sceneIndex !== -1) {
        scenes.value[sceneIndex] = {
          ...currentScene.value,
          cards: [...currentScene.value.cards]
        }
      }

      // 保存到localStorage
      localStorage.setItem('scenes', JSON.stringify(scenes.value))
    }
  } catch (error) {
    console.error('更新卡片标签失败:', error)
    showToast('更新卡片标签失败: ' + error.message, 'error')
  }
}

// 修改卡片高度更新方法
const updateCardHeight = async (card, newHeight) => {
  try {
    if (!currentScene.value) return

    // 更新卡片高度
    const cardIndex = currentScene.value.cards.findIndex(c => c.id === card.id)
    if (cardIndex !== -1) {
      currentScene.value.cards[cardIndex] = {
        ...currentScene.value.cards[cardIndex],
        height: newHeight
      }

      // 更新scenes数组中的场景
      const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
      if (sceneIndex !== -1) {
        scenes.value[sceneIndex] = {
          ...currentScene.value,
          cards: [...currentScene.value.cards]
        }
      }

      // 保存到localStorage
      localStorage.setItem('scenes', JSON.stringify(scenes.value))
    }
  } catch (error) {
    console.error('更新卡片高度失败:', error)
    showToast('更新卡片高度失败: ' + error.message, 'error')
  }
}

// 处理插入卡片到提示词
const handleInsertToPrompt = (card) => {
  try {
    if (!selectedPrompt.value) {
      showToast('请先选择一个提示词模板', 'error')
      return
    }

    // 初始化提示词的insertedContents数组
    if (!selectedPrompt.value.insertedContents) {
      selectedPrompt.value.insertedContents = []
    }

    // 添加新的插入内容
    selectedPrompt.value.insertedContents.push(card.content)

    // 更新提示词
    const promptIndex = prompts.value.findIndex(p => p.id === selectedPrompt.value.id)
    if (promptIndex !== -1) {
      prompts.value[promptIndex] = { ...selectedPrompt.value }
    }

    // 初始化卡片的insertedContents数组
    if (!card.insertedContents) {
      card.insertedContents = []
    }

    // 添加到卡片的已插入记录
    card.insertedContents.push({
      promptId: selectedPrompt.value.id,
      content: card.content
    })

    // 更新卡片
    updateCard(card)

    // 保存提示词数据
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
    
    showToast('内容已插入到提示词', 'success')
  } catch (error) {
    console.error('插入内容失败:', error)
    showToast('插入内容失败: ' + error.message, 'error')
  }
}

// 处理移除已插入的内容
const handleRemoveInsertedContent = ({ card, index }) => {
  try {
    if (!card.insertedContents) return

    // 获取要移除的内容信息
    const removedContent = card.insertedContents[index]
    
    // 从卡片中移除
    card.insertedContents.splice(index, 1)
    
    // 从提示词中移除
    const prompt = prompts.value.find(p => p.id === removedContent.promptId)
    if (prompt && prompt.insertedContents) {
      const promptContentIndex = prompt.insertedContents.indexOf(card.content)
      if (promptContentIndex !== -1) {
        prompt.insertedContents.splice(promptContentIndex, 1)
      }
    }

    // 更新卡片和提示词
    updateCard(card)
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
    
    showToast('已移除插入的内容', 'success')
  } catch (error) {
    console.error('移除内容失败:', error)
    showToast('移除内容失败: ' + error.message, 'error')
  }
}

// 更新卡片方法
const updateCard = (card) => {
  if (!currentScene.value) return

  const cardIndex = currentScene.value.cards.findIndex(c => c.id === card.id)
  if (cardIndex !== -1) {
    currentScene.value.cards[cardIndex] = {
      ...card,
      insertedContents: card.insertedContents || []
    }

    // 更新场景
    const sceneIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
    if (sceneIndex !== -1) {
      scenes.value[sceneIndex] = {
        ...currentScene.value,
        cards: [...currentScene.value.cards]
      }
    }

    // 保存到本地存储
    localStorage.setItem('scenes', JSON.stringify(scenes.value))
  }
}

// 处理选择提示词
const selectPrompt = (prompt) => {
  selectedPrompt.value = prompt
}

const cardToInsert = ref(null)

// 修改处理插入提示词的方法
const handleInsertPrompt = (card) => {
  // 如果没有可用的提示词，显示错误提示
  if (!prompts.value || prompts.value.length === 0) {
    showToast('请先创建提示词模板', 'error')
    return
  }

  // 保存要插入的卡片并显示模态框
  cardToInsert.value = card
  showPromptSelectModal.value = true
}

// 修改选择提示词并插入的方法
const selectPromptAndInsert = (prompt) => {
  if (!cardToInsert.value) return

  try {
    const card = cardToInsert.value
    
    // 检查提示词模板
    if (!prompt.template) {
      showToast('提示词模板无效', 'error')
      return
    }

    // 初始化提示词的insertedContents数组
    if (!prompt.insertedContents) {
      prompt.insertedContents = []
    }

    // 添加新的插入内容到提示词中
    prompt.insertedContents.push({
      cardId: card.id,
      content: card.content,
      timestamp: Date.now()
    })

    // 更新提示词
    const promptIndex = prompts.value.findIndex(p => p.id === prompt.id)
    if (promptIndex !== -1) {
      prompts.value[promptIndex] = { ...prompt }
    }

    // 保存提示词数据
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
    
    // 关闭模态框
    showPromptSelectModal.value = false
    cardToInsert.value = null
    
    showToast('内容已插入到提示词', 'success')
  } catch (error) {
    console.error('插入内容失败:', error)
    showToast('插入内容失败: ' + error.message, 'error')
  }
}

// 修改发送消息的方法
const sendMessage = async () => {
  try {
    // 获取选中的模型和提示词
    const selectedModel = models.value.find(m => m.id === currentModelId.value)
    const currentPrompt = selectedPrompt.value
    
    if (!selectedModel || !currentPrompt) {
      showToast('请选择模型和提示词', 'error')
      return
    }

    // 获取提示词的已插入内容
    const insertedContents = currentPrompt.insertedContents || []
    const insertedTexts = insertedContents.map(item => item.content).join('\n')
    
    // 构建完整的提示词内容
    const fullPrompt = currentPrompt.template.replace(/{{text}}/g, insertedTexts)

    // 添加用户消息到聊天记录
    messages.value.push({
      role: 'user',
      content: fullPrompt
    })

    // 显示加载状态
    isLoading.value = true

    // 发送请求到API
    const response = await sendToAPI(selectedModel, messages.value)
    
    if (response.success) {
      messages.value.push({
        role: 'assistant',
        content: response.message
      })
    } else {
      showToast(response.error || '发送失败', 'error')
    }

  } catch (error) {
    console.error('发送消息失败:', error)
    showToast('发送失败: ' + error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 获取处理后的提示词内容
const getProcessedPromptContent = (prompt, cardContent) => {
  if (!prompt || !cardContent) return ''
  return prompt.template.replace(/{{text}}/g, cardContent)
}

// 在聊天中使用处理后的提示词内容
const usePromptInChat = (prompt, processedContent) => {
  // 这里添加将处理后的内容发送到聊天的逻辑
  if (currentChat.value) {
    currentChat.value.messages.push({
      role: 'user',
      content: processedContent
    })
    // 触发消息发送
    sendMessage()
  }
}

// 确保在 setup 中定义状态

</script>

<style scoped>
.container {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex; /* 使用 flex 布局 */
}

.content-area {
  flex: 1;
  height: 100%;
  overflow: hidden;
  margin-right: 60px; /* 为右侧按钮预留空间 */
}

.main-content, :deep(.book-splitter) {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.view-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 100;
  background: transparent; /* 设置背景透明 */
  pointer-events: auto; /* 确保可以点击 */
}

.view-switcher button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.8); /* 半透明背景 */
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
}

.view-switcher button:hover {
  background: rgba(255, 255, 255, 1); /* 鼠标悬停时变为不透明 */
  color: #333;
}

.view-switcher button.active {
  background: #646cff;
  color: white;
}

.prompt-panel {
  position: relative;
  margin: 10px;
  min-width: 400px;
  max-width: 1000px;
  border-right: 1px solid #ddd;
  background: white;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow: auto; /* 允许内容滚动 */
  scrollbar-width: none; /* Firefox 隐藏滚动条 */
}

.prompt-panel h2{
  margin: 10px;
}

.scenes-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%; /* 关键：确保容器高度正确 */
  overflow: hidden; /* 整个容器不滚动 */
}


.scenes-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #eee;
  gap: 12px;
  flex-shrink: 0; /* 头部不收缩 */
}

.scene-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
  padding-bottom: 4px;
  user-select: none; /* Prevent text selection in scene tabs */
}

.scene-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.scene-tab.active {
  background: #646cff;
  color: white;
  border-color: #646cff;
}

.scene-tab.is-dragging {
  opacity: 0.7;
  transform: scale(1.02);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.scene-name {
  flex: 1;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move; /* 指示可拖拽 */
  user-select: none; /* Prevent text selection in scene names */
}

.scene-name i {
  opacity: 0.5;
  font-size: 12px;
}

.scene-tab:hover .scene-name i {
  opacity: 1;
}

.scene-actions {
  display: flex;
  gap: 4px;
  opacity: 0.7;
}

.scene-tab:hover .scene-actions {
  opacity: 1;
}

.edit-name-btn,
.delete-scene-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.edit-name-btn:hover,
.delete-scene-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.scene-tab.active .edit-name-btn:hover,
.scene-tab.active .delete-scene-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.new-scene-btn {
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px dashed #ccc;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.new-scene-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

.content-panel {
  flex: 1;
  min-width: 400px;
  padding: 16px;
  overflow-y: auto;
  background: #f9f9f9;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
}

.text-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border: 1px solid #eee;
  min-height: 180px;
  max-height: 400px;
}

.text-card:hover {
  box-shadow: 0 8px 12px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.text-card.is-selected {
  border: 2px solid #646cff;
  box-shadow: 0 0 0 2px rgba(100,108,255,0.2);
}

.card-content {
  position: relative;
  flex: 1;
  padding: 0;
  background: #fff;
}

.card-content textarea {
  width: 90%;
  height: 100%;
  min-height: 120px;
  max-height: 350px;
  padding: 16px;
  border: none;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: transparent;
}

.card-content textarea:focus {
  outline: none;
  background: #f8f9ff;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
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

.card-actions button i {
  font-size: 14px;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: row-resize;
  background: linear-gradient(transparent, rgba(0,0,0,0.05));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.text-card:hover .resize-handle {
  opacity: 1;
}

.resize-handle:hover {
  background: linear-gradient(transparent, rgba(100,108,255,0.1));
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 2px;
  background: #ddd;
  border-radius: 1px;
}

/* 卡片详情模态框样式优化 */
.detail-modal {
  width: 70vw;
  max-width: 900px;
  height: 70vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.modal-body {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.card-detail-content {
  width: 100%;
  height: calc(100% - 40px);
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: #fff;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

/* 拖拽时的样式 */
.text-card.is-dragging {
  opacity: 0.7;
  transform: scale(1.02);
  box-shadow: 0 12px 24px rgba(0,0,0,0.2);
}

/* 滚动条美化 */
.card-detail-content::-webkit-scrollbar,
.text-card textarea::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.card-detail-content::-webkit-scrollbar-track,
.text-card textarea::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.card-detail-content::-webkit-scrollbar-thumb,
.text-card textarea::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.card-detail-content::-webkit-scrollbar-thumb:hover,
.text-card textarea::-webkit-scrollbar-thumb:hover {
  background: #999;
}

.panel-header {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  z-index: 10;
  padding: 16px;
  margin: -20px -20px 20px -20px;
  border-bottom: 1px solid #eee;
}

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
  position: relative;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 600px;
  max-width: 800px;
  width: 80vw;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
}

.form-group input {
  width: 80%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.model-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.refresh-btn {
  padding: 4px 8px;
  background: #f0f7ff;
  border: 1px solid #646cff;
  color: #646cff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.refresh-btn:hover {
  background: #e3f2fd;
}

.refresh-btn i {
  font-size: 12px;
}

.model-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
}

.delete-model-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-model-btn:hover {
  background: #fee2e2;
}

.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.add-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px dashed #ccc;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn:hover {
  background: #e9ecef;
  border-color: #ccc;
}

.save-btn {
  padding: 8px 16px;
  background: #10b981;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-btn:hover {
  background: #059669;
}

/* 修改模态框基础样式 */
.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.header-actions {
  display: flex;
  margin-left: 10px;
  margin-right: 10px;
  justify-content: flex-end;
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
  border-color: #ccc;
}

.import-btn input[type="file"] {
  display: none;
}

.import-btn i {
  font-size: 16px;
}

/* 调整卡片网格布局，为顶部留出空间 */
.content-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cards-grid {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.drop-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ddd;
  margin: 20px;
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

.content-panel.drag-over {
  background: rgba(100,108,255,0.05);
}

.panel-header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #eee;
  z-index: 1;
}

/* 添加模型选择样式 */
.model-select {
  position: relative;
  margin: 10px 0 10px 0;
  min-width: 150px;
}

.model-select select {
  width: 90%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

.model-select select:hover {
  border-color: #999;
}

.model-select select:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 2px rgba(100,108,255,0.2);
}

/* 成功提示样式 */
.success-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slide-in 0.3s ease;
}

.success-notification.fade-out {
  animation: fade-out 0.3s ease forwards;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* 提示词编辑模态框样式优化 */
.modal-content {
  min-width: 600px;
  max-width: 800px;
  width: 80vw;
  max-height: 85vh; /* 限制最大高度 */
  display: flex;
  flex-direction: column;
}

.template-input {
  min-height: 200px !important;
  max-height: none !important; /* 移除最大高度限制 */
  height: auto !important; /* 允许自动增长 */
  font-family: monospace;
  white-space: pre-wrap;
  resize: vertical; /* 允许垂直调整大小 */
  line-height: 1.5;
  padding: 12px;
}

/* 提示词选择模态框样式 */
.prompt-select-list {
  max-height: 60vh;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.prompt-select-item {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prompt-select-item:hover {
  border-color: #646cff;
  box-shadow: 0 4px 12px rgba(100, 108, 255, 0.1);
  transform: translateY(-2px);
}

.prompt-select-item h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.prompt-select-item p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 0.9em;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.prompt-slots {
  font-size: 0.8em;
  color: #666;
  padding: 4px 8px;
  background: #f8f9fa;
  border-radius: 4px;
  display: inline-block;
}

/* 模态框整体样式优化 */
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
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  padding: 24px;
  position: relative;
  overflow: visible; /* 允许内容溢出 */
}

.modal-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 90%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.modal-actions button {
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.modal-actions button:first-child {
  background: #f8f9fa;
  border: 1px solid #ddd;
  color: #666;
}

.modal-actions button:last-child {
  background: #646cff;
  border: none;
  color: white;
}

.modal-actions button:hover {
  transform: translateY(-1px);
}

.modal-actions button:first-child:hover {
  background: #e9ecef;
  border-color: #ccc;
}

.modal-actions button:last-child:hover {
  background: #5058cc;
}

/* 修改提示弹窗样式和位置 */
.toast-popup {
  position: fixed;
  top: 60px; /* 调整顶部距离，与红框位置对应 */
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
  transition: all 0.3s ease;
  font-size: 14px;
  min-width: 200px; /* 设置最小宽度 */
  justify-content: center; /* 文字居中 */
}

.toast-popup.success {
  border-left: 4px solid #10b981;
}

.toast-popup.error {
  border-left: 4px solid #ef4444;
}

.toast-popup.success i {
  color: #10b981;
}

.toast-popup.error i {
  color: #ef4444;
}

.toast-popup.show {
  transform: translateX(-50%) translateY(0);
}

/* 标签相关样式 */
.tag-filters {
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
  flex-wrap: wrap;
}

.tag-filter {
  padding: 4px 12px;
  background: #f0f0f0;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-filter:hover {
  background: #e0e0e0;
}

.tag-filter.active {
  background: #646cff;
  color: white;
}

.card-tags {
  display: flex;
  gap: 8px;
  padding: 8px;
  flex-wrap: wrap;
  border-top: 1px solid #eee;
}

.card-tag {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-tag:hover {
  background: #e0e0e0;
}

.card-tag.active {
  background: #646cff;
  color: white;
}

.add-tag-btn {
  white-space: nowrap;
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.tag-actions {
  display: flex;
  gap: 8px;
}

.toggle-keyword-btn {
  padding: 4px 8px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-keyword-btn.is-keyword {
  color: #646cff;
  background: rgba(100, 108, 255, 0.1);
}

.toggle-keyword-btn:hover {
  background: #e9ecef;
}

.toggle-keyword-btn.is-keyword:hover {
  background: rgba(100, 108, 255, 0.2);
}

/* 在卡片上显示关键词标签的特殊样式 */
.card-tag.is-keyword {
  background: rgba(100, 108, 255, 0.1);
  color: #646cff;
  border: 1px solid #646cff;
}

.delete-tag-btn {
  padding: 4px 8px;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
}

.delete-tag-btn:hover {
  background: #fee2e2;
  border-radius: 4px;
}

.prompt-panel-header {
  padding: 12px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.import-btn:hover {
  background: #e9ecef;
  border-color: #ccc;
}

.import-btn input {
  display: none;
}

/* 编辑器样式 */
.detail-modal {
  width: 80vw;
  height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.card-title-input {
  flex: 1;
  margin-right: 16px;
}

.title-input {
  width: 90%;
  padding: 8px 12px;
  font-size: var(--font-size-large);
  border: 1px solid #ddd;
  border-radius: 4px;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  padding: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 8px;
}

.editor-toolbar button {
  padding: 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.editor-toolbar button:hover {
  background: #f0f0f0;
  color: #333;
}

.preview-container {
  padding: 16px;
  overflow-y: auto;
  font-size: var(--font-size-normal);
  line-height: 1.6;
}

/* Markdown 预览样式 */
.markdown-body {
  color: #24292e;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body code {
  padding: 0.2em 0.4em;
  background-color: rgba(27,31,35,0.05);
  border-radius: 3px;
  font-family: "Microsoft YaHei", monospace;
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
}

.markdown-body pre code {
  padding: 0;
  background-color: transparent;
}

* {
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif !important;
}

/* 添加视图切换器样式 */
.view-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.view-switcher button {
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.view-switcher button:hover {
  background: #f0f0f0;
}

.view-switcher button.active {
  background: #646cff;
  color: white;
  border-color: #646cff;
}

/* 确保主界面内容在切换时保持布局 */
.main-content {
  display: flex;
  height: 100%;
  width: 100%;
}

/* 调整容器样式以适应新的布局 */
.container {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 自定义复选框样式 */
.checkbox-group {
  margin: 16px 0;
}

.checkbox-label {
  display: flex;
  gap: 8px;
  user-select: none;
}

.checkbox-text {
  font-weight: 500;
  color: #333;
}

.checkbox-description {
  font-size: 0.9em;
  color: #666;
  margin-left: 4px;
}



.custom-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin: 2px 0;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.custom-checkbox:checked {
  background-color: #646cff;
  border-color: #646cff;
}

.custom-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-checkbox:hover {
  border-color: #646cff;
}

/* 确保复选框在禁用状态下的样式 */
.custom-checkbox:disabled {
  background-color: #f5f5f5;
  border-color: #ddd;
  cursor: not-allowed;
}

.custom-checkbox:disabled + .checkbox-text {
  color: #999;
}

.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 9999;
  animation: slideIn 0.3s ease;
}

.toast.info {
  background-color: #2196f3;
}

.toast.error {
  background-color: #f44336;
}

.toast.success {
  background-color: #4caf50;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 添加样式以更好地显示模型信息 */
.model-select {
  font-family: monospace;
  padding: 8px;
  min-width: 200px;
}

.model-select option {
  padding: 4px;
  font-family: monospace;
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
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.prompt-list {
  margin: 16px 0;
}

.prompt-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
}

.prompt-item:hover {
  background: #f5f5f5;
}

.modal-actions {
  margin-top: 16px;
  text-align: right;
}

.cancel-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #e5e5e5;
}

.prompt-template {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}
</style> 