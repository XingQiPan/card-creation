<template>
  <div class="agent-editor-overlay" @click.self="$emit('close')">
    <div class="agent-editor">
      <div class="editor-header">
        <h3>{{ isNew ? '新建AI成员' : '编辑AI成员' }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="editor-body">
        <div class="form-group">
          <label>名称</label>
          <input 
            v-model="formData.name" 
            type="text" 
            placeholder="输入AI成员名称"
            class="form-input"
          >
        </div>
        
        <div class="form-group">
          <label>描述</label>
          <textarea 
            v-model="formData.description" 
            placeholder="描述AI成员的特点和职责"
            class="form-input"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>系统提示词</label>
          <textarea 
            v-model="formData.systemPrompt" 
            placeholder="设置AI成员的行为规范和角色定位"
            class="form-input"
            rows="4"
          ></textarea>
        </div>

        <div class="form-section">
          <div class="section-title">技能标签</div>
          <div class="skills-input">
            <input 
              v-model="newSkill"
              type="text"
              placeholder="输入技能标签后按回车添加"
              class="form-input"
              @keyup.enter="addSkill"
            >
          </div>
          <div class="skills-list" v-if="formData.skills && formData.skills.length > 0">
            <span 
              v-for="(skill, index) in formData.skills" 
              :key="index"
              class="skill-tag"
            >
              {{ skill }}
              <button class="remove-skill" @click="removeSkill(index)">&times;</button>
            </span>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">模型配置</div>
          <div class="form-group">
            <label>语言模型</label>
            <select v-model="formData.modelId" class="form-input">
              <option value="">请选择模型</option>
              <option 
                v-for="model in models" 
                :key="model.id" 
                :value="model.id"
              >
                {{ model.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>温度</label>
            <div class="range-input">
              <input 
                type="range" 
                v-model="formData.temperature" 
                min="0" 
                max="2" 
                step="0.1"
                class="range-slider"
              >
              <span class="range-value">{{ formData.temperature }}</span>
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
.agent-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
}

.agent-editor {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 1280px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.2s ease-out;
}

.editor-header {
  padding: 24px 28px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3 {
  margin: 0;
  font-size: 20px;
  color: #1f1f1f;
  font-weight: 600;
}

.editor-body {
  padding: 48px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
}

.form-group {
  margin-bottom: 24px;
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
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  line-height: 1.5;
  color: #1f1f1f;
  background: white;
  transition: all 0.2s;
}

.form-input:hover {
  border-color: #1890ff;
}

.form-input:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

select.form-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8.825L1.175 4 2.238 2.938 6 6.7l3.763-3.762L10.825 4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

textarea.form-input {
  min-height: 80px;
  resize: vertical;
}

.form-section {
  margin-bottom: 28px;
  padding-top: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  margin-bottom: 16px;
}

.skills-input {
  margin-bottom: 12px;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
}

.skill-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 6px;
  font-size: 13px;
}

.remove-skill {
  background: none;
  border: none;
  color: #1890ff;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.remove-skill:hover {
  opacity: 1;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-slider {
  flex: 1;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  appearance: none;
}

.range-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.range-value {
  min-width: 40px;
  text-align: right;
  font-size: 14px;
  color: #666;
}

.editor-footer {
  padding: 20px 28px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn,
.save-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #e5e5e5;
  color: #666;
}

.cancel-btn:hover {
  background: #e8e8e8;
  border-color: #d9d9d9;
  color: #333;
}

.save-btn {
  background: #1890ff;
  border: 1px solid #1890ff;
  color: white;
  min-width: 88px;
}

.save-btn:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.25);
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
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
  border: 2px solid #f5f5f5;
}

::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}
</style>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  agent: Object,
  isNew: Boolean,
  models: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['save', 'close'])

const newSkill = ref('')

// 表单数据初始化
const formData = ref({
  name: '',
  description: '',
  systemPrompt: '',
  modelId: '',
  temperature: 0.7,
  skills: []
})

// 初始化表单数据
onMounted(() => {
  if (props.agent) {
    // 确保深拷贝数组
    const agentData = {
      ...props.agent,
      skills: props.agent.skills ? [...props.agent.skills] : []
    }
    formData.value = {
      ...formData.value,
      ...agentData
    }
  }
})

const addSkill = () => {
  if (newSkill.value.trim()) {
    if (!formData.value.skills) {
      formData.value.skills = []
    }
    formData.value.skills.push(newSkill.value.trim())
    newSkill.value = ''
  }
}

const removeSkill = (index) => {
  formData.value.skills.splice(index, 1)
}

const handleSave = () => {
  if (!formData.value.name) {
    alert('请输入AI成员名称')
    return
  }
  
  if (!formData.value.systemPrompt) {
    alert('请输入系统提示词')
    return
  }
  
  emit('save', { ...formData.value })
}
</script> 