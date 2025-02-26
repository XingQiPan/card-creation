<template>
  <div 
    class="task-node"
    :class="{
      'root-node': isRoot,
      'is-selected': isSelected,
      'status-pending': task.status === 'pending',
      'status-running': task.status === 'running',
      'status-completed': task.status === 'completed',
      'status-failed': task.status === 'failed'
    }"
    @click.stop="$emit('select', task.id)"
  >
    <div class="task-header">
      <div class="task-title">
        <span class="status-indicator"></span>
        <h4>{{ task.title }}</h4>
      </div>
      <div class="task-assignee" v-if="assignedAgent">
        <i class="fas fa-user-circle"></i> {{ assignedAgent.name }}
      </div>
    </div>
    
    <div class="task-description" v-if="task.description">
      {{ task.description }}
    </div>
    
    <div class="task-output" v-if="task.output">
      <div class="output-header">
        <h5>任务输出</h5>
        <div class="output-actions">
          <button @click.stop="copyOutput" title="复制输出">
            <i class="fas fa-copy"></i>
          </button>
          <button @click.stop="rewriteOutput" title="重写输出">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button @click.stop="summarizeOutput" title="总结输出">
            <i class="fas fa-compress-alt"></i>
          </button>
        </div>
      </div>
      <div class="output-content">{{ task.output }}</div>
    </div>
    
    <div class="task-error" v-if="task.error">
      <div class="error-header">
        <h5>执行错误</h5>
      </div>
      <div class="error-content">{{ task.error }}</div>
    </div>
    
    <div class="task-actions">
      <button @click.stop="$emit('execute', task)" title="执行任务" :disabled="task.status === 'running'">
        <i class="fas fa-play"></i>
      </button>
      <button @click.stop="$emit('add-subtask', task)" title="添加子任务">
        <i class="fas fa-plus"></i>
      </button>
      <button @click.stop="$emit('edit', task)" title="编辑任务">
        <i class="fas fa-edit"></i>
      </button>
      <button @click.stop="$emit('delete', task)" title="删除任务">
        <i class="fas fa-trash"></i>
      </button>
      <button @click.stop="$emit('assign', task)" title="分配任务">
        <i class="fas fa-user-check"></i>
      </button>
    </div>
    
    <div class="subtasks" v-if="task.subtasks && task.subtasks.length">
      <draggable 
        v-model="task.subtasks"
        class="subtask-list"
        item-key="id"
        handle=".drag-handle"
        group="tasks"
        @start="isDragging = true"
        @end="handleDragEnd"
      >
        <template #item="{element: subtask}">
          <div class="subtask-item">
            <div class="drag-handle">
              <i class="fas fa-grip-vertical"></i>
            </div>
            <task-node 
              :task="subtask" 
              :agents="agents"
              :scenes="scenes"
              :is-root="false"
              :selected-id="selectedId"
              @execute="$emit('execute', subtask)"
              @add-subtask="$emit('add-subtask', subtask)"
              @edit="$emit('edit', subtask)"
              @delete="$emit('delete', subtask)"
              @assign="$emit('assign', subtask)"
              @select="$emit('select', $event)"
            />
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  agents: {
    type: Array,
    default: () => []
  },
  scenes: {
    type: Array,
    default: () => []
  },
  isRoot: {
    type: Boolean,
    default: false
  },
  selectedId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits([
  'execute', 
  'add-subtask', 
  'edit', 
  'delete', 
  'assign', 
  'select',
  'update:task'
])

const isDragging = ref(false)

const isSelected = computed(() => {
  return props.selectedId === props.task.id
})

// 获取分配的代理
const assignedAgent = computed(() => {
  if (!props.task.assignedTo || !props.agents) return null
  return props.agents.find(agent => agent.id === props.task.assignedTo)
})

// 处理拖拽结束
const handleDragEnd = () => {
  isDragging.value = false
  nextTick(() => {
    // 通知父组件任务顺序已更新
    emit('update:task', props.task)
  })
}

// 复制输出到剪贴板
const copyOutput = () => {
  if (!props.task.output) return
  
  navigator.clipboard.writeText(props.task.output)
    .then(() => {
      // 可以添加一个通知提示复制成功
      console.log('输出已复制到剪贴板')
    })
    .catch(err => {
      console.error('复制失败:', err)
    })
}

// 重写输出
const rewriteOutput = () => {
  if (!props.task.output) return
  
  emit('execute', {
    ...props.task,
    action: 'rewrite'
  })
}

// 总结输出
const summarizeOutput = () => {
  if (!props.task.output) return
  
  emit('execute', {
    ...props.task,
    action: 'summarize'
  })
}

// 解析任务标题中的代理和场景分配
watch(() => props.task.title, (newTitle) => {
  if (!newTitle) return
  
  // 匹配 @代理名::场景名 格式
  const match = newTitle.match(/@([^:]+)::([^:\s]+)/)
  
  if (match) {
    const agentName = match[1].trim()
    const sceneName = match[2].trim()
    
    // 查找匹配的代理
    if (agentName && props.agents) {
      const agent = props.agents.find(a => 
        a.name.toLowerCase() === agentName.toLowerCase()
      )
      
      if (agent && agent.id !== props.task.assignedTo) {
        // 自动分配代理
        emit('assign', {
          ...props.task,
          assignedTo: agent.id
        })
      }
    }
    
    // 查找匹配的场景
    if (sceneName && props.scenes) {
      const scene = props.scenes.find(s => 
        s.name.toLowerCase() === sceneName.toLowerCase()
      )
      
      if (scene && scene.id !== props.task.relatedSceneId) {
        // 自动关联场景
        emit('edit', {
          ...props.task,
          relatedSceneId: scene.id
        })
      }
    }
  }
}, { immediate: true })
</script>

<style scoped>
.task-node {
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  transition: all 0.3s;
}

.task-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.task-node.is-selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #d9d9d9;
}

.status-pending .status-indicator {
  background-color: #faad14;
}

.status-running .status-indicator {
  background-color: #1890ff;
}

.status-completed .status-indicator {
  background-color: #52c41a;
}

.status-failed .status-indicator {
  background-color: #f5222d;
}

.task-assignee {
  font-size: 0.85rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.task-description {
  margin-bottom: 0.75rem;
  color: #666;
  font-size: 0.9rem;
}

.task-output, .task-error {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.task-output {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
}

.task-error {
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
}

.output-header, .error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.output-header h5, .error-header h5 {
  margin: 0;
  font-size: 0.9rem;
}

.output-actions {
  display: flex;
  gap: 0.25rem;
}

.output-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: #666;
}

.output-actions button:hover {
  color: #1890ff;
}

.output-content, .error-content {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.85rem;
}

.error-content {
  color: #f5222d;
}

.task-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
}

.task-actions button {
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.task-actions button:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.task-actions button:disabled {
  color: #d9d9d9;
  border-color: #d9d9d9;
  cursor: not-allowed;
}

.subtasks {
  margin-top: 1rem;
  padding-left: 1.5rem;
  border-left: 1px dashed #d9d9d9;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subtask-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.drag-handle {
  padding: 0.5rem 0.25rem;
  color: #999;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.root-node {
  border-left: 4px solid #1890ff;
}
</style>
