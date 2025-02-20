# 星卡写作 (AI Prompt Editor)

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
- 📚 拆书工具：提供智能拆书和批量处理功能

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

3. 运行开发服务器：

```bash
npm run dev
```

4. 打开浏览器访问 http://localhost:8888

### 构建部署

构建生产版本：
```bash
npm run build
```

## 📖 功能详细说明

### 1. 场景管理

- **场景创建与切换**
  - 支持创建多个独立场景
  - 场景间拖拽排序
  - 场景名称自定义
  - 场景快速切换

- **场景数据管理**
  - 自动保存场景内容
  - 场景导入导出
  - 场景复制与删除

### 2. 文本卡片系统

- **卡片操作**
  - 创建文本卡片
  - 拖拽排序
  - 高度自定义
  - 标题和内容编辑
  - 快速删除

- **批量操作**
  - 多文件导入
  - 拖拽导入
  - 批量导出

### 3. 标签系统

- **标签类型**
  - 普通标签：用于分类和筛选
  - 关键词标签：特殊标签，支持自动上下文注入
  
- **标签功能**
  - 标签创建与管理
  - 标签筛选器
  - 快速标签切换
  - 标签导入导出

### 4. 提示词系统

- **模板管理**
  - 创建提示词模板
  - 支持多个插入点
  - 默认模型设置
  - 模板导入导出

- **智能处理**
  - 关键词自动识别
  - 上下文智能注入
  - 多模型支持
  - 批量处理能力

### 5. 拆书工具

- **章节识别**
  - 智能识别章节标题
  - 支持多种标题格式
  - 自动分章节处理

- **批量处理**
  - 多场景并行处理
  - 暂停/继续支持
  - 进度保存
  - 结果导入导出

- **处理控制**
  - 自定义处理间隔
  - 错误重试机制
  - 处理进度显示
  - 实时状态更新

### 6. API 集成

- **多模型支持**
  - OpenAI API 集成
  - Google Gemini API 集成
  - 自定义 API 支持

- **参数配置**
  - 模型参数自定义
  - API 密钥管理
  - 请求配置调整

## 🛠️ 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Vuedraggable](https://github.com/SortableJS/Vue.Draggable) - 拖拽组件
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Marked](https://marked.js.org/) - Markdown 解析器
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS 防护
- [Pinia](https://pinia.vuejs.org/) - 状态管理

## ⚠️ 注意事项

- API 地址配置：
  - Gemini API: `https://generativelanguage.googleapis.com/v1beta/models/{模型名称}:generateContent`
  - OpenAI API: 自动附加 `/chat/completions`
- 关键词标签：使用关键词标签的卡片内容会在提示词中被检测并自动注入相关上下文
- 拆书功能：支持断点续传，可以导入之前的进度继续处理

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

1. Fork 这个项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📧 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系：

- QQ群：待建立

---

如果这个项目对你有帮助，欢迎给一个 ⭐️ Star！