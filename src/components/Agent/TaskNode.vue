<template>
  <div 
    class="task-node"
    :class="{
      'root-node': isRoot,
      'is-selected': task.id === selectedTaskId,
      'status-pending': task.status === 'pending',
      'status-running': task.status === 'running',
      'status-completed': task.status === 'completed',
      'status-failed': task.status === 'failed'
    }"
    @click.stop="handleSelect"
  >
    <div class="task-content" @click.stop>
      <div class="task-header">
        <div class="task-title">
          <span class="status-indicator"></span>
          <h4>{{ task.title }}</h4>
          <span class="task-status" :class="task.status">{{ getStatusText(task.status) }}</span>
        </div>
        <div class="task-assignee" v-if="assignedAgent">
          <i class="fas fa-user-circle"></i> {{ assignedAgent.name }}
        </div>
      </div>
      
      <div class="task-description" v-if="task.description">
        {{ task.description }}
      </div>
      
      <div class="task-actions">
        <button 
          @click.stop="$emit('execute', task)"
          :disabled="isExecuting || task.status === 'running'"
          class="action-btn execute-btn"
          title="执行任务"
        >
          <i class="fas fa-play"></i> 执行
        </button>
        <button 
          v-if="task.subtasks && task.subtasks.length > 0"
          @click.stop="$emit('execute-all', task)"
          :disabled="isExecuting"
          class="action-btn execute-all-btn"
          title="执行所有子任务"
        >
          <i class="fas fa-play-circle"></i> 执行所有
        </button>
        <button 
          @click.stop="$emit('add-subtask', task)"
          class="action-btn add-btn"
          title="添加子任务"
        >
          <i class="fas fa-plus"></i> 添加子任务
        </button>
        <button 
          @click.stop="$emit('edit', task)"
          class="action-btn edit-btn"
          title="编辑任务"
        >
          <i class="fas fa-edit"></i> 编辑
        </button>
        <button 
          v-if="!isRoot"
          @click.stop="$emit('delete', task.id)"
          class="action-btn delete-btn"
          title="删除任务"
        >
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
      
      <div class="task-output" v-if="task.output">
        <div class="output-header">
          <h5>任务输出</h5>
          <div class="output-actions">
            <button @click.stop="handleCopyOutput" title="复制输出" class="icon-btn">
              <i class="fas fa-copy"></i>
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
    </div>
    
    <div 
      v-if="task.subtasks && task.subtasks.length > 0" 
      class="subtasks"
      @click.stop
    >
      <task-node
        v-for="subtask in task.subtasks"
        :key="subtask.id"
        :task="subtask"
        :agents="agents"
        :scenes="scenes"
        :selected-id="selectedId"
        :is-executing="isExecuting"
        @execute="$emit('execute', $event)"
        @execute-all="$emit('execute-all', $event)"
        @delete="$emit('delete', $event)"
        @add-subtask="$emit('add-subtask', $event)"
        @edit="$emit('edit', $event)"
        @select="$emit('select', subtask.id)"
      />
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
  selectedTaskId: {
    type: String,
    default: null
  },
  isExecuting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['execute', 'execute-all', 'delete', 'add-subtask', 'edit'])

const isDragging = ref(false)

const isSelected = computed(() => {
  return props.selectedTaskId === props.task.id
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
const handleCopyOutput = async () => {
  if (!props.task.output) return
  
  try {
    await navigator.clipboard.writeText(props.task.output)
    console.log('输出已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
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

const getStatusText = (status) => {
  switch (status) {
    case 'pending': return '待执行'
    case 'running': return '执行中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return '未知'
  }
}

// 处理任务选择
const handleSelect = (event) => {
  event.stopPropagation()
  console.log('TaskNode: 选择任务:', props.task.id)
  emit('select', props.task.id)
}
</script>

<style scoped>
.task-node {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.task-node:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.root-node {
  border-left: 4px solid #1890ff;
}

.is-selected {
  border: 2px solid #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.status-pending {
  border-left: 4px solid #faad14;
}

.status-running {
  border-left: 4px solid #1890ff;
  animation: pulse 2s infinite;
}

.status-completed {
  border-left: 4px solid #52c41a;
}

.status-failed {
  border-left: 4px solid #f5222d;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
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
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.task-description {
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  border: none;
  color: white;
}

.execute-btn {
  background-color: #52c41a;
}

.execute-all-btn {
  background-color: #1890ff;
}

.add-btn {
  background-color: #722ed1;
}

.edit-btn {
  background-color: #1890ff;
}

.delete-btn {
  background-color: #f5222d;
}

.action-btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.task-output, .task-error {
  margin-bottom: 16px;
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
}

.output-header, .error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.output-header h5, .error-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.output-actions {
  display: flex;
  gap: 5px;
}

.icon-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
}

.icon-btn:hover {
  color: #1890ff;
}

.output-content, .error-content {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

.error-content {
  color: #f5222d;
}

.subtasks {
  margin-top: 16px;
  margin-left: 24px;
  padding-left: 16px;
  border-left: 2px dashed #d9d9d9;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f5f5f5;
}

.task-status.running {
  background: #e6f7ff;
  color: #1890ff;
}

.task-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.task-status.failed {
  background: #fff2f0;
  color: #ff4d4f;
}

.is-root > .task-content {
  border-width: 2px;
}

.task-node.is-selected > .task-content {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
</style>
