<template>
  <div class="container">
    <!-- 添加视图切换按钮 -->
    <div class="view-switcher">
      <button 
        @click="currentView = 'main'"
        :class="{ active: currentView === 'main' }"
      >
        <i class="fas fa-columns"></i> 主界面
      </button>
      <button 
        @click="currentView = 'bookSplitter'"
        :class="{ active: currentView === 'bookSplitter' }"
      >
        <i class="fas fa-book-open"></i> 拆书工具
      </button>
    </div>

    <!-- 主界面内容 -->
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
                <span v-if="prompt.template.length > 200" class="show-more">
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
        />
      </div>
    </div>

    <!-- 拆书工具界面 -->
    <BookSplitter 
      v-else-if="currentView === 'bookSplitter'"
      :prompts="prompts"
      :models="models"
    />

    <!-- 提示词选择模态框 -->
    <div v-if="showPromptSelectModal" class="modal">
      <div class="modal-content">
        <h3>选择要插入的提示词</h3>
        <div class="prompt-select-list">
          <div 
            v-for="prompt in insertablePrompts"
            :key="prompt.id"
            class="prompt-select-item"
            @click="insertPromptToCard(prompt)"
          >
            <h4>{{ prompt.title }}</h4>
            <p>{{ prompt.template }}</p>
            <div class="prompt-slots">
              <span>需要插入 {{ getInsertCount(prompt.template) }} 个文本</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="showPromptSelectModal = false">取消</button>
        </div>
      </div>
    </div>

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
                  </select>
                </div>
                <div class="form-group">
                  <label>API 地址</label>
                  <input v-model="model.apiUrl" placeholder="API 地址"/>
                </div>
                <div class="form-group">
                  <label>模型标识</label>
                  <input v-model="model.modelId" placeholder="如：deepseek-ai/DeepSeek-V3"/>
                </div>
                <div class="form-group">
                  <label>API Key</label>
                  <input v-model="model.apiKey" type="password" placeholder="API Key"/>
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

    <!-- 提示消息 -->
    <div class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
        <div class="toast-icon">
          <i :class="toast.icon"></i>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import draggable from 'vuedraggable'
import Scene from './components/Scene.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import BookSplitter from './components/BookSplitter.vue'

// 状态管理
const prompts = ref([])
const textCards = ref([])
const selectedCards = ref([])
const selectedPrompt = ref(null)
const showPromptModal = ref(false)
const showPromptSelectModal = ref(false)
const editingPrompt = ref(null)
const currentEditingCard = ref(null)
const drag = ref(false)
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
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    modelId: 'gpt-3.5-turbo',
    maxTokens: 512,
    temperature: 0.7
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    apiKey: '',
    modelId: 'gemini-1.5-flash',
    maxTokens: 512,
    temperature: 0.7
  }
])
const promptPanelWidth = ref(300) // 默认宽度
const showPromptDetailModal = ref(false)
const showCardDetailModal = ref(false)
const selectedCard = ref(null)
const showSuccessNotification = ref(false)
let isResizing = false
let startX = 0
let startWidth = 0

// 场景相关状态
const scenes = ref([])
const currentScene = ref(null)

// 添加标签相关的状态
const tags = ref([]) // 所有可用的标签
const selectedTags = ref([]) // 当前选中的标签过滤器
const showTagModal = ref(false) // 控制标签管理模态框
const newTagName = ref('') // 新标签名称

// 提示消息相关状态
const toasts = ref([])

// 添加拖拽状态
const dragScene = ref(false)

const isPreview = ref(false)
const editorTextarea = ref(null)

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

// 加载模型配置
onMounted(() => {
  const savedModels = localStorage.getItem('aiModels')
  if (savedModels) {
    models.value = JSON.parse(savedModels).map(model => {
      // 确保移除已保存模型中可能存在的 /chat/completions
      model.apiUrl = model.apiUrl.replace(/\/chat\/completions$/, '').replace(/\/$/, '')
      return model
    })
  }

  // 确保所有提示词都有必要的属性
  prompts.value = prompts.value.map(prompt => ({
    ...prompt,
    insertedContents: prompt.insertedContents || [],
    selectedModel: prompt.selectedModel || prompt.defaultModel || ''
  }))

  // 初始化场景
  const savedScenes = localStorage.getItem('scenes')
  if (savedScenes) {
    scenes.value = JSON.parse(savedScenes)
    if (scenes.value.length > 0) {
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

  // 在 onMounted 中加载标签
  const savedTags = localStorage.getItem('tags')
  if (savedTags) {
    tags.value = JSON.parse(savedTags)
  }

  // 加载已保存的提示词
  const savedPrompts = localStorage.getItem('prompts')
  if (savedPrompts) {
    prompts.value = JSON.parse(savedPrompts)
  }
})

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

const getRemainingInserts = () => {
  if (!selectedPrompt.value) return 0
  return getInsertCount(selectedPrompt.value.template) - selectedCards.value.length
}

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
    selectedModel: ''
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
    selectedModel: promptForm.value.defaultModel
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

const deleteCard = (id) => {
  // 从 textCards 中删除
  textCards.value = textCards.value.filter(card => card.id !== id)
  // 从 selectedCards 中删除
  selectedCards.value = selectedCards.value.filter(cardId => cardId !== id)
  // 从当前场景的 cards 中删除
  if (currentScene.value) {
    currentScene.value.cards = currentScene.value.cards.filter(card => card.id !== id)
  }
}

const clearSelection = () => {
  selectedCards.value = []
  selectedPrompt.value = null
}

// 定义提供商类型
const PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini'
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
    let keywordsList = [] // 存储检测到的关键词

    // 检查插入内容中的关键词
    if (prompt.insertedContents?.length > 0) {
      // 获取所有关键词标签
      const keywordTags = tags.value.filter(tag => tag.isKeyword)
      
      // 遍历所有插入的内容
      prompt.insertedContents.forEach(content => {
        // 查找对应的卡片
        const card = currentScene.value.cards.find(c => c.content === content)
        if (card && card.tags) {
          // 只有当卡片包含关键词标签时，才将其标题作为关键词
          keywordTags.forEach(tag => {
            if (card.tags.includes(tag.id)) {
              keywordsList.push(card.title)
            }
          })
        }
      })

      // 替换模板中的占位符
      prompt.insertedContents.forEach(content => {
        processedTemplate = processedTemplate.replace('{{text}}', content)
      })
    }

    // 去重关键词
    keywordsList = [...new Set(keywordsList)]

    // 如果有关键词，添加到提示词开头
    if (keywordsList.length > 0) {
      processedTemplate = `关键词：${keywordsList.join('、')}\n\n${processedTemplate}`
    }

    let response
    let content

    if (model.provider === PROVIDERS.OPENAI) {
      response = await fetch(`${model.apiUrl}/chat/completions`, {
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
      
      const result = await response.json()
      content = result.choices?.[0]?.message?.content
      
    } else if (model.provider === PROVIDERS.GEMINI) {
      const url = `${model.apiUrl}?key=${model.apiKey}`
      response = await fetch(url, {
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
      
      const result = await response.json()
      content = result.candidates?.[0]?.content?.parts?.[0]?.text
    }

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
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

    showToast('发送成功')
    
    // 清理状态
    prompt.insertedContents = []
    prompt.selectedModel = prompt.defaultModel || ''

  } catch (error) {
    console.error('API 请求错误:', error)
    showToast(error.message, 'error')
  }
}

const insertSelectedCards = () => {
  if (!selectedPrompt.value || !canInsertSelected()) return

  let resultTemplate = selectedPrompt.value.template
  const selectedTexts = selectedCards.value.map(id =>
    textCards.value.find(card => card.id === id)?.content
  )

  selectedTexts.forEach(text => {
    resultTemplate = resultTemplate.replace('{{text}}', text)
  })

  textCards.value.push({
    id: Date.now(),
    content: resultTemplate,
    isResult: true
  })

  clearSelection()
}


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
  
  const blob = new Blob([jsonl], { type: 'application/x-jsonl' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cards.jsonl'
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
  models.value.push(createDefaultModel())
}

const deleteModel = (id) => {
  models.value = models.value.filter(model => model.id !== id)
  saveModels()
}

const saveModels = () => {
  // 验证所有模型的基础 URL
  const invalidModels = models.value.filter(model => !validateApiUrl(model.apiUrl))
  if (invalidModels.length > 0) {
    alert('请检查 API 地址格式，确保以 https:// 开头')
    return
  }
  
  localStorage.setItem('aiModels', JSON.stringify(models.value))
  alert('保存成功')
}

// 添加 API URL 验证
const validateApiUrl = (url) => {
  return url.startsWith('https://')
}

// 修改创建默认模型的方法
const createDefaultModel = () => ({
  id: Date.now(),
  name: '',
  apiUrl: 'https://api.siliconflow.cn/v1', // 移除 /chat/completions
  modelId: 'deepseek-ai/DeepSeek-V3',
  apiKey: '',
  maxTokens: 512,
  temperature: 0.7
})

// 修改默认的 Gemini 模型配置
const defaultGeminiModel = {
  id: 'gemini',
  name: 'Gemini',
  provider: PROVIDERS.GEMINI,
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', // 修正 URL
  modelId: 'gemini-1.5-pro',
  apiKey: '',
  maxTokens: 512,
  temperature: 0.7
}

// 在 onMounted 中初始化模型
onMounted(() => {
  // 加载保存的模型
  const savedModels = localStorage.getItem('aiModels')
  if (savedModels) {
    models.value = JSON.parse(savedModels)
  } else {
    // 如果没有保存的模型，添加默认模型
    models.value = [createDefaultModel(), defaultGeminiModel]
  }
  
  // 确保所有提示词都有必要的属性
  prompts.value = prompts.value.map(prompt => ({
    ...prompt,
    insertedContents: prompt.insertedContents || [],
    selectedModel: prompt.selectedModel || prompt.defaultModel || ''
  }))

  // 初始化场景
  const savedScenes = localStorage.getItem('scenes')
  if (savedScenes) {
    scenes.value = JSON.parse(savedScenes)
    if (scenes.value.length > 0) {
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

  // 加载已保存的提示词
  const savedPrompts = localStorage.getItem('prompts')
  if (savedPrompts) {
    prompts.value = JSON.parse(savedPrompts)
  }

  // 在组件挂载时加载标签
  loadTags()
})

// 处理 API 地址输入
const handleApiUrlInput = (event, model) => {
  let url = event.target.value
  // 移除末尾的 /chat/completions（如果有）
  url = url.replace(/\/chat\/completions$/, '')
  // 移除末尾的斜杠（如果有）
  url = url.replace(/\/$/, '')
  model.apiUrl = url
}

// 获取完整的 API 地址
const getFullApiUrl = (baseUrl) => {
  return `${baseUrl}/chat/completions`
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
const createNewScene = () => {
  const newScene = {
    id: Date.now(),
    name: `场景 ${scenes.value.length + 1}`,
    cards: []
  }
  scenes.value.push(newScene)
  currentScene.value = newScene
  saveScenes()
}

const switchScene = (scene) => {
  currentScene.value = scene
}

const deleteScene = (sceneId) => {
  if (!confirm('确定要删除这个场景吗？')) return
  
  const index = scenes.value.findIndex(s => s.id === sceneId)
  if (index !== -1) {
    scenes.value.splice(index, 1)
    if (currentScene.value.id === sceneId) {
      currentScene.value = scenes.value[0]
    }
    saveScenes()
  }
}

// 保存场景到本地存储
const saveScenes = () => {
  localStorage.setItem('scenes', JSON.stringify(scenes.value))
}

// 监听场景变化并保存
watch([() => scenes.value, () => currentScene.value], () => {
  saveScenes()
}, { deep: true })

// 添加场景名称编辑功能
const editSceneName = (scene) => {
  const newName = prompt('请输入新的场景名称:', scene.name)
  if (newName && newName.trim()) {
    scene.name = newName.trim()
    saveScenes() // 保存更改
  }
}

// 保存提示词到本地存储
const savePrompts = () => {
  localStorage.setItem('prompts', JSON.stringify(prompts.value))
}

// 监听提示词变化并保存
watch(() => prompts.value, savePrompts, { deep: true })

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

// 保存标签到本地存储
const saveTags = () => {
  localStorage.setItem('tags', JSON.stringify(tags.value))
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

// 添加视图切换状态
const currentView = ref('main')
</script>

<style scoped>
.container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.prompt-panel {
  position: relative;
  min-width: 300px;
  max-width: 800px;
  border-right: 1px solid #ddd;
  background: white;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
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
  width: 100%;
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

input, textarea {
  width: 90%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

textarea.template-input {
  min-height: 200px !important;
  font-family: monospace;
  white-space: pre-wrap;
}

.prompt-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: grab;
  position: relative;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.prompt-item:hover .prompt-actions {
  opacity: 1;
}

.prompt-actions {
  position: absolute;
  right: 8px;
  top: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.prompt-info {
  font-size: 0.8em;
  color: #666;
  margin-top: 8px;
}

.selected-info {
  display: flex;
  gap: 16px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.prompt-item.has-content {
  border-left: 4px solid #646cff;
}

.inserted-contents {
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.inserted-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  margin-bottom: 4px;
  background: white;
  border-radius: 4px;
  font-size: 0.9em;
}

.inserted-content button {
  padding: 2px 4px;
  background: none;
  border: none;
  color: #ff4444;
  cursor: pointer;
}

.send-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.send-btn:hover {
  background: #059669;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.edit-btn:hover {
  color: #646cff;
  background: rgba(100,108,255,0.1);
}

.delete-btn:hover {
  color: #dc3545;
  background: #fee2e2;
}

.settings-modal {
  width: 800px;
  max-width: 90vw;
  height: auto;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-top: 0;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.model-item {
  position: relative;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #eee;
}

.model-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group {
  justify-content: center;
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  color: #666;
  font-size: 0.9em;
}

.form-group input {
  width: 80%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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
  width: 100%;
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
  max-width: 1200px;
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
  width: 100%;
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
</style> 
