<template>
  <div class="output-editor-modal">
    <div class="output-editor-content">
      <div class="editor-header">
        <h3>编辑任务输出</h3>
        <button @click="$emit('close')" class="close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="editor-body">
        <div class="task-info">
          <div class="task-title">{{ task.title }}</div>
          <div class="task-status" :class="task.status">{{ getStatusText(task.status) }}</div>
        </div>
        
        <div class="editor-form">
          <textarea 
            v-model="outputContent" 
            class="output-textarea"
            placeholder="输入任务输出内容..."
            rows="15"
          ></textarea>
        </div>
      </div>
      
      <div class="editor-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button @click="saveOutput" class="save-btn">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['save', 'close']);

// 本地状态
const outputContent = ref('');

// 初始化
onMounted(() => {
  outputContent.value = props.task.output || '';
});

// 保存输出
const saveOutput = () => {
  emit('save', {
    ...props.task,
    output: outputContent.value
  });
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'pending': return '待执行';
    case 'running': return '执行中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return '未知';
  }
};
</script>

<style scoped>
.output-editor-modal {
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

.output-editor-content {
  background-color: white;
  border-radius: 8px;
  width: 100%;
  max-width: 1400px;
  min-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.editor-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background-color: #f5f5f5;
  color: #666;
}

.editor-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.task-info {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.task-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.task-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background-color: #f5f5f5;
}

.task-status.pending {
  background-color: #fffbe6;
  color: #faad14;
}

.task-status.running {
  background-color: #e6f7ff;
  color: #1890ff;
}

.task-status.completed {
  background-color: #f6ffed;
  color: #52c41a;
}

.task-status.failed {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.editor-form {
  flex: 1;
  display: flex;
  min-height: 100%;
}

.output-textarea {
  width: 100%;
  min-height: 90%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  font-family: monospace;
  resize: vertical;
  box-sizing: border-box;
}

.output-textarea:focus {
  outline: none;
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.editor-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.cancel-btn {
  padding: 8px 16px;
  background-color: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}

.save-btn {
  padding: 8px 16px;
  background-color: #1890ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}
</style> 