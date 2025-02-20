<template>
  <div class="book-splitter">
    <div class="header">
      <h2>小说拆解器</h2>
      <div class="actions">
        <button class="upload-btn">
          <input 
            type="file" 
            accept=".txt"
            @change="handleBookUpload"
            ref="fileInput"
          >
          <i class="fas fa-book"></i> 上传小说
        </button>
        <button 
          @click="exportResults" 
          :disabled="!hasResults"
          class="export-btn"
        >
          <i class="fas fa-file-export"></i> 导出结果
        </button>
      </div>
    </div>

    <div class="content">
      <!-- 原文场景 -->
      <div class="scene original-scene">
        <h3>原文章节 ({{ originalCards.length }}章)</h3>
        <div class="cards-container">
          <div 
            v-for="card in originalCards" 
            :key="card.id"
            class="text-card"
          >
            <div class="card-header">
              <span class="chapter-number">#{{ card.chapterNumber }}</span>
              <input v-model="card.title" placeholder="章节标题" />
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
          <select v-model="selectedPromptId">
            <option value="">选择提示词</option>
            <option 
              v-for="prompt in prompts" 
              :key="prompt.id"
              :value="prompt.id"
            >
              #{{ prompt.sequence }} - {{ prompt.title }}
            </option>
          </select>
          
          <!-- 只保留模型选择 -->
          <div class="model-select" v-if="selectedPrompt">
            <select v-model="selectedPrompt.selectedModel">
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
              @click="processWithPrompt"
              :disabled="!canProcess"
              v-if="!processing"
            >
              <i class="fas fa-play"></i> 开始处理
            </button>
            <button 
              @click="toggleProcessing"
              class="process-control"
              v-else
            >
              <i :class="isPaused ? 'fas fa-play' : 'fas fa-pause'"></i>
              {{ isPaused ? '继续处理' : '暂停处理' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 处理结果场景 -->
      <div class="scene result-scene">
        <h3>处理结果 ({{ resultCards.length }}章)</h3>
        <div class="cards-container">
          <div 
            v-for="card in resultCards" 
            :key="card.id"
            class="text-card"
          >
            <div class="card-header">
              <span class="chapter-number">{{ card.originalNumber }}</span>
              <span class="prompt-info">
                提示词 {{ card.promptSequence }}
              </span>
            </div>
            <textarea 
              v-model="card.content" 
              placeholder="处理结果"
              readonly
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 状态
const originalCards = ref([])
const resultCards = ref([])
const selectedPromptId = ref('')
const processing = ref(false)
const isPaused = ref(false)
const currentIndex = ref(0)

// 从父组件接收提示词列表和模型列表
const props = defineProps({
  prompts: {
    type: Array,
    required: true
  },
  models: {  // 添加模型列表属性
    type: Array,
    required: true
  }
})

// 计算属性
const hasResults = computed(() => resultCards.value.length > 0)

const selectedPrompt = computed(() => {
  return props.prompts.find(p => p.id === selectedPromptId.value)
})

const canProcess = computed(() => {
  return selectedPrompt.value && 
         selectedPrompt.value.selectedModel && 
         !processing.value
})

// 将文本分割成章节
const splitIntoChapters = (text) => {
  const chapters = []
  const lines = text.split('\n')
  let currentChapter = {
    title: '',
    content: [],
    chapterNumber: 0
  }
  
  const chapterPattern = /^(.*?)第(\d+|[一二三四五六七八九十百千]+)[章节段][：:]?\s+[\u4e00-\u9fa5]+.*$/
  const alternativePattern = /^[0-9一二三四五六七八九十百千零]+[、，,  ：:].*$/
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    // 检查是否是章节标题
    const isChapterTitle = (
      chapterPattern.test(trimmedLine) || 
      (alternativePattern.test(trimmedLine) && trimmedLine.length < 60)
    )

    if (isChapterTitle) {
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
      currentChapter.content.push(trimmedLine)
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

// 处理小说上传
const handleBookUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const content = await file.text()
    const chapters = splitIntoChapters(content)
    
    originalCards.value = chapters.map((chapter, index) => ({
      id: Date.now() + index,
      chapterNumber: index + 1,
      title: chapter.title,
      content: chapter.content
    }))

    event.target.value = ''
  } catch (error) {
    console.error('文件处理错误:', error)
    alert('文件处理失败: ' + error.message)
  }
}

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini'
}

// 切换暂停/继续状态
const toggleProcessing = () => {
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    // 继续处理
    continueProcessing()
  }
}

// 处理提示词
const processWithPrompt = async () => {
  if (!selectedPromptId.value || processing.value) return

  const prompt = props.prompts.find(p => p.id === selectedPromptId.value)
  if (!prompt) {
    alert('未找到选中的提示词')
    return
  }

  processing.value = true
  isPaused.value = false
  currentIndex.value = 0
  resultCards.value = [] // 清空之前的结果

  await continueProcessing()
}

// 继续处理函数
const continueProcessing = async () => {
  const prompt = props.prompts.find(p => p.id === selectedPromptId.value)
  
  try {
    while (currentIndex.value < originalCards.value.length && !isPaused.value) {
      const card = originalCards.value[currentIndex.value]
      try {
        const result = await processChapter(card, prompt)
        
        resultCards.value.push({
          id: Date.now() + Math.random(),
          originalNumber: card.chapterNumber,
          promptSequence: prompt.sequence,
          content: result,
          promptId: prompt.id,
          title: card.title
        })

        currentIndex.value++
        
        // 如果不是最后一章且未暂停，等待3秒
        if (currentIndex.value < originalCards.value.length && !isPaused.value) {
          await delay(3000)
        }
      } catch (error) {
        console.error(`处理章节 ${card.title} 失败:`, error)
        alert(`处理章节 "${card.title}" 失败: ${error.message}`)
        // 是否继续处理下一章节
        if (!confirm('是否继续处理下一章节？')) {
          isPaused.value = true
          break
        }
        currentIndex.value++
      }
    }

    // 如果全部处理完成
    if (currentIndex.value >= originalCards.value.length) {
      processing.value = false
      isPaused.value = false
      currentIndex.value = 0
    }
  } catch (error) {
    console.error('处理错误:', error)
    alert('处理失败: ' + error.message)
    processing.value = false
  }
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
const exportResults = () => {
  const exportData = {
    original: originalCards.value.map(card => ({
      chapterNumber: card.chapterNumber,
      title: card.title,
      content: card.content
    })),
    results: resultCards.value.map(card => ({
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
</script>

<style scoped>
.book-splitter {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px); /* 减去顶部导航栏的高度 */
  margin: 70px;
  gap: 20px;
  width: 85vw;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #eee;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.actions {
  display: flex;
  gap: 12px;
}

.upload-btn, .export-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.upload-btn:hover, .export-btn:hover {
  background: #5058cc;
}

.upload-btn input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.export-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.content {
  display: flex;
  gap: 20px;
  flex: 1;
  padding: 0 24px 24px;
  min-height: 0; /* 重要：防止flex子元素溢出 */
}

.scene {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  min-height: 0; /* 重要：防止flex子元素溢出 */
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
  width: 100%;
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
  width: 100%;
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

/* 添加进度显示 */
.prompt-selector {
  position: relative;
}

.progress-info {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  text-align: center;
}
</style> 