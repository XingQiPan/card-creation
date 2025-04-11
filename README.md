# 星卡写作 (AI Prompt Editor)

一个现代化的、功能丰富的提示词编辑和管理系统，基于 Vue 3 + Vite 构建。该系统允许用户创建、编辑和管理 AI 提示词，支持场景管理、文本卡片和智能工作流。

**版本号：0.9.3**

![项目截图](./public/yangli.png)

## ✨ 主要特性

- 📝 多场景管理：支持创建多个场景并在场景间自由切换
- 🗂️ 文本卡片系统：灵活的卡片式布局，支持拖拽排序和卡片关联
- 🤖 智能工作流：支持创建和管理AI任务流程支持创建和管理AI任务流程
- 🏷️ 标签管理：支持为卡片添加标签，包括普通标签和关键词标签
- 📤 导入导出：支持文本文件(.txt)、Markdown(.md)和 JSON(.json)格式的导入导出
- 🎯 提示词模板：支持创建和管理提示词模板，可插入文本内容
- 🔗 卡片关联：支持多卡片关联，关联内容自动合并
- 🎨 现代化 UI：简洁优雅的界面设计，流畅的交互体验
- 📱 响应式设计：适配不同尺寸的屏幕和设备
- 📚 拆书工具：提供智能拆书和批量处理功能
- 💬 智能聊天：支持多模型对话，自动关联卡片内容，智能拆分卡片
- 🔍 AI检测：支持AI检测，（检测文本是否由AI生成，目前支持roberta-large-openai-detector模型，效果和朱雀相差较大，但勉强能用，若有好模型可以推荐下）【目前是test分支支持模型判断，main分支支持简单算法判断，还未优化】
- 🔠 全局字体调整：支持全局字体大小调整，提升阅读体验
- 📊 卡片布局控制：支持自定义卡片列数和大小，灵活适应不同工作场景

# 版本更新内容:
<details open>
<summary>0.9.3.6</summary>

- 修复了API显示，增加了OpenAI模型选择可以输入，或者拉取模型
- 小说编辑器排版，保存功能完成
- 优化了首页关键词设置颜色显示（羽制作）
- 实现了检测卡组再聊天对话中（羽制作）
- 修复了部分样式问题
- 写作部分UI模块全部完整（角色卡完成，其余未完成）
- 修复标签不能删除
- 修复openai格式请求api在首页，拆书数据返回解析问题
- 增加写入db数据库（抛弃了之前的json存储数据）
- 删除部分冗余样式
- 拆解优化了首页代码
- 解决了依赖问题

</details>

<details>
<summary>0.9.3.5</summary>

- 小说编辑器基础版本-为完善
- 修复了拆书无法终止，删除记录后不会处理的bug
- 基本的小说编辑器功能（没上ai功能）
- 手动选择关键词是否附加检索（羽制作）
- 用户可以发送助手的回答（羽制作）
- 可以导出选中拆书的卡片导出txt
- 可以制作卡片组，用来自由组合卡片（羽制作）
- 关键词选择弹窗，可以在选择时打开卡片详情页面进行修改（羽制作）
- 修复了卡片组的bug
- 卡片属性（设置颜色）、关键词选择弹窗，可以在选择时打开卡片详情页面进行修改（ctrl点击关键词跳转到对应卡片）（羽制作）
- 优化了对话卡片关联显示（羽制作）
- 【提示：按住Alt键点击卡片(包括卡组内的卡片)可以直接插入到提示词】
- 【现在删除卡片卡组要有提示，不过按住ctrl键点击删除按钮可以直接删除】

</details>

<details>
<summary>0.9.3.4</summary>

- 增加了提示词下载器，更新了agent增加了agent工作流修改输出任务的功能
- 修复拆书无法加载bug
- 增加显示卡片多少列的功能，可以放大卡片来操作
- 修复关联功能不可以在对话使用，优化了UI
- 修复对话终止问题不能正确终止
- 点击重新处理不会将之前处理的删除，修复重新处理不会流式输出
- 将所有界面配置了路由

</details>

<details>
<summary>0.9.3.3</summary>

- 修复了流式输出（Gemini，自定义(智谱api)，openai(硅基流动)，ollama）
- 修复了导入提示词会报错的bug
- 修复记事本续写功能
- 修复gemini无法使用提示词的bug，无法发送提示词bug
- 修改了拆书章节匹配机制
- 更改数据存储逻辑，完全抛弃前端存储（对话，首页，拆书）
- 修复了提示词批量导出，批量导入功能
- 修复了拆书保存问题
- 增加了内置提示词平台，可以直接下载提示词使用。
- 修复了聊天会话保存问题

</details>

<details>
<summary>0.9.3.2</summary>

- 增加了AI检测功能，检测文本是否由AI生成（目前是test分支支持模型判断，main分支支持简单算法判断，还未优化）
- 修复关联卡功能，在提示词中也能使用
- 优化了保存功能（实时保存）
- 支持流式输出（Gemini，自定义(智谱api)，openai(硅基流动)）
- 修复了导入提示词会报错的bug


</details>

<details>
<summary>0.9.3.1</summary>

- 修复了场景无法切换的bug
- 修复了拆书功能无法保存的bug

</details>

<details>
<summary>0.9.3</summary>

- 首页js代码进行封装，优化请求等，提升了速度，并且存储逻辑也进行了统一，丢失概率大大下降。
- 优化了对话的请求逻辑，同样进行了封装，对话时候不会重复发送system，切换提示词只是切换system。
- 修复了大量请求问题，统一了请求逻辑。
- 修复了ollama，LM拉取模型，请求失败问题。

</details>

<details>
<summary>0.9.2</summary>

- 增加了版本号
- 修复刷新后无法本地保存接口数据的bug（经量不要疯狂按f5刷新）
- 增加对话轮数，自定义
- 增加提示词导入功能
- 修复标签功能
- 修复章纲转换为卡片时，无法选择目标场景的bug（同时无法选中所有卡片转化为场景卡片功能）

</details>

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装步骤

一、第一种启动方式

card-creation\
```bash
start-dev.bat
```

注意：
默认两种方式都是安装好NodeJS的，如果未安装请先安装NodeJS

打开浏览器访问 http://localhost:8888

三、第三种启动方式

下载exe运行程序

路径：分支[山河-GO-exe](https://github.com/XingQiPan/card-creation/tree/shanhe-go-exe)

在群文件也可以下载

### 注意，使用的时候最佳比例是80%，建议缩小浏览器到80%使用，否则会出现样式问题

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
  - Gemini API: 只需要输入模型名字就好了
  - OpenAI API: 自动附加 `v1/chat/completions` 符合openai格式都可
  - Ollama API: `http://localhost:11434` 拉取模型，拉取后选择自己想要的模型
  - custom API: 自定义API，请确保API地址正确（完整），填入对应api模型
  - 阶跃星辰 API: 拉取选择对应模型
  - 请确保 Ollama 服务已正确启动
  - 支持拉取模型列表，请确保模型支持拉取列表服务，若有问题可以用自定义API（需要输入完整地址）
- 关键词标签：使用关键词标签的卡片内容会在提示词中被检测并自动注入相关上下文
- 卡片关联：关联的卡片内容会在插入提示词时自动合并
- 拖拽优化：场景和卡片拖拽时不会干扰文本选择
- 拆书功能：支持断点续传，可以导入之前的进度继续处理

- API文档：[API注册与星卡填入API文档](https://rw29psdqbrk.feishu.cn/docx/PLgIdp2N9o1tyjxPhLyc5Mghnbh?from=from_copylink)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

1. Fork 这个项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献列表

- [IssaCic0](https://github.com/IssaCic0)
- [山河](https://github.com/shanheinfo)
- [羽](https://github.com/xhaskk)

## 📧 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系：

- QQ群：1028368820
- 教程：

新教程：

2、[【星卡写作第二课教程，如何接入API】]() (版本号：0.9.3.5)

文档；[【API注册与星卡填入API文档】](https://rw29psdqbrk.feishu.cn/docx/PLgIdp2N9o1tyjxPhLyc5Mghnbh?from=from_copylink)

1、[【星卡写作第一课教程，如何安装星卡写作！】](https://www.bilibili.com/video/BV1K3XnYrEmK/?share_source=copy_web&vd_source=92632bab5e8514b32ea9f54b8f6199a1) (版本号：0.9.3.3)

旧教程：

1、[【逆天，一步操作，写作10倍效率——《星卡基础教程》】](https://www.bilibili.com/video/BV1WdPFegEpt/?share_source=copy_web&vd_source=92632bab5e8514b32ea9f54b8f6199a1) (版本号：0.9.3.2-旧版本)

本教程虽然才过了几天，但是已经与最新版本有较大差异，可以在本视频了解对应功能。

有问题优先进群问，我后期会出新视频同步更新到这里。


---

如果这个项目对你有帮助，欢迎给一个 ⭐️ Star！

赞助码！！！
饿饿，饭饭
![赞助图片](./public/可爱的赞助码.jpg)

默认开源协议是GPL协议，如果需要商用请联系我。
