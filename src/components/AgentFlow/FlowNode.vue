<template>
  <div 
    class="flow-node" 
    :class="[nodeData.type, { 'selected': selected }]"
    :data-node-id="nodeId"
    @click.stop="selectNode"
  >
    <div class="node-header">
      <div class="node-type">
        <i :class="getNodeIcon(nodeData.type)"></i>
        {{ getNodeTypeName(nodeData.type) }}
      </div>
      <div class="node-actions">
        <button @click.stop="$emit('configure', nodeData)" class="config-btn">
          <i class="fas fa-cog"></i>
        </button>
        <button @click.stop="$emit('delete', nodeId)" class="delete-btn">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    
    <div class="node-content">
      <h4>{{ nodeData.name || `${getNodeTypeName(nodeData.type)} ${nodeId.slice(0, 4)}` }}</h4>
      <div v-if="nodeData.description" class="node-description">
        {{ nodeData.description }}
      </div>
    </div>
    
    <!-- 连接点 -->
    <div class="connection-points">
      <!-- 输出连接点 -->
      <div 
        v-if="nodeData.type !== 'end'" 
        class="connection-point output"
        @mousedown.stop="startConnectionOutput"
        data-connection-type="output"
      >
        <i class="fas fa-arrow-right"></i>
      </div>
      
      <!-- 条件节点的额外连接点 -->
      <div 
        v-if="nodeData.type === 'condition'" 
        class="connection-point true-output"
        @mousedown.stop="startConnectionTrue"
        data-connection-type="true-output"
      >
        <span>✓</span>
      </div>
      
      <div 
        v-if="nodeData.type === 'condition'" 
        class="connection-point false-output"
        @mousedown.stop="startConnectionFalse"
        data-connection-type="false-output"
      >
        <span>✗</span>
      </div>
      
      <!-- 输入连接点 -->
      <div 
        v-if="nodeData.type !== 'start'" 
        class="connection-point input"
        data-connection-type="input"
        data-node-id="nodeId"
      >
        <i class="fas fa-arrow-left"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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

const emit = defineEmits(['select', 'configure', 'delete', 'connection-start']);

const selectNode = () => {
  emit('select', props.nodeId);
};

// 开始从默认输出点创建连接
const startConnectionOutput = (event) => {
  const rect = event.target.getBoundingClientRect();
  const point = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  emit('connection-start', {
    nodeId: props.nodeId,
    point,
    type: 'default'
  });
};

// 开始从"真"输出点创建连接
const startConnectionTrue = (event) => {
  const rect = event.target.getBoundingClientRect();
  const point = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  emit('connection-start', {
    nodeId: props.nodeId,
    point,
    type: 'true'
  });
};

// 开始从"假"输出点创建连接
const startConnectionFalse = (event) => {
  const rect = event.target.getBoundingClientRect();
  const point = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  emit('connection-start', {
    nodeId: props.nodeId,
    point,
    type: 'false'
  });
};

// 获取节点类型图标
const getNodeIcon = (type) => {
  switch (type) {
    case 'start':
      return 'fas fa-play-circle';
    case 'end':
      return 'fas fa-stop-circle';
    case 'condition':
      return 'fas fa-code-branch';
    case 'message':
      return 'fas fa-comment';
    default:
      return 'fas fa-square';
  }
};

// 获取节点类型名称
const getNodeTypeName = (type) => {
  switch (type) {
    case 'start':
      return '开始';
    case 'end':
      return '结束';
    case 'condition':
      return '条件';
    case 'message':
      return '消息';
    default:
      return '节点';
  }
};
</script>

<style scoped>
.flow-node {
  width: 200px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  user-select: none;
  transition: box-shadow 0.2s;
}

.flow-node.selected {
  box-shadow: 0 0 0 2px #3b82f6, 0 2px 4px rgba(0, 0, 0, 0.1);
}

.node-header {
  padding: 12px;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  background-color: #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.node-actions {
  display: flex;
  gap: 4px;
}

.config-btn, .delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
}

.config-btn:hover, .delete-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.delete-btn:hover {
  color: #ef4444;
}

.node-content {
  padding: 12px;
}

.node-content h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.node-description {
  font-size: 12px;
  color: #6b7280;
  word-break: break-word;
}

/* 连接点样式 */
.connection-points {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.connection-point {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: white;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #3b82f6;
  cursor: pointer;
  pointer-events: auto;
  z-index: 10;
}

.connection-point:hover {
  background-color: #eff6ff;
  transform: scale(1.1);
}

.connection-point.output {
  top: 50%;
  right: -10px;
  transform: translateY(-50%);
}

.connection-point.input {
  top: 50%;
  left: -10px;
  transform: translateY(-50%);
}

.connection-point.true-output {
  bottom: -10px;
  right: 30%;
  color: #10b981;
  border-color: #10b981;
}

.connection-point.false-output {
  bottom: -10px;
  left: 30%;
  color: #ef4444;
  border-color: #ef4444;
}

/* 节点类型特殊样式 */
.flow-node.start .node-header {
  background-color: #dcfce7;
  color: #15803d;
}

.flow-node.end .node-header {
  background-color: #fee2e2;
  color: #b91c1c;
}

.flow-node.condition .node-header {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.flow-node.message .node-header {
  background-color: #f3f4f6;
  color: #4b5563;
}
</style>
