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
        <label>指派给</label>
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
      
      <div class="form-group">
        <label>场景</label>
        <select v-model="form.sceneId">
          <option value="">无场景</option>
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
        <label>相关任务</label>
        <select v-model="form.relatedTaskId">
          <option value="">无相关任务</option>
          <option 
            v-for="task in availableTasks" 
            :key="task.id" 
            :value="task.id"
          >
            {{ task.title }}
          </option>
        </select>
      </div>
      
      <div class="form-group">
        <label>上下文设置</label>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="form.includeParentContext"
            >
            包含父任务输出作为上下文
          </label>
        </div>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="form.includeRelatedContext"
            >
            包含相关任务输出作为上下文
          </label>
        </div>
      </div>
      
      <div class="form-group">
        <label>自定义提示词</label>
        <textarea 
          v-model="form.customPrompt" 
          placeholder="可选：为此任务设置自定义提示词"
          rows="3"
        ></textarea>
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
  subtasks: []
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

.form-group small {
  display: block;
  color: #999;
  margin-top: 4px;
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
</style> 