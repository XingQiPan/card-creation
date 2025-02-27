# 星卡写作 - Go版本

这是星卡写作的Go语言实现版本，使用Wails框架将Web前端打包为桌面应用。

## 功能特点

- 完全兼容原Vue版本的数据格式和API
- 本地数据存储，无需依赖外部数据库
- 桌面应用体验，无需部署服务器
- 自动版本检查和更新提示

## 技术栈

- 后端：Go语言
- 前端打包：Wails框架
- 数据存储：本地JSON文件

## 开发说明

### 环境要求

- Go 1.18+
- Wails v2
- Node.js 14+

### 构建步骤
ps:我已经默认在bin目录下提交了对应的wails.exe，可以直接使用我的版本

1. 安装Wails：`go install github.com/wailsapp/wails/v2/cmd/wails@latest`
2. 构建项目：`wails build`

## 使用说明

应用启动后会自动创建数据目录，默认位置为：
- Windows: `%APPDATA%\星卡写作\data`
- macOS: `~/Library/Application Support/星卡写作/data`
- Linux: `~/.config/星卡写作/data`

## 版本历史

- v1.0.0: 初始版本，实现基本功能

## 贡献者

- 山河 (@shanheinfo)

## 许可证

与原项目相同，采用Apache 2.0许可证
