好的，根据提供的代码，我将分析并生成一个详细的API文档，按照功能进行分类。

**通用响应结构**

大多数API接口遵循以下通用响应结构：

*   **成功响应:**
    ```json
    {
      "success": true,
      "data": <any> // 接口返回的具体数据
    }
    ```
*   **失败响应:**
    ```json
    {
      "success": false,
      "error": "<string>" // 错误信息描述
    }
    ```

**数据模型定义 (根据代码推断)**

*   `Scene`: 场景对象，结构未知，但通常包含ID、内容等。
*   `Prompt`: 提示词对象，结构未知，但通常包含ID、标题、内容、分类、标签等。
*   `Tag`: 标签对象，结构未知，通常包含ID、名称等。
*   `Agent`: 代理/AI成员对象，包含ID (`number` 或 `string`)、名称 (`string`)、描述 (`string`)、创建时间 (`createdAt`)、更新时间 (`updatedAt`) 等。
*   `Config`: 配置对象，包含 `models` (`Model[]`)、`notepadContent` (`string`)、`currentSceneId` (`string|null`)、`selectedTags` (`string[]`)、`currentView` (`string`) 等。
*   `Model`: 模型配置对象，包含 `id` (`string`), `name` (`string`), `provider` (`string`), `modelId` (`string`), `availableModels` (`Model[]?`) 等。
*   `TaskObject`: 任务对象，结构未知，代码中作为单个对象保存/加载。
*   `BookScene`: 书籍场景对象，结构未知。
*   `BuiltInPrompt`: 内置提示词对象，包含 `id` (`string`), `title` (`string`), `systemPrompt` (`string`), `userPrompt` (`string`), `category` (`string`), `tags` (`string[]`) 等。
*   `ChatSession`: 聊天会话对象，结构未知，代码中作为数组保存/加载。
*   `Entity`: 知识图谱实体对象，包含 `name` (`string`), `type` (`string?`), `description` (`string?`) 等。
*   `Relation`: 知识图谱关系对象，包含 `source` (`string`), `target` (`string`), `type` (`string`), `description` (`string?`) 等。
*   `Observation`: 知识图谱观察项对象，包含 `entityName` (`string`), `observation` (`string`), `timestamp` (`string?`) 等。
*   `Node`: 知识图谱节点对象，结构未知，通常包含实体信息及相关联的观察和关系。
*   `GraphObject`: 知识图谱完整数据结构，包含实体、关系、观察等。

---

### 1. 通用状态与调试 API

*   **GET /health**
    *   **描述:** 检查服务器健康状态。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "status": "ok"
            }
            ```
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/test**
    *   **描述:** 测试API服务器是否正常工作。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "message": "API服务器正常工作"
            }
            ```
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/debug/config**
    *   **描述:** 获取当前服务器加载的配置信息 (用于调试)。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": <Config> // 当前加载的配置对象
            }
            ```
        *   `500 Internal Server Error`: 通用错误响应。

---

### 2. 核心数据管理 API (场景、提示词、标签、配置)

这些API主要用于加载和保存应用程序的核心数据文件 (`scenes.json`, `prompts.json`, `tags.json`, `config.json`)。

*   **GET /api/get-all-data**
    *   **描述:** 从 `data/all-data.json` 文件加载所有主要数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "scenes": <Scene[]>,
              "prompts": <Prompt[]>,
              "tags": <Tag[]>,
              "config": <Config>,
              "agents": <Agent[]> // 注意：代码中实际加载的是all-data.json，但DataManager.getAllData包含了agents
            }
            ```
            如果 `all-data.json` 不存在，返回空数据结构。
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/sync-data**
    *   **描述:** 将所有主要数据保存到 `data/all-data.json` 文件。
    *   **请求体:**
        ```json
        {
          "scenes": <Scene[]>,
          "prompts": <Prompt[]>,
          "tags": <Tag[]>,
          "config": <Config>,
          "agents": <Agent[]>
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/load-scenes**
    *   **描述:** 从 `data/scenes.json` 文件加载场景数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Scene[]> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/save-scenes**
    *   **描述:** 将场景数据保存到 `data/scenes.json` 文件。
    *   **请求体:** `<Scene[]>` (场景数据数组)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/load-prompts**
    *   **描述:** 从 `data/prompts.json` 文件加载提示词数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Prompt[]> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/save-prompts**
    *   **描述:** 将提示词数据保存到 `data/prompts.json` 文件。
    *   **请求体:** `<Prompt[]>` (提示词数据数组)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/prompts/category/:category**
    *   **描述:** 按分类筛选并加载提示词数据。
    *   **路径参数:**
        *   `category`: 要筛选的提示词分类 (`string`)
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Prompt[]> }` (过滤后的提示词数组)
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/built-in-prompts**
    *   **描述:** 从 `data/built-in-prompts.json` 文件加载内置提示词数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <BuiltInPrompt[]> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/load-tags**
    *   **描述:** 从 `data/tags.json` 文件加载标签数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Tag[]> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/save-tags**
    *   **描述:** 将标签数据保存到 `data/tags.json` 文件。
    *   **请求体:** `<Tag[]>` (标签数据数组)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/load-config**
    *   **描述:** 从 `data/config.json` 文件加载配置数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Config> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/save-config**
    *   **描述:** 将配置数据保存到 `data/config.json` 文件。
    *   **请求体:** `<Config>` (配置对象)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/chat-sessions**
    *   **描述:** 从 `data/chat-sessions.json` 文件加载聊天会话数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `<ChatSession[]>` (聊天会话数据数组)
        *   `500 Internal Server Error`: `{ "error": "<string>" }` (注意：此接口错误响应格式与通用格式不同)

*   **POST /api/chat-sessions**
    *   **描述:** 将聊天会话数据保存到 `data/chat-sessions.json` 文件。
    *   **请求体:** `<ChatSession[]>` (聊天会话数据数组)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: `{ "error": "<string>" }` (注意：此接口错误响应格式与通用格式不同)

---

### 3. AI 代理 (Agent) 管理 API

*   **GET /api/agents**
    *   **描述:** 从 `data/agents.json` 文件加载所有AI代理数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Agent[]> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/agents/:id**
    *   **描述:** 根据ID获取特定的AI代理数据。
    *   **路径参数:**
        *   `id`: AI代理的唯一标识符 (`string` 或 `number`)
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Agent> }`
        *   `404 Not Found`: `{ "success": false, "error": "未找到该代理" }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/agents**
    *   **描述:** 创建或更新AI代理。如果请求体包含 `id`，则更新现有代理；否则创建新代理。
    *   **请求体:** `<Agent>` (AI代理对象，包含要保存或更新的数据)
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Agent> }` (保存/更新后的代理对象)
        *   `500 Internal Server Error`: 通用错误响应。

*   **DELETE /api/agents/:id**
    *   **描述:** 根据ID删除AI代理。
    *   **路径参数:**
        *   `id`: 要删除的AI代理的唯一标识符 (`string` 或 `number`)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `404 Not Found`: `{ "success": false, "error": "未找到指定的 AI 成员" }`
        *   `500 Internal Server Error`: 通用错误响应。

---

### 4. 任务 (Task) 管理 API

*   **GET /api/tasks**
    *   **描述:** 从 `data/tasks.json` 文件加载任务数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <TaskObject> }` (任务对象，如果文件不存在或为空则为 `null`)
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/tasks**
    *   **描述:** 将任务数据保存到 `data/tasks.json` 文件。
    *   **请求体:** `<TaskObject>` (任务对象)
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <TaskObject> }` (保存后的任务对象)
        *   `500 Internal Server Error`: 通用错误响应。

*   **DELETE /api/tasks**
    *   **描述:** 删除 `data/tasks.json` 文件。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

---

### 5. 书籍处理与管理 API

*   **POST /api/split-book**
    *   **描述:** 上传一个文本文件，将其分割成章节。
    *   **请求体:** `multipart/form-data`
        *   `file`: 要上传的文本文件 (`File`)。文件大小限制为 50MB。
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": {
                "chapters": [
                  {
                    "title": "<string>",
                    "content": "<string>",
                    "chapterNumber": <number>
                  }
                  // ... 更多章节
                ]
              }
            }
            ```
        *   `400 Bad Request`: `{ "success": false, "error": "没有接收到文件" }`
        *   `500 Internal Server Error`: `{ "success": false, "error": "<string>" }` (处理文件或分割失败)

*   **GET /api/load-book-scenes**
    *   **描述:** 从 `data/book-scenes.json` 文件加载书籍场景数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <BookScene[]> }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/save-book-scenes**
    *   **描述:** 将书籍场景数据保存到 `data/book-scenes.json` 文件。
    *   **请求体:** `<BookScene[]>` (书籍场景数据数组)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/books**
    *   **描述:** 获取所有已保存书籍的列表 (扫描 `data/books` 目录下的JSON文件)。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            [
              {
                "id": "<string>", // 文件名（不含扩展名）
                "title": "<string>", // 通常是第一章标题
                "preview": "<string>", // 第一章内容的前100字（纯文本）
                "chapterCount": <number>, // 章节数量
                "wordCount": <number>, // 总字数（纯文本）
                "updatedAt": "<string>" // ISO日期字符串
              }
              // ... 更多书籍
            ]
            ```
            如果目录不存在或为空，返回空数组 `[]`。
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/books/:bookId/chapters**
    *   **描述:** 根据书籍ID获取特定书籍的所有章节数据。
    *   **路径参数:**
        *   `bookId`: 书籍的唯一标识符 (对应 `data/books` 目录下的JSON文件名，不含扩展名) (`string`)
    *   **响应:**
        *   `200 OK`:
            ```json
            [
              {
                "title": "<string>",
                "content": "<string>",
                "chapterNumber": <number>
              }
              // ... 更多章节
            ]
            ```
            如果书籍文件不存在，返回空数组 `[]`。
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/books/:bookId/chapters**
    *   **描述:** 保存特定书籍的所有章节数据到对应的JSON文件。
    *   **路径参数:**
        *   `bookId`: 要保存的书籍的唯一标识符 (`string`)
    *   **请求体:**
        ```json
        [
          {
            "title": "<string>",
            "content": "<string>",
            "chapterNumber": <number>
          }
          // ... 更多章节
        ]
        ```
        (章节数据数组)
    *   **响应:**
        *   `200 OK`: `{ "success": true }`
        *   `400 Bad Request`: `{ "success": false, "error": "无效的章节数据格式" }`
        *   `500 Internal Server Error`: 通用错误响应。

---

### 6. AI 检测 API

*   **POST /api/detect-ai-text**
    *   **描述:** 检测给定文本的AI生成可能性。
    *   **请求体:**
        ```json
        {
          "text": "<string>" // 要检测的文本内容
        }
        ```
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": {
                "isAIGenerated": <boolean>, // 是否被检测为AI生成
                "confidence": <number> // 置信度 (0-1之间的浮点数)
              }
            }
            ```
        *   `400 Bad Request`: `{ "success": false, "error": "请提供有效的文本内容" }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/detect-ai-file**
    *   **描述:** 检测上传文件的AI生成可能性。
    *   **请求体:** `multipart/form-data`
        *   `file`: 要检测的文本文件 (`File`)。文件大小限制为 50MB。
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": {
                "isAIGenerated": <boolean>, // 是否被检测为AI生成
                "confidence": <number> // 置信度 (0-1之间的浮点数)
              }
            }
            ```
        *   `400 Bad Request`: `{ "success": false, "error": "请上传文件" }`
        *   `500 Internal Server Error`: 通用错误响应。

---

### 7. 知识图谱 (Knowledge Graph) API

这些API操作存储在 `data/KnowledgeGraph` 目录下的知识图谱文件。

*   **POST /api/kg/entities**
    *   **描述:** 创建新的实体。
    *   **请求体:**
        ```json
        {
          "entities": [
            {
              "name": "<string>", // 实体名称 (必需)
              "type": "<string?>", // 实体类型 (可选)
              "description": "<string?>" // 实体描述 (可选)
            }
            // ... 更多实体
          ]
        }
        ```
    *   **响应:**
        *   `201 Created`: `{ "success": true, "data": <ResultObject> }` (创建结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或实体数据无效)

*   **POST /api/kg/relations**
    *   **描述:** 创建新的关系。
    *   **请求体:**
        ```json
        {
          "relations": [
            {
              "source": "<string>", // 源实体名称 (必需)
              "target": "<string>", // 目标实体名称 (必需)
              "type": "<string>", // 关系类型 (必需)
              "description": "<string?>" // 关系描述 (可选)
            }
            // ... 更多关系
          ]
        }
        ```
    *   **响应:**
        *   `201 Created`: `{ "success": true, "data": <ResultObject> }` (创建结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或关系数据无效)

*   **POST /api/kg/observations**
    *   **描述:** 向实体添加新的观察项。
    *   **请求体:**
        ```json
        {
          "observations": [
            {
              "entityName": "<string>", // 实体名称 (必需)
              "observation": "<string>", // 观察内容 (必需)
              "timestamp": "<string?>" // 时间戳 (可选, ISO格式)
            }
            // ... 更多观察项
          ]
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <ResultObject> }` (添加结果)
        *   `404 Not Found`: `{ "success": false, "error": "<string>" }` (指定的实体不存在)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或观察数据无效)

*   **PUT /api/kg/observations**
    *   **描述:** 更新实体的特定观察项。
    *   **请求体:**
        ```json
        {
          "updates": [
            {
              "entityName": "<string>", // 实体名称 (必需)
              "oldObservation": "<string>", // 旧的观察内容 (必需)
              "newObservation": "<string>" // 新的观察内容 (必需)
            }
            // ... 更多更新
          ]
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <ResultObject> }` (更新结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或更新数据无效)

*   **PUT /api/kg/entity-observations**
    *   **描述:** 设置实体的所有观察项 (会替换现有观察项)。
    *   **请求体:**
        ```json
        {
          "entityName": "<string>", // 实体名称 (必需)
          "observations": ["<string>", "<string>", ...] // 观察内容数组 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <ResultObject> }` (设置结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或数据无效)

*   **DELETE /api/kg/entities**
    *   **描述:** 删除实体及其相关的关系和观察项。
    *   **请求体:**
        ```json
        {
          "entityNames": ["<string>", "<string>", ...] // 要删除的实体名称数组 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <ResultObject> }` (删除结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或实体名称无效)

*   **DELETE /api/kg/observations**
    *   **描述:** 删除实体的特定观察项。
    *   **请求体:**
        ```json
        {
          "deletions": [
            {
              "entityName": "<string>", // 实体名称 (必需)
              "observation": "<string>" // 要删除的观察内容 (必需)
            }
            // ... 更多删除项
          ]
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <ResultObject> }` (删除结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或删除数据无效)

*   **DELETE /api/kg/relations**
    *   **描述:** 删除特定的关系。
    *   **请求体:**
        ```json
        {
          "relations": [
            {
              "source": "<string>", // 源实体名称 (必需)
              "target": "<string>", // 目标实体名称 (必需)
              "type": "<string>" // 关系类型 (必需)
            }
            // ... 更多关系
          ]
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <ResultObject> }` (删除结果)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误或关系数据无效)

*   **GET /api/kg/graph**
    *   **描述:** 获取当前加载的完整知识图谱数据。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <GraphObject> }` (知识图谱对象)
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/kg/search**
    *   **描述:** 搜索知识图谱中的节点 (实体)。
    *   **查询参数:**
        *   `query`: 搜索关键词 (`string`, 必需)
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Node[]> }` (匹配的节点数组)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误)

*   **GET /api/kg/nodes**
    *   **描述:** 根据实体名称获取特定的节点数据。
    *   **查询参数:**
        *   `names`: 实体名称列表，逗号分隔 (`string`, 必需)
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": <Node[]> }` (匹配的节点数组)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (请求格式错误)

*   **POST /api/kg/load-graph**
    *   **描述:** 加载指定的知识图谱文件作为当前图谱。
    *   **请求体:**
        ```json
        {
          "fileName": "<string>" // 要加载的文件名 (相对于 data/KnowledgeGraph 目录) 或绝对路径 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "message": "<string>", "path": "<string>" }` (加载成功信息及文件路径)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (文件名无效)
        *   `404 Not Found`: `{ "success": false, "error": "<string>" }` (文件不存在)

*   **GET /api/kg/graph-files**
    *   **描述:** 获取知识图谱文件列表。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": {
                "files": ["<string>", ...], // 文件名列表
                "currentFile": "<string>", // 当前加载的文件名
                "directory": "<string>" // 知识图谱文件目录路径
              }
            }
            ```
        *   `500 Internal Server Error`: 通用错误响应。

*   **DELETE /api/kg/delete-graph**
    *   **描述:** 删除指定的知识图谱文件。
    *   **请求体:**
        ```json
        {
          "fileName": "<string>" // 要删除的文件名 (相对于 data/KnowledgeGraph 目录，必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "message": "<string>" }` (删除成功信息)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (文件名无效)
        *   `404 Not Found`: `{ "success": false, "error": "<string>" }` (文件不存在或删除失败)
        *   `500 Internal Server Error`: 通用错误响应。

---

### 8. 云同步与备份 API

这些API处理与WebDAV服务器的同步以及本地备份。

*   **GET /api/cloud/status**
    *   **描述:** 检查WebDAV连接状态。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "message": "<string?>", "error": "<string?>" }` (连接状态及信息)
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/settings/webdav**
    *   **描述:** 更新WebDAV连接设置和自动备份配置。
    *   **请求体:**
        ```json
        {
          "webdavUrl": "<string>", // WebDAV服务器URL (必需)
          "webdavUsername": "<string>", // WebDAV用户名 (必需)
          "webdavPassword": "<string>", // WebDAV密码 (必需)
          "autoSaveInterval": <number>, // 自动保存间隔 (毫秒) (必需)
          "autoBackupEnabled": <boolean?> // 是否启用自动备份 (可选)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "message": "<string>", "error": "<string?>" }` (设置结果及连接测试结果)
        *   `400 Bad Request`: `{ "success": false, "error": "WebDAV配置不完整..." }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/cloud-sync/auto-backup**
    *   **描述:** 启用或禁用自动云备份。
    *   **请求体:**
        ```json
        {
          "enabled": <boolean> // 是否启用自动备份 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": { "enabled": <boolean>, "status": "<string>" } }` (当前自动备份状态及操作结果)
        *   `400 Bad Request`: `{ "success": false, "error": "参数错误：enabled必须是布尔值" }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/cloud-sync/auto-backup**
    *   **描述:** 获取当前自动云备份的状态和间隔。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": true, "data": { "enabled": <boolean>, "interval": <number> } }` (自动备份是否启用及间隔毫秒数)
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/cloud/sync**
    *   **描述:** 手动触发一次云同步备份。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "message": "<string?>", "error": "<string?>" }` (同步结果)
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/cloud/backups**
    *   **描述:** 获取云端备份文件列表。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "data": { "files": ["<string>", ...], "directory": "<string>" } }` (备份文件列表及云端目录)
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/cloud/restore**
    *   **描述:** 从指定的云端备份文件恢复数据。
    *   **请求体:**
        ```json
        {
          "backupPath": "<string>" // 云端备份文件的完整路径 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "message": "<string?>", "error": "<string?>" }` (恢复结果)
        *   `400 Bad Request`: `{ "success": false, "error": "未指定要恢复的备份路径" }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **DELETE /api/cloud/backups**
    *   **描述:** 删除指定的云端备份文件。
    *   **请求体:**
        ```json
        {
          "backupPath": "<string>" // 云端备份文件的完整路径 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "message": "备份已删除" }`
        *   `400 Bad Request`: `{ "success": false, "error": "未指定要删除的备份路径" }`
        *   `500 Internal Server Error`: 通用错误响应 (包括WebDAV客户端未初始化或删除失败)。

*   **POST /api/cloud/rename**
    *   **描述:** 重命名云端备份文件。
    *   **请求体:**
        ```json
        {
          "backupPath": "<string>", // 云端备份文件的当前完整路径 (必需)
          "newName": "<string>" // 新的文件名 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "message": "<string>" }` (重命名成功信息)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (缺少参数或重命名失败)
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api/local/backups**
    *   **描述:** 获取本地备份文件列表。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "data": { "files": ["<string>", ...], "directory": "<string>" } }` (备份文件列表及本地目录)
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/local/restore**
    *   **描述:** 从指定的本地备份文件恢复数据。
    *   **请求体:**
        ```json
        {
          "backupPath": "<string>" // 本地备份文件的完整路径 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": <boolean>, "message": "<string?>", "error": "<string?>" }` (恢复结果)
        *   `400 Bad Request`: `{ "success": false, "error": "未指定要恢复的备份路径" }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **DELETE /api/local/backups**
    *   **描述:** 删除指定的本地备份文件。
    *   **请求体:**
        ```json
        {
          "backupPath": "<string>" // 本地备份文件的完整路径 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "message": "本地备份已删除" }`
        *   `400 Bad Request`: `{ "success": false, "error": "未指定要删除的备份路径" }`
        *   `404 Not Found`: `{ "success": false, "error": "本地备份文件不存在" }`
        *   `500 Internal Server Error`: 通用错误响应。

*   **POST /api/local/rename**
    *   **描述:** 重命名本地备份文件。
    *   **请求体:**
        ```json
        {
          "backupPath": "<string>", // 本地备份文件的当前完整路径 (必需)
          "newName": "<string>" // 新的文件名 (必需)
        }
        ```
    *   **响应:**
        *   `200 OK`: `{ "success": true, "message": "<string>" }` (重命名成功信息)
        *   `400 Bad Request`: `{ "success": false, "error": "<string>" }` (缺少参数或重命名失败)
        *   `500 Internal Server Error`: 通用错误响应。

---

### 9. 模型管理 API

*   **GET /api/models**
    *   **描述:** 获取所有可用模型列表 (从配置中读取)。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": [
                {
                  "id": "<string>", // 模型唯一ID
                  "name": "<string>", // 模型名称
                  "provider": "<string>", // 模型提供者
                  "modelId": "<string>" // 实际的模型ID
                }
                // ... 更多模型
              ]
            }
            ```
        *   `500 Internal Server Error`: 通用错误响应。

---

### 10. API 文档 API

*   **GET /api/docs**
    *   **描述:** 获取由服务器内部 `APIDocService` 生成的API文档结构。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`:
            ```json
            {
              "success": true,
              "data": [
                {
                  "method": "<string>", // HTTP方法
                  "path": "<string>", // API路径
                  "description": "<string>", // 描述
                  "params": [<object>, ...], // 参数列表
                  "responses": { // 响应状态码及结构
                    "200": <object>,
                    "400": <object>,
                    // ...
                  }
                }
                // ... 更多路由定义
              ]
            }
            ```
        *   `500 Internal Server Error`: 通用错误响应。

*   **GET /api-docs**
    *   **描述:** 获取API文档结构 (与 `/api/docs` 功能类似，可能用于不同的前端展示)。
    *   **请求参数:** 无
    *   **响应:**
        *   `200 OK`: `<object>` (API文档结构，具体格式取决于 `apiDoc` 变量的定义，代码中未完全展示，但预期包含路由信息)
        *   `500 Internal Server Error`: 通用错误响应。

---

