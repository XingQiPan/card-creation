<template>
  <div class="knowledge-base">
    <!-- 知识库列表 -->
    <div class="kb-list">
      <div class="kb-header">
        <div class="kb-title">知识库</div>
      </div>
      <div class="kb-items">
        <div 
          v-for="kb in knowledgeBases" 
          :key="kb.id"
          :class="['kb-item', { active: selectedKB?.id === kb.id }]"
          @click="selectKB(kb)"
        >
          <i class="fas fa-database"></i>
          <span class="kb-name">{{ kb.name }}</span>
          <button 
            class="delete-btn" 
            @click.stop="deleteKnowledgeBase(kb.id)"
            title="删除知识库"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="kb-item add" @click="showCreateModal = true">
          <i class="fas fa-plus"></i>
          <span>添加</span>
        </div>
      </div>
    </div>

    <!-- 知识库内容区 -->
    <div class="kb-content" v-if="selectedKB">
      <!-- 知识库头部 -->
      <div class="kb-header">
        <h3>{{ selectedKB.name }}</h3>
        <div class="header-actions">
          <button class="settings-btn" @click="openSettings">
            <i class="fas fa-cog"></i> 设置
          </button>
        </div>
      </div>

      <!-- 文件区域 -->
      <div class="section">
        <div class="section-header">
          <h2>文件</h2>
          <button class="add-btn" @click="$refs.fileInput.click()">
            <i class="fas fa-plus"></i> 添加文件
          </button>
          <input 
            type="file" 
            ref="fileInput"
            style="display: none"
            multiple
            accept=".pdf,.docx,.pptx,.xlsx,.odt,.txt"
            @change="handleFileUpload"
          >
        </div>

        <div class="upload-area" @drop.prevent="handleFileDrop" @dragover.prevent>
          <div class="upload-hint">
            <p>拖拽文件到这里</p>
            <p class="sub-hint">支持 pdf, docx, pptx, xlsx, odt, txt 格式</p>
          </div>
        </div>

        <!-- 文件列表 -->
        <div class="file-list">
          <div v-for="doc in selectedKB.documents" :key="doc.id" class="file-item">
            <i class="fas fa-file-alt"></i>
            <span>{{ doc.name }}</span>
            <div class="file-actions">
              <button @click.stop="removeDocument(doc.id)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索区域 -->
      <div class="search-section" v-if="selectedKB">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="输入搜索内容..."
            @keyup.enter="handleSearch"
          >
          <button 
            class="search-btn" 
            @click="handleSearch"
            :disabled="isSearching"
          >
            <i class="fas" :class="isSearching ? 'fa-spinner fa-spin' : 'fa-search'"></i>
            {{ isSearching ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <!-- 搜索结果 -->
        <div class="search-results" v-if="searchResults.length > 0">
          <div 
            v-for="result in searchResults" 
            :key="result.docId + result.chunkIndex"
            class="result-item"
          >
            <div class="result-header">
              <span class="doc-name">{{ result.docName }}</span>
              <span class="similarity">相似度: {{ (result.similarity * 100).toFixed(1) }}%</span>
            </div>
            <div class="result-content">{{ result.text }}</div>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div class="no-results" v-else-if="hasSearched">
          没有找到相关内容
        </div>
      </div>

      <!-- 模型信息 -->
      <div class="model-info" @click="console.log('model-info clicked')">
        <span class="model-tag">{{ getModelName(selectedKB.config.model) }}</span>
      </div>

      <div class="actions">
        <button @click="handleReprocessDocuments" :disabled="isProcessing">
          {{ isProcessing ? '处理中...' : '重新处理文档' }}
        </button>
      </div>
    </div>

    <!-- 创建知识库弹窗 -->
    <Modal v-if="showCreateModal" @close="showCreateModal = false">
      <template #header>
        <h3>创建知识库</h3>
      </template>
      <template #body>
        <div class="form-group">
          <label class="required">名称</label>
          <input 
            v-model="newKB.name" 
            type="text" 
            class="form-input"
            placeholder="请输入知识库名称"
          >
        </div>
        <div class="form-group">
          <label class="required">选择嵌入模型</label>
          <select v-model="newKB.model" class="form-input">
            <option value="">请选择模型</option>
            <option 
              v-for="model in embeddingModels" 
              :key="model.id" 
              :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-cancel" @click="showCreateModal = false">取消</button>
        <button class="btn btn-confirm" @click="createKnowledgeBase">确定</button>
      </template>
    </Modal>

    <!-- 知识库设置弹窗 -->
    <Modal 
      v-if="showSettings" 
      @close="showSettings = false"
    >
      <template #header>
        <h3>知识库设置</h3>
      </template>
      <template #body>
        <div class="settings-form">
          <div class="form-group">
            <label>知识库名称</label>
            <input 
              type="text" 
              v-model="settingsForm.name"
              placeholder="输入知识库名称"
            >
          </div>

          <div class="form-group">
            <label>
              选择模型
              <span class="help-text">选择用于生成文本嵌入的模型</span>
            </label>
            <select v-model="settingsForm.model">
              <option value="">请选择模型</option>
              <option 
                v-for="model in embeddingModels" 
                :key="model.id" 
                :value="model.id"
              >
                {{ model.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>
              分段大小
              <span class="help-text">文档分割的字符数，较大的值适合长文本，较小的值适合精确匹配</span>
              <span class="value-display">{{ settingsForm.chunkSize }}字</span>
            </label>
            <input 
              type="range" 
              v-model.number="settingsForm.chunkSize"
              min="100" 
              max="2000"
              step="50"
            >
          </div>

          <div class="form-group">
            <label>
              重叠大小
              <span class="help-text">相邻分段的重叠字符数，避免内容在分段处断开</span>
              <span class="value-display">{{ settingsForm.overlapSize }}字</span>
            </label>
            <input 
              type="range" 
              v-model.number="settingsForm.overlapSize"
              min="0" 
              max="200"
              step="10"
            >
          </div>

          <div class="form-group">
            <label>
              最大分段数量
              <span class="help-text">每个文档的最大分段数，控制处理和搜索的资源消耗</span>
              <span class="value-display">{{ settingsForm.maxChunks }}个</span>
            </label>
            <input 
              type="range" 
              v-model.number="settingsForm.maxChunks"
              min="5" 
              max="50"
              step="5"
            >
          </div>

          <div class="form-group">
            <label>
              最大返回结果数
              <span class="help-text">搜索时返回的最大结果数量</span>
              <span class="value-display">{{ settingsForm.maxResults }}条</span>
            </label>
            <input 
              type="range" 
              v-model.number="settingsForm.maxResults"
              min="10" 
              max="100"
              step="5"
            >
          </div>

          <div class="form-group">
            <label>
              相似度阈值
              <span class="help-text">搜索结果的最低相似度要求，较高的值提供更精确但更少的结果</span>
              <span class="value-display">{{ (settingsForm.threshold * 100).toFixed(0) }}%</span>
            </label>
            <input 
              type="range" 
              v-model.number="settingsForm.threshold"
              min="0.1" 
              max="0.9"
              step="0.05"
            >
          </div>
        </div>
      </template>
      <template #footer>
        <div class="form-actions">
          <button @click="showSettings = false">取消</button>
          <button 
            class="primary" 
            @click="saveSettings"
            :disabled="!settingsForm.model || !isValidSettings"
          >
            保存
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, onMounted, watch } from 'vue'
import { embeddingService } from '../utils/services/embeddingService'
import { showToast } from '../utils/common'
import Modal from './Modal.vue'
import { debugLog } from '../utils/debug'

// 定义 props
const props = defineProps({
  models: {
    type: Array,
    required: true
  }
})

// 状态管理
const showCreateModal = ref(false)
const showSettings = ref(false)
const knowledgeBases = ref([])
const selectedKB = ref(null)
const newKB = ref({
  name: '',
  model: ''
})
const settingsForm = ref({
  name: '',
  model: '',
  chunkSize: 500,
  overlapSize: 50,
  similarityThreshold: 0.3,
  maxChunks: 15,
  maxResults: 50,
  threshold: 0.3
})
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)
const isProcessing = ref(false)

// 计算属性：过滤出嵌入式模型
const embeddingModels = computed(() => {
  return props.models.filter(model => model.provider === 'embedding')
})

// 计算属性：检查设置是否有效
const isValidSettings = computed(() => {
  return (
    settingsForm.value.name.trim() &&
    settingsForm.value.model &&
    settingsForm.value.chunkSize >= 100 &&
    settingsForm.value.chunkSize <= 2000 &&
    settingsForm.value.overlapSize >= 0 &&
    settingsForm.value.overlapSize < settingsForm.value.chunkSize &&
    settingsForm.value.similarityThreshold >= 0.1 &&
    settingsForm.value.similarityThreshold <= 0.9 &&
    settingsForm.value.maxChunks >= 5 &&
    settingsForm.value.maxChunks <= 50 &&
    settingsForm.value.maxResults >= 10 &&
    settingsForm.value.maxResults <= 100 &&
    settingsForm.value.threshold >= 0.1 &&
    settingsForm.value.threshold <= 0.9
  )
})

// 获取模型名称的方法
const getModelName = (modelId) => {
  const model = props.models.find(m => m.id === modelId)
  return model ? model.name : '未知模型'
}

// 加载知识库列表
const loadKnowledgeBases = () => {
  knowledgeBases.value = embeddingService.getAllKnowledgeBases()
}

// 选择知识库
const selectKB = (kb) => {
  selectedKB.value = embeddingService.getKnowledgeBase(kb.id)
}

// 创建知识库
const createKnowledgeBase = async () => {
  try {
    if (!newKB.value.name) {
      throw new Error('请输入知识库名称')
    }
    if (!newKB.value.model) {
      throw new Error('请选择嵌入模型')
    }
    
    // 验证是否为嵌入式模型
    const selectedModel = props.models.find(m => m.id === newKB.value.model)
    if (!selectedModel || selectedModel.provider !== 'embedding') {
      throw new Error('请选择嵌入式模型')
    }

    const kb = await embeddingService.createKnowledgeBase(newKB.value)
    showCreateModal.value = false
    newKB.value = { name: '', model: '' }
    knowledgeBases.value = embeddingService.getAllKnowledgeBases()
    selectKB(kb)
    showToast('创建知识库成功')
  } catch (error) {
    showToast(error.message, 'error')
  }
}

// 处理文件上传
const handleFileUpload = async (event) => {
  const files = event.target.files
  if (!files.length) return

  try {
    for (const file of files) {
      const content = await file.text()
      await embeddingService.addDocumentToKnowledgeBase(
        selectedKB.value.id, 
        {
          name: file.name,
          content
        },
        props.models
      )
    }
    selectedKB.value = embeddingService.getKnowledgeBase(selectedKB.value.id)
    knowledgeBases.value = embeddingService.getAllKnowledgeBases()
    showToast('文件上传成功')
  } catch (error) {
    showToast('文件上传失败: ' + error.message, 'error')
  }
  event.target.value = ''
}

// 处理文件拖放
const handleFileDrop = async (event) => {
  const files = event.dataTransfer.files
  if (!files.length) return

  try {
    for (const file of files) {
      const content = await file.text()
      await embeddingService.addDocumentToKnowledgeBase(
        selectedKB.value.id, 
        {
          name: file.name,
          content
        },
        props.models
      )
    }
    selectedKB.value = embeddingService.getKnowledgeBase(selectedKB.value.id)
    knowledgeBases.value = embeddingService.getAllKnowledgeBases()
    showToast('文件上传成功')
  } catch (error) {
    showToast('文件上传失败: ' + error.message, 'error')
  }
}

// 删除文档
const removeDocument = async (docId) => {
  try {
    if (confirm('确定要删除这个文件吗？')) {
      embeddingService.removeDocument(selectedKB.value.id, docId)
      selectedKB.value = embeddingService.getKnowledgeBase(selectedKB.value.id)
      knowledgeBases.value = embeddingService.getAllKnowledgeBases()
      showToast('文件删除成功')
    }
  } catch (error) {
    showToast('文件删除失败', 'error')
  }
}

// 处理搜索
const handleSearch = async () => {
  try {
    if (!searchQuery.value.trim()) {
      showToast('请输入搜索内容')
      return
    }
    
    isSearching.value = true
    hasSearched.value = true
    
    // 1. 预处理搜索查询
    const query = searchQuery.value.trim()
    const model = props.models.find(m => m.id === selectedKB.value.config.model)
    if (!model) {
      throw new Error('未找到匹配的模型配置')
    }

    // 2. 获取查询的向量表示
    const queryEmbedding = await embeddingService.createEmbedding(query, model)
    if (!queryEmbedding?.data?.[0]?.embedding) {
      throw new Error('生成查询向量失败')
    }
    const queryVector = queryEmbedding.data[0].embedding

    // 3. 在所有文档中搜索
    let allMatches = []
    const kb = selectedKB.value
    const threshold = kb.config?.similarityThreshold || 0.3

    for (const doc of (kb.documents || [])) {
      if (!doc.chunks || !Array.isArray(doc.chunks)) continue

      // 对每个文档块计算相似度
      const docMatches = doc.chunks
        .map(chunk => {
          if (!chunk.embedding || !Array.isArray(chunk.embedding)) return null

          const similarity = embeddingService.calculateCosineSimilarity(
            queryVector,
            chunk.embedding
          )

          return {
            docId: doc.id,
            docName: doc.name,
            chunkText: chunk.text,
            similarity,
            position: chunk.metadata?.position || 0,
            // 保存原始块信息用于后续处理
            originalChunk: chunk
          }
        })
        .filter(match => match && match.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)

      if (docMatches.length > 0) {
        allMatches.push(...docMatches)
      }
    }

    // 4. 对结果进行分组和合并
    const docGroups = new Map()
    
    for (const match of allMatches) {
      if (!docGroups.has(match.docId)) {
        docGroups.set(match.docId, {
          docId: match.docId,
          docName: match.docName,
          matches: [],
          maxSimilarity: 0,
          contexts: new Set()
        })
      }

      const group = docGroups.get(match.docId)
      group.matches.push(match)
      group.maxSimilarity = Math.max(group.maxSimilarity, match.similarity)
    }

    // 5. 处理每个文档组的上下文
    const processedResults = Array.from(docGroups.values())
      .map(group => {
        // 按位置排序
        group.matches.sort((a, b) => a.position - b.position)
        
        // 合并相近的文本块
        const mergedText = mergeContexts(group.matches)

        return {
          docId: group.docId,
          docName: group.docName,
          text: mergedText,
          similarity: group.maxSimilarity,
          matchCount: group.matches.length,
          // 高亮搜索词
          highlightedText: highlightSearchTerms(mergedText, query)
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, kb.config?.maxChunks || 15)

    searchResults.value = processedResults

  } catch (error) {
    console.error('搜索失败:', error)
    showToast(error.message, 'error')
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 合并上下文
const mergeContexts = (matches) => {
  if (matches.length === 0) return ''

  const chunks = [...matches]
  chunks.sort((a, b) => a.position - b.position)

  let mergedText = chunks[0].chunkText
  let lastEnd = chunks[0].position + chunks[0].chunkText.length

  for (let i = 1; i < chunks.length; i++) {
    const currentChunk = chunks[i]
    const gap = currentChunk.position - lastEnd

    if (gap < 100) {
      // 相近的文本块，尝试找到重叠部分
      const overlap = findOverlap(mergedText, currentChunk.chunkText)
      if (overlap > 0) {
        mergedText += currentChunk.chunkText.slice(overlap)
      } else {
        mergedText += ' ... ' + currentChunk.chunkText
      }
    } else {
      // 间隔较大，使用分隔符
      mergedText += '\n...\n' + currentChunk.chunkText
    }

    lastEnd = currentChunk.position + currentChunk.chunkText.length
  }

  return mergedText
}

// 查找文本重叠
const findOverlap = (text1, text2) => {
  const minOverlap = 10
  const maxOverlap = Math.min(text1.length, text2.length)

  for (let i = maxOverlap; i >= minOverlap; i--) {
    const end1 = text1.slice(-i)
    const start2 = text2.slice(0, i)
    if (end1 === start2) {
      return i
    }
  }

  return 0
}

// 高亮搜索词
const highlightSearchTerms = (text, query) => {
  if (!text || !query) return text

  // 转义正则表达式特殊字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escapedQuery, 'gi')

  return text.replace(regex, match => `<mark>${match}</mark>`)
}

// 删除知识库
const deleteKnowledgeBase = async (id) => {
  try {
    if (confirm('确定要删除这个知识库吗？')) {
      embeddingService.deleteKnowledgeBase(id)
      if (selectedKB.value?.id === id) {
        selectedKB.value = null
      }
      knowledgeBases.value = embeddingService.getAllKnowledgeBases()
      showToast('删除知识库成功')
    }
  } catch (error) {
    showToast('删除知识库失败', 'error')
  }
}

// 打开设置
const openSettings = () => {
  if (selectedKB.value) {
    settingsForm.value = {
      name: selectedKB.value.name,
      model: selectedKB.value.config?.model || '',
      chunkSize: selectedKB.value.config?.chunkSize || 500,
      overlapSize: selectedKB.value.config?.overlapSize || 50,
      similarityThreshold: selectedKB.value.config?.similarityThreshold || 0.3,
      maxChunks: selectedKB.value.config?.maxChunks || 15,
      maxResults: selectedKB.value.config?.maxResults || 50,
      threshold: selectedKB.value.config?.threshold || 0.3
    }
    showSettings.value = true
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    if (!selectedKB.value || !isValidSettings.value) return
    
    const oldModel = selectedKB.value.config?.model
    
    // 创建更新对象，确保所有设置都被包含
    const updateData = {
      name: settingsForm.value.name,
      config: {
        model: settingsForm.value.model,
        chunkSize: Number(settingsForm.value.chunkSize),
        overlapSize: Number(settingsForm.value.overlapSize),
        maxChunks: Number(settingsForm.value.maxChunks),
        maxResults: Number(settingsForm.value.maxResults),
        threshold: Number(settingsForm.value.threshold)
      }
    }

    // 使用 embeddingService 更新知识库
    await embeddingService.updateKnowledgeBase(selectedKB.value.id, updateData)
    
    // 重新加载选中的知识库以获取最新数据
    selectedKB.value = embeddingService.getKnowledgeBase(selectedKB.value.id)
    
    // 如果模型发生变化，提示用户重新处理文档
    if (oldModel !== settingsForm.value.model) {
      showToast('设置已保存。由于更换了模型，请重新处理文档。')
    } else {
      showToast('设置已保存')
    }
    
    showSettings.value = false
  } catch (error) {
    showToast(error.message, 'error')
  }
}

// 重新处理文档
const handleReprocessDocuments = async () => {
  if (!selectedKB.value) return
  
  try {
    isProcessing.value = true
    await embeddingService.reprocessAllDocuments(selectedKB.value.id, props.models)
    showToast('文档处理完成')
  } catch (error) {
    showToast(error.message, 'error')
  } finally {
    isProcessing.value = false
  }
}

// 在组件挂载时加载知识库
onMounted(() => {
  loadKnowledgeBases()
  console.log('Component initialized')
})
</script>

<style scoped>
.knowledge-base {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.kb-list {
  width: 240px;
  background: white;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
}

.kb-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kb-title {
  font-size: 16px;
  font-weight: 500;
  color: #1f2329;
}

.kb-items {
  padding: 8px;
  flex: 1;
  overflow-y: auto;
}

.kb-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 4px;
  position: relative;
}

.kb-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  position: absolute;
  right: 8px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  color: #ff4d4f;
}

.kb-item:hover .delete-btn {
  opacity: 1;
}

.kb-item.active .delete-btn {
  color: #00a971;
}

.kb-item.active .delete-btn:hover {
  color: #ff4d4f;
}

.kb-item.add {
  color: #666;
}

.kb-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 500;
  color: #1f2329;
}

.add-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #1f2329;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.add-btn:hover {
  background: #f5f5f5;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  margin-bottom: 16px;
}

.upload-hint {
  color: #666;
}

.sub-hint {
  font-size: 13px;
  color: #999;
  margin-top: 8px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  gap: 8px;
}

.file-actions {
  margin-left: auto;
}

.search-section {
  margin-top: 20px;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-box input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-btn {
  padding: 8px 16px;
  background: #00a971;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.search-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.doc-name {
  font-weight: 500;
  color: #333;
}

.similarity {
  color: #00a971;
  font-size: 14px;
}

.result-content {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.no-results {
  text-align: center;
  color: #666;
  padding: 32px;
  background: #f5f5f5;
  border-radius: 4px;
}

.model-info {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-tag {
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}

.settings-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.help-text {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-weight: normal;
}

.value-display {
  float: right;
  color: #00a971;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-group input[type="range"] {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-actions button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.form-actions button.primary {
  background: #00a971;
  color: white;
  border: none;
}

.form-actions button.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Modal 相关样式 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #1f2329;
  font-size: 14px;
}

.form-group label.required::after {
  content: '*';
  color: #ff4d4f;
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-input:focus {
  border-color: #00a971;
  outline: none;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancel {
  background: #f5f5f5;
  border: 1px solid #ddd;
  margin-right: 8px;
}

.btn-confirm {
  background: #00a971;
  color: white;
  border: none;
}

.btn-confirm:hover {
  background: #008f5d;
}

.slider-container {
  width: 100%;
  padding: 10px 0;
  position: relative;
}

.slider-value {
  text-align: center;
  color: #00a971;
  font-size: 14px;
  margin-bottom: 8px;
}

.slider {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #00a971;
  border-radius: 50%;
  cursor: pointer;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}

.warning-text {
  background: #fff7e6;
  border: 1px solid #ffe7ba;
  border-radius: 4px;
  font-size: 12px;
  color: #d46b08;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-text i {
  color: #d46b08;
}

.form-input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.help-icon {
  color: #999;
  font-size: 14px;
  margin-left: 4px;
  cursor: help;
}

/* 添加 Modal 相关样式 */
:deep(.modal-overlay) {
  z-index: 1000;
}

:deep(.modal-content) {
  min-width: 500px;
}
</style> 