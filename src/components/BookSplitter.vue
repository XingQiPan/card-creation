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
    <div v-if="showMoveModal" class="modal" @click="closeMoveModal">
      <div class="modal-content" @click.stop>
        <h3>选择目标场景</h3>
        <div class="scene-list">
          <div v-if="props.scenes && props.scenes.length > 0">
            <div 
              v-for="scene in props.scenes"
              :key="scene.id"
              class="scene-item"
              @click="moveCardToScene(scene)"
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { openDB } from 'idb'

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

// 添加 IndexedDB 相关常量
const DB_NAME = 'bookSplitterDB'
const DB_VERSION = 1
const STORE_NAME = 'scenes'

// 添加 delay 函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const isLoading = ref(true)

const allChaptersSelected = ref(false)
const hasSelectedChapters = computed(() => {
  return currentScene.value?.originalCards.some(card => card.selected)
})

// 添加新的响应式数据
const allResultsSelected = ref(false)
const hasSelectedResults = computed(() => {
  return currentScene.value?.resultCards.some(card => card.selected)
})

// 修改 loadScenes 方法
const loadScenes = async () => {
  isLoading.value = true
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const loadedScenes = await store.getAll()
    
    if (loadedScenes.length > 0) {
      // 反序列化日期等数据
      scenes.value = loadedScenes.map(scene => ({
        ...scene,
        resultCards: scene.resultCards.map(card => ({
          ...card,
          updatedAt: card.updatedAt ? new Date(card.updatedAt) : null
        }))
      }))
      currentSceneId.value = loadedScenes[0].id
      showToast('已恢复保存的场景数据主人~', 'success')
    } else {
      const defaultScene = createDefaultScene()
      scenes.value = [defaultScene]
      currentSceneId.value = defaultScene.id
      await saveScenes()
    }
  } catch (error) {
    console.error('加载场景失败:', error)
    showToast('加载场景失败主人~，已创建新场景', 'error')
    const defaultScene = createDefaultScene()
    scenes.value = [defaultScene]
    currentSceneId.value = defaultScene.id
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

// 修改 onMounted 钩子
onMounted(async () => {
  await loadScenes()
  // 确保视图更新
  await nextTick()
})

// 计算当前场景
const currentScene = computed(() => {
  return scenes.value.find(s => s.id === currentSceneId.value)
})

// 修改保存场景方法
const saveScenes = async () => {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // 序列化场景数据
    const serializedScenes = scenes.value.map(scene => ({
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
        updatedAt: card.updatedAt ? card.updatedAt.toISOString() : null
      })),
      selectedPromptId: scene.selectedPromptId,
      processing: false,
      isPaused: false,
      currentIndex: scene.currentIndex || 0
    }))

    // 清空存储并重新保存所有场景
    await store.clear()
    await Promise.all(serializedScenes.map(scene => store.add(scene)))
    await tx.done
  } catch (error) {
    console.error('保存场景失败:', error)
    showToast('保存场景失败主人~，请重试', 'error')
  }
}

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
    formData.append('sceneId', scene.id);

    const response = await fetch('http://localhost:3000/api/split-book', {
      method: 'POST',
      body: formData,
      // 不要设置 Content-Type header，让浏览器自动设置
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '处理失败');
    }

    // 更新场景的原始卡片
    scene.originalCards = result.chapters.map((chapter, index) => ({
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
    showToast(`成功导入 ${result.chapters.length} 个章节`, 'success');
  } catch (error) {
    console.error('文件处理错误:', error);
    showToast(error.message || '文件处理失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

// 修改暂停/继续功能
const toggleProcessing = (scene) => {
  scene.isPaused = !scene.isPaused
  if (!scene.isPaused) {
    processWithPrompt(scene) // 改用 processWithPrompt 替代 continueProcessing
  }
  saveScenes()
}

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

    // 使用 userPrompt 替代 template
    const processedTemplate = (prompt.userPrompt || prompt.template || "").replace(/{{text}}/g, card.content)
    const messages = [
      {
        role: "user",
        content: processedTemplate
      }
    ]

    // 如果存在 systemPrompt，添加到消息中
    if (prompt.systemPrompt) {
      messages.unshift({
        role: "system",
        content: prompt.systemPrompt
      });
    }

    let response
    let result

    // 构建基础请求配置
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    }

    // 根据不同提供商处理请求
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
        response = await fetch(`${model.apiUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({
            model: model.modelId,
            messages: messages,
            max_tokens: Number(model.maxTokens),
            temperature: Number(model.temperature)
          })
        })
        break

      case 'custom': // 直接使用提供的 URL，不附加路径
        response = await fetch(model.apiUrl, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({
            model: model.modelId,
            messages: messages,
            max_tokens: Number(model.maxTokens),
            temperature: Number(model.temperature)
          })
        })
        break

      case 'gemini':
        response = await fetch(`${model.apiUrl}?key=${model.apiKey}`, {
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
              temperature: Number(model.temperature),
              maxOutputTokens: Number(model.maxTokens)
            }
          })
        })
        break

      default:
        throw new Error(`不支持的模型提供商: ${model.provider}`)
    }

    // 检查响应状态
    if (!response || !response.ok) {
      const errorData = await response?.json().catch(() => ({}))
      console.error('API Error Response:', errorData)
      
      // 处理错误响应
      let errorMessage = '请求失败'
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message
        } else if (errorData.error.code) {
          errorMessage = `服务器错误 (${errorData.error.code})`
        }
      }
      throw new Error(`${errorMessage}: ${response?.status || 'Unknown Error'}`)
    }

    result = await response.json()
    
    // 解析不同提供商的响应
    switch (model.provider) {
      case 'openai':
      case 'stepfun':
      case 'mistral':
      case 'custom':
        return result.choices[0].message.content
      case 'gemini':
        return result.candidates[0].content.parts[0].text
      default:
        throw new Error(`不支持的模型提供商: ${model.provider}`)
    }

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

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'book-processing-results.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 添加导入结果的方法
const importResults = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const content = await file.text()
    const importData = JSON.parse(content)
    
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
      currentIndex: importData.results.length // 设置为已处理的章节数
    }

    // 添加到场景列表
    scenes.value.push(newScene)
    currentSceneId.value = newScene.id
    saveScenes()

    // 清空文件输入
    event.target.value = ''
    
  } catch (error) {
    console.error('导入错误:', error)
    alert('导入失败: ' + error.message)
  }
}

// 添加显示提示消息的方法
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

// 修改转换为卡片的方法
const showMoveModal = ref(false)
const cardToMove = ref(null)

const convertToCard = (card) => {
  cardToMove.value = {
    id: Date.now(),
    title: card.title || `第${card.originalNumber}章`, // 使用章节标题
    content: card.content,
    height: '200px',
    tags: [],
    insertedContents: []
  }
  showMoveModal.value = true
}

const moveCardToScene = (scene) => {
  if (!cardToMove.value) return
  
  // 添加到选中的场景
  scene.cards.push(cardToMove.value)
  
 // 关闭模态框
  showMoveModal.value = false
  cardToMove.value = null
  
  // 显示成功提示
  showToast('已添加到场景：' + scene.name, 'success')
}

const closeMoveModal = () => {
  showMoveModal.value = false
  cardToMove.value = null
}

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
  currentSceneId.value = sceneId
  saveScenes()
}

// 修改 canProcess 方法为 canProcessChapter
const canProcessChapter = (scene) => {
  const prompt = getSelectedPrompt(scene)
  return prompt && 
         prompt.selectedModel && 
         !scene.processing
}

// 添加终止处理的方法
const stopProcessing = async (scene) => {
  scene.processing = false
  scene.isPaused = false
  scene.currentIndex = 0
  scene.shouldStop = true // 添加终止标记
  await saveScenes()
  showToast('已终止处理主人~', 'success')
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
</script>

<style scoped>
@import url("../styles/bookSplitter.css");
</style> 