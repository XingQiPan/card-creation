<template>
  <div 
    class="flow-node"
    :class="[
      `node-type-${nodeData.type}`,
      { selected, dragging: isDragging }
    ]"
    :data-node-id="nodeId"
    @click.stop="$emit('select', nodeId)"
  >
    <!-- 节点头部 -->
    <div class="node-header" @mousedown.stop="startDrag">
      <i :class="getNodeIcon()"></i>
      <span class="node-title">{{ nodeData.name || getDefaultNodeName() }}</span>
      <div class="node-actions">
        <button 
          v-if="!isStartNode && !isEndNode"
          @click.stop="$emit('delete', nodeId)" 
          class="delete-btn"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- 节点内容 -->
    <div class="node-content">
      <!-- 消息节点 -->
      <div v-if="nodeData.type === 'message'" class="message-content">
        <div class="message-preview">{{ getMessagePreview() }}</div>
      </div>

      <!-- 条件节点 -->
      <div v-if="nodeData.type === 'condition'" class="condition-content">
        <div class="condition-preview">{{ getConditionPreview() }}</div>
      </div>

      <!-- API调用节点 -->
      <div v-if="nodeData.type === 'api'" class="api-content">
        <div class="api-preview">{{ getApiPreview() }}</div>
      </div>
      
      <!-- 大模型调用节点 -->
      <div v-if="nodeData.type === 'llm'" class="llm-content">
        <div class="llm-preview">{{ getLLMPreview() }}</div>
      </div>
      
      <!-- 函数节点 -->
      <div v-if="nodeData.type === 'function'" class="function-content">
        <div class="function-preview">{{ getFunctionPreview() }}</div>
      </div>
      
      <!-- 延时节点 -->
      <div v-if="nodeData.type === 'delay'" class="delay-content">
        <div class="delay-preview">{{ getDelayPreview() }}</div>
      </div>
    </div>

    <!-- 连接点 -->
    <div 
      v-if="!isStartNode"
      class="connection-point input"
      @mousedown.stop="$emit('connection-start', { nodeId, pointType: 'input' })"
    ></div>
    
    <div 
      v-if="!isEndNode"
      class="connection-point output"
      @mousedown.stop="$emit('connection-start', { nodeId, pointType: 'output' })"
    ></div>
    
    <div 
      v-if="nodeData.type === 'condition'"
      class="connection-point output-false"
      @mousedown.stop="$emit('connection-start', { nodeId, pointType: 'output-false' })"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  nodeId: {
    type: String,
    required: true
  },
  nodeData: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select', 'delete', 'connection-start', 'update-position']);

// 计算属性
const isStartNode = computed(() => props.nodeData.type === 'start');
const isEndNode = computed(() => props.nodeData.type === 'end');

// 拖拽状态
const isDragging = ref(false);
let startX = 0;
let startY = 0;
let startNodeX = 0;
let startNodeY = 0;

// 开始拖拽
const startDrag = (event) => {
  if (event.button !== 0) return; // 只响应左键
  
  isDragging.value = true;
  
  // 记录起始位置
  startX = event.clientX;
  startY = event.clientY;
  startNodeX = props.nodeData.position.x;
  startNodeY = props.nodeData.position.y;
  
  // 添加全局事件监听
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('mouseup', stopDrag);
  
  // 阻止文本选择
  event.preventDefault();
};

// 处理拖拽
const handleDrag = (event) => {
  if (!isDragging.value) return;
  
  // 计算偏移量
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  
  // 计算新位置
  const newX = Math.max(0, startNodeX + dx);
  const newY = Math.max(0, startNodeY + dy);
  
  // 发送位置更新事件
  emit('update-position', {
    id: props.nodeId,
    position: { x: newX, y: newY }
  });
};

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;
  
  // 移除全局事件监听
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
};

// 获取节点图标
const getNodeIcon = () => {
  switch (props.nodeData.type) {
    case 'start': return 'fas fa-play-circle';
    case 'end': return 'fas fa-stop-circle';
    case 'message': return 'fas fa-comment';
    case 'condition': return 'fas fa-code-branch';
    case 'api': return 'fas fa-cloud';
    case 'function': return 'fas fa-code';
    case 'llm': return 'fas fa-brain';
    case 'delay': return 'fas fa-clock';
    default: return 'fas fa-circle';
  }
};

// 获取默认节点名称
const getDefaultNodeName = () => {
  switch (props.nodeData.type) {
    case 'start': return '开始';
    case 'end': return '结束';
    case 'message': return '消息';
    case 'condition': return '条件';
    case 'api': return 'API调用';
    case 'function': return '函数';
    case 'llm': return '大模型调用';
    case 'delay': return '延时';
    default: return '节点';
  }
};

// 获取消息预览
const getMessagePreview = () => {
  const message = props.nodeData.data?.message || '';
  return message.length > 50 ? message.substring(0, 50) + '...' : message;
};

// 获取条件预览
const getConditionPreview = () => {
  const condition = props.nodeData.data?.condition || '';
  return condition.length > 50 ? condition.substring(0, 50) + '...' : condition;
};

// 获取API预览
const getApiPreview = () => {
  const method = props.nodeData.data?.method || 'GET';
  const endpoint = props.nodeData.data?.endpoint || '';
  return `${method} ${endpoint}`;
};

// 获取大模型调用预览
const getLLMPreview = () => {
  const modelId = props.nodeData.data?.modelId || '未选择模型';
  const prompt = props.nodeData.data?.prompt || '';
  const promptPreview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
  return `${modelId}: ${promptPreview}`;
};

// 获取函数预览
const getFunctionPreview = () => {
  const functionName = props.nodeData.data?.functionName || '未指定函数';
  return `函数: ${functionName}`;
};

// 获取延时预览
const getDelayPreview = () => {
  const duration = props.nodeData.data?.duration || 0;
  const unit = props.nodeData.data?.unit || 'ms';
  return `等待: ${duration}${unit}`;
};
</script>

<style scoped>
.flow-node {
  position: absolute;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  min-width: 150px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  user-select: none;
  z-index: 1;
}

.flow-node.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.flow-node.dragging {
  opacity: 0.8;
  z-index: 1000;
}

.node-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
  cursor: move;
}

.node-header i {
  margin-right: 8px;
  color: #6b7280;
}

.node-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.node-actions {
  display: flex;
}

.delete-btn {
  padding: 4px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
}

.delete-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.node-content {
  padding: 12px;
  min-height: 40px;
}

.message-preview,
.condition-preview,
.api-preview,
.llm-preview,
.function-preview,
.delay-preview {
  font-size: 12px;
  color: #6b7280;
  white-space: pre-wrap;
  word-break: break-word;
}

.connection-point {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  cursor: crosshair;
  z-index: 2;
}

.connection-point:hover {
  background: #3b82f6;
}

.connection-point.input {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point.output {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.connection-point.output-false {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
}

/* 节点类型特定样式 */
.node-type-start .node-header {
  background: #dcfce7;
  border-color: #86efac;
}

.node-type-end .node-header {
  background: #fee2e2;
  border-color: #fca5a5;
}

.node-type-condition .node-header {
  background: #dbeafe;
  border-color: #93c5fd;
}

.node-type-api .node-header {
  background: #f3e8ff;
  border-color: #c084fc;
}

.node-type-llm .node-header {
  background: #f0fdf4;
  border-color: #86efac;
}

.node-type-function .node-header {
  background: #eff6ff;
  border-color: #93c5fd;
}

.node-type-delay .node-header {
  background: #fef3c7;
  border-color: #fcd34d;
}
</style>