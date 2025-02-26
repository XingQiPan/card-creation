<template>
  <div class="node-types-panel">
    <h3>节点类型</h3>
    <div class="node-types-list">
      <div 
        v-for="type in nodeTypes" 
        :key="type.id"
        class="node-type-item"
        draggable="true"
        @dragstart="handleDragStart($event, type)"
      >
        <i :class="type.icon"></i>
        <span class="type-name">{{ type.name }}</span>
        <span class="type-description">{{ type.description }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['dragstart']);

// 定义节点类型
const nodeTypes = ref([
  {
    id: 'start',
    name: '开始节点',
    description: '流程的起始点',
    icon: 'fas fa-play-circle',
    data: {}
  },
  {
    id: 'end',
    name: '结束节点',
    description: '流程的终止点',
    icon: 'fas fa-stop-circle',
    data: {}
  },
  {
    id: 'message',
    name: '消息节点',
    description: '发送或接收消息',
    icon: 'fas fa-comment',
    data: {
      message: '',
      messageType: 'text'
    }
  },
  {
    id: 'condition',
    name: '条件节点',
    description: '根据条件分支流程',
    icon: 'fas fa-code-branch',
    data: {
      condition: '',
      description: ''
    }
  },
  {
    id: 'api',
    name: 'API调用',
    description: '调用外部API服务',
    icon: 'fas fa-cloud',
    data: {
      method: 'GET',
      endpoint: '',
      headers: [],
      body: ''
    }
  },
  {
    id: 'llm',
    name: '大模型调用',
    description: '调用AI大模型生成内容',
    icon: 'fas fa-brain',
    data: {
      modelId: '',
      prompt: '',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: ''
    }
  },
  {
    id: 'function',
    name: '函数节点',
    description: '执行自定义函数',
    icon: 'fas fa-code',
    data: {
      functionName: '',
      parameters: {}
    }
  },
  {
    id: 'delay',
    name: '延时节点',
    description: '等待指定时间',
    icon: 'fas fa-clock',
    data: {
      duration: 1000,
      unit: 'ms'
    }
  }
]);

// 处理拖拽开始事件
const handleDragStart = (event, type) => {
  // 设置拖拽数据
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: type.id,
    data: type.data
  }));
  
  // 设置拖拽效果
  event.dataTransfer.effectAllowed = 'copy';
  
  // 创建拖拽预览
  const preview = document.createElement('div');
  preview.className = 'node-drag-preview';
  preview.innerHTML = `<i class="${type.icon}"></i><span>${type.name}</span>`;
  document.body.appendChild(preview);
  
  // 设置拖拽图像
  event.dataTransfer.setDragImage(preview, 20, 20);
  
  // 延迟移除预览元素
  setTimeout(() => {
    document.body.removeChild(preview);
  }, 0);
  
  emit('dragstart', type);
};
</script>

<style scoped>
.node-types-panel {
  padding: 16px;
  background: white;
  height: 100%;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  color: #374151;
}

.node-types-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.node-type-item {
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}

.node-type-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.node-type-item i {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 8px;
}

.type-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.type-description {
  font-size: 12px;
  color: #6b7280;
}

/* 拖拽预览样式 */
.node-drag-preview {
  position: fixed;
  top: -1000px;
  left: -1000px;
  background: white;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  z-index: 9999;
}

.node-drag-preview i {
  font-size: 14px;
  color: #6b7280;
}

.node-drag-preview span {
  font-size: 14px;
  color: #374151;
}

/* 拖拽状态样式 */
.node-type-item.dragging {
  opacity: 0.5;
}
</style> 