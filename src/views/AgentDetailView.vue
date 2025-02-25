<template>
  <div class="agent-detail-view">
    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i> 加载中...
    </div>

    <div v-else class="agent-detail-container">
      <div class="header-section">
        <button @click="goBack" class="back-btn">
          <i class="fas fa-arrow-left"></i> 返回
        </button>
        <h1>{{ agent.name }}</h1>
        <div class="actions">
          <button @click="testAgent" class="action-btn test">
            <i class="fas fa-play"></i> 测试助手
          </button>
          <button @click="editAgent" class="action-btn edit">
            <i class="fas fa-edit"></i> 编辑助手
          </button>
        </div>
      </div>

      <div class="agent-info-section">
        <div class="info-card">
          <h2>基本信息</h2>
          <div class="info-item">
            <span class="label">名称:</span>
            <span>{{ agent.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">描述:</span>
            <span>{{ agent.description || '无描述' }}</span>
          </div>
          <div class="info-item">
            <span class="label">模型:</span>
            <span>{{ getModelName(agent.modelId) }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态:</span>
            <span :class="agent.enabled ? 'enabled' : 'disabled'">
              {{ agent.enabled ? '已启用' : '已禁用' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">创建时间:</span>
            <span>{{ formatDate(agent.createdAt) }}</span>
          </div>
          <div class="info-item" v-if="agent.updatedAt">
            <span class="label">更新时间:</span>
            <span>{{ formatDate(agent.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="agent-flow-section">
        <div class="section-header">
          <h2>助手流程</h2>
          <div class="flow-actions">
            <button @click="viewFlowDetails" class="action-btn view-flow">
              <i class="fas fa-project-diagram"></i> 查看流程详情
            </button>
          </div>
        </div>

        <div class="flow-info">
          <div class="info-card">
            <div class="flow-stats">
              <div class="stat-item">
                <i class="fas fa-code-branch"></i>
                <span>{{ getFlowNodesCount() }} 个节点</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-link"></i>
                <span>{{ getFlowConnectionsCount() }} 个连接</span>
              </div>
            </div>
            
            <div class="flow-description">
              <h3>流程说明</h3>
              <p v-if="!hasFlowData()">
                暂无流程数据，请点击"编辑助手"添加流程。
              </p>
              <div v-else>
                <p>该助手包含以下处理流程：</p>
                <ul class="flow-steps">
                  <li v-for="(node, index) in getFlowNodes()" :key="node.id">
                    <span class="step-number">{{ index + 1 }}</span>
                    <span class="step-name">{{ node.name }}</span>
                    <span class="step-type">({{ getNodeTypeName(node.type) }})</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div class="edit-instructions">
              <h3>编辑说明</h3>
              <p>您可以通过点击"编辑助手"按钮来修改助手的基本信息和流程设计。</p>
              <p>在流程编辑器中，您可以：</p>
              <ul>
                <li>添加不同类型的节点（开始、消息、条件、API调用、结束）</li>
                <li>连接节点以创建处理流程</li>
                <li>配置每个节点的具体参数</li>
                <li>调整节点位置以优化流程布局</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const agent = ref({})
const loading = ref(true)
const models = ref([])

// 获取节点类型名称
const getNodeTypeName = (type) => {
  const nodeTypes = {
    'start': '开始节点',
    'message': '消息节点',
    'condition': '条件节点',
    'api': 'API调用节点',
    'end': '结束节点'
  }
  return nodeTypes[type] || type
}

// 获取模型名称
const getModelName = (modelId) => {
  if (!models.value || !Array.isArray(models.value)) {
    return '未知模型'
  }
  const model = models.value.find(m => m.id === modelId)
  return model ? model.name : modelId || '未知模型'
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 获取流程节点数量
const getFlowNodesCount = () => {
  if (!agent.value.flow || !agent.value.flow.nodes) {
    return 0
  }
  return agent.value.flow.nodes.length
}

// 获取流程连接数量
const getFlowConnectionsCount = () => {
  if (!agent.value.flow || !agent.value.flow.connections) {
    return 0
  }
  return agent.value.flow.connections.length
}

// 获取流程节点列表
const getFlowNodes = () => {
  if (!agent.value.flow || !agent.value.flow.nodes) {
    return []
  }
  return agent.value.flow.nodes
}

// 检查是否有流程数据
const hasFlowData = () => {
  return agent.value.flow && 
         agent.value.flow.nodes && 
         agent.value.flow.nodes.length > 0
}

// 返回上一页
const goBack = () => {
  router.push('/agents')
}

// 编辑 Agent
const editAgent = () => {
  router.push(`/agents/${agent.value.id}/edit`)
}

// 测试 Agent
const testAgent = () => {
  router.push(`/agents/${agent.value.id}/test`)
}

// 查看流程详情
const viewFlowDetails = () => {
  router.push(`/agents/${agent.value.id}/edit?tab=flow`)
}

// 获取 Agent 详情
const loadAgentData = async () => {
  try {
    loading.value = true;
    const agentId = route.params.id;
    
    if (!agentId) {
      throw new Error('无效的助手ID');
    }
    
    console.log('加载助手详情:', agentId);
    
    const response = await fetch(`http://localhost:3000/api/agents/${agentId}`);
    
    if (!response.ok) {
      throw new Error(`获取助手失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      agent.value = result.data;
    } else {
      throw new Error(result.message || '获取助手失败');
    }
  } catch (error) {
    console.error('加载助手数据失败:', error);
    alert(`加载失败: ${error.message}`);
    router.push('/agents');
  } finally {
    loading.value = false;
  }
};

// 加载模型列表
const loadModels = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/models')
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        models.value = result.data
      }
    }
  } catch (error) {
    console.log('使用默认模型列表')
    models.value = [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
    ]
  }
}

// 组件挂载时获取数据
onMounted(async () => {
  await loadModels()
  await loadAgentData()
})
</script>

<style scoped>
.agent-detail-view {
  width: 100%;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.back-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #555;
}

.back-btn:hover {
  color: #000;
}

.actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.test {
  background-color: #8b5cf6;
  color: white;
}

.edit {
  background-color: #8b5cf6;
  color: white;
}

.view-flow {
  background-color: #9C27B0;
  color: white;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px 0;
  color: #666;
}

.agent-detail-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.agent-info-section {
  margin-bottom: 30px;
}

.info-card {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.info-item {
  margin-bottom: 10px;
  display: flex;
}

.label {
  font-weight: bold;
  min-width: 80px;
}

.enabled {
  color: #8b5cf6;
}

.disabled {
  color: #999;
}

.agent-flow-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.flow-info {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.flow-stats {
  display: flex;
  margin-bottom: 15px;
}

.stat-item {
  margin-right: 20px;
  display: flex;
  align-items: center;
}

.stat-item i {
  margin-right: 5px;
  color: #2196F3;
}

.flow-description, .edit-instructions {
  margin-top: 20px;
}

.flow-steps {
  list-style-type: none;
  padding: 0;
  margin-top: 10px;
}

.flow-steps li {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.step-number {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  background-color: #2196F3;
  color: white;
  border-radius: 50%;
  margin-right: 10px;
  font-size: 14px;
}

.step-name {
  font-weight: bold;
  margin-right: 5px;
}

.step-type {
  color: #757575;
  font-size: 14px;
}

.edit-instructions ul {
  padding-left: 20px;
}

.edit-instructions li {
  margin-bottom: 5px;
}

@media (max-width: 768px) {
  .agent-info-section {
    grid-template-columns: 1fr;
  }
}
</style>