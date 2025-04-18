# API文档

## 健康检查
- 路径: `/health`
- 方法: GET
- 描述: 服务器健康检查
- 请求头: 无特殊要求
- 请求参数: 无
- 响应: 
```json
{
  "status": "ok",
  "timestamp": "2023-04-09T08:30:00.000Z"
}
```

## 数据加载
- 路径: `/api/load-scenes`
- 方法: GET
- 描述: 加载场景数据
- 请求头: 无特殊要求
- 请求参数: 无
- 响应: 
```json
[
  {
    "id": "scene-1",
    "name": "默认场景",
    "description": "默认场景描述",
    "createdAt": "2023-04-09T08:30:00.000Z",
    "updatedAt": "2023-04-09T08:30:00.000Z"
  }
]
```

- 路径: `/api/load-prompts`
- 方法: GET
- 描述: 加载提示词数据
- 请求头: 无特殊要求
- 请求参数: 无
- 响应: 
```json
[
  {
    "id": "prompt-1",
    "name": "默认提示词",
    "content": "默认提示词内容",
    "tags": [],
    "createdAt": "2023-04-09T08:30:00.000Z",
    "updatedAt": "2023-04-09T08:30:00.000Z"
  }
]
```

- 路径: `/api/load-tags`
- 方法: GET
- 描述: 加载标签数据
- 请求头: 无特殊要求
- 请求参数: 无
- 响应: 
```json
[
  {
    "id": "tag-1",
    "name": "默认标签",
    "color": "#FF0000",
    "createdAt": "2023-04-09T08:30:00.000Z",
    "updatedAt": "2023-04-09T08:30:00.000Z"
  }
]
```

- 路径: `/api/load-config`
- 方法: GET
- 描述: 加载配置数据
- 请求头: 无特殊要求
- 请求参数: 无
- 响应: 
```json
{
  "theme": "light",
  "language": "zh-CN",
  "autoSave": true,
  "autoBackup": false,
  "lastSyncTime": "2023-04-09T08:30:00.000Z"
}
```

## 数据保存
- 路径: `/api/save-scenes`
- 方法: POST
- 描述: 保存场景数据
- 参数: `Scene[]`

- 路径: `/api/save-prompts`
- 方法: POST
- 描述: 保存提示词数据
- 参数: `Prompt[]`

- 路径: `/api/save-tags`
- 方法: POST
- 描述: 保存标签数据
- 参数: `Tag[]`

- 路径: `/api/save-config`
- 方法: POST
- 描述: 保存配置数据
- 请求头: Content-Type: application/json
- 请求参数: 
```json
{
  "theme": "light",
  "language": "zh-CN",
  "autoSave": true,
  "autoBackup": false
}
```
- 响应: 
```json
{
  "success": true,
  "message": "配置保存成功"
}
```

## 代理管理
- 路径: `/api/agents`
- 方法: GET
- 描述: 获取所有代理
- 响应: `Agent[]`

- 路径: `/api/agents/:id`
- 方法: GET
- 描述: 获取特定代理
- 参数: `id` (路径参数)
- 响应: `Agent`

- 路径: `/api/agents`
- 方法: POST
- 描述: 创建或更新代理
- 参数: `Agent`对象

## 文件处理
- 路径: `/api/split-book`
- 方法: POST
- 描述: 上传并分割书籍文件
- 参数: `file` (文件上传)
- 响应: 章节数组

## 云同步
- 路径: `/api/cloud-sync/auto-backup`
- 方法: GET
- 描述: 获取自动备份状态
- 响应: `{ enabled: boolean }`

- 路径: `/api/cloud-sync/auto-backup`
- 方法: POST
- 描述: 设置自动备份状态
- 参数: `{ enabled: boolean }`

## 调试
- 路径: `/api/debug/config`
- 方法: GET
- 描述: 查看当前配置
- 响应: 完整配置对象

## API文档
- 路径: `/api/docs`
- 方法: GET
- 描述: 获取所有API路由信息
- 响应: 路由信息数组