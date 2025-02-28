<template>
  <div class="book-splitter">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载中，请稍候主人~</p>
    </div>
    <div class="header">
      <div class="left-actions">
        <button @click="addScene" class="add-tab-btn">
          <i class="fas fa-plus"></i> 新建场景
        </button>
        <button @click="clearAllScenes" class="clear-btn">
          <i class="fas fa-trash"></i> 清空所有
        </button>
        <label class="import-btn">
          <input 
            type="file" 
            accept=".json"
            @change="importResults"
            ref="importFileInput"
          >
          <i class="fas fa-file-import"></i> 导入结果
        </label>
      </div>
      <div class="scene-tabs">
        <div 
          v-for="scene in scenes" 
          :key="scene.id" 
          class="scene-tab"
          :class="{ active: currentSceneId === scene.id }"
          @click="switchScene(scene.id)"
        >
          <input 
            v-model="scene.name" 
            placeholder="场景名称"
            @input="saveScenes"
            @click.stop
          />
          <button 
            @click.stop="deleteScene(scene.id)" 
            class="delete-tab-btn"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="scene-content" v-if="currentScene">
      <div class="scene-header">
        <div class="scene-actions">
          <button class="upload-btn">
            <input 
              type="file" 
              accept=".txt"
              @change="(e) => handleBookUpload(e, currentScene)"
              ref="fileInput"
            >
            <i class="fas fa-book"></i> 上传小说
          </button>
          <button 
            @click="exportResults(currentScene)"
            :disabled="!currentScene.resultCards.length"
            class="export-btn"
          >
            <i class="fas fa-file-export"></i> 导出结果
          </button>
        </div>
      </div>

      <!-- 原有的场景内容 -->
      <div class="main-content">
        <!-- 原文场景 -->
        <div class="scene original-scene">
          <h3>原文章节 ({{ currentScene.originalCards.length }}章)</h3>
          <div class="cards-container">
            <div 
              v-for="card in currentScene.originalCards" 
              :key="card.id"
              class="text-card"
            >
              <div class="card-header">
                <span class="chapter-number">#{{ card.chapterNumber }}</span>
                <input 
                  v-model="card.title" 
                  placeholder="章节标题"
                  @input="saveScenes"
                />
                <button 
                  @click="processChapter(card, currentScene)"
                  class="process-btn"
                  :disabled="!canProcessChapter(currentScene)"
                >
                  处理本章
                </button>
              </div>
              <textarea 
                v-model="card.content" 
                placeholder="章节内容"
                readonly
              ></textarea>
            </div>
          </div>
        </div>

        <!-- 提示词处理区 -->
        <div class="prompt-panel">
          <h3>提示词处理</h3>
          <div class="prompt-selector">
            <select 
              v-model="currentScene.selectedPromptId"
              @change="saveScenes"
            >
              <option value="">选择提示词</option>
              <option 
                v-for="prompt in prompts" 
                :key="prompt.id"
                :value="prompt.id"
              >
                #{{ prompt.sequence }} - {{ prompt.title }}
              </option>
            </select>
            
            <div class="model-select" v-if="getSelectedPrompt(currentScene)">
              <select 
                v-model="getSelectedPrompt(currentScene).selectedModel"
                @change="saveScenes"
              >
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

            <div class="processing-status" v-if="currentScene.processing">
              <div>正在处理 #{{ currentScene.originalCards[currentScene.currentIndex]?.chapterNumber }}/{{ currentScene.originalCards.length }} 章</div>
              <div class="progress-bar">
                <div 
                  class="progress" 
                  :style="{ width: `${(currentScene.currentIndex / currentScene.originalCards.length) * 100}%` }"
                ></div>
              </div>
            </div>

            <div class="prompt-actions">
              <button 
                @click="cancelPromptSelection"
                class="cancel-btn"
                :disabled="!currentScene.processing"
              >
                终止处理
              </button>
              <button 
                @click="() => processWithPrompt(currentScene)"
                :disabled="!canProcess(currentScene) || currentScene.processing"
                class="confirm-btn"
              >
                {{ currentScene.processing ? '处理中...' : '开始处理' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 结果场景 -->
        <div class="scene result-scene">
          <h3>
            处理结果 ({{ currentScene.resultCards.length }}章)
            <div class="result-actions" v-if="currentScene.resultCards.length">
              <label class="select-all">
                <input 
                  type="checkbox" 
                  v-model="allResultsSelected"
                  @change="toggleAllResults"
                />
                全选
              </label>
              <button 
                @click="convertSelectedToCards"
                class="convert-selected-btn"
                :disabled="!hasSelectedResults"
              >
                <i class="fas fa-share-square"></i> 转换选中
              </button>
              <button 
                @click="deleteSelectedResults"
                class="delete-selected-btn"
                :disabled="!hasSelectedResults"
              >
                <i class="fas fa-trash"></i> 删除选中
              </button>
            </div>
          </h3>
          <div class="cards-container">
            <div 
              v-for="card in currentScene.resultCards" 
              :key="card.id"
              class="text-card"
            >
              <div class="card-header">
                <input 
                  type="checkbox" 
                  v-model="card.selected"
                  @change="updateResultSelection"
                />
                <span class="chapter-number">{{ card.originalNumber }}</span>
                <span class="prompt-info">{{ card.title }}</span>
                <div class="card-actions">
                  <button 
                    @click="deleteResult(card)"
                    class="action-btn delete-btn"
                  >
                    <i class="fas fa-trash"></i> 删除
                  </button>
                  <button 
                    @click="reprocessChapter(card, currentScene)"
                    class="action-btn"
                    :disabled="currentScene.processing && !currentScene.isPaused"
                  >
                    <i class="fas fa-redo"></i> 重新处理
                  </button>
                  <button 
                    @click="convertToCard(card)"
                    class="action-btn"
                  >
                    <i class="fas fa-share-square"></i> 转为卡片
                  </button>
                </div>
              </div>
              <textarea 
                v-model="card.content"
                readonly
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加场景选择模态框 -->
    <div v-if="showSceneSelector" class="scene-selector-modal">
      <div class="modal-content">
        <h3>选择目标场景</h3>
        <select 
          v-model="selectedSceneId"
        >
          <option value="">请选择场景</option>
          <option 
            v-for="scene in props.scenes" 
            :key="scene.id" 
            :value="scene.id"
          >
            {{ scene.name || '未命名场景' }}
          </option>
        </select>
        <div class="modal-actions">
          <button @click="showSceneSelector = false">取消</button>
          <button 
            @click="confirmConversion"
            :disabled="!selectedSceneId"
          >
            确认转换
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { openDB } from 'idb'
import { useCommon } from '../utils/composables/useCommon'
import { showToast } from '../utils/common'
import { sendToModel } from '../utils/modelRequests'

// 定义 props
const props = defineProps({
  prompts: {
    type: Array,
    required: true
  },
  models: {
    type: Array,
    required: true
  },
  scenes: {
    type: Array,
    required: true
  }
})

const currentSceneId = ref(null)
const scenes = ref([])
const PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  STEPFUN: 'stepfun',
  MISTRAL: 'mistral'
}

// 修改 IndexedDB 相关常量和初始化
const DB_NAME = 'bookSplitterDB'
const DB_VERSION = 2  // 增加版本号，强制更新数据库结构
const STORE_NAME = 'bookScenes'

// 添加 delay 函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const isLoading = ref(true)

// 添加新的响应式数据
const allResultsSelected = ref(false)
const hasSelectedResults = computed(() => {
  return currentScene.value?.resultCards.some(card => card.selected)
})

// 定义 emit
const emit = defineEmits(['convert-to-cards'])

// 添加场景选择相关的响应式变量
const showSceneSelector = ref(false)
const selectedSceneId = ref(null)

// 使用 useCommon 组合式 API
const {
  exportData,
  importData,
  saveToStorage,
  loadFromStorage,
  formatTime,
  truncateText,
  createDebounce
} = useCommon()

// 添加数据序列化工具
const DataSerializer = {
  serializeScene(scene) {
    return {
      id: scene.id,
      name: scene.name,
      originalCards: scene.originalCards.map(card => ({
        id: card.id,
        chapterNumber: card.chapterNumber,
        title: card.title,
        content: card.content,
        selected: card.selected,
        uploadTime: card.uploadTime
      })),
      resultCards: scene.resultCards.map(card => ({
        id: card.id,
        originalNumber: card.originalNumber,
        promptSequence: card.promptSequence,
        content: card.content,
        promptId: card.promptId,
        title: card.title,
        selected: card.selected,
        updatedAt: card.updatedAt ? card.updatedAt.toISOString() : null
      })),
      selectedPromptId: scene.selectedPromptId,
      processing: false,
      isPaused: false,
      shouldStop: false,
      currentIndex: scene.currentIndex || 0
    }
  },

  deserializeScene(data) {
    return {
      ...data,
      resultCards: (data.resultCards || []).map(card => ({
        ...card,
        updatedAt: card.updatedAt ? new Date(card.updatedAt) : null,
        selected: false
      }))
    }
  }
}

// 重新添加 initializeDB 函数
const initializeDB = async () => {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          console.log('Created book scenes store')
        }
      }
    })
    console.log('数据库初始化成功')
    return db
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

// 修改 DBUtils，使用 initializeDB
const DBUtils = {
  async getDB() {
    return await initializeDB()
  },

  async saveData(scenes) {
    const db = await this.getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    await store.clear()
    
    // 序列化场景数据
    const serializedScenes = scenes.map(scene => DataSerializer.serializeScene(scene))
    
    for (const scene of serializedScenes) {
      await store.add(scene)
    }
    await tx.done
  },

  async loadData() {
    const db = await this.getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const scenes = await store.getAll()
    // 反序列化场景数据
    return scenes.map(scene => DataSerializer.deserializeScene(scene))
  }
}

// 修改 loadScenes 方法
const loadScenes = async () => {
  isLoading.value = true
  try {
    // 先从后端加载
    const response = await fetch('http://localhost:3000/api/load-book-scenes')
    if (!response.ok) {
      throw new Error('从服务器加载场景失败')
    }
    
    const loadedScenes = await response.json()
    
    if (loadedScenes.success && Array.isArray(loadedScenes.data)) {
      if (loadedScenes.data.length > 0) {
        scenes.value = loadedScenes.data.map(scene => 
          DataSerializer.deserializeScene(scene)
        )
        // 如果没有当前场景ID，设置为第一个场景
        if (!currentSceneId.value || !switchScene(currentSceneId.value)) {
          currentSceneId.value = scenes.value[0].id
        }
        
        // 同步到 IndexedDB
        try {
          await DBUtils.saveData(scenes.value)
        } catch (dbError) {
          console.error('同步到 IndexedDB 失败:', dbError)
        }
        
        showToast('已恢复保存的场景数据主人~', 'success')
      } else {
        // 如果没有场景，创建默认场景
        createNewScene()
      }
    } else {
      throw new Error('加载的场景数据格式不正确')
    }
  } catch (error) {
    console.error('加载场景失败:', error)
    
    // 尝试从 IndexedDB 加载
    try {
      const localScenes = await DBUtils.loadData()
      if (localScenes.length > 0) {
        scenes.value = localScenes
        if (!currentSceneId.value || !switchScene(currentSceneId.value)) {
          currentSceneId.value = localScenes[0].id
        }
        showToast('已从本地恢复场景数据主人~', 'success')
        return
      }
    } catch (dbError) {
      console.error('从 IndexedDB 加载失败:', dbError)
    }
    
    // 如果都失败了，创建默认场景
    createNewScene()
  } finally {
    isLoading.value = false
  }
}

// 修改创建默认场景的方法，确保新卡片包含 selected 属性
const createDefaultScene = () => {
  return {
    id: Date.now(),
    name: '默认场景',
    originalCards: [],
    resultCards: [],
    selectedPromptId: null,
    processing: false,
    isPaused: false,
    shouldStop: false
  }
}

// 确保在组件挂载前初始化数据库
let dbInitialized = false

onMounted(async () => {
  if (!dbInitialized) {
    try {
      await initializeDB()
      dbInitialized = true
      await loadScenes()
    } catch (error) {
      console.error('初始化失败:', error)
      showToast('初始化失败主人~，请刷新页面重试', 'error')
    }
  }
})

// 计算当前场景
const currentScene = computed(() => {
  return scenes.value.find(s => s.id === currentSceneId.value) || null
})

// 修改 saveScenes 方法
const saveScenes = createDebounce(async () => {
  try {
    // 序列化场景数据用于后端保存
    const serializedScenes = scenes.value.map(scene => DataSerializer.serializeScene(scene))

    // 保存到后端
    const response = await fetch('http://localhost:3000/api/save-book-scenes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serializedScenes)
    })

    if (!response.ok) {
      throw new Error('保存到服务器失败')
    }

    // 保存到 IndexedDB
    await DBUtils.saveData(scenes.value)
    showToast('保存成功主人~', 'success')
  } catch (error) {
    console.error('保存场景失败:', error)
    showToast('保存场景失败主人~，请重试', 'error')
  }
}, 500)

// 修改清空所有场景的方法
const clearAllScenes = async () => {
  if (confirm('确定要清空所有场景吗主人~？这个操作不能撤销哦！')) {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      })
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      
      await store.clear()
      await tx.done
      
      scenes.value = []
      addScene() // 添加一个新的空场景
      showToast('已清空所有场景主人~', 'success')
    } catch (error) {
      console.error('清空场景失败:', error)
      showToast('清空场景失败主人~', 'error')
    }
  }
}

// 获取选中的提示词
const getSelectedPrompt = (scene) => {
  return props.prompts.find(p => p.id === scene.selectedPromptId)
}

// 检查是否可以处理
const canProcess = (scene) => {
  const prompt = getSelectedPrompt(scene)
  return prompt && 
         prompt.selectedModel && 
         scene.originalCards.length > 0 && 
         !scene.processing
}

// 修改处理文件上传的方法
const handleBookUpload = async (event, scene) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    isLoading.value = true;
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/api/split-book', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '处理失败');
    }

    // 更新场景的原始卡片，注意这里使用 result.data.chapters
    scene.originalCards = result.data.chapters.map((chapter, index) => ({
      id: Date.now() + index,
      chapterNumber: chapter.chapterNumber || (index + 1),
      title: chapter.title || `第${index + 1}章`,
      content: chapter.content,
      selected: false,
      uploadTime: new Date().toISOString()
    }));

    // 清空文件输入
    event.target.value = '';
    
    // 保存场景数据
    await saveScenes();
    showToast(`成功导入 ${result.data.chapters.length} 个章节`, 'success');
  } catch (error) {
    console.error('文件处理错误:', error);
    showToast(error.message || '文件处理失败', 'error');
  } finally {
    isLoading.value = false;
  }
};


// 处理单个章节
const processChapter = async (card, scene) => {
  if (!canProcessChapter(scene)) {
    showToast('请先选择提示词和模型主人~', 'error')
    return
  }

  const prompt = getSelectedPrompt(scene)
  if (!prompt) {
    showToast('未找到选中的提示词主人~', 'error')
    return
  }

  const model = props.models.find(m => m.id === prompt.selectedModel)
  if (!model) {
    showToast('未找到选中的模型主人~', 'error')
    return
  }

  console.log('开始处理章节:', {
    chapterTitle: card.title,
    modelInfo: {
      provider: model.provider,
      modelId: model.modelId
    },
    promptInfo: {
      title: prompt.title,
      template: prompt.template
    }
  })
  
  try {
    scene.processing = true
    const result = await processWithAPI(card, prompt, scene)
    
    // 更新或添加结果卡片
    const existingResultCard = scene.resultCards.find(rc => rc.originalNumber === card.chapterNumber)
    if (existingResultCard) {
      existingResultCard.content = result
      existingResultCard.updatedAt = new Date()
    } else {
      scene.resultCards.push({
        id: Date.now(),
        originalNumber: card.chapterNumber,
        promptSequence: prompt.sequence,
        content: result,
        promptId: prompt.id,
        title: card.title,
        updatedAt: new Date()
      })
    }

    await saveScenes()
    showToast(`第${card.chapterNumber}章处理完成主人~`, 'success')
    return result
  } catch (error) {
    console.error('处理章节失败:', error)
    showToast(`处理失败主人~: ${error.message}`, 'error')
    throw error
  } finally {
    scene.processing = false
  }
}

// 修改处理函数以支持多场景
const processWithPrompt = async (scene) => {
  if (!scene.selectedPromptId || scene.processing) return

  const prompt = props.prompts.find(p => p.id === scene.selectedPromptId)
  if (!prompt) {
    showToast('未找到选中的提示词主人~', 'error')
    return
  }

  // 如果已经在处理中，先重置状态
  if (scene.processing) {
    scene.processing = false
    scene.isPaused = false
    scene.shouldStop = false
    scene.currentIndex = 0
    await saveScenes()
    return
  }

  scene.processing = true
  scene.isPaused = false
  scene.shouldStop = false
  scene.currentIndex = 0

  // 获取选中的模型
  const model = props.models.find(m => m.id === prompt.selectedModel)
  if (!model) {
    showToast('未找到选中的模型主人~', 'error')
    scene.processing = false
    return
  }

  try {
    // 清空之前的结果
    scene.resultCards = []
    
    // 如果是阶跃星辰或Mistral模型，先等待2秒
    if (model.provider === 'stepfun' || model.provider === 'mistral') {
      await delay(2000)
    }

    // 开始处理所有章节
    for (let i = 0; i < scene.originalCards.length; i++) {
      if (scene.shouldStop || scene.isPaused) {
        break
      }

      const card = scene.originalCards[i]
      try {
        const result = await processWithAPI(card, prompt, scene)
        
        if (scene.shouldStop || scene.isPaused) {
          break
        }

        scene.resultCards.push({
          id: Date.now() + Math.random(),
          originalNumber: card.chapterNumber,
          promptSequence: prompt.sequence,
          content: result,
          promptId: prompt.id,
          title: card.title,
          updatedAt: new Date()
        })

        scene.currentIndex = i + 1
        await saveScenes()
        
        if (i < scene.originalCards.length - 1 && !scene.isPaused && !scene.shouldStop) {
          await delay(1500) // 添加延迟避免请求过快
        }

        showToast(`已完成第 ${i + 1}/${scene.originalCards.length} 章处理主人~`, 'success')
      } catch (error) {
        console.error(`处理章节 ${card.title} 失败:`, error)
        showToast(`处理章节 "${card.title}" 失败主人~: ${error.message}`, 'error')
        
        if (!confirm('是否继续处理下一章节主人~？')) {
          scene.shouldStop = true
          break
        }
      }
    }
  } catch (error) {
    console.error('处理过程发生错误:', error)
    showToast('处理过程发生错误主人~: ' + error.message, 'error')
  } finally {
    scene.processing = false
    scene.isPaused = false
    scene.shouldStop = false
    scene.currentIndex = 0
    await saveScenes()
  }
}

// 修改 processWithAPI 方法
const processWithAPI = async (card, prompt, scene) => {
  try {
    const model = props.models.find(m => m.id === prompt.selectedModel)
    if (!model) {
      throw new Error('未选择模型')
    }

    // 处理提示词模板
    const processedTemplate = (prompt.userPrompt || prompt.template || "").replace(/{{text}}/g, card.content)

    // 使用 sendToModel 发送请求
    const content = await sendToModel(
      model,
      processedTemplate,
      [], // 空的上下文数组
      null, // 不需要 abortController
      prompt.systemPrompt // 系统提示词
    )

    return content

  } catch (error) {
    console.error('API 请求错误:', error)
    throw new Error(`处理失败: ${error.message}`)
  }
}

// 导出结果
const exportResults = (scene) => {
  const exportData = {
    original: scene.originalCards.map(card => ({
      chapterNumber: card.chapterNumber,
      title: card.title,
      content: card.content
    })),
    results: scene.resultCards.map(card => ({
      originalNumber: card.originalNumber,
      promptSequence: card.promptSequence,
      content: card.content,
      promptId: card.promptId
    }))
  }
  
  exportData(exportData, 'book-processing-results')
}

// 导入结果
const importResults = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  importData(file, (importData) => {
    // 创建新场景
    const newScene = {
      id: Date.now(),
      name: '导入场景',
      originalCards: importData.original.map(card => ({
        id: Date.now() + Math.random(),
        chapterNumber: card.chapterNumber,
        title: card.title,
        content: card.content
      })),
      resultCards: importData.results.map(card => ({
        id: Date.now() + Math.random(),
        originalNumber: card.originalNumber,
        promptSequence: card.promptSequence,
        content: card.content,
        promptId: card.promptId
      })),
      selectedPromptId: '',
      processing: false,
      isPaused: false,
      currentIndex: importData.results.length
    }

    // 添加到场景列表
    scenes.value.push(newScene)
    currentSceneId.value = newScene.id
    saveScenes()

    // 清空文件输入
    event.target.value = ''
  })
}

// 添加重新处理单章的方法
const reprocessChapter = async (card, scene) => {
  const prompt = props.prompts.find(p => p.id === scene.selectedPromptId)
  if (!prompt) {
    alert('请先选择提示词')
    return
  }

  try {
    // 找到原始章节
    const originalCard = scene.originalCards.find(
      oc => oc.chapterNumber === card.originalNumber
    )
    if (!originalCard) {
      throw new Error('未找到原始章节')
    }

    // 处理章节
    const result = await processChapter(originalCard, scene)
    
    // 更新结果
    const index = scene.resultCards.findIndex(rc => rc.id === card.id)
    if (index !== -1) {
      scene.resultCards[index] = {
        ...card,
        content: result,
        updatedAt: new Date()
      }
      saveScenes()
    }

    showToast('重新处理完成', 'success')
  } catch (error) {
    console.error('重新处理失败:', error)
    showToast(`重新处理失败: ${error.message}`, 'error')
  }
}

// 修改单个卡片转换方法
const convertToCard = (card) => {
  // 显示场景选择器，并存储当前要转换的卡片
  showSceneSelector.value = true
  selectedSceneId.value = null
  
  // 存储要转换的单个卡片
  const cardToAdd = {
    id: Date.now() + Math.random(),
    title: card.title || `第${card.originalNumber}章`,
    content: card.content,
    height: '200px',
    tags: []
  }
  
  // 修改确认转换方法以处理单个卡片
  const confirmSingleCard = () => {
    if (!selectedSceneId.value) {
      showToast('请选择目标场景', 'error')
      return
    }

    emit('convert-to-cards', {
      cards: [cardToAdd],
      targetSceneId: Number(selectedSceneId.value)
    })
    
    showSceneSelector.value = false
    selectedSceneId.value = null
    showToast('已将章纲转换为卡片', 'success')
  }
  
  // 替换原有的确认方法
  confirmConversion.value = confirmSingleCard
}

// 修改批量转换方法
const convertSelectedToCards = () => {
  if (!currentScene.value) return
  
  const selectedCards = currentScene.value.resultCards.filter(card => card.selected)
  if (selectedCards.length === 0) {
    showToast('请选择要转换的章纲', 'warning')
    return
  }
  
  showSceneSelector.value = true
  selectedSceneId.value = null
  
  // 修改确认转换方法以处理多个卡片
  const confirmMultipleCards = () => {
    if (!selectedSceneId.value) {
      showToast('请选择目标场景', 'error')
      return
    }
    
    const cardsToAdd = selectedCards.map(card => ({
      id: Date.now() + Math.random(),
      title: card.title || `第${card.originalNumber}章`,
      content: card.content,
      height: '200px',
      tags: []
    }))

    emit('convert-to-cards', {
      cards: cardsToAdd,
      targetSceneId: Number(selectedSceneId.value)
    })
    
    showSceneSelector.value = false
    selectedSceneId.value = null
    showToast(`已将${selectedCards.length}个章纲转换为卡片`, 'success')
  }
  
  // 替换原有的确认方法
  confirmConversion.value = confirmMultipleCards
}

// 使用 ref 来存储当前的确认方法
const confirmConversion = ref(() => {})

// 添加 addScene 方法
const addScene = () => {
  const newScene = {
    id: Date.now(),
    name: `新场景 ${scenes.value.length + 1}`,
    originalCards: [],
    resultCards: [],
    selectedPromptId: null,
    processing: false,
    isPaused: false
  }
  scenes.value.push(newScene)
  currentSceneId.value = newScene.id
  saveScenes()
}

const deleteScene = async (sceneId) => {
  try {
    const index = scenes.value.findIndex(s => s.id === sceneId)
    if (index === -1) {
      throw new Error('场景不存在主人~')
    }

    // 如果只剩一个场景，不允许删除
    if (scenes.value.length <= 1) {
      throw new Error('至少需要保留一个场景主人~')
    }

    // 如果要删除的是当前场景，先切换到其他场景
    if (currentSceneId.value === sceneId) {
      const nextScene = scenes.value[index + 1] || scenes.value[index - 1]
      currentSceneId.value = nextScene.id
    }

    // 从数组中移除场景
    scenes.value.splice(index, 1)
    await saveScenes()
    showToast('场景已删除主人~', 'success')
  } catch (error) {
    console.error('删除场景失败:', error)
    showToast(error.message, 'error')
  }
}

// 添加场景切换方法
const switchScene = (sceneId) => {
  const scene = scenes.value.find(s => s.id === sceneId)
  if (scene) {
    currentSceneId.value = sceneId
    // 重置处理状态
    scene.processing = false
    scene.isPaused = false
    scene.shouldStop = false
    return true
  }
  return false
}

// 修改 canProcess 方法为 canProcessChapter
const canProcessChapter = (scene) => {
  const prompt = getSelectedPrompt(scene)
  return prompt && 
         prompt.selectedModel && 
         !scene.processing
}

// 添加全选/取消全选方法
const toggleAllResults = () => {
  if (!currentScene.value) return
  currentScene.value.resultCards.forEach(card => {
    card.selected = allResultsSelected.value
  })
  saveScenes()
}

// 更新选择状态
const updateResultSelection = () => {
  if (!currentScene.value) return
  allResultsSelected.value = currentScene.value.resultCards.every(card => card.selected)
  saveScenes()
}

// 删除单个结果
const deleteResult = async (card) => {
  if (!currentScene.value) return
  if (confirm('确定要删除这个处理结果吗主人~？')) {
    const index = currentScene.value.resultCards.findIndex(c => c.id === card.id)
    if (index !== -1) {
      currentScene.value.resultCards.splice(index, 1)
      await saveScenes()
      showToast('已删除处理结果主人~', 'success')
    }
  }
}

// 删除选中的结果
const deleteSelectedResults = async () => {
  if (!currentScene.value) return
  if (!hasSelectedResults.value) return
  
  if (confirm('确定要删除选中的处理结果吗主人~？')) {
    currentScene.value.resultCards = currentScene.value.resultCards.filter(card => !card.selected)
    allResultsSelected.value = false
    await saveScenes()
    showToast('已删除选中的处理结果主人~', 'success')
  }
}

// 修改取消选择的方法为终止处理
const cancelPromptSelection = async () => {
  if (!currentScene.value) return
  
  if (currentScene.value.processing) {
    currentScene.value.shouldStop = true
    currentScene.value.processing = false
    currentScene.value.isPaused = false
    currentScene.value.currentIndex = 0
    await saveScenes()
    showToast('已终止处理主人~', 'success')
  }
}

// 修改创建新场景的方法
const createNewScene = () => {
  const newScene = {
    id: Date.now(),
    name: `拆书场景 ${scenes.value.length + 1}`,
    originalCards: [],
    resultCards: [],
    selectedPromptId: null,
    processing: false,
    isPaused: false,
    shouldStop: false,
    currentIndex: 0
  }
  
  scenes.value.push(newScene)
  currentSceneId.value = newScene.id
  saveScenes() // 保存新场景
  return newScene
}

// 添加场景列表的计算属性
const sceneList = computed(() => {
  return scenes.value.map(scene => ({
    id: scene.id,
    name: scene.name
  }))
})

// 导出必要的方法和属性
defineExpose({
  createNewScene,
  switchScene,
  currentScene,
  sceneList,
  scenes,
  currentSceneId
})

// 监听场景变化并保存
watch([scenes, currentSceneId], async () => {
  if (scenes.value.length > 0) {
    await saveScenes()
  }
}, { deep: true })
</script>

<style scoped>
@import url("../styles/bookSplitter.css");

.scene-selector-modal {
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
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 