<template>
  <div class="agent-flow-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button 
          @click="undo" 
          class="toolbar-btn"
          :disabled="!canUndo"
          title="撤销 (Ctrl+Z)"
        >
          <i class="fas fa-undo"></i>
        </button>
        <button 
          @click="redo" 
          class="toolbar-btn"
          :disabled="!canRedo"
          title="重做 (Ctrl+Y)"
        >
          <i class="fas fa-redo"></i>
        </button>
      </div>
      
      <!-- 缩放控制 -->
      <div class="toolbar-group">
        <button 
          @click="zoomOut" 
          class="toolbar-btn"
          :disabled="scale <= 0.5"
          title="缩小"
        >
          <i class="fas fa-search-minus"></i>
        </button>
        <span class="scale-display">{{ Math.round(scale * 100) }}%</span>
        <button 
          @click="zoomIn" 
          class="toolbar-btn"
          :disabled="scale >= 2"
          title="放大"
        >
          <i class="fas fa-search-plus"></i>
        </button>
        <button 
          @click="resetZoom" 
          class="toolbar-btn"
          title="重置缩放"
        >
          <i class="fas fa-expand"></i>
        </button>
      </div>
      
      <div class="toolbar-group">
        <button @click="saveFlow" class="toolbar-btn save">
          <i class="fas fa-save"></i> 保存
        </button>
        <button @click="$emit('cancel')" class="toolbar-btn cancel">
          <i class="fas fa-times"></i> 取消
        </button>
      </div>
    </div>

    <div class="editor-container">
      <!-- 节点类型面板 -->
      <NodeTypes 
        class="node-types-panel"
        @dragstart="handleNodeDragStart"
      />

      <!-- 流程画布 -->
      <div class="canvas-container">
        <div 
          class="flow-canvas"
          ref="canvasRef"
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent
          @click="deselectAll"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
        >
          <!-- 网格背景 -->
          <div class="canvas-grid"></div>

          <!-- 节点 -->
          <FlowNode
            v-for="node in flow.nodes"
            :key="node.id"
            :node-id="node.id"
            :node-data="node"
            :selected="selectedNodeId === node.id"
            :style="getNodeStyle(node)"
            @select="selectNode"
            @delete="deleteNode"
            @connection-start="startConnection"
            @update-position="updateNodePosition"
          />

          <!-- 连接线 -->
          <svg class="connections-layer">
            <!-- 正常连接线 -->
            <path
              v-for="conn in flow.connections"
              :key="conn.id"
              :d="getConnectionPath(conn)"
              :stroke="getConnectionColor(conn)"
              :stroke-width="getConnectionWidth(conn)"
              fill="none"
              @click.stop="selectConnection(conn.id)"
            />
            
            <!-- 临时连接线 -->
            <path
              v-if="tempConnection.active"
              :d="getTempConnectionPath()"
              stroke="#3b82f6"
              :stroke-width="2 / scale"
              stroke-dasharray="5,5"
              fill="none"
            />
          </svg>
        </div>
      </div>

      <!-- 节点配置面板 -->
      <NodeConfigPanel
        v-if="selectedNode"
        :node="selectedNode"
        class="config-panel"
        @update="updateNodeConfig"
        @close="deselectAll"
      />
    </div>
    
    <!-- 缩放和平移控制 -->
    <div class="canvas-controls">
      <button @click="zoomIn" class="control-btn" title="放大">
        <i class="fas fa-plus"></i>
      </button>
      <button @click="zoomOut" class="control-btn" title="缩小">
        <i class="fas fa-minus"></i>
      </button>
      <button @click="resetZoom" class="control-btn" title="重置视图">
        <i class="fas fa-home"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import NodeTypes from './NodeTypes.vue';
import FlowNode from './FlowNode.vue';
import FlowConnection from './FlowConnection.vue';
import NodeConfigPanel from './NodeConfigPanel.vue';
import { HistoryManager } from './utils/history';

const props = defineProps({
  initialFlow: {
    type: Object,
    default: () => ({
      nodes: [],
      connections: []
    })
  }
});

const emit = defineEmits(['save', 'cancel']);

// 状态
const flow = ref(JSON.parse(JSON.stringify(props.initialFlow)));
const selectedNodeId = ref(null);
const selectedConnectionId = ref(null);
const canvasRef = ref(null);
const tempConnection = ref({
  active: false,
  sourceNodeId: null,
  sourcePointType: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
});

// 历史记录管理器
const historyManager = ref(null);

// 缩放和平移状态
const scale = ref(1);
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panStartOffset = ref({ x: 0, y: 0 });

// 计算属性
const selectedNode = computed(() => 
  flow.value.nodes.find(node => node.id === selectedNodeId.value)
);
const canUndo = computed(() => historyManager.value?.canUndo() ?? false);
const canRedo = computed(() => historyManager.value?.canRedo() ?? false);

// 画布样式
const canvasStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${panOffset.value.x}px, ${panOffset.value.y}px)`,
  transformOrigin: '0 0'
}));

// 获取节点连接点坐标
const getNodeConnectionPointCoords = (nodeId, pointType) => {
  // 首先找到节点元素
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
  if (!nodeElement) return null;
  
  // 找到连接点元素
  const pointElement = nodeElement.querySelector(`.connection-point.${pointType}`);
  if (!pointElement) return null;
  
  // 获取节点和连接点的位置信息
  const nodeRect = nodeElement.getBoundingClientRect();
  const pointRect = pointElement.getBoundingClientRect();
  const canvasRect = canvasRef.value.getBoundingClientRect();
  
  // 计算连接点相对于节点的偏移
  const offsetX = (pointRect.left + pointRect.width / 2) - (nodeRect.left);
  const offsetY = (pointRect.top + pointRect.height / 2) - (nodeRect.top);
  
  // 从节点数据中获取实际位置
  const node = flow.value.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  
  // 返回连接点的实际坐标
  return {
    x: node.position.x + offsetX / scale.value,
    y: node.position.y + offsetY / scale.value
  };
};

// 获取连接点坐标（用于现有连接）
const getConnectionPoint = (nodeId, pointType) => {
  const coords = getNodeConnectionPointCoords(nodeId, pointType);
  if (!coords) {
    // 如果无法获取坐标，尝试从节点位置估算
    const node = flow.value.nodes.find(n => n.id === nodeId);
    if (node) {
      // 根据连接点类型估算位置
      switch (pointType) {
        case 'input':
          return { x: node.position.x, y: node.position.y + 30 };
        case 'output':
          return { x: node.position.x + 150, y: node.position.y + 30 };
        case 'output-false':
          return { x: node.position.x + 75, y: node.position.y + 60 };
        default:
          return { x: node.position.x + 75, y: node.position.y + 30 };
      }
    }
  }
  return coords || { x: 0, y: 0 };
};

// 处理节点拖拽
const handleNodeDragStart = (nodeType) => {
  console.log('开始拖拽节点:', nodeType);
};

const handleDrop = (event) => {
  const data = JSON.parse(event.dataTransfer.getData('application/json'));
  const canvasRect = canvasRef.value.getBoundingClientRect();
  
  const newNode = {
    id: Date.now().toString(),
    type: data.type,
    name: '',
    position: {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top
    },
    data: data.data
  };

  flow.value.nodes.push(newNode);
  recordChange();
};

// 获取连接线路径
const getConnectionPath = (connection) => {
  // 获取源节点和目标节点
  const sourceNode = flow.value.nodes.find(n => n.id === connection.from);
  const targetNode = flow.value.nodes.find(n => n.id === connection.to);
  
  if (!sourceNode || !targetNode) return '';
  
  // 计算连接点位置
  let startX, startY, endX, endY;
  
  // 源节点连接点
  if (connection.fromType === 'output-false') {
    // 条件节点的false输出在底部
    startX = sourceNode.position.x + 75; // 节点宽度的一半
    startY = sourceNode.position.y + 60; // 节点底部
  } else {
    // 默认输出在右侧
    startX = sourceNode.position.x + 150; // 节点宽度
    startY = sourceNode.position.y + 30; // 节点高度的一半
  }
  
  // 目标节点连接点总是在左侧
  endX = targetNode.position.x;
  endY = targetNode.position.y + 30; // 节点高度的一半
  
  // 计算贝塞尔曲线控制点
  const dx = Math.abs(endX - startX);
  const offsetX = Math.min(dx * 0.5, 50);
  
  let cp1x, cp2x;
  
  if (startX < endX) {
    cp1x = startX + offsetX;
    cp2x = endX - offsetX;
  } else {
    cp1x = startX - offsetX;
    cp2x = endX + offsetX;
  }
  
  return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
};

// 获取临时连接路径
const getTempConnectionPath = () => {
  const { startX, startY, currentX, currentY } = tempConnection.value;
  
  // 计算控制点
  const dx = Math.abs(currentX - startX);
  const offsetX = Math.min(dx * 0.5, 50);
  
  let cp1x, cp2x;
  
  if (startX < currentX) {
    cp1x = startX + offsetX;
    cp2x = currentX - offsetX;
  } else {
    cp1x = startX - offsetX;
    cp2x = currentX + offsetX;
  }
  
  return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${currentY}, ${currentX} ${currentY}`;
};

// 获取连接线颜色
const getConnectionColor = (connection) => {
  if (selectedConnectionId === connection.id) return '#3b82f6';
  if (connection.type === 'condition-true') return '#10b981';
  if (connection.type === 'condition-false') return '#ef4444';
  return '#9ca3af';
};

// 获取连接线宽度
const getConnectionWidth = (connection) => {
  return (selectedConnectionId === connection.id ? 2 : 1.5) / scale.value;
};

// 开始连接
const startConnection = ({ nodeId, pointType }) => {
  // 获取源节点
  const sourceNode = flow.value.nodes.find(n => n.id === nodeId);
  if (!sourceNode) return;
  
  let startX, startY;
  
  // 根据连接点类型确定起始位置
  if (pointType === 'output-false') {
    // 条件节点的false输出在底部
    startX = sourceNode.position.x + 75; // 节点宽度的一半
    startY = sourceNode.position.y + 60; // 节点底部
  } else if (pointType === 'output') {
    // 默认输出在右侧
    startX = sourceNode.position.x + 150; // 节点宽度
    startY = sourceNode.position.y + 30; // 节点高度的一半
  } else {
    // 输入点在左侧
    startX = sourceNode.position.x;
    startY = sourceNode.position.y + 30; // 节点高度的一半
  }
  
  tempConnection.value = {
    active: true,
    fromNode: nodeId,
    fromType: pointType,
    startX,
    startY,
    currentX: startX,
    currentY: startY
  };
  
  // 添加事件监听
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 处理鼠标移动
const handleMouseMove = (event) => {
  if (!tempConnection.value.active) return;
  
  const canvasRect = canvasRef.value.getBoundingClientRect();
  
  // 计算鼠标在画布中的实际位置（考虑缩放和滚动）
  tempConnection.value.currentX = (event.clientX - canvasRect.left) / scale.value + canvasRef.value.scrollLeft;
  tempConnection.value.currentY = (event.clientY - canvasRect.top) / scale.value + canvasRef.value.scrollTop;
};

// 处理鼠标抬起
const handleMouseUp = (event) => {
  if (!tempConnection.value.active) return;
  
  // 移除事件监听
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  
  // 检查是否在连接点上释放
  const targetElement = document.elementFromPoint(event.clientX, event.clientY);
  if (targetElement && targetElement.classList.contains('connection-point')) {
    // 获取目标节点ID
    const targetNode = targetElement.closest('.flow-node');
    if (targetNode) {
      const targetNodeId = targetNode.getAttribute('data-node-id');
      const targetPointType = targetElement.classList.contains('input') ? 'input' : 
                             targetElement.classList.contains('output-false') ? 'output-false' : 'output';
      
      // 创建连接
      createConnection(
        tempConnection.value.fromNode,
        tempConnection.value.fromType,
        targetNodeId,
        targetPointType
      );
    }
  }
  
  // 重置临时连接
  tempConnection.value.active = false;
};

// 选择操作
const selectNode = (nodeId) => {
  selectedNodeId.value = nodeId;
  selectedConnectionId.value = null;
};

const selectConnection = (connectionId) => {
  selectedConnectionId.value = connectionId;
  selectedNodeId.value = null;
};

const deselectAll = () => {
  selectedNodeId.value = null;
  selectedConnectionId.value = null;
};

// 删除操作
const deleteNode = (nodeId) => {
  flow.value.nodes = flow.value.nodes.filter(node => node.id !== nodeId);
  flow.value.connections = flow.value.connections.filter(
    conn => conn.from !== nodeId && conn.to !== nodeId
  );
  recordChange();
};

// 创建新连接
const createConnection = (sourceNodeId, sourceType, targetNodeId, targetType) => {
  // 创建连接对象
  const newConnection = {
    id: Date.now().toString(),
    from: sourceNodeId,
    to: targetNodeId,
    fromType: sourceType,
    toType: targetType,
    type: sourceType === 'output-false' ? 'condition-false' : 'default'
  };
  
  // 添加到连接列表
  flow.value.connections.push(newConnection);
  recordChange();
};

// 更新节点配置
const updateNodeConfig = (updatedNode) => {
  const index = flow.value.nodes.findIndex(node => node.id === updatedNode.id);
  if (index !== -1) {
    flow.value.nodes[index] = updatedNode;
    recordChange();
  }
};

// 更新节点位置
const updateNodePosition = ({ id, position }) => {
  const node = flow.value.nodes.find(n => n.id === id);
  if (node) {
    node.position = {
      x: Math.max(0, position.x),
      y: Math.max(0, position.y)
    };
    recordChange();
  }
};

// 保存流程
const saveFlow = () => {
  emit('save', flow.value);
};

// 缩放功能
const zoomIn = () => {
  if (scale.value < 2) {
    scale.value = Math.min(2, scale.value + 0.1);
  }
};

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(0.5, scale.value - 0.1);
  }
};

const resetZoom = () => {
  scale.value = 1;
  panOffset.value = { x: 0, y: 0 };
};

// 生命周期钩子
onMounted(() => {
  historyManager.value = new HistoryManager(flow.value);
  
  // 添加键盘快捷键监听
  document.addEventListener('keydown', handleKeyDown);
  
  // 添加空格键监听（用于平移模式）
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
});

// 处理键盘事件
const handleKeyDown = (event) => {
  // 撤销/重做快捷键
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'z':
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        break;
      case 'y':
        event.preventDefault();
        redo();
        break;
      case '0':
        event.preventDefault();
        resetZoom();
        break;
      case '=':
      case '+':
        event.preventDefault();
        zoomIn();
        break;
      case '-':
        event.preventDefault();
        zoomOut();
        break;
    }
  }
  
  // 空格键按下时启用平移模式
  if (event.code === 'Space' && !isPanning.value) {
    canvasRef.value.style.cursor = 'grab';
  }
};

const handleKeyUp = (event) => {
  // 空格键释放时禁用平移模式
  if (event.code === 'Space' && !isPanning.value) {
    canvasRef.value.style.cursor = 'default';
  }
};

// 撤销
const undo = () => {
  if (canUndo.value) {
    const previousState = historyManager.value.undo();
    if (previousState) {
      flow.value = previousState;
    }
  }
};

// 重做
const redo = () => {
  if (canRedo.value) {
    const nextState = historyManager.value.redo();
    if (nextState) {
      flow.value = nextState;
    }
  }
};

// 记录状态变化
const recordChange = () => {
  historyManager.value?.push(flow.value);
};

// 获取节点样式
const getNodeStyle = (node) => {
  return {
    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
    zIndex: selectedNodeId === node.id ? 10 : 1
  };
};
</script>

<style scoped>
.agent-flow-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f9fafb;
  position: relative;
}

.toolbar {
  padding: 12px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.save {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
}

.toolbar-btn.save:hover {
  background: #2563eb;
}

.toolbar-btn.cancel {
  padding: 8px 16px;
}

.scale-display {
  font-size: 14px;
  color: #6b7280;
  min-width: 50px;
  text-align: center;
}

.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.node-types-panel {
  width: 240px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  z-index: 10;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.flow-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  background: #ffffff;
  transition: transform 0.1s ease;
}

.canvas-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 5000px;
  height: 5000px;
  background-size: 20px 20px;
  background-image:
    linear-gradient(to right, #f0f0f0 1px, transparent 1px),
    linear-gradient(to bottom, #f0f0f0 1px, transparent 1px);
  transform: translate(-2500px, -2500px);
}

.config-panel {
  width: 300px;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
  z-index: 10;
}

.canvas-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
}

.control-btn:hover {
  background: #f3f4f6;
  color: #3b82f6;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.connections-layer path {
  pointer-events: stroke;
  cursor: pointer;
}
</style>