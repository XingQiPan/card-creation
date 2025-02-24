## SpecStory

## API Form Style Adjustments (2025/2/24 19:32:54)

_**User**_

设置api窗体样式进行调整

---

_**Assistant**_

我将帮你调整设置API窗体的样式。主要关注模型配置部分的布局和交互体验。以下是建议的修改：

```css:src/styles/app.css
/* 设置模态框样式优化 */
.settings-modal {
  width: 90vw;
  max-width: 1000px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 模型列表样式优化 */
.models-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.model-item {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.model-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.model-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.form-group input:hover,
.form-group select:hover {
  border-color: #d1d5db;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #646cff;
  box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
}

.form-group input[type="password"] {
  letter-spacing: 2px;
}

/* 模型选择区域样式 */
.model-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.model-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
}

.model-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
  cursor: pointer;
}

.refresh-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #4b5563;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e7eb;
  color: #1f2937;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 删除模型按钮样式 */
.delete-model-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px;
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.delete-model-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* 底部操作按钮样式 */
.settings-actions {
  display: flex;
  justify-content: space-between;
  padding: 20px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  margin-top: 20px;
}

.add-btn {
  padding: 10px 20px;
  background: #ffffff;
  border: 2px dashed #e5e7eb;
  color: #4b5563;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #1f2937;
}

.save-btn {
  padding: 10px 24px;
  background: #646cff;
  border: none;
  color: white;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.save-btn:hover {
  background: #5058cc;
  transform: translateY(-1px);
}
```

主要改进包括：

1. 优化整体布局和间距
2. 改进表单控件的样式和交互效果
3. 添加细腻的动画过渡效果
4. 统一颜色方案和圆角风格
5. 优化按钮样式和悬停效果
6. 改进模型选择区域的布局和交互
7. 美化删除按钮和刷新按钮
8. 优化底部操作区域的样式

这些样式改进将使API设置界面更加现代化、专业化，并提供更好的用户体验。

---



---

