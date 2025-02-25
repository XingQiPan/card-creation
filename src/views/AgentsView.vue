<template>
  <div class="agents-view">
    <div class="header-section">
      <h1>智能自动化工作流</h1>
      <div class="actions">
        <button @click="createNewAgent" class="primary-btn">
          <i class="fas fa-plus"></i> 新建助手
        </button>
      </div>
    </div>

    <div class="agents-container">
      <!-- 加载中提示 -->
      <div v-if="loading" class="loading-container">
        <i class="fas fa-spinner fa-spin"></i> 加载中...
      </div>

      <!-- 代理列表 -->
      <div v-else-if="agents.length > 0" class="agents-list">
        <div 
          v-for="agent in agents" 
          :key="agent.id" 
          class="agent-card"
          @click="viewAgentDetail(agent)"
        >
          <div class="agent-header">
            <!-- <div class="agent-avatar">
              <img :src="agent.avatar || '/default-avatar.png'" alt="Agent Avatar">
            </div> -->
            <div class="agent-info">
              <h3>{{ agent.name }}</h3>
              <p class="agent-description">{{ agent.description || '无描述' }}</p>
            </div>
          </div>
          <div class="agent-meta">
            <div class="meta-item">
              <span class="label">模型:</span>
              <span>{{ getModelName(agent.modelId) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">状态:</span>
              <span :class="agent.enabled ? 'enabled' : 'disabled'">
                {{ agent.enabled ? '已启用' : '已禁用' }}
              </span>
            </div>
          </div>
          <div class="agent-actions">
            <button @click="testAgent(agent, $event)" class="action-btn test">
              <i class="fas fa-play"></i> 测试
            </button>
            <button @click="editAgent(agent, $event)" class="action-btn edit">
              <i class="fas fa-edit"></i> 编辑
            </button>
            <button @click="deleteAgent(agent, $event)" class="action-btn delete">
              <i class="fas fa-trash"></i> 删除
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <i class="fas fa-robot"></i>
        <p>还没有创建任何智能助手</p>
        <button @click="createNewAgent" class="primary-btn">
          <i class="fas fa-plus"></i> 创建第一个助手
        </button>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="toastVisible" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const agents = ref([])
const loading = ref(true)
const models = ref([])
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref('info')

// 加载模型列表
const loadModels = async () => {
  try {
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

// 获取模型名称
const getModelName = (modelId) => {
  if (!models.value || !Array.isArray(models.value)) {
    return '未知模型'
  }
  const model = models.value.find(m => m.id === modelId)
  return model ? model.name : '未知模型'
}

// 加载代理列表
const loadAgents = async () => {
  try {
    loading.value = true;
    
    const response = await fetch('http://localhost:3000/api/agents');
    
    if (!response.ok) {
      throw new Error(`获取助手列表失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      agents.value = result.data;
    } else {
      throw new Error(result.message || '获取助手列表失败');
    }
  } catch (error) {
    console.error('加载助手列表失败:', error);
    showToast('加载助手列表失败: ' + error.message, 'error');
    agents.value = []; // 清空列表
  } finally {
    loading.value = false;
  }
};

// 创建新代理
const createNewAgent = () => {
  console.log('创建新代理');
  router.push('/agents/new');
};

// 查看代理详情
const viewAgentDetail = (agent) => {
  console.log('查看代理详情:', agent.id);
  router.push(`/agents/${agent.id}`);
};

// 编辑代理
const editAgent = (agent, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  if (event) event.stopPropagation();
  console.log('编辑代理:', agent.id);
  router.push(`/agents/${agent.id}/edit`);
};

// 测试代理
const testAgent = (agent, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  if (event) event.stopPropagation();
  console.log('测试代理:', agent.id);
  router.push(`/agents/${agent.id}/test`);
};

// 删除代理
const deleteAgent = async (agent, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  if (event) event.stopPropagation();
  
  if (!confirm(`确定要删除助手 "${agent.name}" 吗？`)) {
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:3000/api/agents/${agent.id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`删除助手失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      showToast('删除助手成功', 'success');
      // 重新加载代理列表
      loadAgents();
    } else {
      throw new Error(result.message || '删除助手失败');
    }
  } catch (error) {
    console.error('删除助手失败:', error);
    showToast('删除助手失败: ' + error.message, 'error');
  }
};

// 显示提示消息
const showToast = (message, type = 'info') => {
  toastMessage.value = message
  toastType.value = type
  toastVisible.value = true
  
  setTimeout(() => {
    toastVisible.value = false
  }, 3000)
}

onMounted(async () => {
  await loadModels()
  await loadAgents()
})
</script>

<style scoped>
.agents-view {
  width: 100%;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.primary-btn {
  background-color: #8b5cf6; /* 紫色 */
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.primary-btn:hover {
  background-color: #7c3aed; /* 深紫色 */
}

.agents-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.agents-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.agent-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.agent-header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.agent-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 10px;
}

.agent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.agent-info {
  flex: 1;
}

.agent-description {
  color: #6b7280;
  margin-bottom: 15px;
  font-size: 14px;
  line-height: 1.5;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.agent-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-item {
  font-size: 12px;
  color: #6b7280;
}

.agent-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
}

.test-btn:hover {
  background-color: #ede9fe; /* 淡紫色 */
  color: #8b5cf6; /* 紫色 */
}

.edit-btn:hover {
  background-color: #ede9fe; /* 淡紫色 */
  color: #8b5cf6; /* 紫色 */
}

.delete-btn:hover {
  background-color: #ffebee;
  color: #f44336;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
  text-align: center;
}

.empty-state i {
  font-size: 48px;
  color: #ccc;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  margin-bottom: 20px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px 0;
  color: #666;
}

.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  z-index: 1000;
}

.toast.info {
  background-color: #8b5cf6; /* 紫色 */
}

.toast.success {
  background-color: #8b5cf6; /* 紫色 */
}

.toast.error {
  background-color: #f44336;
}
</style> 