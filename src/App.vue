<template>
  <div class="container">    
    <!-- 其他视图内容 -->
    <div class="content-area">
      <!-- 主要内容区域 -->
      <div v-if="currentView === 'main'" class="main-content">

        <!-- 左侧提示词模板区 -->
        <div class="prompt-panel" :style="{ width: promptPanelWidth + 'px' }">
          <div class="panel-header">
            <h2>提示词模板(v{{ version }})</h2>
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
            <button @click="exportPrompts">
              <i class="fas fa-file-export"></i> 导出提示词
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
        v-if="currentView === 'book'"
        :scenes="scenes"
        :prompts="prompts"
        :models="models"
        @convert-to-cards="handleBatchConvertToCards"
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
      <AIDetector
        v-else-if="currentView === 'detector'"
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
      <button 
        @click="currentView = 'agents'" 
        :class="{ active: currentView === 'agents' }"
      >
        <i class="fas fa-robot"></i>
      </button>
      <button 
        @click="currentView = 'detector'" 
        :class="{ active: currentView === 'detector' }"
      >
        <i class="fas fa-search"></i>
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
import AgentsView from './components/AgentsView.vue'
import { showToast } from './utils/common.js'
import { sendToModel } from './utils/modelRequests'
import { useCommon } from './utils/composables/useCommon'
import { showToastMessage, detectContentType, splitContent } from './utils/common'
import { dataService } from './utils/services/dataService'
import { debugLog, setDebugMode } from './utils/debug'
import AIDetector from './components/AIDetector.vue'

setDebugMode(true)

// 添加版本号
const version = __APP_VERSION__

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
const scenes = ref([])
const currentScene = ref(null)
const tags = ref([])
const selectedTags = ref([])
const showTagModal = ref(false)
const newTagName = ref('')
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


// 使用组合式API
const {
  isLoading,
  exportData,
  importData,
  saveToStorage,
  loadFromStorage,
  formatTime,
  truncateText,
  createDebounce
} = useCommon()

// 防抖的数据同步
const syncData = createDebounce(async () => {
  if (!dataLoaded.value) return

  try {
    isLoading.value = true
    const dataToSync = {
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

    await dataService.saveAllData(dataToSync)
  } catch (error) {
    showToast(`数据同步失败: ${error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}, 500)

// 初始化数据
const initializeData = async (data) => {
  scenes.value = data.scenes || []
  prompts.value = data.prompts || []
  tags.value = data.tags || []
  
  if (data.config) {
    models.value = (data.config.models || []).map(model => ({
      ...model,
      provider: model.provider || 'custom',
      maxTokens: model.maxTokens || 512,
      temperature: model.temperature || 0.7
    }))
    
    notepadInitialContent.value = data.config.notepadContent || ''
    currentView.value = data.config.currentView || 'main'
    selectedTags.value = data.config.selectedTags || []
    
    if (scenes.value.length > 0) {
      const savedSceneId = data.config.currentSceneId
      currentScene.value = scenes.value.find(s => s.id === savedSceneId) || scenes.value[0]
    }
  }
}

// 加载所有数据
const loadAllData = async () => {
  try {
    isLoading.value = true
    const data = await dataService.loadAllData()
    const initializedData = await dataService.initializeData(data)
    
    // 更新状态
    scenes.value = initializedData.scenes
    prompts.value = initializedData.prompts
    tags.value = initializedData.tags
    
    if (initializedData.config) {
      models.value = initializedData.config.models
      notepadInitialContent.value = initializedData.config.notepadContent
      currentView.value = initializedData.config.currentView
      selectedTags.value = initializedData.config.selectedTags
      
      if (scenes.value.length > 0) {
        const savedSceneId = initializedData.config.currentSceneId
        currentScene.value = scenes.value.find(s => s.id === savedSceneId) || scenes.value[0]
      }
    }

    dataLoaded.value = true
  } catch (error) {
    console.error('数据加载失败:', error)
    showToast('数据加载失败', 'error')
    const defaultData = await dataService.initializeData({})
    await initializeData(defaultData)
  } finally {
    isLoading.value = false
  }
}

// 处理关键词匹配和上下文构建
const processKeywords = (text) => {
  const processedCards = new Set() // 用于追踪已处理的卡片，避免循环引用
  const keywordMatches = []
  const keywordTags = tags.value.filter(tag => tag.isKeyword)
  
  // 获取所有场景中的所有卡片
  const getAllCards = () => {
    const allCards = []
    scenes.value.forEach(scene => {
      if (scene.cards && Array.isArray(scene.cards)) {
        allCards.push(...scene.cards)
      }
    })
    return allCards
  }

  // 根据ID查找卡片
  const findCardById = (cardId) => {
    return getAllCards().find(card => card.id === cardId)
  }
  
  // 递归处理卡片及其关联卡片
  const processCard = (card) => {
    if (!card || processedCards.has(card.id)) return // 避免循环引用和空卡片
    processedCards.add(card.id)
    
    debugLog('Processing card:', card.title)
    
    // 检查卡片是否有关键词标签
    const hasKeywordTag = card.tags?.some(tagId => 
      keywordTags.some(tag => tag.id === tagId)
    )

    // 检查文本中是否包含卡片标题
    const titleIncluded = card.title && 
      text.toLowerCase().includes(card.title.toLowerCase())
    
    if (hasKeywordTag && titleIncluded) {
      // 收集关联卡片的内容
      const linkedContents = []
      
      // 处理关联卡片
      if (card.links?.length > 0) {
        debugLog('Found linked cards:', card.links)
        card.links.forEach(linkedCardId => {
          const linkedCard = findCardById(linkedCardId)
          if (linkedCard) {
            debugLog('Processing linked card:', linkedCard.title)
            linkedContents.push(`关联内容「${linkedCard.title}」：\n${linkedCard.content || '无内容'}`)
            processCard(linkedCard) // 继续处理关联卡片的关联
          }
        })
      }

      // 避免重复添加相同的卡片
      const isDuplicate = keywordMatches.some(
        match => match.title === card.title
      )
      
      if (!isDuplicate) {
        let content = card.content || '无内容'
        
        // 如果有关联内容，添加到主内容后面
        if (linkedContents.length > 0) {
          content += '\n\n--- 关联内容 ---\n\n' + linkedContents.join('\n\n')
        }

        keywordMatches.push({
          keyword: card.title,
          title: card.title,
          content: content
        })
      }
    }
  }

  // 遍历所有场景和卡片
  getAllCards().forEach(card => {
    processCard(card)
  })

  // 如果找到关键词匹配，构建上下文信息
  if (keywordMatches.length > 0) {
    debugLog('Found keyword matches:', keywordMatches)
    const contextInfo = keywordMatches
      .map(match => `关键词「${match.title}」相关内容：\n${match.content}`)
      .join('\n\n')
    
    const processedText = `${contextInfo}\n\n---\n\n${text}`
    return processedText
  }

  return text
}

// 生命周期钩子
onMounted(async () => {
  await loadAllData()
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
const savePrompt = async () => {
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
    await loadAllData()
    closePromptModal() // 使用closePromptModal方法关闭
    showToast('提示词保存成功', 'success')
  } catch (error) {
    console.error('保存提示词失败:', error)
    showToast('保存提示词失败: ' + error.message, 'error')
  }
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

    showToast('发送成功！') 

    // 处理插入内容的替换
    if (prompt.insertedContents?.length > 0) {
      const insertedTexts = prompt.insertedContents.map(item => item.content).join('\n')
      processedTemplate = processedTemplate.replace(/{{text}}/g, insertedTexts)
    }

    // 2. 再进行关键词检测和处理
    if (prompt.detectKeywords !== false) {  // 默认为 true，除非明确设置为 false
      processedTemplate = processKeywords(processedTemplate)
    }

    // 使用 sendToModel 发送请求
    const content = await sendToModel(
      model,
      processedTemplate,
      [], // 空的上下文数组
      null, // 不需要 abortController
      prompt.systemPrompt // 系统提示词作为模板
    )

    debugLog('content', content)

    // 创建新卡片
    const newCard = {
      id: Date.now(),
      content,
      title: prompt.title ? `来自提示词「${prompt.title}」的回复` : '生成的内容',
      height: '200px',
      tags: []
    }
    
    debugLog('newCard', newCard)

    if (currentScene.value) {
      currentScene.value.cards.push(newCard)
    }

    showToast('回复成功！')

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
              userPrompt: prompt.userPrompt || prompt.template || '{{text}}', // 默认添加占位符
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
            systemPrompt: content.trim(), // 非JSON文件内容作为系统提示词
            userPrompt: '{{text}}', // 默认添加占位符
            defaultModel: models.value[0]?.id || '',
            insertedContents: [],
            detectKeywords: true
          })
        }
      } else {
        // 处理普通文本文件，内容作为系统提示词
        prompts.value.push({
          id: Date.now() + Math.random(),
          title: file.name,
          systemPrompt: content.trim(), // 文本内容作为系统提示词
          userPrompt: '{{text}}', // 默认添加占位符
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

// 新增的插入提示词相关方法
const insertPromptAtCursor = (card) => {
  currentEditingCard.value = card
  showPromptSelectModal.value = true
}


const removeInsertedContent = (prompt, index) => {
  prompt.insertedContents.splice(index, 1)
  // 保存更新后的提示词数据
  localStorage.setItem('prompts', JSON.stringify(prompts.value))
}

const hasInsertedContent = (prompt) => {
  return Array.isArray(prompt?.insertedContents) && prompt.insertedContents.length > 0
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

const saveModels = async () => {
  showToast('保存成功！')
  dataService.saveToLocalStorage('models', models.value)
  await loadAllData()
}

const saveScenes = async () => {
  dataService.saveToLocalStorage('scenes', scenes.value)
  await loadAllData()
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
      debugLog('openai', model.apiUrl)
      const response = await fetch(`${model.apiUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
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

// 显示卡片详情
const viewCardDetail = (card) => {
  selectedCard.value = card
  showCardDetailModal.value = true
}

// 场景操作方法
const createNewScene = async () => {
  try {
    const newScene = {
      id: Date.now(),
      name: `场景 ${scenes.value.length + 1}`,
      cards: []
    }
    
    scenes.value.push(newScene)
    
    // 直接切换到新场景
    switchScene(newScene)
    
    // 保存更改
    await saveImmediately()
    showToast('新场景创建成功', 'success')
  } catch (error) {
    console.error('创建场景失败:', error)
    showToast('创建场景失败: ' + error.message, 'error')
  }
}

const deleteScene = async (sceneId) => {
  if (!confirm('确定要删除这个场景吗？')) return
  
  try {
    const index = scenes.value.findIndex(s => s.id === sceneId)
    if (index === -1) {
      throw new Error('场景不存在')
    }
    
    // 如果只剩一个场景，不允许删除
    if (scenes.value.length <= 1) {
      throw new Error('至少需要保留一个场景')
    }
    
    // 如果要删除的是当前场景，先切换到其他场景
    if (currentScene.value?.id === sceneId) {
      const nextScene = scenes.value[index + 1] || scenes.value[index - 1]
      switchScene(nextScene)
    }
    
    // 删除场景
    scenes.value.splice(index, 1)
    
    // 保存更改
    await saveImmediately()
    showToast('场景删除成功', 'success')
  } catch (error) {
    console.error('删除场景失败:', error)
    showToast('删除场景失败: ' + error.message, 'error')
  }
}

// 修改场景名称编辑方法
const editSceneName = async (scene) => {
  const newName = prompt('请输入新的场景名称:', scene.name)
  if (newName && newName.trim()) {
    try {
      scene.name = newName.trim()
      await saveImmediately()
      showToast('场景名称修改成功', 'success')
    } catch (error) {
      console.error('修改场景名称失败:', error)
      showToast('修改场景名称失败: ' + error.message, 'error')
    }
  }
}

// 切换标签的关键词状态
const toggleTagKeyword = (tagId) => {
  const tag = tags.value.find(t => t.id === tagId)
  if (tag) {
    tag.isKeyword = !tag.isKeyword
    saveTags()
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
  try {
    // 找到目标场景
    const targetScene = scenes.value.find(s => Number(s.id) === Number(sceneId))
    if (!targetScene) {
      throw new Error(`目标场景不存在 (ID: ${sceneId})`)
    }

    // 确保场景有 cards 数组
    if (!Array.isArray(targetScene.cards)) {
      targetScene.cards = []
    }

    // 添加卡片到目标场景
    targetScene.cards.push(...cards)

    // 保存更改
    saveScenes()

    showToast(`成功添加 ${cards.length} 个卡片到场景：${targetScene.name}`, 'success')
  } catch (error) {
    console.error('添加卡片到场景失败:', error)
    showToast('添加卡片失败: ' + error.message, 'error')
  }
}

// 添加合并卡片的方法
const handleMergeCards = (cards) => {
  debugLog('Merging cards:', cards)
}

const preventTextSelection = (prevent) => {
  document.body.style.userSelect = prevent ? 'none' : ''
}

watch(dragScene, (isDragging) => {
  preventTextSelection(isDragging)
})

onUnmounted(() => {
  preventTextSelection(false)
})

// 修改处理添加到笔记本的方法
const handleAddToNotepad = (cardData) => {
  // 先切换到笔记本视图
  
  showToast('已添加到记事本')
  currentView.value = 'note'
  // 使用 nextTick 确保视图更新后再设置内容
  nextTick(() => {
    // 设置笔记本初始内容，包含标题和完整信息
    const formattedContent = `# ${cardData.title}\n\n${cardData.content}`
    
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
      switchScene(nextScene)
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

// 减少自动同步间隔到10秒
onMounted(async () => {
  await loadAllData()
  setInterval(syncData, 10000) // 10秒自动同步一次
  const savedInsertedContents = localStorage.getItem('promptInsertedContents')
  if (savedInsertedContents) {
    promptInsertedContents.value = JSON.parse(savedInsertedContents)
  }
})

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

    // 收集卡片及其关联卡片的内容
    const allContent = []
    const processedCards = new Set() // 避免循环引用

    const collectCardContent = (card) => {
      if (processedCards.has(card.id)) return
      processedCards.add(card.id)

      // 添加当前卡片内容
      allContent.push(card.content)

      // 处理关联卡片
      if (card.links?.length > 0) {
        scenes.value.forEach(scene => {
          scene.cards.forEach(linkedCard => {
            if (card.links.includes(linkedCard.id)) {
              collectCardContent(linkedCard)
            }
          })
        })
      }
    }

    // 处理主卡片及其关联卡片
    collectCardContent(cardToInsert.value)

    // 合并所有内容
    const combinedContent = allContent.join('\n\n--- 关联内容 ---\n\n')

    // 添加新的插入内容
    prompt.insertedContents.push({
      id: Date.now(),
      content: combinedContent,
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
    
    showToast('内容已插入到提示词（包含关联内容）')
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

// 修改添加标签的方法
const addTag = () => {
  if (newTagName.value.trim()) {
    const tag = {
      id: Date.now(),
      name: newTagName.value.trim(),
      isKeyword: false
    }
    tags.value.push(tag)
    saveTags()
    newTagName.value = '' // 清空输入
    showToast('标签添加成功', 'success')
  }
}

// 确保有保存标签的方法
const saveTags = async () => {
  try {
    dataService.saveToLocalStorage('tags', tags.value)
    await loadAllData()
  } catch (error) {
    console.error('保存标签失败:', error)
    showToast('保存标签失败', 'error')
  }
}

// 在组件挂载时加载标签
onMounted(() => {
  // 加载标签
  const savedTags = localStorage.getItem('tags')
  if (savedTags) {
    try {
      tags.value = JSON.parse(savedTags)
    } catch (error) {
      console.error('加载标签失败:', error)
      tags.value = []
    }
  }
})

// 修改导入文件处理方法
const handleFilesImport = async (event) => {
  const files = event.target.files
  if (!files.length) return

  try {
    isLoading.value = true
    
    for (const file of files) {
      let content = await file.text()
      
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content)
          if (Array.isArray(jsonData.cards)) {
            // 创建新场景
            const newScene = {
              id: Date.now(),
              name: jsonData.name || file.name.replace('.json', ''),
              cards: jsonData.cards.map(card => ({
                ...card,
                id: Date.now() + Math.random(),
                height: card.height || '120px',
                tags: Array.isArray(card.tags) ? card.tags : []
              }))
            }
            scenes.value.push(newScene)
            currentScene.value = newScene
          } else if (Array.isArray(jsonData)) {
            // 处理普通JSON数组
            const newCards = jsonData.map(item => ({
              id: Date.now() + Math.random(),
              title: typeof item === 'object' ? truncateText(item.title || '') : '',
              content: typeof item === 'object' ? (item.content || JSON.stringify(item)) : String(item),
              height: '120px',
              tags: []
            }))
            if (currentScene.value) {
              currentScene.value.cards.push(...newCards)
            }
          } else {
            // 处理单个JSON对象
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
              content: content,
              height: '120px',
              tags: []
            })
          }
        }
      }
    }
    
    await saveImmediately()
    showToastMessage('文件导入成功', 'success')
  } catch (error) {
    console.error('文件导入失败:', error)
    showToastMessage('文件导入失败: ' + error.message, 'error')
  } finally {
    isLoading.value = false
    event.target.value = ''
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

// 保存当前视图到本地存储
watch(currentView, (newView) => {
  localStorage.setItem('currentView', newView)
  dataService.saveToLocalStorage('currentView', newView)
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
    })
  } catch (error) {
    console.error('更新场景失败:', error)
    showToast('更新场景失败: ' + error.message, 'error')
  }
}

// 初始化数据
onMounted(async () => {
  try {
    // 加载场景
    const savedScenes = localStorage.getItem('scenes')
    if (savedScenes) {
      scenes.value = JSON.parse(savedScenes)
    }
    
    // 加载其他数据
    await loadData()
  } catch (error) {
    console.error('初始化数据失败:', error)
    showToast('初始化数据失败: ' + error.message, 'error')
  }
})

// 加载数据的辅助函数
const loadData = async () => {
  try {
    isLoading.value = true
    const data = await dataService.loadBackendData()
    
    // 更新状态
    models.value = data.models
    prompts.value = data.prompts
    tags.value = data.tags
    scenes.value = data.scenes
    
    // 更新配置
    notepadInitialContent.value = data.config.notepadContent
    currentView.value = data.config.currentView
    selectedTags.value = data.config.selectedTags
    
    // 设置当前场景
    if (data.config.currentSceneId && scenes.value.length > 0) {
      currentScene.value = scenes.value.find(s => s.id === data.config.currentSceneId) || scenes.value[0]
    } else if (scenes.value.length > 0) {
      currentScene.value = scenes.value[0]
    }
    
    dataLoaded.value = true
  } catch (error) {
    console.error('加载数据失败:', error)
    showToast('加载数据失败: ' + error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

// 修改处理批量转换的方法
const handleBatchConvertToCards = ({ cards, targetSceneId }) => {
  try {
    // 转换为数字类型进行比较
    const targetScene = scenes.value.find(s => Number(s.id) === Number(targetSceneId));
    
    if (!targetScene) {
      throw new Error(`目标场景不存在 (ID: ${targetSceneId})`);
    }
    
    // 确保场景有 cards 数组
    if (!Array.isArray(targetScene.cards)) {
      targetScene.cards = [];
    }
    
    // 添加卡片到目标场景
    targetScene.cards.push(...cards);
    
    // 保存更改
    saveScenes();
    
    // 切换到主视图并选中目标场景
    currentView.value = 'main';
    currentScene.value = targetScene;
    
    showToast(`成功添加 ${cards.length} 个卡片到场景：${targetScene.name}`, 'success');
  } catch (error) {
    console.error('转换卡片失败:', error);
    showToast('转换卡片失败: ' + error.message, 'error');
  }
};

// 添加即时保存函数
const saveImmediately = async () => {
  try 
  {
    // 保存场景数据到本地存储
    localStorage.setItem('scenes', JSON.stringify(scenes.value))
    
    // 保存当前场景ID
    if (currentScene.value) {
      localStorage.setItem('currentSceneId', currentScene.value.id.toString())
    }

    // 保存其他相关数据
    localStorage.setItem('prompts', JSON.stringify(prompts.value))
    localStorage.setItem('tags', JSON.stringify(tags.value))
    localStorage.setItem('models', JSON.stringify(models.value))
    
    // 保存配置数据
    const config = {
      models: models.value,
      notepadContent: notepadInitialContent.value,
      currentSceneId: currentScene.value?.id,
      selectedTags: selectedTags.value,
      currentView: currentView.value
    }
    localStorage.setItem('config', JSON.stringify(config))

    // 如果有后端API，也同步到后端
    try {
      await dataService.syncToBackend({
        scenes: scenes.value,
        prompts: prompts.value,
        tags: tags.value,
        config
      })
    } catch (backendError) {
      console.warn('后端同步失败，但本地保存成功:', backendError)
    }

  }
   catch (error) {
    console.error('保存数据失败:', error)
    showToast('保存失败: ' + error.message, 'error')
    throw error
  }
}

// 修改场景切换方法
const switchScene = (scene) => {
  try {
    if (!scene || !scene.id) {
      throw new Error('无效的场景')
    }
    
    // 更新当前场景
    currentScene.value = scene
    
    // 保存当前场景ID到本地存储
    localStorage.setItem('currentSceneId', scene.id.toString())
    
    return true
  } catch (error) {
    console.error('切换场景失败:', error)
    showToast('切换场景失败: ' + error.message, 'error')
    return false
  }
}
</script>

<style scoped>
@import url("./styles/app.css");
@import url("./styles/common.css");
</style> 