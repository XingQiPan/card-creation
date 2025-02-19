# 智能提示词编辑系统 (AI Prompt Editor)

一个现代化的、功能丰富的提示词编辑和管理系统，基于 Vue 3 + Vite 构建。该系统允许用户创建、编辑和管理 AI 提示词，支持场景管理、文本卡片和标签系统。

![项目截图占位符]

## ✨ 主要特性

- 📝 多场景管理：支持创建多个场景并在场景间自由切换
- 🗂️ 文本卡片系统：灵活的卡片式布局，支持拖拽排序
- 🏷️ 标签管理：支持为卡片添加标签，包括普通标签和关键词标签
- 📤 导入导出：支持文本文件(.txt)、Markdown(.md)和 JSON(.json)格式的导入导出
- 🎯 提示词模板：支持创建和管理提示词模板，可插入文本内容
- 🎨 现代化 UI：简洁优雅的界面设计，流畅的交互体验
- 📱 响应式设计：适配不同尺寸的屏幕和设备

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装步骤

1. 克隆项目到本地：

```bash
git clone https://github.com/XingQiPan/card-creation.git
cd card-creation
```



2. 安装依赖：

```bash
npm install
```

3. 运行

```bash
npm run dev
```

4. 打开浏览器访问 http://localhost:8888

### 构建部署

构建生产版本：
```bash
npm run build
```


## 🛠️ 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Vuedraggable](https://github.com/SortableJS/Vue.Draggable) - 基于 Sortable.js 的 Vue 拖拽组件
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Marked](https://marked.js.org/) - Markdown 解析器
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS 防护
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理库

## 📖 使用指南

### 场景管理

- 点击"新场景"按钮创建新的场景
- 场景标签支持拖拽排序
- 点击场景标签切换不同场景
- 支持编辑场景名称和删除场景

### 文本卡片

- 点击"新建卡片"添加文本卡片
- 支持拖拽调整卡片位置
- 可以调整卡片高度
- 支持为卡片添加标签
- 支持导入外部文件内容

### 标签系统

- 支持创建和管理标签
- 可将标签标记为关键词
- 支持按标签筛选卡片
- 标签可以在卡片间快速添加/移除

### 导入导出

- 支持导入 .txt、.md、.json 格式文件
- 支持将内容导出为 JSONL 格式
- 支持拖拽文件导入

### 注意！

- 谷歌Gemini API 请求地址是：https://generativelanguage.googleapis.com/v1beta/models/{模型名称}:generateContent
- openai API 请求会自动将在最后赋值/chat/completions
## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

1. Fork 这个项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📧 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系：

- QQ群 还没建

---

如果这个项目对你有帮助，欢迎给一个 ⭐️ Star！

