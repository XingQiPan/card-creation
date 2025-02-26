<template>
  <div class="container">    
    <!-- 其他视图内容 -->
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
                  {{ truncateText(prompt.userPrompt, 200) }}
                  <span v-if="prompt.userPrompt.length > 200" class="show-more" style="color: #999;">
                    点击查看更多...
                  </span>
                </div>
                <div class="prompt-info">
                  <template v-if="canInsertText(prompt)">
                    <span>可插入数量: {{ getInsertCount(prompt.userPrompt) }}</span>
                    <div v-if="prompt.insertedContents?.length" class="inserted-contents">
                      <div v-for="(content, index) in prompt.insertedContents" 
                           :key="index" 
                           class="inserted-content">
                        <span>插入 {{index + 1}}: {{ truncateText(content.content) }}</span>
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
            <div class="scene-tabs">
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
            </div>
            <button @click="createNewScene">
              <i class="fas fa-plus"></i> 新建场景
            </button>
            <label class="import-btn">
              <input 
                type="file" 
                multiple 
                accept=".txt,.md,.json,.jsonl"
                @change="handleFilesImport"
                ref="fileInput"
              >
              <i class="fas fa-file-import"></i> 导入文件
            </label>
            <button @click="exportScene">
              <i class="fas fa-file-export"></i> 导出
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
      <AgentsView 
        v-else-if="currentView === 'agents'"
        :models="models"
        :scenes="scenes"
        @update-scene="handleSceneUpdate"
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
      <button 
        @click="currentView = 'agents'" 
        :class="{ active: currentView === 'agents' }"
      >
        <i class="fas fa-robot"></i>
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
              <h4>{{ prompt.title || '未命名提示词' }}</h4>
              <p class="prompt-template">
                {{ prompt.userPrompt ? truncateText(prompt.userPrompt, 100) : '无内容' }}
              </p>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showPromptSelectModal = false" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 提示词编辑模态框 -->
    <div v-if="showPromptModal" class="modal" @click.self="closePromptModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPrompt ? '编辑提示词' : '新建提示词' }}</h3>
          <button @click="closePromptModal" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>标题</label>
            <input v-model="promptForm.title" placeholder="输入提示词标题">
          </div>
          <div class="prompt-inputs">
            <div class="prompt-input-group">
              <label>
                系统提示词
                <i class="fas fa-info-circle" title="设置AI助手的角色和行为准则"></i>
              </label>
              <textarea
                v-model="promptForm.systemPrompt"
                class="system-prompt-input"
                placeholder="输入系统提示词，用于设置AI助手的角色和行为准则..."
              ></textarea>
            </div>
            <div class="prompt-input-group">
              <label>
                用户提示词
                <i class="fas fa-info-circle" title="使用{{text}}作为插入内容的占位符"></i>
              </label>
              <textarea
                v-model="promptForm.userPrompt"
                class="user-prompt-input"
                placeholder="输入用户提示词，使用{{text}}作为插入内容的占位符..."
              ></textarea>
            </div>
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
        </div>
        <div class="modal-footer">
          <button @click="closePromptModal" class="cancel-btn">取消</button>
          <button @click="savePrompt" class="save-btn">保存</button>
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
                <div class="form-group" v-if="model.provider !== 'gemini'">
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
          <pre class="template-detail">{{ selectedPrompt.userPrompt }}</pre>
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
import AgentsView from './components/AgentsView.vue'  // Add this import


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
const dataLoaded = ref(false) // 添加这一行
const promptForm = ref({
  title: '',
  systemPrompt: '',
  userPrompt: '',
  defaultModel: '',
  detectKeywords: true
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
    dataLoaded.value = false // 开始加载时设置为 false
    
    // 从本地存储加载所有数据
    const localData = {
      scenes: dataService.loadFromLocalStorage('scenes'),
      prompts: dataService.loadFromLocalStorage('prompts'),
      tags: dataService.loadFromLocalStorage('tags'),
      config: dataService.loadFromLocalStorage('config')
    }

    // 初始化数据
    await initializeData(localData)
    dataLoaded.value = true

  } catch (error) {
    console.error('数据加载失败:', error)
    showToast('数据加载失败', 'error')
    // 初始化默认数据
    await initializeData({
      scenes: [],
      prompts: [],
      tags: [],
      config: {}
    })
    dataLoaded.value = true
  }
}

// 初始化数据的方法保持不变
const initializeData = (data) => {
  try {
    // 初始化场景
    if (Array.isArray(data.scenes) && data.scenes.length) {
      scenes.value = data.scenes.map(scene => ({
        ...scene,
        cards: Array.isArray(scene.cards) ? scene.cards : []
      }))
      // 设置当前场景
      if (data.config?.currentSceneId) {
        currentScene.value = scenes.value.find(s => s.id === data.config.currentSceneId)
      }
      if (!currentScene.value) {
        currentScene.value = scenes.value[0]
      }
    } else {
      // 创建默认场景
      const defaultScene = {
        id: Date.now(),
        name: '默认场景',
        cards: []
      }
      scenes.value = [defaultScene]
      currentScene.value = defaultScene
    }

    // 初始化提示词
    if (Array.isArray(data.prompts)) {
      prompts.value = data.prompts.map(prompt => ({
        ...prompt,
        userPrompt: prompt.userPrompt || prompt.template || '', // 兼容旧数据
        systemPrompt: prompt.systemPrompt || '',
        insertedContents: Array.isArray(prompt.insertedContents) ? prompt.insertedContents : []
      }))
    } else {
      prompts.value = []
    }

    // 初始化其他数据
    if (Array.isArray(data.tags)) tags.value = data.tags
    if (Array.isArray(data.config?.models)) models.value = data.config.models
    if (Array.isArray(data.config?.selectedTags)) selectedTags.value = data.config.selectedTags
    if (data.config?.currentView) currentView.value = data.config.currentView
    if (data.config?.notepadContent) notepadInitialContent.value = data.config.notepadContent
  } catch (error) {
    console.error('数据初始化错误:', error)
    // 创建默认数据
    const defaultScene = {
      id: Date.now(),
      name: '默认场景',
      cards: []
    }
    scenes.value = [defaultScene]
    currentScene.value = defaultScene
    prompts.value = []
    tags.value = []
  }
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
  if (!scene?.id) return
  
  try {
    // 保存当前场景的更改
    if (currentScene.value?.id) {
      const currentIndex = scenes.value.findIndex(s => s.id === currentScene.value.id)
      if (currentIndex !== -1) {
        scenes.value[currentIndex] = { ...currentScene.value }
      }
    }
    
    // 切换到新场景
    const targetScene = scenes.value.find(s => s.id === scene.id)
    if (targetScene) {
      currentScene.value = { ...targetScene }
      saveImmediately() // 立即保存更改
    }
  } catch (error) {
    console.error('场景切换错误:', error)
    showToast('场景切换失败', 'error')
  }
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
  try {
    localStorage.setItem('aiModels', JSON.stringify(models.value))
    showToast('模型配置已保存', 'success')
    await syncData() // 改为使用 syncData
  } catch (error) {
    console.error('保存模型失败:', error)
    showToast('保存模型失败: ' + error.message, 'error')
  }
}

const closeModelEditor = () => {
  saveModels() // 关闭前自动保存
  //showModelEditor.value = false
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


const canInsertText = (prompt) => {
  if (!prompt?.userPrompt) return false
  return getInsertCount(prompt.userPrompt) > 0
}

const canSendRequest = (prompt) => {
  if (!prompt?.userPrompt) return false
  return prompt.userPrompt.trim().length > 0
}



const canInsertSelected = () => {
  if (!selectedPrompt.value) return false
  return selectedCards.value.length === getInsertCount(selectedPrompt.value.template)
}
// 提示词相关方法
const createNewPrompt = () => {
  showPromptModal.value = true
  editingPrompt.value = null // 确保清空编辑状态
  promptForm.value = {
    title: '',
    systemPrompt: '', // 初始化系统提示词
    userPrompt: '', 
    defaultModel: '',
    detectKeywords: true  // 默认启用关键词检测
  }
}

const editPrompt = (prompt) => {
  editingPrompt.value = prompt
  promptForm.value = { ...prompt }
  showPromptModal.value = true
}

// 修改关闭模态框的方法
const closePromptModal = () => {
  showPromptModal.value = false
  editingPrompt.value = null
  // 重置表单
  promptForm.value = {
    title: '',
    systemPrompt: '',
    userPrompt: '{{text}}',
    defaultModel: '',
    detectKeywords: true
  }
}

// 修改保存提示词的方法
const savePrompt = () => {
  if (!promptForm.value.title || !promptForm.value.userPrompt) {
    showToast('请填写标题和用户提示词', 'error')
    return
  }

  try {
    const newPrompt = {
      id: editingPrompt.value?.id || Date.now(),
      title: promptForm.value.title,
      systemPrompt: promptForm.value.systemPrompt || '',
      userPrompt: promptForm.value.userPrompt,
      defaultModel: promptForm.value.defaultModel || '',
      insertedContents: editingPrompt.value?.insertedContents || [],
      selectedModel: promptForm.value.defaultModel || '',
      detectKeywords: promptForm.value.detectKeywords
    }

    if (editingPrompt.value) {
      const index = prompts.value.findIndex(p => p.id === editingPrompt.value.id)
      if (index !== -1) {
        prompts.value[index] = newPrompt
      }
    } else {
      prompts.value.push(newPrompt)
    }

    // 保存到本地存储
    dataService.saveToLocalStorage('prompts', prompts.value)
    
    closePromptModal() // 使用closePromptModal方法关闭
    showToast('提示词保存成功', 'success')
  } catch (error) {
    console.error('保存提示词失败:', error)
    showToast('保存提示词失败: ' + error.message, 'error')
  }
}

// 修改插入文本的方法
const insertSelectedText = (prompt) => {
  if (!selectedCards.value.length) {
    showToast('请先选择要处理的卡片', 'error')
    return
  }

  const selectedTexts = selectedCards.value.map(card => card.content).join('\n\n')
  
  // 检查提示词模板中是否包含 {{text}}
  if (!prompt.userPrompt.includes('{{text}}')) {
    showToast('提示词模板必须包含 {{text}} 占位符', 'error')
    return
  }

  // 替换模板中的 {{text}} 为选中的文本
  const processedPrompt = prompt.userPrompt.replace(/{{text}}/g, selectedTexts)
  
  // 更新提示词的插入内容记录
  const insertedContent = {
    id: Date.now(),
    text: selectedTexts,
    cards: selectedCards.value.map(card => ({ id: card.id, content: card.content }))
  }

  // 确保 insertedContents 是数组
  if (!Array.isArray(prompt.insertedContents)) {
    prompt.insertedContents = []
  }
  prompt.insertedContents.push(insertedContent)

  // 保存更新后的提示词
  localStorage.setItem('prompts', JSON.stringify(prompts.value))

  // 更新当前选中的提示词
  selectedPrompt.value = {
    ...prompt,
    processedPrompt
  }

  showToast('内容已插入提示词', 'success')
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

// 定义API地址格式化函数
const formatApiUrl = (model) => {
  switch (model.provider) {
    case 'openai':
      return `${model.apiUrl.replace(/\/+$/, '')}/chat/completions`
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent`
    case 'ollama':
      return 'http://localhost:11434/api/chat'
    case 'custom':
      return model.apiUrl // 自定义API使用完整URL
    default:
      return model.apiUrl
  }
}

// 修改发送提示词请求的方法
const sendPromptRequest = async (prompt) => {
  if (!prompt.userPrompt.trim()) {
    showToast('请输入提示词内容', 'error')
    return
  }

  const model = models.value.find(m => m.id === prompt.selectedModel)
  if (!model) {
    showToast('请选择有效的模型', 'error')
    return
  }

  try {
    let processedTemplate = prompt.userPrompt

    // 处理插入内容的替换
    if (prompt.insertedContents?.length > 0) {
      const insertedTexts = prompt.insertedContents.map(item => item.content).join('\n')
      processedTemplate = processedTemplate.replace(/{{text}}/g, insertedTexts)
    }

    // 只在启用关键词检测时执行关键词处理
    if (prompt.detectKeywords) {
      // 检查关键词
      let keywordContexts = []
      const keywordTags = tags.value.filter(tag => tag.isKeyword)
      
      // 获取当前场景中带有关键词标签的卡片
      const keywordCards = currentScene.value.cards.filter(card => 
        card.tags?.some(tagId => keywordTags.some(tag => tag.id === tagId)) && 
        card.title
      )

      // 检查每个关键词卡片
      keywordCards.forEach(card => {
        if (card.title && processedTemplate.includes(card.title)) {
          keywordContexts.push({
            keyword: card.title,
            content: card.content
          })
        }
      })

      // 如果找到关键词，添加上下文
      if (keywordContexts.length > 0) {
        const contextSection = keywordContexts.map(ctx => 
          `关键词「${ctx.keyword}」的上下文:\n${ctx.content}`
        ).join('\n\n')
        processedTemplate = `${contextSection}\n\n---\n\n${processedTemplate}`
      }
    }

    console.log('processedTemplate', processedTemplate)

    // 发送请求到API
    let response
    const apiUrl = formatApiUrl(model)

    // 根据不同的模型提供商发送请求
    if (model.provider === 'openai' || model.provider === 'custom') {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            {
              role: "system",
              content: prompt.systemPrompt
            },
            {
              role: "user",
              content: processedTemplate
            }
          ],
          max_tokens: Number(model.maxTokens),
          temperature: Number(model.temperature)
        })
      })
    } else if (model.provider === 'gemini') {
      console.log('gemini', apiUrl)
      response = await fetch(`${apiUrl}?key=${model.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: processedTemplate
            }]
          }],
          generationConfig: {
            maxOutputTokens: Number(model.maxTokens),
            temperature: Number(model.temperature)
          }
        })
      })
    } else if (model.provider === 'ollama') {
      response = await fetch(apiUrl, {
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
          options: {
            num_predict: Number(model.maxTokens),
            temperature: Number(model.temperature)
          }
        })
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`)
    }

    const result = await response.json()
    let content

    // 根据不同的提供商处理返回结果
    if (model.provider === 'openai' || model.provider === 'custom') {
      content = result.choices?.[0]?.message?.content
    } else if (model.provider === 'gemini') {
      content = result.candidates?.[0]?.content?.parts?.[0]?.text
    } else if (model.provider === 'ollama') {
      content = result.message?.content
    }

    if (!content) {
      throw new Error('响应格式错误')
    }

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

    // 移除这两行代码，不再清除插入内容
    // prompt.insertedContents = []
    // prompt.selectedModel = prompt.defaultModel || ''

    showToast('发送成功')

  } catch (error) {
    console.error('API 请求错误:', error)
    showToast(error.message, 'error')
  }
}


// 简化的文件导入处理
const importPrompts = async (event) => {
  const files = event.target.files
  if (!files.length) return

  try {
    for (const file of files) {
      let content = await file.text()
      
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content)
          const newPrompts = Array.isArray(jsonData) ? jsonData : [jsonData]
          
          newPrompts.forEach(prompt => {
            // 确保导入的提示词符合新结构
            prompts.value.push({
              id: Date.now() + Math.random(),
              title: prompt.title || file.name,
              systemPrompt: prompt.systemPrompt || '',
              userPrompt: prompt.userPrompt || prompt.template || content.trim(), // 兼容旧版本
              defaultModel: prompt.defaultModel || models.value[0]?.id || '',
              insertedContents: [],
              detectKeywords: prompt.detectKeywords ?? true
            })
          })
        } catch (e) {
          console.warn('JSON 解析失败，作为普通文本处理')
          prompts.value.push({
            id: Date.now() + Math.random(),
            title: file.name,
            systemPrompt: '',
            userPrompt: content.trim(),
            defaultModel: models.value[0]?.id || '',
            insertedContents: [],
            detectKeywords: true
          })
        }
      } else {
        // 处理普通文本文件
        prompts.value.push({
          id: Date.now() + Math.random(),
          title: file.name,
          systemPrompt: '',
          userPrompt: content.trim(),
          defaultModel: models.value[0]?.id || '',
          insertedContents: [],
          detectKeywords: true
        })
      }
    }

    event.target.value = ''
    savePrompts()
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

// 新增的插入提示词相关方法
const insertPromptAtCursor = (card) => {
  currentEditingCard.value = card
  showPromptSelectModal.value = true
}

const insertPromptToCard = (prompt) => {
  if (!currentEditingCard.value) return
  
  const insertCount = getInsertCount(prompt.userPrompt)
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
  // 保存更新后的提示词数据
  localStorage.setItem('prompts', JSON.stringify(prompts.value))
}

const hasInsertedContent = (prompt) => {
  return Array.isArray(prompt?.insertedContents) && prompt.insertedContents.length > 0
}

// 修改文本截断方法，添加更严格的类型检查
const truncateText = (text, length = 20) => {
  // 如果文本为空或未定义，返回空字符串
  if (!text) return ''
  
  // 确保文本是字符串类型
  const str = String(text)
  return str.length > length ? str.slice(0, length) + '...' : str
}

// 计算可插入的提示词
const insertablePrompts = computed(() => {
  return prompts.value.filter(prompt => getInsertCount(prompt.userPrompt) > 0)
})

// 模型管理方法
const addModel = () => {
  const newModel = createDefaultModel()
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
    else if(model.provider === 'openai'){
      const response = await fetch(`${model.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      console.log('openai', response)
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }
      
      const result = await response.json()
      // OpenAI 返回的是一个对象数组，需要正确解析
      return result.data.map(model => {
        // 处理可能是字符串或对象的情况
        if (typeof model === 'string') {
          return {
            id: model,
            name: model
          }
        }
        // 如果是对象格式，返回正确的模型信息
        return {
          id: model.id,
          name: model.id,
          created: model.created,
          owned_by: model.owned_by
        }
      })
    }
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
  if (!prompt) return
  
  selectedPrompt.value = {
    ...prompt,
    template: [
      prompt.systemPrompt && `系统提示词:\n${prompt.systemPrompt}`,
      `用户提示词:\n${prompt.userPrompt}`
    ].filter(Boolean).join('\n\n')
  }
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
  try {
    if (!confirm('确定要删除这个提示词吗？')) return
    
    prompts.value = prompts.value.filter(p => p.id !== promptId)
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
    showToast('提示词删除成功', 'success')
  } catch (error) {
    console.error('删除提示词失败:', error)
    showToast('删除提示词失败: ' + error.message, 'error')
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
const handleAddCardsToScene = async (sceneId, cards) => {
  try {
    const sceneIndex = scenes.value.findIndex(s => s.id === sceneId)
    if (sceneIndex !== -1) {
      const updatedScene = JSON.parse(JSON.stringify(scenes.value[sceneIndex]))
      if (!updatedScene.cards) {
        updatedScene.cards = []
      }
      updatedScene.cards.push(...cards)
      
      // 使用场景更新处理器
      await handleSceneUpdate(updatedScene)
    }
  } catch (error) {
    console.error('添加卡片失败:', error)
    showToast('添加卡片失败: ' + error.message, 'error')
  }
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
    // 使用已存在的 getInsertCount 函数检查提示词中有多少个 {{text}} 占位符
    const textPlaceholders = getInsertCount(prompt.userPrompt)
    
    // 确保 insertedContents 是数组
    if (!prompt.insertedContents) {
      prompt.insertedContents = []
    }
    
    // 检查是否已达到最大插入数量
    if (prompt.insertedContents.length >= textPlaceholders) {
      showToast(`该提示词最多只能插入 ${textPlaceholders} 个内容`, 'error')
      return
    }
    
    // 检查是否已经插入过相同内容
    // const isDuplicate = prompt.insertedContents.some(item => 
    //   item.content === cardToInsert.value.content && 
    //   item.cardId === cardToInsert.value.id
    // )
    
    // if (isDuplicate) {
    //   showToast('该内容已经插入过', 'error')
    //   return
    // }

    // 添加新的插入内容
    prompt.insertedContents.push({
      id: Date.now(),
      content: cardToInsert.value.content,
      cardId: cardToInsert.value.id
    })

    // 更新提示词
    const index = prompts.value.findIndex(p => p.id === prompt.id)
    if (index !== -1) {
      prompts.value[index] = { ...prompt }
    }

    // 保存到本地存储
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
    
    // 关闭模态框
    showPromptSelectModal.value = false
    cardToInsert.value = null
    
    showToast('内容已插入到提示词')
  } catch (error) {
    console.error('插入内容错误:', error)
    showToast('插入失败: ' + error.message, 'error')
  }
}

// 添加一个辅助函数来计算提示词中的占位符数量
const getInsertCount = (promptTemplate) => {
  if (!promptTemplate) return 0
  return (promptTemplate.match(/{{text}}/g) || []).length
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
    const fullPrompt = currentPrompt.userPrompt.replace(/{{text}}/g, insertedTexts)

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


// 修改导入文件处理方法
const handleFilesImport = async (event) => {
  const files = event.target.files
  if (!files.length) return

  try {
    for (const file of files) {
      let content = await file.text()
      
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content)
          // 如果是场景导出的JSON，包含cards数组
          if (Array.isArray(jsonData.cards)) {
            // 创建新场景
            const newScene = {
              id: Date.now(),
              name: jsonData.name || file.name.replace('.json', ''),
              cards: jsonData.cards.map(card => ({
                ...card,
                id: Date.now() + Math.random(), // 生成新的ID
                height: card.height || '120px',
                tags: Array.isArray(card.tags) ? card.tags : []
              }))
            }
            scenes.value.push(newScene)
            currentScene.value = newScene
          } else if (Array.isArray(jsonData)) {
            // 如果是普通JSON数组，作为卡片导入
            const newCards = jsonData.map(item => ({
              id: Date.now() + Math.random(),
              title: typeof item === 'object' ? (item.title || '') : '',
              content: typeof item === 'object' ? (item.content || JSON.stringify(item)) : String(item),
              height: '120px',
              tags: []
            }))
            if (currentScene.value) {
              currentScene.value.cards.push(...newCards)
            }
          } else {
            // 单个JSON对象
            const newCard = {
              id: Date.now() + Math.random(),
              title: '',
              content: JSON.stringify(jsonData, null, 2),
              height: '120px',
              tags: []
            }
            if (currentScene.value) {
              currentScene.value.cards.push(newCard)
            }
          }
        } catch (e) {
          console.warn('JSON解析失败，作为文本处理')
          if (currentScene.value) {
            currentScene.value.cards.push({
              id: Date.now() + Math.random(),
              title: file.name,
              content: content.trim(),
              height: '120px',
              tags: []
            })
          }
        }
      } else {
        // 处理普通文本文件
        if (currentScene.value) {
          currentScene.value.cards.push({
            id: Date.now() + Math.random(),
            title: file.name,
            content: content.trim(),
            height: '120px',
            tags: []
          })
        }
      }
    }

    // 清空文件输入
    event.target.value = ''
    // 保存更改
    saveImmediately()
    showToast('文件导入成功')

  } catch (error) {
    console.error('文件导入错误:', error)
    showToast('文件导入失败: ' + error.message, 'error')
  }
}

// 将函数名改为 exportScene，避免与其他地方的 exportToJsonl 冲突
const exportScene = () => {
  try {
    if (!currentScene.value) {
      showToast('没有可导出的场景', 'error')
      return
    }

    const sceneData = {
      name: currentScene.value.name,
      cards: currentScene.value.cards.map(card => ({
        title: card.title || '',
        content: card.content || '',
        tags: card.tags || [],
        height: card.height || '120px'
      }))
    }

    const jsonStr = JSON.stringify(sceneData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentScene.value.name || 'scene'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast('场景导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showToast('导出失败: ' + error.message, 'error')
  }
}


defineExpose({
  handleFilesImport,
  exportScene // 更新导出的函数名
})

// 修改插入内容到提示词的方法
const insertContentToPrompt = (prompt, content) => {
  if (!prompt.insertedContents) {
    prompt.insertedContents = []
  }
  
  prompt.insertedContents.push({
    id: Date.now(),
    content: content
  })
  
  // 保存插入的内容到本地存储
  promptInsertedContents.value[prompt.id] = prompt.insertedContents
  localStorage.setItem('promptInsertedContents', JSON.stringify(promptInsertedContents.value))
  
  // 关闭选择提示词的模态框
  showPromptSelectModal.value = false
  
  showToast('内容已插入到提示词')
}

// 保存当前视图到本地存储
watch(currentView, (newView) => {
  localStorage.setItem('currentView', newView)
})

// 处理场景更新
const handleSceneUpdate = async (updatedScene) => {
  try {
    // 更新本地场景数据
    const index = scenes.value.findIndex(s => s.id === updatedScene.id)
    if (index !== -1) {
      // 创建新的场景数组以触发响应式更新
      scenes.value = [
        ...scenes.value.slice(0, index),
        updatedScene,
        ...scenes.value.slice(index + 1)
      ]
    }
    
    // 保存到本地存储
    localStorage.setItem('scenes', JSON.stringify(scenes.value))
    
    // 触发视图更新
    nextTick(() => {
      // 如果需要，可以在这里添加额外的更新逻辑
      console.log('场景已更新:', updatedScene.name)
    })
  } catch (error) {
    console.error('更新场景失败:', error)
    showToast('更新场景失败: ' + error.message, 'error')
  }
}

// 初始化数据
onMounted(() => {
  try {
    // 加载场景
    const savedScenes = localStorage.getItem('scenes')
    if (savedScenes) {
      scenes.value = JSON.parse(savedScenes)
    }
    
    // 加载其他数据
    loadData()
  } catch (error) {
    console.error('初始化数据失败:', error)
    showToast('初始化数据失败: ' + error.message, 'error')
  }
})

// 加载数据的辅助函数
const loadData = () => {
  try {
    // 加载模型配置
    const savedModels = localStorage.getItem('models')
    if (savedModels) {
      // 确保每个模型都有正确的 provider 字段
      models.value = JSON.parse(savedModels).map(model => ({
        ...model,
        provider: model.provider || 'custom', // 如果没有 provider 字段，默认为 custom
        maxTokens: model.maxTokens || 512,
        temperature: model.temperature || 0.7
      }))
    }
    
    // 保存处理后的模型数据
    localStorage.setItem('models', JSON.stringify(models.value))
    
    // 加载提示词
    const savedPrompts = localStorage.getItem('prompts')
    if (savedPrompts) {
      prompts.value = JSON.parse(savedPrompts)
    }
    
    dataLoaded.value = true
    console.log('数据加载完成，模型:', models.value)
  } catch (error) {
    console.error('加载数据失败:', error)
    showToast('加载数据失败: ' + error.message, 'error')
  }
}




// 监听场景变化
watch(scenes, (newScenes) => {
  // 保存到本地存储
  localStorage.setItem('scenes', JSON.stringify(newScenes))
  
  // 触发所有相关组件的更新
  nextTick(() => {
    if (currentView.value === 'main') {
      // 主视图相关更新
    } else if (currentView.value === 'agents') {
      // Agents视图相关更新
    }
    // ... 其他视图的更新逻辑
  })
}, { deep: true })
</script>

<style scoped>
@import url("./styles/app.css");
@import url("./styles/common.css");


</style> 