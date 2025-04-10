  <template>
    <div class="modal-overlay" @click="$emit('close')">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <slot name="header"></slot>
        </div>
        <div class="modal-body">
          <slot name="body"></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  defineEmits(['close'])
  </script>

  <style scoped>
  .modal-overlay {
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

  .modal-container {
    background: white;
    border-radius: 8px;
    width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-header h3 {
    font-size: 16px;
    font-weight: 500;
    color: #1f2329;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    font-size: 16px;
    line-height: 1;
  }

  .close-btn:hover {
    color: #666;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: nowrap;
  }

  /* 帮助图标样式 */
  .help-icon {
    color: #999;
    font-size: 14px;
    margin-left: 4px;
    cursor: help;
  }

  /* 动画效果 */
  .modal-overlay {
    animation: fadeIn 0.2s ease-out;
  }

  .modal-container {
    animation: slideIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* 滚动条样式 */
  .modal-container::-webkit-scrollbar {
    width: 6px;
  }

  .modal-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  .modal-container::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }

  .modal-container::-webkit-scrollbar-thumb:hover {
    background: #999;
  }
  </style> 