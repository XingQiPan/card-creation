# 星卡写作 (AI Prompt Editor)

一个现代化的、功能丰富的提示词编辑和管理系统，基于 Vue 3 + Vite 构建。该系统允许用户创建、编辑和管理 AI 提示词，支持场景管理、文本卡片和智能工作流。

**版本号：0.9.0**

![项目截图](./public/yangli.png)

## ✨ 主要特性

- 📝 多场景管理：支持创建多个场景并在场景间自由切换
- 🗂️ 文本卡片系统：灵活的卡片式布局，支持拖拽排序和卡片关联
- 🤖 智能工作流：
  - 支持创建和管理AI任务流程
  - 自动关联场景卡片内容
  - 支持任务嵌套和依赖关系
  - 智能识别关键词并注入相关上下文
  - 支持批量执行任务
  - 自动生成场景卡片
- 🏷️ 标签管理：支持为卡片添加标签，包括普通标签和关键词标签
- 📤 导入导出：支持文本文件(.txt)、Markdown(.md)和 JSON(.json)格式的导入导出
- 🎯 提示词模板：支持创建和管理提示词模板，可插入文本内容
- 🔗 卡片关联：支持多卡片关联，关联内容自动合并
- 🎨 现代化 UI：简洁优雅的界面设计，流畅的交互体验
- 📱 响应式设计：适配不同尺寸的屏幕和设备
- 📚 拆书工具：提供智能拆书和批量处理功能
- 💬 智能聊天：支持多模型对话，自动关联卡片内容，智能拆分卡片

## 🤖 智能工作流使用指南

### 创建任务
1. 在工作流界面点击"新建任务"
2. 填写任务标题和描述
3. 选择执行任务的AI成员
4. 配置任务选项：
   - 读取场景卡片：自动识别关键词并注入相关卡片内容
   - 生成场景卡片：将任务结果自动保存为新的场景卡片

### 任务执行
1. 单任务执行：点击任务右侧的执行按钮
2. 批量执行：选择多个任务后点击"执行所选"
3. 执行过程中可以实时查看任务状态和输出

### 场景卡片集成
- 读取场景卡片：
  - 系统会自动分析任务内容中的关键词
  - 匹配相关场景卡片并注入内容
  - 支持模糊匹配和精确匹配
- 生成场景卡片：
  - 任务完成后自动创建新卡片
  - 支持自动添加序号前缀
  - 实时更新场景内容

### 最佳实践
1. 合理组织任务层级，复杂任务可以拆分为子任务
2. 善用场景卡片集成功能，提高内容复用效率
3. 使用批量执行处理相关联的任务
4. 定期整理和归档已完成的任务

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
一、第一种方式

2. 安装依赖：

card-creation\

```bash
npm install
```

backend\

```bash
npm install
```

3. 运行开发服务器：

card-creation\
```bash
npm run dev
```

backend\

```bash
node server.js
```

二、第二种启动方式

card-creation\
```bash
start-dev.bat
```

注意：
默认两种方式都是安装好NodeJS的，如果未安装请先安装NodeJS


4. 打开浏览器访问 http://localhost:8888

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
  - OpenAI API: 自动附加 `/chat/completions` 符合openai格式都可
  - Ollama API: `http://localhost:11434` 拉取模型，拉取后选择自己想要的模型
  - custom API: 自定义API，请确保API地址正确（完整），填入对应api模型
  - 阶跃星辰 API: 拉取选择对应模型(感谢IssaCic0贡献)
  - 请确保 Ollama 服务已正确启动
  - 支持拉取模型列表，请确保模型支持拉取列表服务，若有问题可以用自定义API（需要输入完整地址）
- 关键词标签：使用关键词标签的卡片内容会在提示词中被检测并自动注入相关上下文
- 卡片关联：关联的卡片内容会在插入提示词时自动合并
- 拖拽优化：场景和卡片拖拽时不会干扰文本选择
- 拆书功能：支持断点续传，可以导入之前的进度继续处理

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

1. Fork 这个项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献列表

- [IssaCic0](https://github.com/IssaCic0)

## 📧 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系：

- QQ群：1028368820
- 教程：【逆天，一步操作，写作10倍效率——《星卡基础教程》】 https://www.bilibili.com/video/BV1WdPFegEpt/?share_source=copy_web&vd_source=92632bab5e8514b32ea9f54b8f6199a1
本教程虽然才过了几天，但是已经与最新版本有较大差异，可以在本视频了解对应功能。
有问题优先进群问，我后期会出新视频同步更新到这里。

---

如果这个项目对你有帮助，欢迎给一个 ⭐️ Star！