<template>
  <div class="book-splitter">
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

            <div class="process-buttons">
              <button 
                @click="() => processWithPrompt(currentScene)"
                :disabled="!canProcess(currentScene)"
                v-if="!currentScene.processing"
              >
                <i class="fas fa-play"></i> 开始处理
              </button>
              <button 
                @click="() => toggleProcessing(currentScene)"
                class="process-control"
                v-else
              >
                <i :class="currentScene.isPaused ? 'fas fa-play' : 'fas fa-pause'"></i>
                {{ currentScene.isPaused ? '继续处理' : '暂停处理' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 结果场景 -->
        <div class="scene result-scene">
          <h3>处理结果 ({{ currentScene.resultCards.length }}章)</h3>
          <div class="cards-container">
            <div 
              v-for="card in currentScene.resultCards" 
              :key="card.id"
              class="text-card"
            >
              <div class="card-header">
                <span class="chapter-number">{{ card.originalNumber }}</span>
                <span class="prompt-info">{{ card.title }}</span>
                <div class="card-actions">
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
import { ref, computed, onMounted } from 'vue'
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
  GEMINI: 'gemini'
}

// 添加 IndexedDB 相关常量
const DB_NAME = 'bookSplitterDB'
const DB_VERSION = 1
const STORE_NAME = 'scenes'

// 添加 delay 函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 初始化 IndexedDB
const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
  return db
}

// 计算当前场景
const currentScene = computed(() => {
  return scenes.value.find(s => s.id === currentSceneId.value)
})

// 修改保存场景的方法，确保对象可以被克隆
const saveScenes = async () => {
  try {
    const db = await initDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    // 清除所有现有数据
    await store.clear()
    
    // 保存所有场景，确保对象可以被克隆
    for (const scene of scenes.value) {
      // 创建一个可以被克隆的场景对象
      const cloneableScene = JSON.parse(JSON.stringify({
        id: scene.id,
        name: scene.name,
        originalCards: scene.originalCards,
        resultCards: scene.resultCards,
        selectedPromptId: scene.selectedPromptId,
        processing: scene.processing,
        isPaused: scene.isPaused,
        currentIndex: scene.currentIndex
      }))
      
      await store.put(cloneableScene)
    }
    
    await tx.done
  } catch (error) {
    console.error('保存场景失败:', error)
  }
}

// 修改加载场景的方法
const loadScenes = async () => {
  try {
    const db = await initDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    const allScenes = await store.getAll()
    scenes.value = allScenes

    if (scenes.value.length > 0) {
      currentSceneId.value = scenes.value[0].id
    } else {
      addScene()
    }
  } catch (error) {
    console.error('加载场景失败:', error)
    // 如果加载失败，创建一个默认场景
    addScene()
  }
}

// 修改 onMounted 钩子
onMounted(() => {
  loadScenes()
})

// 修改清空所有场景的方法
const clearAllScenes = async () => {
  if (confirm('确定要清空所有场景吗？')) {
    try {
      const db = await initDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      
      await store.clear()
      await tx.done
      
      scenes.value = []
      addScene() // 添加一个新的空场景
    } catch (error) {
      console.error('清空场景失败:', error)
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

// 修改文件上传处理函数
const handleBookUpload = async (event, scene) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const content = await file.text()
    const chapters = splitIntoChapters(content)
    
    // 检查是否成功分割出章节
    if (chapters.length === 0) {
      showToast("未能识别到任何章节，请确保文件为 UTF-8 编码，并且包含类似 第X章 或 第X节 的章节标记。支持的章节格式示例：第一章 章节名、第1章 章节名、第一节 节名、 1. 章节名、 一、章节名"
        ,
        'error'
      )
    }
    
    scene.originalCards = chapters.map((chapter, index) => ({
      id: Date.now() + index,
      chapterNumber: index + 1,
      title: chapter.title,
      content: chapter.content
    }))

    event.target.value = ''
    saveScenes()
  } catch (error) {
    console.error('文件处理错误:', error)
    if (error instanceof Error) {
      alert(error.message)
    } else {
      alert('文件处理失败，请确保文件为 UTF-8 编码格式')
    }
  }
}

// 修改章节分割函数，增加更多章节标记的支持
const splitIntoChapters = (text) => {
  const chapters = []
  const lines = text.split('\n')
  let currentChapter = {
    title: '',
    content: [],
    chapterNumber: 0
  }
  
  // 扩展章节匹配模式
  const chapterPatterns = [
    /^第[一二三四五六七八九十百千]+[章节]/,  // 匹配"第一章"、"第二节"等
    /^第\d+[章节]/,  // 匹配"第1章"、"第2节"等
    /^[一二三四五六七八九十][、.．]/,  // 匹配"一、"、"二。"等
    /^\d+[、.．]/,  // 匹配"1、"、"2。"等
    /^[（(]\d+[)）]/  // 匹配"(1)"、"（2）"等
  ]
  
  const isChapterTitle = (line) => {
    // 检查行长度，避免匹配过长的段落
    if (line.length > 100) return false
    
    // 检查是否匹配任一章节模式
    return chapterPatterns.some(pattern => pattern.test(line))
  }
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    if (isChapterTitle(trimmedLine)) {
      // 保存上一章节
      if (currentChapter.title && currentChapter.content.length > 0) {
        chapters.push({
          ...currentChapter,
          content: currentChapter.content.join('\n')
        })
      }

      // 开始新章节
      currentChapter = {
        title: trimmedLine,
        content: [],
        chapterNumber: chapters.length + 1
      }
    } else {
      // 添加到当前章节内容
      if (currentChapter.title) {
        currentChapter.content.push(trimmedLine)
      }
    }
  }

  // 保存最后一章
  if (currentChapter.title && currentChapter.content.length > 0) {
    chapters.push({
      ...currentChapter,
      content: currentChapter.content.join('\n')
    })
  }

  return chapters
}

// 修改处理函数以支持多场景
const processWithPrompt = async (scene) => {
  if (!scene.selectedPromptId || scene.processing) return

  const prompt = props.prompts.find(p => p.id === scene.selectedPromptId)
  if (!prompt) {
    alert('未找到选中的提示词')
    return
  }

  scene.processing = true
  scene.isPaused = false
  scene.currentIndex = 0
  scene.resultCards = [] // 清空之前的结果

  await continueProcessing(scene)
  saveScenes()
}

// 修改继续处理函数
const continueProcessing = async (scene) => {
  const prompt = props.prompts.find(p => p.id === scene.selectedPromptId)
  
  try {
    while (scene.currentIndex < scene.originalCards.length && !scene.isPaused) {
      const card = scene.originalCards[scene.currentIndex]
      try {
        const result = await processChapter(card, prompt)
        
        scene.resultCards.push({
          id: Date.now() + Math.random(),
          originalNumber: card.chapterNumber,
          promptSequence: prompt.sequence,
          content: result,
          promptId: prompt.id,
          title: card.title
        })

        scene.currentIndex++
        saveScenes()
        
        if (scene.currentIndex < scene.originalCards.length && !scene.isPaused) {
          await delay(1500)
        }
      } catch (error) {
        console.error(`处理章节 ${card.title} 失败:`, error)
        alert(`处理章节 "${card.title}" 失败: ${error.message}`)
        if (!confirm('是否继续处理下一章节？')) {
          scene.isPaused = true
          break
        }
        scene.currentIndex++
      }
    }

    if (scene.currentIndex >= scene.originalCards.length) {
      scene.processing = false
      scene.isPaused = false
      scene.currentIndex = 0
    }
    saveScenes()
  } catch (error) {
    console.error('处理错误:', error)
    alert('处理失败: ' + error.message)
    scene.processing = false
    saveScenes()
  }
}

// 修改暂停/继续功能
const toggleProcessing = (scene) => {
  scene.isPaused = !scene.isPaused
  if (!scene.isPaused) {
    continueProcessing(scene)
  }
  saveScenes()
}

// 处理单个章节
const processChapter = async (card, prompt) => {
  const model = props.models.find(m => m.id === prompt.selectedModel)
  if (!model) {
    throw new Error('请选择模型')
  }

  // 替换提示词模板中的占位符
  const processedTemplate = prompt.template.replace(/{{text}}/g, card.content)

  try {
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

    return content

  } catch (error) {
    console.error('API请求错误:', error)
    throw new Error(`API请求失败: ${error.message}`)
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
    const result = await processChapter(originalCard, prompt)
    
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

// 添加场景方法
const addScene = () => {
  const newScene = {
    id: Date.now(),
    name: '新场景',
    originalCards: [],
    resultCards: [],
    selectedPromptId: '',
    processing: false,
    isPaused: false,
    currentIndex: 0
  }
  
  scenes.value.push(newScene)
  currentSceneId.value = newScene.id
  saveScenes()
}

// 添加场景切换方法
const switchScene = (sceneId) => {
  currentSceneId.value = sceneId
  saveScenes()
}
</script>

<style scoped>
.book-splitter {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #eee;
  min-height: 60px;
  gap: 16px;
  flex-shrink: 0;
}

.left-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.scene-tabs {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  flex: 1;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: #ddd transparent;
  margin-right: 16px;
}

.scene-tabs::-webkit-scrollbar {
  height: 6px;
}

.scene-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.scene-tabs::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}

.scene-tabs::-webkit-scrollbar-thumb:hover {
  background-color: #ccc;
}

.scene-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  min-width: 120px;
  max-width: 200px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.scene-tab.active {
  background: #646cff;
  border-color: #646cff;
  color: white;
}

.scene-tab input {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  width: 100%;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-tab.active input {
  color: white;
}

.delete-tab-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-tab-btn:hover {
  opacity: 1;
}

.add-tab-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-tab-btn:hover {
  background: #218838;
}

.clear-btn {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-btn:hover {
  background: #c82333;
}

.scene-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  min-height: 0;
}

.main-content {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: auto;
}

.scene {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  min-height: 0;
}

.scene h3 {
  padding: 16px;
  margin: 0;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  color: #333;
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.prompt-panel {
  width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.prompt-panel h3 {
  padding: 16px;
  margin: 0;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  color: #333;
}

.prompt-selector {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-selector select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.prompt-selector button {
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.prompt-selector button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.text-card {
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid #eee;
}

.card-header {
  padding: 12px;
  background: white;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-number {
  font-weight: bold;
  color: #646cff;
}

.prompt-info {
  color: #666;
  font-size: 0.9em;
}

textarea {
  width: 90%;
  min-height: 200px;
  padding: 12px;
  border: none;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  background: white;
}

.result-scene .text-card {
  border-left: 4px solid #646cff;
}

.model-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-select select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}

input, textarea {
  width: 97%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.process-buttons {
  display: flex;
  gap: 12px;
}

.process-control {
  background: #ff9800 !important;
}

.process-control:hover {
  background: #f57c00 !important;
}

.prompt-selector {
  position: relative;
}

.progress-info {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  text-align: center;
}

.scenes-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  overflow-y: auto;
}

.scene-wrapper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.scene-header input {
  font-size: 18px;
  border: none;
  background: transparent;
  padding: 4px 8px;
  border-radius: 4px;
}

.scene-header input:focus {
  background: white;
  outline: none;
  border: 1px solid #ddd;
}

.scene-actions {
  display: flex;
  gap: 8px;
}

.delete-btn {
  padding: 8px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn:hover {
  background: #c82333;
}

.add-scene-btn {
  background: #28a745;
  color: white;
}

.add-scene-btn:hover {
  background: #218838;
}

.clear-btn {
  background: #dc3545;
  color: white;
}

.clear-btn:hover {
  background: #c82333;
}

.import-btn {
  padding: 8px 16px;
  background: #0d6efd;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.import-btn:hover {
  background: #0b5ed7;
}

.import-btn input {
  display: none;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  padding: 4px 8px;
  background: #f0f7ff;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9em;
  color: #646cff;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #646cff;
  color: white;
  border-color: #646cff;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e4e8;
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
  padding: 16px;
}

.modal-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-actions button:hover {
  background: #f5f5f5;
}
</style> 