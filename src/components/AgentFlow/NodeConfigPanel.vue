<template>
  <div class="node-config-panel" v-if="node">
    <div class="panel-header">
      <h3>{{ getNodeTypeName() }} 配置</h3>
      <button @click="$emit('close')" class="close-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="panel-content">
      <!-- 基本信息 -->
      <div class="form-group">
        <label>节点名称</label>
        <input 
          type="text" 
          v-model="nodeData.name" 
          placeholder="输入节点名称"
          @input="updateNode"
        >
      </div>

      <!-- 消息节点配置 -->
      <template v-if="node.type === 'message'">
        <div class="form-group">
          <label>消息内容</label>
          <textarea 
            v-model="nodeData.data.message" 
            placeholder="输入消息内容"
            rows="4"
            @input="updateNode"
          ></textarea>
        </div>
        <div class="form-group">
          <label>消息类型</label>
          <select v-model="nodeData.data.messageType" @change="updateNode">
            <option value="text">文本消息</option>
            <option value="template">模板消息</option>
          </select>
        </div>
      </template>

      <!-- 条件节点配置 -->
      <template v-if="node.type === 'condition'">
        <div class="form-group">
          <label>条件表达式</label>
          <textarea 
            v-model="nodeData.data.condition" 
            placeholder="输入条件表达式"
            rows="3"
            @input="updateNode"
          ></textarea>
        </div>
        <div class="form-group">
          <label>条件说明</label>
          <input 
            type="text" 
            v-model="nodeData.data.description" 
            placeholder="输入条件说明"
            @input="updateNode"
          >
        </div>
      </template>

      <!-- API节点配置 -->
      <template v-if="node.type === 'api'">
        <div class="form-group">
          <label>请求方法</label>
          <select v-model="nodeData.data.method" @change="updateNode">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div class="form-group">
          <label>API端点</label>
          <input 
            type="text" 
            v-model="nodeData.data.endpoint" 
            placeholder="输入API端点"
            @input="updateNode"
          >
        </div>
        <div class="form-group">
          <label>请求头</label>
          <div class="headers-list">
            <div 
              v-for="(header, index) in nodeData.data.headers" 
              :key="index"
              class="header-item"
            >
              <input 
                type="text" 
                v-model="header.key" 
                placeholder="Header名"
                @input="updateNode"
              >
              <input 
                type="text" 
                v-model="header.value" 
                placeholder="Header值"
                @input="updateNode"
              >
              <button @click="removeHeader(index)" class="remove-btn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <button @click="addHeader" class="add-btn">
              <i class="fas fa-plus"></i> 添加Header
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>请求体</label>
          <textarea 
            v-model="nodeData.data.body" 
            placeholder="输入请求体 (JSON格式)"
            rows="4"
            @input="updateNode"
          ></textarea>
        </div>
      </template>
      
      <!-- 大模型调用节点配置 -->
      <template v-if="node.type === 'llm'">
        <div class="form-group">
          <label>选择模型</label>
          <select v-model="nodeData.data.modelId" @change="updateNode">
            <option value="">请选择模型</option>
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>系统提示词</label>
          <textarea 
            v-model="nodeData.data.systemPrompt" 
            placeholder="输入系统提示词（可选）"
            rows="3"
            @input="updateNode"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>用户提示词</label>
          <textarea 
            v-model="nodeData.data.prompt" 
            placeholder="输入提示词"
            rows="5"
            @input="updateNode"
          ></textarea>
          <div class="hint">可以使用 {{变量名}} 引用上下文变量</div>
        </div>
        
        <div class="form-group">
          <label>温度 ({{ nodeData.data.temperature }})</label>
          <input 
            type="range" 
            v-model.number="nodeData.data.temperature" 
            min="0" 
            max="1" 
            step="0.1"
            @input="updateNode"
          >
          <div class="range-labels">
            <span>精确</span>
            <span>创造性</span>
          </div>
        </div>
        
        <div class="form-group">
          <label>最大生成长度</label>
          <input 
            type="number" 
            v-model.number="nodeData.data.maxTokens" 
            min="1" 
            max="4000"
            @input="updateNode"
          >
        </div>
      </template>

      <!-- 函数节点配置 -->
      <template v-if="node.type === 'function'">
        <div class="form-group">
          <label>函数参数</label>
          <textarea 
            v-model="nodeData.data.parametersJson" 
            placeholder="输入函数参数 (JSON格式)"
            rows="4"
            @input="updateParametersJson"
          ></textarea>
        </div>
      </template>

      <!-- 延时节点的配置 -->
      <template v-if="node.type === 'delay'">
        <div class="form-group">
          <label>持续时间</label>
          <div class="duration-input">
            <input 
              type="number" 
              v-model="nodeData.data.duration" 
              placeholder="持续时间"
              @input="updateNode"
            >
            <select v-model="nodeData.data.unit" @change="updateNode">
              <option value="ms">毫秒</option>
              <option value="s">秒</option>
              <option value="m">分钟</option>
              <option value="h">小时</option>
              <option value="d">天</option>
            </select>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update', 'close']);

// 节点数据的本地副本
const nodeData = ref(JSON.parse(JSON.stringify(props.node)));

// 可用的模型列表
const availableModels = ref([]);

// 获取模型列表
const fetchModels = async () => {
  try {
    const response = await axios.get('/api/models');
    if (response.data.success) {
      availableModels.value = response.data.models;
    }
  } catch (error) {
    console.error('获取模型列表失败:', error);
    // 添加一些默认模型作为后备
    availableModels.value = [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
    ];
  }
};

// 获取节点类型名称
const getNodeTypeName = () => {
  switch (nodeData.value.type) {
    case 'start': return '开始节点';
    case 'end': return '结束节点';
    case 'message': return '消息节点';
    case 'condition': return '条件节点';
    case 'api': return 'API调用节点';
    case 'function': return '函数节点';
    case 'llm': return '大模型调用节点';
    case 'delay': return '延时节点';
    default: return '节点';
  }
};

// 更新节点
const updateNode = () => {
  emit('update', JSON.parse(JSON.stringify(nodeData.value)));
};

// 更新函数参数
const updateParametersJson = (event) => {
  try {
    // 尝试解析JSON
    const params = JSON.parse(nodeData.value.data.parametersJson);
    nodeData.value.data.parameters = params;
    updateNode();
  } catch (error) {
    // JSON解析错误，不更新parameters字段
    console.error('参数JSON格式错误:', error);
  }
};

// 添加请求头
const addHeader = () => {
  if (!nodeData.value.data.headers) {
    nodeData.value.data.headers = [];
  }
  nodeData.value.data.headers.push({ key: '', value: '' });
  updateNode();
};

// 删除请求头
const removeHeader = (index) => {
  nodeData.value.data.headers.splice(index, 1);
  updateNode();
};

// 生命周期钩子
onMounted(() => {
  // 确保数据结构完整
  if (!nodeData.value.data) {
    nodeData.value.data = {};
  }
  
  // 初始化大模型节点的默认值
  if (nodeData.value.type === 'llm') {
    if (!nodeData.value.data.temperature) {
      nodeData.value.data.temperature = 0.7;
    }
    if (!nodeData.value.data.maxTokens) {
      nodeData.value.data.maxTokens = 1000;
    }
  }
  
  // 初始化函数节点的默认值
  if (nodeData.value.type === 'function') {
    if (!nodeData.value.data.parameters) {
      nodeData.value.data.parameters = {};
    }
    // 将parameters对象转为JSON字符串用于编辑
    nodeData.value.data.parametersJson = JSON.stringify(
      nodeData.value.data.parameters,
      null,
      2
    );
  }
  
  // 初始化延时节点的默认值
  if (nodeData.value.type === 'delay') {
    if (!nodeData.value.data.duration) {
      nodeData.value.data.duration = 1000;
    }
    if (!nodeData.value.data.unit) {
      nodeData.value.data.unit = 'ms';
    }
  }
  
  // 获取模型列表
  fetchModels();
});
</script>

<style scoped>
.node-config-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #374151;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  color: #374151;
}

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.headers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.header-item input {
  flex: 1;
}

.remove-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.remove-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.add-btn {
  background: none;
  border: 1px solid #d1d5db;
  color: #6b7280;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.duration-input {
  display: flex;
  gap: 8px;
}

.duration-input input {
  flex: 1;
}

.duration-input select {
  width: 80px;
}
</style> 