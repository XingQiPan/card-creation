<template>
  <div class="agent-editor">
    <div class="editor-header">
      <button @click="goBack" class="back-btn">
        <i class="fas fa-arrow-left"></i> 返回
      </button>
      <h1>{{ isNewAgent ? '创建智能助手' : '编辑智能助手' }}</h1>
      <div class="actions">
        <button @click="saveAgent" class="primary-btn save-btn" :disabled="isSaving">
          <i class="fas" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-save'"></i> 
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i> 加载中...
    </div>

    <div v-else class="editor-container">
      <div class="tabs">
        <button 
          @click="activeTab = 'basic'" 
          :class="['tab-btn', { active: activeTab === 'basic' }]"
        >
          <i class="fas fa-info-circle"></i> 基本信息
        </button>
        <button 
          @click="activeTab = 'flow'" 
          :class="['tab-btn', { active: activeTab === 'flow' }]"
        >
          <i class="fas fa-project-diagram"></i> 流程设计
        </button>
      </div>

      <div v-if="activeTab === 'basic'" class="form-section">
        <h2>基本信息</h2>
        <div class="form-group">
          <label for="agent-name">名称</label>
          <input 
            type="text" 
            id="agent-name" 
            v-model="agent.name" 
            placeholder="输入助手名称"
            required
          />
        </div>

        <div class="form-group">
          <label for="agent-description">描述</label>
          <textarea 
            id="agent-description" 
            v-model="agent.description" 
            placeholder="输入助手描述（可选）"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="system-prompt">系统提示词</label>
          <textarea 
            id="system-prompt" 
            v-model="agent.settings.systemPrompt" 
            placeholder="输入系统提示词（可选）"
            rows="5"
          ></textarea>
          <div class="help-text">系统提示词用于指导AI助手的行为和回答方式</div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="agent.enabled" />
            <span>启用助手</span>
          </label>
        </div>
      </div>

      <div v-if="activeTab === 'flow'" class="flow-section">
        <h2>流程设计</h2>
        <p class="section-description">
          设计助手的处理流程，定义消息如何被处理和响应
        </p>
        <div class="flow-editor-container">
          <agent-flow-editor 
            :value="agent.flow" 
            :id="agentId" 
            :is-new-agent="isNewAgent"
            :models="models"
            @update:value="updateFlow"
          />
        </div>
      </div>
    </div>

    <div v-if="notification.show" class="notification" :class="notification.type">
      <i class="fas" :class="notification.icon"></i>
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AgentFlowEditor from '../AgentFlow/AgentFlowEditor.vue';

const router = useRouter();
const route = useRoute();
const loading = ref(true);
const models = ref([]);
const isSaving = ref(false);
const notification = ref({
  show: false,
  message: '',
  type: 'success',
  icon: 'fa-check-circle'
});

// 获取路由参数中的代理ID
const agentId = computed(() => route.params.id);
const isNewAgent = computed(() => agentId.value === 'new');

// 初始化代理数据
const agent = reactive({
  name: '',
  description: '',
  enabled: true,
  settings: {
    systemPrompt: ''
  },
  flow: {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        name: '开始节点',
        position: { x: 100, y: 100 },
        config: {}
      }
    ],
    connections: []
  },
  createdAt: null,
  updatedAt: null
});

// 当前激活的标签页
const activeTab = ref('basic');

// 监听路由参数变化
watch(() => route.query.tab, (newTab) => {
  if (newTab === 'flow') {
    activeTab.value = 'flow';
  } else {
    activeTab.value = 'basic';
  }
}, { immediate: true });

// 返回上一页
const goBack = () => {
  if (isNewAgent.value) {
    router.push('/agents');
  } else {
    router.push(`/agents/${agentId.value}`);
  }
};

// 显示通知
const showNotification = (message, type = 'success') => {
  notification.value = {
    show: true,
    message,
    type,
    icon: type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
  };
  
  // 3秒后自动关闭通知
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

// 加载模型列表
const loadModels = async () => {
  try {
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
    showNotification('无法加载模型列表，使用默认模型', 'error');
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
  if (isNewAgent.value) {
    // 如果是新建代理，初始化默认值
    agent.createdAt = new Date().toISOString();
    loading.value = false;
    return;
  }
  
  try {
    loading.value = true;
    console.log(`正在加载代理数据，ID: ${agentId.value}`);
    
    const response = await fetch(`http://localhost:3000/api/agents/${agentId.value}`);
    
    if (!response.ok) {
      throw new Error(`获取助手数据失败: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('加载的代理数据:', result);
    
    if (result.success && result.data) {
      // 清空当前数据
      Object.keys(agent).forEach(key => {
        if (key !== 'settings' && key !== 'flow') {
          agent[key] = undefined;
        }
      });
      
      // 更新代理数据
      Object.assign(agent, result.data);
      
      // 确保settings对象存在
      if (!agent.settings) {
        agent.settings = { systemPrompt: '' };
      }
      
      // 确保flow对象存在
      if (!agent.flow) {
        agent.flow = { 
          nodes: [
            {
              id: 'start-node',
              type: 'start',
              name: '开始节点',
              position: { x: 100, y: 100 },
              config: {}
            }
          ], 
          connections: [] 
        };
      }
      
      console.log('代理数据加载成功:', agent);
    } else {
      throw new Error(result.message || '获取助手数据失败');
    }
  } catch (error) {
    console.error('加载助手数据失败:', error);
    showNotification(`加载助手数据失败: ${error.message}`, 'error');
    setTimeout(() => {
      router.push('/agents');
    }, 2000);
  } finally {
    loading.value = false;
  }
};

// 更新流程数据
const updateFlow = (newFlow) => {
  agent.flow = newFlow;
};

// 保存代理
const saveAgent = async () => {
  // 验证必填字段
  if (!agent.name) {
    showNotification('请输入助手名称', 'error');
    return;
  }
  
  try {
    isSaving.value = true;
    
    // 更新时间戳
    agent.updatedAt = Date.now();
    agent.createdAt = agent.createdAt || new Date().toISOString();
    
    // 确保数据格式正确
    const agentData = {
      ...agent,
      id: isNewAgent.value ? undefined : agentId.value,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt
    };
    
    console.log('准备保存的代理数据:', agentData);
    
    // 无论新建还是更新，统一使用POST请求
    const response = await fetch('http://localhost:3000/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentData)
    });
    
    if (!response.ok) {
      throw new Error(`保存助手失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      showNotification(isNewAgent.value ? '助手创建成功' : '助手更新成功');
      router.push('/agents');
    } else {
      throw new Error(result.message || '保存助手失败');
    }
  } catch (error) {
    console.error('保存失败:', error);
    showNotification(`保存失败: ${error.message}`, 'error');
  } finally {
    isSaving.value = false;
  }
};

// 组件挂载时加载数据
onMounted(async () => {
  try {
    console.log('组件挂载，开始加载数据');
    await loadModels();
    await loadAgentData();
    console.log('数据加载完成');
  } catch (error) {
    console.error('初始化数据失败:', error);
    showNotification(`初始化失败: ${error.message}`, 'error');
  }
});

// 添加刷新数据的方法
const refreshData = async () => {
  try {
    loading.value = true;
    await loadAgentData();
    showNotification('数据已刷新');
  } catch (error) {
    console.error('刷新数据失败:', error);
    showNotification(`刷新失败: ${error.message}`, 'error');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.agent-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  color: #111827;
}

.editor-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.actions {
  display: flex;
  gap: 8px;
}

.save-btn {
  background-color: #8b5cf6;
}

.save-btn:hover {
  background-color: #7c3aed;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  color: #6b7280;
  font-size: 16px;
}

.editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  gap: 20px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn.active {
  background-color: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}

.tab-btn:hover:not(.active) {
  background-color: #f9fafb;
}

.form-section, .flow-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.form-section h2, .flow-section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.section-description {
  color: #6b7280;
  margin-bottom: 16px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
  color: #374151;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  color: #111827;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.help-text {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.flow-editor-container {
  height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-btn:hover {
  background-color: #4f46e5;
}

@media (min-width: 768px) {
  .editor-container {
    flex-direction: row;
    align-items: flex-start;
  }
  
  .form-section {
    width: 40%;
    position: sticky;
    top: 20px;
  }
  
  .flow-section {
    width: 80%;
  }
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}

.notification.success {
  background-color: #10b981;
}

.notification.error {
  background-color: #ef4444;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.primary-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
</style> 