<template>
  <div class="agent-editor">
    <div class="editor-header">
      <h3>{{ isEditing ? '编辑AI成员' : '创建AI成员' }}</h3>
      <button @click="$emit('close')" class="close-btn">&times;</button>
    </div>
    
    <div class="editor-body">
      <div class="form-group">
        <label>名称</label>
        <input v-model="form.name" placeholder="输入AI成员名称">
      </div>
      
      <div class="form-group">
        <label>描述</label>
        <textarea 
          v-model="form.description" 
          placeholder="描述AI成员的特点和能力"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label>技能</label>
        <div class="skills-input">
          <input 
            v-model="newSkill" 
            @keyup.enter="addSkill"
            placeholder="输入技能名称并按回车添加"
          >
          <button @click="addSkill" class="add-btn">添加</button>
        </div>
        <div class="skills-list">
          <div 
            v-for="(skill, index) in form.skills" 
            :key="index"
            class="skill-tag"
          >
            {{ skill }}
            <button @click="removeSkill(index)" class="remove-btn">&times;</button>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label>系统提示词</label>
        <textarea 
          v-model="form.systemPrompt" 
          placeholder="设置AI成员的系统提示词"
          rows="5"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label>模型</label>
        <select v-model="form.modelId">
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
      
      <div class="form-group">
        <label>温度</label>
        <div class="slider-container">
          <input 
            type="range" 
            v-model.number="form.temperature" 
            min="0" 
            max="2" 
            step="0.1"
          >
          <span class="slider-value">{{ form.temperature }}</span>
        </div>
      </div>
    </div>
    
    <div class="editor-footer">
      <button @click="saveAgent" class="save-btn">保存</button>
      <button @click="$emit('close')" class="cancel-btn">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
  agent: {
    type: Object,
    default: () => null
  },
  models: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['save', 'close']);

const isEditing = computed(() => !!props.agent);
const form = ref({
  id: '',
  name: '',
  description: '',
  skills: [],
  systemPrompt: '',
  modelId: '',
  temperature: 0.7
});
const newSkill = ref('');

// 初始化表单
onMounted(() => {
  if (props.agent) {
    form.value = { ...props.agent };
  }
});

// 添加技能
const addSkill = () => {
  if (newSkill.value.trim()) {
    form.value.skills.push(newSkill.value.trim());
    newSkill.value = '';
  }
};

// 移除技能
const removeSkill = (index) => {
  form.value.skills.splice(index, 1);
};

// 保存AI成员
const saveAgent = () => {
  if (!form.value.name) {
    alert('请输入AI成员名称');
    return;
  }
  
  const agentData = { ...form.value };
  if (!agentData.id) {
    agentData.id = Date.now().toString();
  }
  
  emit('save', agentData);
};
</script>

<style scoped>
.agent-editor {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.editor-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e8e8e8;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.skills-input {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.skills-input input {
  flex: 1;
}

.add-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  padding: 0 12px;
  border-radius: 4px;
  cursor: pointer;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.remove-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.slider-container input {
  flex: 1;
}

.slider-value {
  min-width: 30px;
  text-align: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.save-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: white;
  color: #666;
  border: 1px solid #d9d9d9;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style> 