# 星卡写作 - Go版本
web端 主仓库：https://github.com/XingQiPan/card-creation

软件最新发行版：https://github.com/XingQiPan/card-creation/shanhe-go-exe/releases/latest

本分支是由山河维护的分支，基于星卡写作web版本，重新由Go使用Wails框架将Web前端打包为桌面应用，
同时将后端服务从node.js迁移到go中，并使用本地JSON文件存储数据，无需依赖外部数据库。

如果有问题请提issue，thanks！

本地json 存储地址：` C:\Users\你的用户\AppData\Roaming\星卡写作\data`
## 功能特点

- 完全兼容原Vue版本的数据格式和API
- 本地数据存储，无需依赖外部数据库
- 桌面应用体验，无需部署服务器
- 自动版本检查和更新提示，在线更新

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
- v1.1.0: 添加自动版本检查和更新提示，迁移了服务端服务到本地，使用本地JSON文件存储数据，无需依赖外部数据库
- v1.2.0: 添加自动更新功能，修复已知bug，并优化部分功能

## 主要贡献者

- https://github.com/XingQiPan web端源代码 (@XingQiPan)
- https://github.com/shaheinfo 山河 (@shanheinfo)

## 许可证

与原项目相同，采用GUN GPL 3.0许可证
