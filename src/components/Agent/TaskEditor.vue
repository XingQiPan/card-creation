<template>
  <div class="task-editor-overlay" @click.self="$emit('close')">
    <div class="task-editor">
      <div class="editor-header">
        <h3>{{ isNew ? '新建任务' : '编辑任务' }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="editor-body">
        <div class="form-group">
          <label>任务标题</label>
          <div class="input-with-hint">
            <input 
              v-model="formData.title" 
              type="text" 
              placeholder="输入任务标题"
              class="form-input"
            >
            <div class="input-hint">使用@成员名:场景名可直接指派任务</div>
          </div>
        </div>
        
        <div class="form-group">
          <label>任务描述</label>
          <textarea 
            v-model="formData.description" 
            placeholder="描述任务目标和要求"
            class="form-input"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>指派给AI成员</label>
          <select v-model="formData.assignedTo" class="form-input">
            <option value="">请选择AI成员</option>
            <option 
              v-for="agent in agents" 
              :key="agent.id" 
              :value="agent.id"
            >
              {{ agent.name }}
            </option>
          </select>
        </div>

        <div class="form-section">
          <div class="section-title">场景卡片集成</div>
          
          <!-- 读取场景卡片选项 -->
          <div class="card-option-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.readSceneCard"
              >
              <span>读取场景卡片</span>
            </label>

            <div v-if="formData.readSceneCard" class="scene-card-options">
              <div class="form-group">
                <label>从哪个场景读取卡片</label>
                <select v-model="formData.sourceSceneId" class="form-input">
                  <option value="">请选择场景</option>
                  <option 
                    v-for="scene in scenes" 
                    :key="scene.id" 
                    :value="scene.id"
                  >
                    {{ scene.name }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label>搜索方式</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      v-model="formData.searchType" 
                      value="fuzzy"
                    >
                    <span>模糊搜索</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      v-model="formData.searchType" 
                      value="exact"
                    >
                    <span>精确搜索</span>
                  </label>
                </div>
              </div>
              
              <div class="form-group">
                <label>卡片标题关键词</label>
                <input 
                  v-model="formData.cardTitleKeywords" 
                  type="text" 
                  :placeholder="formData.searchType === 'fuzzy' ? '输入关键词进行模糊搜索' : '输入完整标题进行精确搜索'"
                  class="form-input"
                >
              </div>
            </div>
          </div>

          <!-- 生成场景卡片选项 -->
          <div class="card-option-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="formData.generateSceneCard"
              >
              <span>生成场景卡片</span>
            </label>

            <div v-if="formData.generateSceneCard" class="scene-card-options">
              <div class="form-group">
                <label>目标场景</label>
                <select v-model="formData.targetSceneId" class="form-input">
                  <option value="">请选择场景</option>
                  <option 
                    v-for="scene in scenes" 
                    :key="scene.id" 
                    :value="scene.id"
                  >
                    {{ scene.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="formData.addCardPrefix"
                  >
                  <span>添加卡片序号前缀</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button class="save-btn" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-editor-overlay {
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
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

.task-editor {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.2s ease-out;
}

.editor-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 12px 12px 0 0;
}

.editor-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1f1f1f;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.editor-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #1f1f1f;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
  color: #1f1f1f;
}

.form-input:hover {
  border-color: #1890ff;
}

.form-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  outline: none;
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.form-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.checkbox-label span {
  font-size: 14px;
  color: #1f1f1f;
}

.scene-card-options {
  margin-top: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.editor-footer {
  padding: 20px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #fff;
  border-radius: 0 0 12px 12px;
}

.cancel-btn,
.save-btn {
  padding: 9px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #f0f0f0;
  color: #666;
}

.cancel-btn:hover {
  background: #e8e8e8;
  border-color: #d9d9d9;
}

.save-btn {
  background: #1890ff;
  border: 1px solid #1890ff;
  color: white;
}

.save-btn:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}

.card-option-group {
  margin-bottom: 24px;
}

.card-option-group:last-child {
  margin-bottom: 0;
}

.radio-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  margin: 0;
}

.scene-card-options {
  margin-top: 16px;
  padding: 20px;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}
</style>

<script setup>
import { ref, onMounted, computed } from 'vue'

const props = defineProps({
  task: Object,
  parentTask: Object,
  agents: {
    type: Array,
    required: true
  },
  scenes: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save', 'close', 'generateCard'])

// 表单数据
const formData = ref({
  title: '',
  description: '',
  assignedTo: '',
  responseFormat: 'text',
  // 读取场景卡片相关
  readSceneCard: false,
  sourceSceneId: '',
  searchType: 'fuzzy',
  cardTitleKeywords: '',
  // 生成场景卡片相关
  generateSceneCard: false,
  targetSceneId: '',
  addCardPrefix: false,
  // 其他配置
  includeParentContext: false,
  includeRelatedContext: false,
  includeSceneContext: false,
  relatedTaskId: ''
})

// 获取当前选中的源场景
const selectedSourceScene = computed(() => {
  if (!formData.value.sourceSceneId) return null
  return props.scenes.find(scene => scene.id === formData.value.sourceSceneId)
})

// 获取当前选中的目标场景
const selectedTargetScene = computed(() => {
  if (!formData.value.targetSceneId) return null
  return props.scenes.find(scene => scene.id === formData.value.targetSceneId)
})

// 搜索场景卡片
const searchSceneCards = computed(() => {
  if (!selectedSourceScene.value || !formData.value.cardTitleKeywords) return []
  
  const cards = selectedSourceScene.value.cards || []
  const keywords = formData.value.cardTitleKeywords.toLowerCase()
  
  if (formData.value.searchType === 'fuzzy') {
    // 模糊搜索
    return cards.filter(card => 
      card.title.toLowerCase().includes(keywords)
    )
  } else {
    // 精确搜索
    return cards.filter(card => 
      card.title.toLowerCase() === keywords.toLowerCase()
    )
  }
})

// 生成新卡片的标题
const generateCardTitle = (baseTitle) => {
  if (!formData.value.addCardPrefix || !selectedTargetScene.value) {
    return baseTitle
  }
  
  const existingCards = selectedTargetScene.value.cards || []
  const prefix = existingCards.length + 1
  return `${prefix}. ${baseTitle}`
}

// 生成场景卡片
const generateSceneCard = async (taskResult) => {
  if (!selectedTargetScene.value) return null
  
  const cardTitle = generateCardTitle(formData.value.title)
  
  const newCard = {
    id: Date.now().toString(),
    title: cardTitle,
    content: taskResult || formData.value.description, // 如果没有结果，使用任务描述
    tags: [],
    timestamp: new Date().toISOString()
  }
  
  // 发出生成卡片事件
  emit('generateCard', {
    sceneId: formData.value.targetSceneId,
    card: newCard
  })
  
  return newCard
}

// 初始化表单数据
onMounted(() => {
  if (props.task) {
    formData.value = {
      ...formData.value,
      ...props.task
    }
  }
})

// 保存任务
const handleSave = async () => {
  if (!formData.value.title) {
    alert('请输入任务标题')
    return
  }
  
  if (!formData.value.assignedTo) {
    alert('请选择AI成员')
    return
  }
  
  let taskData = { ...formData.value }
  
  // 处理读取场景卡片
  if (formData.value.readSceneCard) {
    if (!formData.value.sourceSceneId) {
      alert('请选择源场景')
      return
    }
    if (!formData.value.cardTitleKeywords) {
      alert('请输入卡片标题关键词')
      return
    }
    
    const matchedCards = searchSceneCards.value
    if (matchedCards.length > 0) {
      taskData.sceneCardContext = matchedCards.map(card => ({
        title: card.title,
        content: card.content,
        sourceSceneId: formData.value.sourceSceneId
      }))
    }
  }
  
  // 处理生成场景卡片
  if (formData.value.generateSceneCard) {
    if (!formData.value.targetSceneId) {
      alert('请选择目标场景')
      return
    }
    
    // 生成初始卡片
    const initialCard = await generateSceneCard()
    if (initialCard) {
      taskData.generatedCard = initialCard
    }
  }
  
  // 添加元数据
  taskData.metadata = {
    hasSceneCardIntegration: formData.value.readSceneCard || formData.value.generateSceneCard,
    searchedCards: formData.value.readSceneCard ? searchSceneCards.value.length : 0,
    willGenerateCard: formData.value.generateSceneCard
  }
  
  emit('save', taskData)
}
</script> 