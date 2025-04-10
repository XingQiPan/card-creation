# 知识图谱 API 文档

知识图谱（Knowledge Graph）是一种语义网络，用于表示各种实体之间的关系及其属性。本API提供了创建、管理和查询知识图谱的功能。
知识图谱端口:3000
## 初始化知识图谱

知识图谱可以通过多种方式进行初始化：

1. **默认路径**：如果不提供参数，系统将在 `backend/data/KnowledgeGraph/knowledge_graph.json` 查找或创建知识图谱文件
2. **提供文件名**：如果提供的是文件名（不包含路径分隔符），系统将在默认目录中查找该文件
3. **提供完整路径**：如果提供的是完整路径，系统将直接使用该路径

```javascript
// 在 server.js 中使用
function initKnowledgeGraph(graphParam = null) {
  // 未提供参数，使用默认路径
  if (!graphParam) {
    return new KnowledgeGraph(DEFAULT_GRAPH_FILE);
  }
  
  // 判断参数是文件名还是路径
  if (!graphParam.includes(path.sep) && !path.isAbsolute(graphParam)) {
    // 只有文件名，拼接默认目录
    const filePath = path.join(KNOWLEDGE_GRAPH_DIR, graphParam);
    // 确保有 .json 扩展名
    const fullPath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
    return new KnowledgeGraph(fullPath);
  } 
  
  // 是完整路径，直接使用
  return new KnowledgeGraph(graphParam);
}
```

## API 端点

### 1. 获取完整知识图谱

```
GET /api/kg/graph
```

获取知识图谱中的所有实体和关系数据。

**返回示例：**

```json
{
  "success": true,
  "data": {
    "entities": {
      "实体1": {
        "name": "实体1",
        "type": "人物",
        "observations": [
          {
            "content": "这是关于实体1的观察",
            "timestamp": "2023-04-09T08:30:00.000Z",
            "source": "user"
          }
        ],
        "properties": {}
      }
    },
    "relations": [
      {
        "source": "实体1",
        "target": "实体2",
        "type": "朋友",
        "properties": {}
      }
    ]
  }
}
```

### 2. 创建实体

```
POST /api/kg/entities
```

创建一个或多个新实体。

**请求体：**

```json
{
  "entities": [
    {
      "name": "实体名称",
      "type": "实体类型",
      "observations": [
        "观察内容1",
        "观察内容2"
      ],
      "overwrite": false
    }
  ]
}
```

**参数说明：**
- `name`：实体名称（必需）
- `type`：实体类型
- `observations`：关于该实体的观察数组
- `overwrite`：是否覆盖同名实体，默认为false

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "name": "实体名称",
      "status": "created"
    }
  ]
}
```

### 3. 创建关系

```
POST /api/kg/relations
```

创建实体之间的关系。

**请求体：**

```json
{
  "relations": [
    {
      "source": "源实体名称",
      "target": "目标实体名称",
      "type": "关系类型",
      "properties": {},
      "overwrite": false
    }
  ]
}
```

**参数说明：**
- `source`：源实体名称（必需）
- `target`：目标实体名称（必需）
- `type`：关系类型（必需）
- `properties`：关系的附加属性
- `overwrite`：是否覆盖同名关系，默认为false

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "source": "源实体名称",
      "target": "目标实体名称",
      "type": "关系类型",
      "status": "created"
    }
  ]
}
```

### 4. 添加观察

```
POST /api/kg/observations
```

向已有实体添加观察项。

**请求体：**

```json
{
  "observations": [
    {
      "entityName": "实体名称",
      "content": "观察内容",
      "timestamp": "2023-04-09T08:30:00.000Z",
      "source": "用户"
    }
  ]
}
```

**参数说明：**
- `entityName`：实体名称（必需）
- `content`：观察内容（必需）
- `timestamp`：时间戳，默认为当前时间
- `source`：数据来源，默认为"user"

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "entityName": "实体名称",
      "status": "added", 
      "content": "观察内容"
    }
  ]
}
```

### 5. 删除实体

```
DELETE /api/kg/entities
```

删除一个或多个实体及其相关的关系。

**请求体：**

```json
{
  "entityNames": ["实体名称1", "实体名称2"]
}
```

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "name": "实体名称1",
      "status": "deleted"
    }
  ]
}
```

### 6. 删除观察

```
DELETE /api/kg/observations
```

删除实体的特定观察项。

**请求体：**

```json
{
  "deletions": [
    {
      "entityName": "实体名称",
      "index": 0
    }
  ]
}
```

**参数说明：**
- `entityName`：实体名称（必需）
- `index`：要删除的观察索引（必需）

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "entityName": "实体名称",
      "index": 0,
      "status": "deleted"
    }
  ]
}
```

### 7. 删除关系

```
DELETE /api/kg/relations
```

删除知识图谱中的特定关系。

**请求体：**

```json
{
  "relations": [
    {
      "source": "源实体名称",
      "target": "目标实体名称",
      "type": "关系类型"
    }
  ]
}
```

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "source": "源实体名称",
      "target": "目标实体名称",
      "type": "关系类型",
      "status": "deleted"
    }
  ]
}
```

### 8. 搜索节点

```
GET /api/kg/search?query=关键词
```

根据查询条件搜索实体。

**查询参数：**
- `query`：搜索关键词，将在实体名称、类型、属性和观察中查找

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "name": "实体名称", 
      "type": "实体类型",
      "observations": [...],
      "properties": {},
      "matchType": "entity"
    }
  ]
}
```

### 9. 查找特定节点

```
GET /api/kg/nodes?names=实体1,实体2
```

按名称检索特定节点。

**查询参数：**
- `names`：要查找的实体名称，多个名称用逗号分隔

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "entity": {
        "name": "实体1",
        "type": "类型",
        "observations": [...],
        "properties": {}
      },
      "relations": [...]
    }
  ]
}
```

### 10. 加载知识图谱文件

```
POST /api/kg/load-graph
```

加载指定的知识图谱文件。

**请求体：**

```json
{
  "fileName": "文件名或路径"
}
```

**参数说明：**
- `fileName`：知识图谱文件名或路径
  - 如果提供的是文件名（不包含路径分隔符），将在默认目录中查找该文件
  - 如果提供的是完整路径，将直接加载该路径

**返回示例：**

```json
{
  "success": true,
  "message": "成功加载知识图谱: /path/to/file.json",
  "path": "/path/to/file.json"
}
```

### 11. 获取知识图谱文件列表

```
GET /api/kg/graph-files
```

获取可用的知识图谱文件列表。

**返回示例：**

```json
{
  "success": true,
  "data": {
    "files": ["knowledge_graph.json", "another_graph.json"],
    "currentFile": "knowledge_graph.json",
    "directory": "/path/to/knowledge/graph/dir"
  }
}
```

### 12. 更新特定观察项

```
PUT /api/kg/observations
```

更新实体的特定观察项。

**请求体：**

```json
{
  "updates": [
    {
      "entityName": "实体名称",
      "index": 0,
      "content": "新的观察内容",
      "timestamp": "2023-04-09T08:30:00.000Z",
      "source": "user"
    }
  ]
}
```

**参数说明：**
- `entityName`：实体名称（必需）
- `index`：要更新的观察项索引（必需）
- `content`：新的观察内容（必需）
- `timestamp`：时间戳，默认为当前时间
- `source`：数据来源，默认为原始来源或"user"

**返回示例：**

```json
{
  "success": true,
  "data": [
    {
      "entityName": "实体名称",
      "index": 0,
      "status": "updated"
    }
  ]
}
```

### 13. 更新实体的所有观察项

```
PUT /api/kg/entity-observations
```

一次性替换实体的所有观察项。

**请求体：**

```json
{
  "entityName": "实体名称",
  "observations": [
    {
      "content": "观察内容1",
      "timestamp": "2023-04-09T08:30:00.000Z",
      "source": "user"
    },
    {
      "content": "观察内容2",
      "timestamp": "2023-04-09T09:30:00.000Z",
      "source": "user"
    }
  ]
}
```

**参数说明：**
- `entityName`：实体名称（必需）
- `observations`：完整的新观察项列表

**返回示例：**

```json
{
  "success": true,
  "data": {
    "entityName": "实体名称",
    "status": "observations_updated"
  }
}
```

## 错误处理

所有API都使用标准的错误响应格式：

```json
{
  "success": false,
  "error": "错误信息"
}
```

常见的HTTP状态码：
- 200/201: 成功
- 400: 请求参数错误
- 404: 资源不存在
- 500: 服务器内部错误 