<template>
  <div class="task-editor">
    <div class="editor-header">
      <h3>{{ isEditing ? '编辑任务' : '创建任务' }}</h3>
      <button @click="$emit('close')" class="close-btn">&times;</button>
    </div>
    
    <div class="editor-body">
      <div class="form-group">
        <label>任务标题</label>
        <input 
          v-model="form.title" 
          placeholder="输入任务标题"
        >
        <small>使用@成员名::场景名可直接指派任务</small>
      </div>
      
      <div class="form-group">
        <label>任务描述</label>
        <textarea 
          v-model="form.description" 
          placeholder="描述任务目标和要求"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label>指派给AI成员</label>
        <select v-model="form.assignedTo">
          <option value="">未指派</option>
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
        <div class="form-section-title">场景卡片集成</div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.readSceneCards">
            读取场景卡片内容
          </label>
          <div class="form-hint">任务执行时将读取场景中的卡片内容作为上下文</div>
        </div>
        
        <div class="form-group" v-if="form.readSceneCards">
          <label>卡片搜索方式</label>
          <select v-model="form.cardSearchMethod">
            <option value="title">按标题搜索</option>
            <option value="tag">按标签搜索</option>
            <option value="all">读取所有卡片</option>
          </select>
        </div>
        
        <div class="form-group" v-if="form.readSceneCards && form.cardSearchMethod !== 'all'">
          <label>{{ form.cardSearchMethod === 'title' ? '卡片标题关键词' : '卡片标签关键词' }}</label>
          <input 
            v-model="form.cardSearchQuery" 
            :placeholder="form.cardSearchMethod === 'title' ? '输入标题关键词，多个关键词用逗号分隔' : '输入标签关键词，多个标签用逗号分隔'"
          >
        </div>
        
        <div class="form-group">
          <label>从哪个场景读取卡片</label>
          <select v-model="form.sourceSceneId">
            <option value="">不指定场景</option>
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
            <input type="checkbox" v-model="form.generateSceneCard">
            生成场景卡片
          </label>
          <div class="form-hint">任务执行完成后将结果生成为场景卡片</div>
        </div>
        
        <div class="form-group" v-if="form.generateSceneCard">
          <label>生成卡片到场景</label>
          <select v-model="form.targetSceneId">
            <option value="">选择目标场景</option>
            <option 
              v-for="scene in scenes" 
              :key="scene.id" 
              :value="scene.id"
            >
              {{ scene.name }}
            </option>
          </select>
        </div>
        
        <div class="form-group" v-if="form.generateSceneCard">
          <label>生成卡片标题前缀</label>
          <input 
            v-model="form.cardTitlePrefix" 
            placeholder="例如: 任务结果 - "
          >
          <div class="form-hint">将自动添加任务标题作为后缀</div>
        </div>
        
        <div class="form-group" v-if="form.generateSceneCard">
          <label>卡片标签</label>
          <input 
            v-model="form.cardTags" 
            placeholder="输入标签，多个标签用逗号分隔"
          >
        </div>
      </div>
      
      <div class="form-section">
        <div class="form-section-title">上下文设置</div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.includeParentContext">
            包含父任务上下文
          </label>
          <div class="form-hint">任务执行时将包含父任务的输出作为上下文</div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.includeRelatedContext">
            包含相关任务上下文
          </label>
        </div>
        
        <div class="form-group" v-if="form.includeRelatedContext">
          <label>相关任务</label>
          <select v-model="form.relatedTaskId">
            <option value="">选择相关任务</option>
            <option 
              v-for="task in availableTasks" 
              :key="task.id" 
              :value="task.id"
            >
              {{ task.title }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-section">
        <div class="form-section-title">响应格式</div>
        
        <div class="form-group">
          <label>响应格式</label>
          <select v-model="form.responseFormat">
            <option value="text">纯文本</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        
        <div class="form-group" v-if="form.responseFormat === 'json'">
          <label>JSON响应模板</label>
          <textarea 
            v-model="form.jsonTemplate" 
            rows="5"
            placeholder='例如: {"content": "", "isComplete": false}'
          ></textarea>
          <div class="form-hint">
            建议使用包含 content 和 isComplete 字段的JSON格式，以便系统判断任务是否完成
          </div>
          <div class="json-template">
            <pre>{"content": "任务生成的内容", "isComplete": true}</pre>
          </div>
        </div>
      </div>
    </div>
    
    <div class="editor-footer">
      <button @click="saveTask" class="save-btn">保存</button>
      <button @click="$emit('close')" class="cancel-btn">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  task: {
    type: Object,
    default: () => null
  },
  parentTask: {
    type: Object,
    default: () => null
  },
  allTasks: {
    type: Array,
    default: () => []
  },
  agents: {
    type: Array,
    default: () => []
  },
  scenes: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['save', 'close']);

const isEditing = computed(() => !!props.task);
const form = ref({
  id: '',
  title: '',
  description: '',
  assignedTo: '',
  sceneId: '',
  relatedTaskId: '',
  includeParentContext: true,
  includeRelatedContext: false,
  customPrompt: '',
  status: 'pending',
  output: '',
  error: '',
  subtasks: [],
  
  // 场景卡片读取设置
  readSceneCards: false,
  cardSearchMethod: 'title',
  cardSearchQuery: '',
  sourceSceneId: '',
  
  // 场景卡片生成设置
  generateSceneCard: false,
  targetSceneId: '',
  cardTitlePrefix: '任务结果 - ',
  cardTags: '',
  
  // 响应格式设置
  responseFormat: 'text',
  jsonTemplate: '{"content": "", "isComplete": false}'
});

// 可选的相关任务（排除自己和子任务）
const availableTasks = computed(() => {
  return props.allTasks.filter(task => {
    if (form.value.id && task.id === form.value.id) {
      return false;
    }
    
    // 检查是否是当前任务的子任务
    const isSubtask = (subtasks, taskId) => {
      for (const subtask of subtasks) {
        if (subtask.id === taskId) {
          return true;
        }
        if (subtask.subtasks && subtask.subtasks.length > 0) {
          if (isSubtask(subtask.subtasks, taskId)) {
            return true;
          }
        }
      }
      return false;
    };
    
    if (form.value.subtasks && form.value.subtasks.length > 0) {
      if (isSubtask(form.value.subtasks, task.id)) {
        return false;
      }
    }
    
    return true;
  });
});

// 初始化表单
onMounted(() => {
  if (props.task) {
    // 编辑现有任务
    form.value = { ...props.task };
  } else if (props.parentTask) {
    // 创建子任务，继承父任务的一些属性
    form.value.sceneId = props.parentTask.sceneId || '';
  }
});

// 保存任务
const saveTask = () => {
  if (!form.value.title) {
    alert('请输入任务标题');
    return;
  }
  
  const taskData = { ...form.value };
  if (!taskData.id) {
    taskData.id = Date.now().toString();
  }
  
  // 解析@成员::场景语法
  const match = taskData.title.match(/@([^:]+)::([^\s]+)/);
  if (match) {
    const agentName = match[1];
    const sceneName = match[2];
    
    // 查找对应的成员和场景
    const agent = props.agents.find(a => a.name === agentName);
    const scene = props.scenes.find(s => s.name === sceneName);
    
    if (agent) {
      taskData.assignedTo = agent.id;
    }
    
    if (scene) {
      taskData.sceneId = scene.id;
    }
    
    // 移除标题中的@语法
    taskData.title = taskData.title.replace(/@([^:]+)::([^\s]+)/, '').trim();
  }
  
  // 处理标签字符串转换为数组
  if (taskData.generateSceneCard && taskData.cardTags) {
    const tagsArray = taskData.cardTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    // 保存为字符串，但在使用时转换为数组
    taskData.cardTagsArray = tagsArray;
  }
  
  // 处理卡片搜索关键词
  if (taskData.readSceneCards && taskData.cardSearchQuery) {
    const queryArray = taskData.cardSearchQuery
      .split(',')
      .map(q => q.trim())
      .filter(q => q);
    
    // 保存为字符串，但在使用时转换为数组
    taskData.cardSearchQueryArray = queryArray;
  }
  
  emit('save', taskData);
};
</script>

<style scoped>
.task-editor {
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

.checkbox-group {
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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

.form-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section-title {
  font-weight: 500;
  margin-bottom: 15px;
  color: #333;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.json-template {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}
</style> 