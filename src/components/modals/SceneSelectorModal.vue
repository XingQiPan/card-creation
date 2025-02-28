<template>
  <BaseModal @close="$emit('close')" content-class="scene-selector-modal">
    <template #header>
      <div class="modal-header">
        <h3>选择目标场景</h3>
      </div>
    </template>

    <div class="modal-body">
      <select v-model="selectedId">
        <option value="">请选择场景</option>
        <option 
          v-for="scene in scenes" 
          :key="scene.id" 
          :value="scene.id"
        >
          {{ scene.name || '未命名场景' }}
        </option>
      </select>
    </div>

    <template #footer>
      <div class="modal-actions">
        <button @click="$emit('close')">取消</button>
        <button 
          @click="$emit('confirm', selectedId)"
          :disabled="!selectedId"
        >
          确认转换
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'

defineProps({
  scenes: {
    type: Array,
    required: true
  }
})

const selectedId = ref('')

defineEmits(['close', 'confirm'])
</script>

<style scoped>
.scene-selector-modal {
  min-width: 400px;
}

.modal-body {
  padding: 20px 0;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

button {
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

button:first-child {
  background: #f8f9fa;
  border: 1px solid #ddd;
  color: #666;
}

button:last-child {
  background: #646cff;
  border: none;
  color: white;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 