<template>
  <div class="agent-testing">
    <div class="testing-header">
      <div class="back-button" @click="goBack">
        <i class="fas fa-arrow-left"></i> 返回
      </div>
      <h1>测试助手: {{ agent?.name || '加载中...' }}</h1>
    </div>

    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i> 正在加载...
    </div>

    <div v-else class="testing-container">
      <div class="chat-window">
        <div class="messages-container">
          <div v-for="(msg, index) in messages" :key="index" 
               class="message" 
               :class="msg.role">
            <div class="message-content">
              {{ msg.content }}
            </div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
        
        <div class="input-container">
          <textarea 
            v-model="userInput" 
            placeholder="输入消息..." 
            rows="3"
            @keydown.enter.prevent="sendMessage"
          ></textarea>
          <button @click="sendMessage" class="send-btn" :disabled="isSending">
            <i class="fas fa-spinner fa-spin" v-if="isSending"></i>
            <i class="fas fa-paper-plane" v-else></i>
          </button>
        </div>
      </div>
      
      <div class="debug-panel">
        <h3>执行日志</h3>
        <div class="execution-logs">
          <div v-for="(log, index) in executionLogs" :key="index" class="log-entry">
            <div class="log-time">{{ formatTime(log.timestamp) }}</div>
            <div class="log-type" :class="log.type">{{ log.type }}</div>
            <div class="log-message">{{ log.message }}</div>
          </div>
          <div v-if="executionLogs.length === 0" class="empty-logs">
            尚无执行日志
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const agent = ref(null);
const loading = ref(true);
const isSending = ref(false);
const userInput = ref('');
const messages = ref([
  {
    role: 'system',
    content: '欢迎使用智能助手测试界面，您可以在这里与助手进行对话测试。',
    timestamp: Date.now()
  }
]);
const executionLogs = ref([]);

// 获取Agent数据
const loadAgentData = async () => {
  try {
    loading.value = true;
    const agentId = route.params.id;
    const response = await fetch(`http://localhost:3000/api/agents/${agentId}`);
    
    if (!response.ok) {
      throw new Error(`获取助手失败: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      agent.value = result.data;
      // 添加系统提示到消息
      if (agent.value.settings?.systemPrompt) {
        addExecutionLog('info', `系统提示词: ${agent.value.settings.systemPrompt}`);
      }
    } else {
      throw new Error(result.error || '获取助手数据失败');
    }
  } catch (error) {
    console.error('加载助手数据失败:', error);
    addExecutionLog('error', `加载失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isSending.value) return;
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userInput.value.trim(),
    timestamp: Date.now()
  });
  
  const userMsg = userInput.value.trim();
  userInput.value = '';
  isSending.value = true;
  
  try {
    addExecutionLog('info', `收到用户消息: ${userMsg}`);
    
    // 初始化流程执行引擎
    const initialContext = {
      userMessage: userMsg,
      userId: 'user-123',
      timestamp: Date.now(),
      history: messages.value.map(m => ({ role: m.role, content: m.content }))
    };
    
    // 执行Agent流程
    flowExecutor.initialize(agent.value.flow, initialContext);
    const result = await flowExecutor.execute();
    
    // 记录执行日志
    result.logs.forEach(log => {
      addExecutionLog(log.type, log.message);
    });
    
    // 显示结果消息
    if (result.result) {
      messages.value.push({
        role: 'assistant',
        content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2),
        timestamp: Date.now()
      });
    } else if (result.context.lastMessage) {
      messages.value.push({
        role: 'assistant',
        content: result.context.lastMessage,
        timestamp: Date.now()
      });
    } else {
      messages.value.push({
        role: 'assistant',
        content: '流程执行完成，但没有生成回复内容。',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('流程执行失败:', error);
    addExecutionLog('error', `执行失败: ${error.message}`);
    
    messages.value.push({
      role: 'assistant',
      content: `抱歉，处理您的请求时出现了错误: ${error.message}`,
      timestamp: Date.now()
    });
  } finally {
    isSending.value = false;
  }
};

// 添加执行日志
const addExecutionLog = (type, message) => {
  executionLogs.value.push({
    type,
    message,
    timestamp: Date.now()
  });
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// 返回上一页
const goBack = () => {
  router.back();
};

onMounted(() => {
  loadAgentData();
});
</script>

<style scoped>
.agent-testing {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.testing-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
  cursor: pointer;
  margin-right: 16px;
}

.back-button:hover {
  color: #1f2937;
}

.testing-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 40px;
  color: #6b7280;
}

.testing-container {
  display: flex;
  height: calc(100% - 68px);
  overflow: hidden;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-right: 1px solid #e5e7eb;
}

.messages-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 8px;
  position: relative;
}

.message.system {
  align-self: center;
  background-color: #f3f4f6;
  color: #4b5563;
  max-width: 90%;
}

.message.user {
  align-self: flex-end;
  background-color: #3b82f6;
  color: white;
}

.message.assistant {
  align-self: flex-start;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #111827;
}

.message-time {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.7;
  text-align: right;
}

.input-container {
  display: flex;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  align-items: flex-end;
}

.input-container textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  resize: none;
  font-size: 14px;
}

.input-container textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.send-btn {
  margin-left: 8px;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.send-btn:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.debug-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
}

.debug-panel h3 {
  margin: 0;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}

.execution-logs {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  font-size: 13px;
  padding: 8px;
  border-radius: 4px;
  background-color: white;
  border: 1px solid #e5e7eb;
}

.log-time {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.log-type {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}

.log-type.info {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.log-type.success {
  background-color: #dcfce7;
  color: #15803d;
}

.log-type.error {
  background-color: #fee2e2;
  color: #b91c1c;
}

.log-type.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.log-message {
  color: #374151;
  word-break: break-word;
}

.empty-logs {
  text-align: center;
  color: #9ca3af;
  padding: 32px 0;
}
</style> 