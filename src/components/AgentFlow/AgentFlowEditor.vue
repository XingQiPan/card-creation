<template>
  <div class="agent-flow-editor">
    <div class="editor-header">
      <h2>{{ isNewAgent ? '创建流程' : '编辑流程' }}</h2>
      <div class="actions">
        <button @click="saveFlow" class="save-btn">
          <i class="fas fa-save"></i> 保存
        </button>
        <button @click="cancelEdit" class="cancel-btn">
          <i class="fas fa-times"></i> 取消
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i> 正在加载...
    </div>

    <div v-else class="editor-container">
      <div class="tools-panel">
        <h3>节点类型</h3>
        <div class="node-types">
          <div 
            v-for="type in filteredNodeTypes" 
            :key="type.id" 
            class="node-type-item"
            draggable="true"
            @dragstart="handleDragStart($event, type)"
          >
            <i :class="type.icon"></i>
            <span>{{ type.name }}</span>
          </div>
        </div>
      </div>

      <div 
        class="flow-canvas" 
        ref="flowCanvas"
        @drop="handleDrop"
        @dragover.prevent
        @dragenter.prevent
        @click="deselectAll"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
      >
        <div v-if="flow.nodes.length === 0" class="empty-flow-hint">
          <p>从左侧拖拽节点到这里开始创建流程</p>
        </div>

        <!-- 节点 -->
        <div 
          v-for="node in flow.nodes"
          :key="node.id"
          class="node-container"
          :style="getNodePosition(node)"
          @mousedown.stop="startDragNode($event, node.id)"
        >
          <FlowNode
            :nodeId="node.id"
            :nodeData="node"
            :selected="selectedNodeId === node.id"
            @select="selectNode"
            @configure="openNodeConfig"
            @delete="deleteNode"
            @connection-start="startConnection"
            @connection-end="endConnection"
          />
        </div>
        
        <!-- 连接线 -->
        <div v-for="connection in connections" :key="connection.id">
          <FlowConnection
            :startPoint="connection.startPoint"
            :endPoint="connection.endPoint"
            :connectionType="connection.type"
          />
        </div>
        
        <!-- 临时连接线 -->
        <div v-if="tempConnection" class="temp-connection">
          <svg 
            :width="canvasSize.width" 
            :height="canvasSize.height" 
            style="position: absolute; top: 0; left: 0; pointer-events: none;"
          >
            <path
              :d="getTempConnectionPath()"
              stroke="#3b82f6"
              stroke-width="2"
              stroke-dasharray="5,5"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
    
    <!-- 节点配置模态框 -->
    <div v-if="showNodeConfig" class="node-config-modal" @click.self="closeNodeConfig">
      <div class="modal-content">
        <div class="modal-header">
          <h3>配置{{ getNodeTypeName(currentNode?.type) }}节点</h3>
          <button @click="closeNodeConfig" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>节点名称</label>
            <input type="text" v-model="currentNode.name" placeholder="输入节点名称">
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="currentNode.description" placeholder="输入节点描述" rows="3"></textarea>
          </div>
          
          <!-- 根据节点类型显示不同的配置选项 -->
          <div v-if="currentNode.type === 'message'">
            <div class="form-group">
              <label>消息内容</label>
              <textarea v-model="currentNode.message" placeholder="输入消息内容" rows="5"></textarea>
            </div>
          </div>
          
          <div v-if="currentNode.type === 'condition'">
            <div class="form-group">
              <label>条件表达式</label>
              <textarea v-model="currentNode.condition" placeholder="输入条件表达式，例如: context.value > 10" rows="3"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeNodeConfig" class="cancel-btn">取消</button>
          <button @click="saveNodeConfig" class="save-btn">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import FlowNode from './FlowNode.vue';
import FlowConnection from './FlowConnection.vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  isNewAgent: {
    type: Boolean,
    default: false
  },
  value: {
    type: Object,
    default: () => ({ nodes: [], connections: [] })
  },
  id: {
    type: String,
    default: 'new'
  },
  models: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:value', 'save', 'cancel']);

const router = useRouter();

// 状态
const loading = ref(true);
const flowCanvas = ref(null);
const selectedNodeId = ref(null);
const isDraggingNode = ref(false);
const draggedNodeId = ref(null);
const dragStartPos = ref({ x: 0, y: 0 });
const showNodeConfig = ref(false);
const currentNode = ref(null);
const tempConnection = ref(null);
const connections = ref([]);
const canvasSize = reactive({ width: 0, height: 0 });

// 流程数据
const flow = ref({
  nodes: [],
  connections: []
});

// 定义 props
const agent = ref({}); // 确保 agent 被定义为 ref
const models = ref([]);
const nodeTypes = ref([
  { id: 'start', name: '开始', icon: 'play-circle', color: '#4CAF50' },
  { id: 'message', name: '消息', icon: 'comment', color: '#2196F3' },
  { id: 'condition', name: '条件', icon: 'code-branch', color: '#FF9800' },
  { id: 'api', name: 'API调用', icon: 'plug', color: '#9C27B0' },
  { id: 'end', name: '结束', icon: 'stop-circle', color: '#F44336' }
]);

// 连接线相关
const isDraggingConnection = ref(false);
const startConnectionNode = ref(null);
const startConnectionPoint = ref(null);
const currentMousePosition = ref({ x: 0, y: 0 });

// 在组件的 setup 部分添加这个变量
const isNewAgent = ref(false);

// 初始化流程数据
const initializeFlow = () => {
  flow.value = JSON.parse(JSON.stringify(props.value || { nodes: [], connections: [] }));
  
  // 确保每个节点都有位置信息
  flow.value.nodes.forEach(node => {
    if (!node.position) {
      node.position = { x: 100, y: 100 };
    }
  });
  
  // 初始化连接
  updateConnections();
};

// 过滤节点类型，确保只有一个开始和结束节点
const filteredNodeTypes = computed(() => {
  return nodeTypes.value.filter(type => {
    if (type.id === 'start') {
      return !flow.value.nodes.some(node => node.type === 'start');
    }
    if (type.id === 'end') {
      return !flow.value.nodes.some(node => node.type === 'end');
    }
    return true;
  });
});

// 获取节点位置样式
const getNodePosition = (node) => {
  return {
    position: 'absolute',
    left: `${node.position.x}px`,
    top: `${node.position.y}px`
  };
};

// 获取节点类型名称
const getNodeTypeName = (type) => {
  const nodeType = nodeTypes.value.find(t => t.id === type);
  return nodeType ? nodeType.name : '节点';
};

// 拖拽开始
const handleDragStart = (event, nodeType) => {
  console.log('开始拖拽节点类型:', nodeType);
  event.dataTransfer.setData('nodeType', JSON.stringify(nodeType));
  event.dataTransfer.effectAllowed = 'copy';
};

// 拖拽放置
const handleDrop = (event) => {
  event.preventDefault();
  
  try {
    const nodeTypeData = event.dataTransfer.getData('nodeType');
    if (!nodeTypeData) {
      console.log('没有获取到节点类型数据');
      return;
    }
    
    const nodeType = JSON.parse(nodeTypeData);
    console.log('放置节点类型:', nodeType);
    
    // 计算放置位置
    const canvasRect = flowCanvas.value.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    
    // 创建新节点
    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeType.id,
      name: nodeType.name,
      position: { x, y },
      config: {}
    };
    
    // 添加到流程中
    flow.value.nodes.push(newNode);
    console.log('添加新节点:', newNode);
    console.log('当前节点列表:', flow.value.nodes);
  } catch (error) {
    console.error('处理拖放事件失败:', error);
  }
};

// 选择节点
const selectNode = (nodeId) => {
  selectedNodeId.value = nodeId;
};

// 取消选择所有节点
const deselectAll = () => {
  selectedNodeId.value = null;
};

// 删除节点
const deleteNode = (nodeId) => {
  // 删除与该节点相关的连接
  flow.value.connections = flow.value.connections.filter(conn => 
    conn.sourceId !== nodeId && conn.targetId !== nodeId
  );
  
  // 删除节点
  flow.value.nodes = flow.value.nodes.filter(node => node.id !== nodeId);
  
  // 更新流程数据
  updateFlow();
  updateConnections();
};

// 开始拖动节点
const startDragNode = (event, nodeId) => {
  if (event.target.closest('.connection-point')) return;
  
  isDraggingNode.value = true;
  draggedNodeId.value = nodeId;
  dragStartPos.value = {
    x: event.clientX,
    y: event.clientY
  };
  
  // 获取当前节点位置
  const node = flow.value.nodes.find(n => n.id === nodeId);
  if (node) {
    dragStartPos.value.nodeX = node.position.x;
    dragStartPos.value.nodeY = node.position.y;
  }
  
  // 选中节点
  selectedNodeId.value = nodeId;
  
  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
};

// 鼠标移动事件 - 用于绘制临时连接线
const handleMouseMove = (event) => {
  if (tempConnection.value) {
    const canvasRect = flowCanvas.value.getBoundingClientRect();
    tempConnection.value.currentPoint = {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top
    };
  }
};

// 鼠标释放事件 - 用于结束连接线绘制
const handleMouseUp = (event) => {
  if (tempConnection.value) {
    // 查找鼠标下方的元素
    const elementsUnderMouse = document.elementsFromPoint(event.clientX, event.clientY);
    
    // 查找输入连接点
    const inputPoint = elementsUnderMouse.find(el => 
      el.classList && el.classList.contains('connection-point') && 
      el.classList.contains('input')
    );
    
    if (inputPoint) {
      // 找到目标节点
      const nodeElement = inputPoint.closest('.flow-node');
      if (nodeElement && nodeElement.dataset.nodeId) {
        const targetNodeId = nodeElement.dataset.nodeId;
        
        // 确保不是连接到自己
        if (targetNodeId !== tempConnection.value.sourceNodeId) {
          // 创建新连接
          const newConnection = {
            id: `conn-${Date.now()}`,
            sourceId: tempConnection.value.sourceNodeId,
            targetId: targetNodeId,
            type: tempConnection.value.type
          };
          
          // 检查是否已存在相同的连接
          const existingConnection = flow.value.connections.find(
            conn => conn.sourceId === newConnection.sourceId && 
                   conn.targetId === newConnection.targetId &&
                   conn.type === newConnection.type
          );
          
          if (!existingConnection) {
            flow.value.connections.push(newConnection);
            updateConnections();
            updateFlow();
          }
        }
      }
    }
    
    // 清除临时连线
    tempConnection.value = null;
  }
};

// 开始创建连接
const startConnection = (data) => {
  // 记录起始节点和连接类型
  tempConnection.value = {
    sourceNodeId: data.nodeId,
    startPoint: {
      x: data.point.x - flowCanvas.value.getBoundingClientRect().left,
      y: data.point.y - flowCanvas.value.getBoundingClientRect().top
    },
    endPoint: {
      x: data.point.x - flowCanvas.value.getBoundingClientRect().left,
      y: data.point.y - flowCanvas.value.getBoundingClientRect().top
    },
    type: data.type
  };
  
  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
};

// 获取临时连线的路径
const getTempConnectionPath = () => {
  if (!tempConnection.value) return '';
  
  const { startPoint, endPoint } = tempConnection.value;
  
  // 计算控制点
  const dx = Math.abs(endPoint.x - startPoint.x);
  const controlOffset = Math.min(dx * 0.5, 150);
  
  // 贝塞尔曲线路径
  return `M ${startPoint.x} ${startPoint.y} 
          C ${startPoint.x + controlOffset} ${startPoint.y}
            ${endPoint.x - controlOffset} ${endPoint.y}
            ${endPoint.x} ${endPoint.y}`;
};

// 更新连接线
const updateConnections = () => {
  console.log('更新连接线，当前连接:', flow.value.connections);
  
  connections.value = flow.value.connections.map(conn => {
    const sourceNode = flow.value.nodes.find(n => n.id === conn.sourceId);
    const targetNode = flow.value.nodes.find(n => n.id === conn.targetId);
    
    if (!sourceNode || !targetNode) {
      console.log('找不到源节点或目标节点:', conn);
      return null;
    }
    
    // 计算连接线的起点和终点
    const sourceRect = {
      x: sourceNode.position.x,
      y: sourceNode.position.y,
      width: 200, // 假设节点宽度为200px
      height: 100 // 假设节点高度为100px
    };
    
    const targetRect = {
      x: targetNode.position.x,
      y: targetNode.position.y,
      width: 200,
      height: 100
    };
    
    // 计算连接点
    const startPoint = {
      x: sourceRect.x + sourceRect.width,
      y: sourceRect.y + sourceRect.height / 2
    };
    
    const endPoint = {
      x: targetRect.x,
      y: targetRect.y + targetRect.height / 2
    };
    
    return {
      id: conn.id,
      startPoint,
      endPoint,
      type: conn.type
    };
  }).filter(Boolean); // 过滤掉 null 值
  
  console.log('更新后的连接线:', connections.value);
};

// 打开节点配置
const openNodeConfig = (node) => {
  currentNode.value = JSON.parse(JSON.stringify(node));
  showNodeConfig.value = true;
};

// 关闭节点配置
const closeNodeConfig = () => {
  showNodeConfig.value = false;
  currentNode.value = null;
};

// 保存节点配置
const saveNodeConfig = () => {
  const index = flow.value.nodes.findIndex(n => n.id === currentNode.value.id);
  if (index !== -1) {
    flow.value.nodes[index] = { ...currentNode.value };
    updateConnections();
  }
  
  closeNodeConfig();
};

// 更新流程数据
const updateFlow = () => {
  emit('update:value', flow.value);
};

// 保存流程
const saveFlow = async () => {
  try {
    // 验证必填字段
    if (!agent.value.name) {
      alert('请输入助手名称');
      return;
    }
    
    if (!agent.value.modelId) {
      alert('请选择模型');
      return;
    }
    
    // 准备保存的数据
    const agentData = {
      ...agent.value,
      flow: flow.value,
      updatedAt: Date.now()
    };
    
    console.log('保存数据:', agentData);
    
    // 如果是新建代理，则创建新记录
    if (props.id === 'new') {
      console.log('创建新代理');
      
      const response = await fetch('http://localhost:3000/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });
      
      if (!response.ok) {
        throw new Error(`创建助手失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // 保存成功后跳转到代理列表页
        router.push('/agents');
      } else {
        throw new Error(result.message || '创建助手失败');
      }
    } else {
      // 更新现有代理
      console.log('更新代理:', props.id);
      
      const response = await fetch(`http://localhost:3000/api/agents/${props.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });
      
      if (!response.ok) {
        throw new Error(`更新助手失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // 保存成功后跳转到代理详情页
        router.push(`/agents/${props.id}`);
      } else {
        throw new Error(result.message || '更新助手失败');
      }
    }
  } catch (error) {
    console.error('保存助手失败:', error);
    alert(`保存失败: ${error.message}`);
  }
};

// 取消编辑
const cancelEdit = () => {
  // 如果是新建代理，则返回代理列表页
  if (props.id === 'new') {
    router.push('/agents');
  } else {
    // 否则返回代理详情页
    router.push(`/agents/${props.id}`);
  }
};

// 更新画布尺寸
const updateCanvasSize = () => {
  if (flowCanvas.value) {
    canvasSize.width = flowCanvas.value.clientWidth;
    canvasSize.height = flowCanvas.value.clientHeight;
  }
};

// 生命周期钩子
onMounted(async () => {
  console.log('组件挂载，ID:', props.id);
  
  // 加载模型列表
  await loadModels();
  
  // 检查是否是新建代理
  if (props.id === 'new') {
    console.log('创建新代理');
    // 初始化新代理数据
    initNewAgent();
    loading.value = false;
  } else {
    // 加载现有代理数据
    await loadAgentData();
  }
  
  updateCanvasSize();
  
  window.addEventListener('resize', () => {
    updateCanvasSize();
    updateConnections();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
  window.removeEventListener('resize', updateCanvasSize);
});

// 处理全局鼠标移动（用于绘制临时连线）
const handleGlobalMouseMove = (event) => {
  if (tempConnection.value) {
    tempConnection.value.endPoint = {
      x: event.clientX - flowCanvas.value.getBoundingClientRect().left,
      y: event.clientY - flowCanvas.value.getBoundingClientRect().top
    };
  } else if (isDraggingNode.value) {
    // 计算新位置
    const dx = event.clientX - dragStartPos.value.x;
    const dy = event.clientY - dragStartPos.value.y;
    
    const node = flow.value.nodes.find(n => n.id === draggedNodeId.value);
    if (node) {
      node.position = {
        x: Math.max(0, dragStartPos.value.nodeX + dx),
        y: Math.max(0, dragStartPos.value.nodeY + dy)
      };
      
      // 更新连接线
      updateConnections();
    }
  }
};

// 处理全局鼠标释放（结束拖拽或连线）
const handleGlobalMouseUp = (event) => {
  // 清除全局事件监听
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
  
  // 处理节点拖拽结束
  if (isDraggingNode.value) {
    isDraggingNode.value = false;
    draggedNodeId.value = null;
    dragStartPos.value = null;
    updateFlow();
    return;
  }
  
  // 处理连线结束
  if (tempConnection.value) {
    // 检查鼠标释放位置是否在节点上
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const inputConnectionPoint = targetElement?.closest('.connection-point.input');
    
    if (inputConnectionPoint) {
      // 找到目标节点
      const nodeContainer = inputConnectionPoint.closest('.node-container');
      if (nodeContainer) {
        const targetNodeId = nodeContainer.querySelector('.flow-node').dataset.nodeId;
        
        // 确保不是连接到自己
        if (targetNodeId && targetNodeId !== tempConnection.value.sourceNodeId) {
          // 创建新连接
          const newConnection = {
            id: `conn-${Date.now()}`,
            sourceId: tempConnection.value.sourceNodeId,
            targetId: targetNodeId,
            type: tempConnection.value.type
          };
          
          // 检查是否已存在相同的连接
          const existingConnection = flow.value.connections.find(
            conn => conn.sourceId === newConnection.sourceId && 
                   conn.targetId === newConnection.targetId &&
                   conn.type === newConnection.type
          );
          
          if (!existingConnection) {
            flow.value.connections.push(newConnection);
            updateConnections();
            updateFlow();
          }
        }
      }
    }
    
    // 清除临时连线
    tempConnection.value = null;
  }
};

// 加载模型列表
const loadModels = async () => {
  try {
    // 如果从 props 中接收到了模型列表，则使用它
    if (props.models && props.models.length > 0) {
      models.value = props.models;
      return;
    }
    
    // 尝试从服务器加载模型列表
    const response = await fetch('http://localhost:3000/api/models');
    
    if (!response.ok) {
      throw new Error(`获取模型列表失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      models.value = result.data;
    } else {
      throw new Error(result.message || '获取模型列表失败');
    }
  } catch (error) {
    console.log('使用默认模型列表');
    // 设置默认模型列表
    models.value = [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
    ];
  }
};

// 加载代理数据
const loadAgentData = async () => {
  try {
    const response = await fetch(`http://localhost:3000/api/agents/${props.id}`);
    
    if (!response.ok) {
      throw new Error(`获取助手失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      agent.value = result.data;
      
      // 如果有流程数据，则加载
      if (agent.value.flow) {
        flow.value = agent.value.flow;
      } else {
        // 否则初始化空流程
        flow.value = {
          nodes: [],
          connections: []
        };
      }
      
      // 更新连接线
      updateConnections();
    } else {
      throw new Error(result.message || '获取助手失败');
    }
  } catch (error) {
    console.error('加载助手数据失败:', error);
    // 初始化空数据
    agent.value = {
      name: '',
      description: '',
      modelId: models.value.length > 0 ? models.value[0].id : '',
      enabled: true
    };
    
    flow.value = {
      nodes: [],
      connections: []
    };
  } finally {
    loading.value = false;
  }
};

// 初始化新代理
const initNewAgent = () => {
  console.log('初始化新代理，可用模型:', models.value);
  
  // 设置为新代理
  isNewAgent.value = true;
  
  agent.value = {
    name: '新建智能助手',
    description: '',
    modelId: models.value.length > 0 ? models.value[0].id : '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: null
  };
  
  // 初始化流程图
  flow.value = {
    nodes: [
      {
        id: uuidv4(),
        type: 'start',
        name: '开始节点',
        position: { x: 100, y: 100 },
        config: {}
      }
    ],
    connections: []
  };
  
  // 更新连接线
  updateConnections();
  
  console.log('新代理初始化完成:', agent.value);
};
</script>

<style scoped>
.agent-flow-editor {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9fafb;
}

.editor-header {
  padding: 16px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

.save-btn, .cancel-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.save-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.save-btn:hover {
  background-color: #2563eb;
}

.cancel-btn {
  background-color: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.cancel-btn:hover {
  background-color: #f3f4f6;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 16px;
  color: #6b7280;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.tools-panel {
  width: 200px;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  padding: 16px;
  overflow-y: auto;
}

.tools-panel h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.node-types {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-type-item {
  padding: 8px 12px;
  background-color: #f3f4f6;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #4b5563;
  user-select: none;
}

.node-type-item:hover {
  background-color: #e5e7eb;
}

.node-type-item i {
  width: 16px;
  text-align: center;
}

.flow-canvas {
  flex: 1;
  position: relative;
  overflow: auto;
  background-color: #f9fafb;
  background-image: 
    linear-gradient(rgba(209, 213, 219, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(209, 213, 219, 0.3) 1px, transparent 1px);
  background-size: 20px 20px;
  min-height: 600px;
}

.empty-flow-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #9ca3af;
  font-size: 16px;
}

.node-container {
  position: absolute;
  user-select: none;
  z-index: 2;
}

.temp-connection {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.node-config-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  max-height: 60vh;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-footer button {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.save-config-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.save-config-btn:hover {
  background-color: #2563eb;
}

.cancel-config-btn {
  background-color: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.cancel-config-btn:hover {
  background-color: #f3f4f6;
}
</style>