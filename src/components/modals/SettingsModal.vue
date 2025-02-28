<template>
  <BaseModal @close="$emit('close')" content-class="settings-modal">
    <template #header>
      <div class="modal-header">
        <h3>设置</h3>
      </div>
    </template>

    <div class="settings-body">
      <div class="models-list">
        <div v-for="model in models" :key="model.id" class="model-item">
          <div class="model-info">
            <!-- 模型信息表单 -->
            <div class="form-group">
              <label>模型名称</label>
              <input v-model="model.name" type="text" />
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input v-model="model.apiKey" type="password" />
            </div>
          </div>
          <button class="delete-model-btn" @click="$emit('delete-model', model.id)">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="settings-actions">
        <button class="add-btn" @click="$emit('add-model')">
          <i class="fas fa-plus"></i>
          添加模型
        </button>
        <button class="save-btn" @click="$emit('save')">保存设置</button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'

defineProps({
  models: {
    type: Array,
    required: true
  }
})

defineEmits(['close', 'save', 'add-model', 'delete-model'])
</script>

<style scoped>
.settings-modal {
  width: 90vw;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
}

/* 其他样式从 app.css 中迁移过来 */
</style> 