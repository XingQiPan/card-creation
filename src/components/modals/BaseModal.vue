<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content" :class="contentClass">
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  contentClass: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  padding: 24px;
  position: relative;
  max-height: 85vh;
  overflow-y: auto;
}
</style> 