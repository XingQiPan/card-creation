import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { AIDetector } from './ai-detector.js'
import { v4 as uuidv4 } from 'uuid'
import KnowledgeGraph from './memory_js/knowledge_graph.js'
import CloudSyncService from './cloud-sync-service.js'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// 修改 multer 配置，添加错误处理
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads')
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制文件大小为 50MB
  }
})

// 启用 CORS 和 JSON 解析
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// 确保数据目录存在
const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR)
}

// 确保上传目录存在
const UPLOADS_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR)
}

// 数据文件路径
const SCENES_FILE = path.join(DATA_DIR, 'scenes.json')
const BOOK_SCENES_FILE = path.join(DATA_DIR, 'book-scenes.json')
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json')
const TAGS_FILE = path.join(DATA_DIR, 'tags.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')

// 添加内置提示词文件路径
const BUILT_IN_PROMPTS_FILE = path.join(DATA_DIR, 'built-in-prompts.json')

// 定义存储书籍章节的目录
const BOOKS_DIR = path.join(DATA_DIR, 'books')

// 确保书籍目录存在
if (!fs.existsSync(BOOKS_DIR)) {
  fs.mkdirSync(BOOKS_DIR, { recursive: true })
}

// 封装文件操作相关的工具函数
const FileUtils = {
  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  },

  saveData(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      return true
    } catch (error) {
      console.error(`Error saving to ${filePath}:`, error)
      return false
    }
  },

  loadData(filePath, defaultValue = null) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(data)
      }
      return defaultValue
    } catch (error) {
      console.error(`Error loading from ${filePath}:`, error)
      return defaultValue
    }
  }
}

// 封装数据管理相关的函数
const DataManager = {
  initializeDataFiles() {
    const files = {
      [SCENES_FILE]: [],
      [BOOK_SCENES_FILE]: [],
      [PROMPTS_FILE]: [],
      [TAGS_FILE]: [],
      [AGENTS_FILE]: [],
      [CONFIG_FILE]: {
        models: [],
        notepadContent: '',
        currentSceneId: null,
        selectedTags: [],
        currentView: 'main'
      },
      [BUILT_IN_PROMPTS_FILE]: [
        {
          id: 'built-in-1',
          title: '文章改写助手',
          systemPrompt: '你是一个专业的文章改写助手，善于保持原文含义的同时改写文章结构和用词。',
          userPrompt: '请改写以下文章，保持原意的同时使其更加通顺易读：\n\n{{text}}',
          category: '写作辅助',
          tags: ['写作', '改写']
        },
        // 可以添加更多内置提示词...
      ]
    }

    Object.entries(files).forEach(([file, defaultData]) => {
      if (!fs.existsSync(file)) {
        FileUtils.saveData(file, defaultData)
      }
    })
  },

  ensureConfigFile() {
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultConfig = {
        models: [],
        agents: []
      }
      
      const existingConfig = FileUtils.loadData(CONFIG_FILE)
      if (existingConfig?.models) {
        defaultConfig.models = existingConfig.models
      }
      
      FileUtils.saveData(CONFIG_FILE, defaultConfig)
      console.log('创建默认配置文件')
    }
  },

  getAllData() {
    return {
      scenes: FileUtils.loadData(SCENES_FILE, []),
      prompts: FileUtils.loadData(PROMPTS_FILE, []),
      tags: FileUtils.loadData(TAGS_FILE, []),
      agents: FileUtils.loadData(AGENTS_FILE, []),
      config: FileUtils.loadData(CONFIG_FILE, {
        models: [],
        notepadContent: '',
        currentSceneId: null,
        selectedTags: [],
        currentView: 'main'
      })
    }
  }
}

// 封装代理相关的处理函数
const AgentService = {
  getAgent(agentId) {
    const agents = FileUtils.loadData(AGENTS_FILE, [])
    return agents.find(a => String(a.id) === String(agentId))
  },

  saveAgent(agentData) {
    const agents = FileUtils.loadData(AGENTS_FILE, [])
    const now = new Date().toISOString()

    if (agentData.id) {
      const agentIndex = agents.findIndex(a => String(a.id) === String(agentData.id))
      if (agentIndex !== -1) {
        const id = agents[agentIndex].id
        agents[agentIndex] = { ...agentData, id, updatedAt: now }
      } else {
        agents.push({ ...agentData, id: Date.now(), createdAt: now, updatedAt: now })
      }
    } else {
      agents.push({ ...agentData, id: Date.now(), createdAt: now, updatedAt: now })
    }

    return FileUtils.saveData(AGENTS_FILE, agents) ? agentData : null
  }
}

// 封装响应处理工具
const ResponseHandler = {
  success(res, data = null) {
    res.json({
      success: true,
      data
    })
  },

  error(res, error, status = 500) {
    console.error(error)
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : error
    })
  }
}

// 封装通用的路由处理器
const RouteHandler = {
  loadData(filePath, defaultValue = []) {
    return (req, res) => {
      try {
        const data = FileUtils.loadData(filePath, defaultValue)
        ResponseHandler.success(res, data)
      } catch (error) {
        ResponseHandler.error(res, error)
      }
    }
  },

  saveData(filePath) {
    return (req, res) => {
      try {
        const data = req.body
        if (FileUtils.saveData(filePath, data)) {
          ResponseHandler.success(res)
        } else {
          throw new Error(`Failed to save data to ${filePath}`)
        }
      } catch (error) {
        ResponseHandler.error(res, error)
      }
    }
  }
}


function splitIntoChapters(book) {
  const chapters = [];
  const bookData = [];
  
  // 辅助函数：转义正则特殊字符
  const regexEscape = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 匹配中文数字章节 (第X章)
  let b = book.match(/^第[零一两二三四五六七八九十百千万亿\d]+章.*/gm) || [];


  
  // 去重并排序（保持原始顺序）
  b = [...new Set(b)].sort((a, b) => 
      book.indexOf(a) - book.indexOf(b)
  );

  // 处理章节内容
  for (let i = 0; i < b.length; i++) {
      let content;
      if (i < b.length - 1) {
          // 构建两个标题之间的正则表达式
          const start = regexEscape(b[i]);
          const end = regexEscape(b[i + 1]);
          const pattern = new RegExp(`${start}([\\s\\S]*?)${end}`, 'm');
          
          // 提取中间内容
          const match = book.match(pattern);
          content = match ? match[1].trim() : '';
      } else {
          // 处理最后一章：从标题开始到文本结束
          const pattern = new RegExp(`${regexEscape(b[i])}([\\s\\S]*)`, 'm');
          const match = book.match(pattern);
          content = match ? match[1].trim() : '';
      }

      // 修复原Python代码中的错误：原代码写死用 b[1] 作为标题
      const currentChapter = {
          title: b[i],      // 修正为当前标题
          content: content
      };
      
      chapters.push(currentChapter);
      bookData.push(content);
  }

  // 如果没有找到章节，添加整个内容作为引言
  if (chapters.length === 0) {
      chapters.push({
          title: "引言",
          content: book.trim()
      });
  }

  return chapters;
}
// 修改文件处理服务
const FileProcessingService = {
  async processBookFile(file) {
    
    try {
      // 读取文件内容
      const content = fs.readFileSync(file.path, 'utf8')
      
      // 分割章节
      const chapters = splitIntoChapters(content)
      
      // 删除临时文件
      await fs.promises.unlink(file.path)
      
      return {
        success: true,
        data: {
          chapters: chapters.map((chapter, index) => ({
            title: chapter.title,
            content: chapter.content,
            chapterNumber: index + 1
          }))
        }
      }
    } catch (error) {
      // 确保清理临时文件
      try {
        await fs.promises.unlink(file.path)
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError)
      }
      throw error
    }
  }
}

// 封装模型服务
const ModelService = {
  getAllModels() {
    const config = FileUtils.loadData(CONFIG_FILE) || { models: [] }
    let allModels = []
    
    if (config.models && Array.isArray(config.models)) {
      // 添加主要模型
      allModels = config.models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        modelId: model.modelId
      }))
      
      // 添加可用模型
      config.models.forEach(model => {
        if (model.availableModels && Array.isArray(model.availableModels)) {
          allModels.push(...model.availableModels
            .filter(m => !allModels.some(existing => existing.id === m.id))
            .map(m => ({
              id: m.id,
              name: m.name,
              provider: model.provider || 'unknown',
              modelId: m.id
            })))
        }
      })
    }
    
    return allModels
  }
}

// 封装API文档服务
const APIDocService = {
  routes: [],

  // 注册路由，增加参数和响应的文档
  registerRoute(method, path, description, params = [], responses = {}) {
    this.routes.push({
      method,
      path,
      description,
      params,
      responses
    })
  },

  // 获取所有路由信息
  getAllRoutes() {
    return this.routes
  },

  // 初始化所有路由文档
  initializeDocs() {
    // 健康检查
    this.registerRoute('GET', '/health', '服务器健康检查',
      [],
      { 
        200: { status: 'ok' }
      }
    )

    // 数据加载路由
    this.registerRoute('GET', '/api/get-all-data', '获取所有数据',
      [],
      {
        200: {
          success: true,
          data: {
            scenes: 'Scene[]',
            prompts: 'Prompt[]',
            tags: 'Tag[]',
            agents: 'Agent[]',
            config: {
              models: 'Model[]',
              notepadContent: 'string',
              currentSceneId: 'string|null',
              selectedTags: 'string[]',
              currentView: 'string'
            }
          }
        }
      }
    )

    // 数据同步路由
    this.registerRoute('POST', '/api/sync-data', '同步所有数据',
      [{
        name: 'body',
        type: 'object',
        required: true,
        schema: {
          scenes: 'Scene[]',
          prompts: 'Prompt[]',
          tags: 'Tag[]',
          config: 'Config',
          agents: 'Agent[]'
        }
      }],
      {
        200: { success: true },
        500: { success: false, error: 'string' }
      }
    )

    // AI 检测路由
    this.registerRoute('POST', '/api/detect-ai-text', 'AI文本检测',
      [{
        name: 'body',
        type: 'object',
        required: true,
        schema: {
          text: 'string'
        }
      }],
      {
        200: {
          success: true,
          data: {
            isAIGenerated: 'boolean',
            confidence: 'number'
          }
        }
      }
    )

    this.registerRoute('POST', '/api/detect-ai-file', 'AI文件检测',
      [{
        name: 'file',
        type: 'file',
        required: true,
        maxSize: '50MB'
      }],
      {
        200: {
          success: true,
          data: {
            isAIGenerated: 'boolean',
            confidence: 'number'
          }
        }
      }
    )

    // 书籍处理路由
    this.registerRoute('POST', '/api/split-book', '上传并分割书籍文件',
      [{
        name: 'file',
        type: 'file',
        required: true,
        maxSize: '50MB'
      }],
      {
        200: {
          success: true,
          data: {
            chapters: [{
              title: 'string',
              content: 'string',
              chapterNumber: 'number'
            }]
          }
        }
      }
    )

    // 代理相关路由
    this.registerRoute('GET', '/api/agents', '获取所有代理',
      [],
      {
        200: {
          success: true,
          data: 'Agent[]'
        }
      }
    )

    this.registerRoute('GET', '/api/agents/:id', '获取特定代理',
      [{
        name: 'id',
        type: 'string',
        required: true,
        in: 'path'
      }],
      {
        200: {
          success: true,
          data: 'Agent'
        },
        404: {
          success: false,
          error: 'Agent not found'
        }
      }
    )

    this.registerRoute('POST', '/api/agents', '创建或更新代理',
      [{
        name: 'body',
        type: 'object',
        required: true,
        schema: {
          id: 'string?',
          name: 'string',
          description: 'string',
          // 其他代理属性...
        }
      }],
      {
        200: {
          success: true,
          data: 'Agent'
        }
      }
    )

    // 数据加载路由
    const dataRoutes = [
      { path: '/api/load-scenes', desc: '加载场景数据', type: 'Scene[]' },
      { path: '/api/load-prompts', desc: '加载提示词数据', type: 'Prompt[]' },
      { path: '/api/load-tags', desc: '加载标签数据', type: 'Tag[]' },
      { path: '/api/load-config', desc: '加载配置数据', type: 'Config' },
      { path: '/api/load-book-scenes', desc: '加载书籍场景数据', type: 'BookScene[]' }
    ]

    dataRoutes.forEach(route => {
      this.registerRoute('GET', route.path, route.desc,
        [],
        {
          200: {
            success: true,
            data: route.type
          }
        }
      )
    })

    // 数据保存路由
    const saveRoutes = [
      { path: '/api/save-scenes', desc: '保存场景数据', type: 'Scene[]' },
      { path: '/api/save-prompts', desc: '保存提示词数据', type: 'Prompt[]' },
      { path: '/api/save-tags', desc: '保存标签数据', type: 'Tag[]' },
      { path: '/api/save-config', desc: '保存配置数据', type: 'Config' },
      { path: '/api/save-book-scenes', desc: '保存书籍场景数据', type: 'BookScene[]' }
    ]

    saveRoutes.forEach(route => {
      this.registerRoute('POST', route.path, route.desc,
        [{
          name: 'body',
          type: route.type,
          required: true
        }],
        {
          200: { success: true },
          500: { success: false, error: 'string' }
        }
      )
    })

    // 模型相关路由
    this.registerRoute('GET', '/api/models', '获取所有可用模型',
      [],
      {
        200: {
          success: true,
          data: [{
            id: 'string',
            name: 'string',
            provider: 'string',
            modelId: 'string'
          }]
        }
      }
    )
  }
}

// 初始化数据文件
DataManager.initializeDataFiles()

// 在服务器启动时确保配置文件存在
DataManager.ensureConfigFile()

// 初始化API文档
APIDocService.initializeDocs()

// 调试路由 - 查看当前配置
app.get('/api/debug/config', (req, res) => {
  try {
    const config = FileUtils.loadData(CONFIG_FILE)
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '读取配置失败: ' + error.message
    })
  }
})

// 添加明确的响应方法
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API服务器正常工作' })
})

// 使用封装的路由处理器简化路由定义
app.get('/api/load-scenes', RouteHandler.loadData(SCENES_FILE))
app.get('/api/load-prompts', RouteHandler.loadData(PROMPTS_FILE))
app.get('/api/load-tags', RouteHandler.loadData(TAGS_FILE))
app.get('/api/load-config', RouteHandler.loadData(CONFIG_FILE, {
  models: [],
  notepadContent: '',
  currentSceneId: null,
  selectedTags: [],
  currentView: 'main'
}))

app.post('/api/save-scenes', RouteHandler.saveData(SCENES_FILE))
app.post('/api/save-prompts', RouteHandler.saveData(PROMPTS_FILE))
app.post('/api/save-tags', RouteHandler.saveData(TAGS_FILE))
app.post('/api/save-config', RouteHandler.saveData(CONFIG_FILE))

// 更新文件上传路由
app.post('/api/split-book', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('没有接收到文件')
    }

    const result = await FileProcessingService.processBookFile(req.file)
    res.json(result) // 直接返回处理结果
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 添加健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 添加新的数据同步路由
app.post('/api/sync-data', async (req, res) => {
  try {
    // 保存数据到文件
    const data = req.body;
    await fs.promises.writeFile(
      path.join(DATA_DIR, 'all-data.json'),
      JSON.stringify(data, null, 2)
    );
    res.json({ success: true });
  } catch (error) {
    console.error('保存数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/get-all-data', async (req, res) => {
  try {
    // 从文件加载数据
    const filePath = path.join(DATA_DIR, 'all-data.json');
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      // 如果文件不存在，返回空数据结构
      return res.json({
        scenes: [],
        prompts: [],
        tags: [],
        config: {
          models: [],
          notepadContent: '',
          currentSceneId: null,
          selectedTags: [],
          currentView: 'main'
        }
      });
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('加载数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/agents/:id', (req, res) => {
  try {
    const agent = AgentService.getAgent(req.params.id)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: '未找到该代理'
      })
    }
    res.json({ success: true, data: agent })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取代理失败: ' + error.message
    })
  }
})

app.post('/api/agents', (req, res) => {
  try {
    const savedAgent = AgentService.saveAgent(req.body)
    if (!savedAgent) {
      throw new Error('保存代理数据失败')
    }
    res.json({ success: true, data: savedAgent })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '处理代理数据失败: ' + error.message
    })
  }
})

// 获取所有代理的API端点
app.get('/api/agents', (req, res) => {
  try {
    const agents = FileUtils.loadData(AGENTS_FILE) || []
    res.json({
      success: true,
      data: agents
    })
  } catch (error) {
    console.error('获取代理列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取代理列表失败: ' + error.message
    })
  }
})

// 添加API文档路由
app.get('/api/docs', (req, res) => {
  try {
    const routes = APIDocService.getAllRoutes()
    ResponseHandler.success(res, routes)
  } catch (error) {
    ResponseHandler.error(res, error)
  }
})


// 获取关系属性
app.get('/api/kg/relations/:source/:target/:type/properties', async (req, res) => {
  try {
    const { source, target, type } = req.params;
    const graph = kg.readGraph();
    const relation = graph.relations.find(
      r => r.source === source && r.target === target && r.type === type
    );
    ResponseHandler.success(res, relation ? relation.properties : {});
  } catch (error) {
    ResponseHandler.error(res, error);
  }
});

// 更新关系属性
app.put('/api/kg/relation-properties', async (req, res) => {
  try {
    const { relation } = req.body;
    if (!relation || !relation.source || !relation.target || !relation.type) {
      return res.status(400).json({ success: false, error: '缺少必要的关系参数' });
    }

    const { source, target, type, properties } = relation;
    const result = await kg.updateRelationProperties(source, target, type, properties);
    
    if (result.success) {
      res.status(200).json({ success: true, message: '关系属性更新成功' });
    } else {
      res.status(400).json({ success: false, error: result.error || '更新关系属性失败' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 处理文本输入的检测请求
app.post('/api/detect-ai-text', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: '请提供有效的文本内容'
            });
        }


        const detector = new AIDetector();
        const result = await detector.analyze(text);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('AI检测失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '检测失败'
        });
    }
});

// 处理文件上传的检测请求
app.post('/api/detect-ai-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '请上传文件'
            });
        }

        // 读取文件内容
        const fileContent = fs.readFileSync(req.file.path, 'utf8');

        // 删除临时文件
        fs.unlinkSync(req.file.path);

        const detector = new AIDetector();
        const result = await detector.analyze(fileContent);
        

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || '检测失败'
        });
    }
});

// 添加拆书场景相关的路由
app.get('/api/load-book-scenes', RouteHandler.loadData(BOOK_SCENES_FILE))
app.post('/api/save-book-scenes', RouteHandler.saveData(BOOK_SCENES_FILE))

// 获取任务
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = FileUtils.loadData(TASKS_FILE, null)
    res.json({
      success: true,
      data: tasks
    })
  } catch (error) {
    console.error('获取任务失败:', error)
    res.status(500).json({
      success: false,
      error: '获取任务失败: ' + error.message
    })
  }
})

// 保存任务
app.post('/api/tasks', (req, res) => {
  try {
    const taskData = req.body
    const saved = FileUtils.saveData(TASKS_FILE, taskData)
    
    if (!saved) {
      throw new Error('保存任务数据失败')
    }
    
    res.json({
      success: true,
      data: taskData
    })
  } catch (error) {
    console.error('保存任务失败:', error)
    res.status(500).json({
      success: false,
      error: '保存任务失败: ' + error.message
    })
  }
})

// 删除任务
app.delete('/api/tasks', (req, res) => {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      fs.unlinkSync(TASKS_FILE)
    }
    
    res.json({
      success: true
    })
  } catch (error) {
    console.error('删除任务失败:', error)
    res.status(500).json({
      success: false,
      error: '删除任务失败: ' + error.message
    })
  }
})

// 删除特定 AI 成员
app.delete('/api/agents/:id', (req, res) => {
  try {
    const agentId = req.params.id
    const agents = FileUtils.loadData(AGENTS_FILE, [])
    
    const filteredAgents = agents.filter(agent => String(agent.id) !== String(agentId))
    
    if (filteredAgents.length === agents.length) {
      return res.status(404).json({
        success: false,
        error: '未找到指定的 AI 成员'
      })
    }
    
    const saved = FileUtils.saveData(AGENTS_FILE, filteredAgents)
    
    if (!saved) {
      throw new Error('保存 AI 成员数据失败')
    }
    
    res.json({
      success: true
    })
  } catch (error) {
    console.error('删除 AI 成员失败:', error)
    res.status(500).json({
      success: false,
      error: '删除 AI 成员失败: ' + error.message
    })
  }
})

// 修改内置提示词路由
app.get('/api/built-in-prompts', (req, res) => {
  try {
    // 确保返回正确的 JSON 格式
    const prompts = FileUtils.loadData(BUILT_IN_PROMPTS_FILE, [])
    if (!prompts) {
      // 如果文件不存在或为空，返回空数组
      return res.json({
        success: true,
        data: []
      })
    }
    
    res.json({
      success: true,
      data: prompts
    })
  } catch (error) {
    console.error('获取内置提示词失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取内置提示词失败'
    })
  }
})


// 处理聊天会话数据
app.get('/api/chat-sessions', (req, res) => {
  try {
    const chatSessionsPath = path.join(__dirname, 'data', 'chat-sessions.json');
    if (fs.existsSync(chatSessionsPath)) {
      const chatSessions = JSON.parse(fs.readFileSync(chatSessionsPath, 'utf8'));
      res.json(chatSessions);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('加载聊天会话失败:', error);
    res.status(500).json({ error: '加载聊天会话失败' });
  }
});

app.post('/api/chat-sessions', (req, res) => {
  try {
    const chatSessions = req.body;
    const chatSessionsPath = path.join(__dirname, 'data', 'chat-sessions.json');
    fs.writeFileSync(chatSessionsPath, JSON.stringify(chatSessions, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('保存聊天会话失败:', error);
    res.status(500).json({ error: '保存聊天会话失败' });
  }
});

// 确保内置提示词文件存在并包含初始数据
const initializeBuiltInPrompts = () => {
  if (!fs.existsSync(BUILT_IN_PROMPTS_FILE)) {
    FileUtils.saveData(BUILT_IN_PROMPTS_FILE, defaultPrompts)
  }
}

// 在服务器启动时初始化内置提示词
initializeBuiltInPrompts()

// 添加调试中间件
app.use((req, res, next) => {
  next()
})

// 添加错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : '服务器错误'
  })
})

// 添加书籍章节相关API - 使用bookId参数区分不同的书籍
app.get('/api/books/:bookId/chapters', (req, res) => {
  try {
    const { bookId } = req.params
    const bookFile = path.join(BOOKS_DIR, `${bookId}.json`)
    
    // 检查文件是否存在，不存在则返回空数组
    if (!fs.existsSync(bookFile)) {
      return res.json([])
    }
    
    const chaptersData = JSON.parse(fs.readFileSync(bookFile, 'utf8'))
    res.json(chaptersData)
  } catch (error) {
    console.error('获取书籍章节失败:', error)
    res.status(500).json({
      success: false,
      error: '获取书籍章节失败: ' + error.message
    })
  }
})

app.post('/api/books/:bookId/chapters', (req, res) => {
  try {
    const { bookId } = req.params;
    const chapters = req.body;

    // 添加更严格的验证
    if (!Array.isArray(chapters)) {
      return res.status(400).json({
        success: false,
        error: '无效的章节数据格式'
      });
    }

    // 确保目录存在
    if (!fs.existsSync(BOOKS_DIR)) {
      fs.mkdirSync(BOOKS_DIR, { recursive: true });
    }

    // 保存章节数据
    fs.writeFileSync(
      path.join(BOOKS_DIR, `${bookId}.json`),
      JSON.stringify(chapters, null, 2),
      'utf8'
    );

    res.json({ success: true });
  } catch (error) {
    console.error('保存失败:', error);
    res.status(500).json({
      success: false,
      error: '保存失败: ' + error.message
    });
  }
});

// 获取所有书籍列表
app.get('/api/books', (req, res) => {
  try {
    // 如果目录不存在，创建它
    if (!fs.existsSync(BOOKS_DIR)) {
      fs.mkdirSync(BOOKS_DIR, { recursive: true })
      return res.json([])
    }
    
    // 读取books目录下的所有JSON文件
    const files = fs.readdirSync(BOOKS_DIR).filter(file => file.endsWith('.json'))
    
    // 从每个文件中提取基本信息组成书籍列表
    const books = files.map(file => {
      const bookId = file.replace('.json', '')
      try {
        const bookData = JSON.parse(fs.readFileSync(path.join(BOOKS_DIR, file), 'utf8'))
        const chapterCount = bookData.length || 0
        const wordCount = bookData.reduce((total, chapter) => {
          // 从HTML内容中提取纯文本计算字数
          const content = chapter.content || ''
          const textContent = content.replace(/<[^>]*>/g, '')
          return total + textContent.replace(/\s+/g, '').length
        }, 0)
        
        return {
          id: bookId,
          title: bookData[0]?.title || '未命名书籍',
          preview: bookData[0]?.content?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
          chapterCount,
          wordCount,
          updatedAt: bookData[0]?.updatedAt || new Date().toISOString()
        }
      } catch (error) {
        console.error(`读取书籍 ${bookId} 信息失败:`, error)
        return {
          id: bookId,
          title: '损坏的书籍',
          preview: '',
          chapterCount: 0,
          wordCount: 0,
          updatedAt: new Date().toISOString()
        }
      }
    })
    
    res.json(books)
  } catch (error) {
    console.error('获取书籍列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取书籍列表失败: ' + error.message
    })
  }
})

// 添加获取按分类筛选的提示词的路由
app.get('/api/prompts/category/:category', (req, res) => {
  try {
    const category = req.params.category;
    const prompts = FileUtils.loadData(PROMPTS_FILE, []);
    const filteredPrompts = prompts.filter(prompt => prompt.category === category);
    ResponseHandler.success(res, filteredPrompts);
  } catch (error) {
    ResponseHandler.error(res, error);
  }
});

// 知识图谱相关目录和文件初始化
const KNOWLEDGE_GRAPH_DIR = path.join(DATA_DIR, 'KnowledgeGraph')
if (!fs.existsSync(KNOWLEDGE_GRAPH_DIR)) {
  fs.mkdirSync(KNOWLEDGE_GRAPH_DIR, { recursive: true })
}
const DEFAULT_GRAPH_FILE = path.join(KNOWLEDGE_GRAPH_DIR, 'knowledge_graph.json')

// 初始化知识图谱实例
function initKnowledgeGraph(graphParam = null) {
  if (!graphParam) {
    return new KnowledgeGraph(DEFAULT_GRAPH_FILE)
  }
  if (!graphParam.includes(path.sep) && !path.isAbsolute(graphParam)) {
    const filePath = path.join(KNOWLEDGE_GRAPH_DIR, graphParam)
    const fullPath = filePath.endsWith('.json') ? filePath : `${filePath}.json`
    return new KnowledgeGraph(fullPath)
  }
  return new KnowledgeGraph(graphParam)
}
const kg = initKnowledgeGraph()

// 初始化云同步服务
const cloudSyncService = new CloudSyncService(DATA_DIR)

// ---------------- 知识图谱 API ----------------
// 创建实体
app.post('/api/kg/entities', async (req, res) => {
  try {
    const entities = req.body.entities || []
    const result = await kg.createEntities(entities)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 创建新的知识图谱文件
app.post('/api/kg/create-graph', async (req, res) => {
  try {
    const { fileName } = req.body
    if (!fileName) {
      return res.status(400).json({ success: false, error: '必须提供文件名' })
    }
    
    const result = await kg.createNewGraph(fileName)
    
    if (result.success) {
      res.status(201).json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 创建关系
app.post('/api/kg/relations', async (req, res) => {
  try {
    const relations = req.body.relations || []
    const result = await kg.createRelations(relations)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 添加观察
app.post('/api/kg/observations', async (req, res) => {
  try {
    const observations = req.body.observations || []
    const result = await kg.addObservations(observations)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    if (error.message.includes('不存在')) {
      res.status(404).json({ success: false, error: error.message })
    } else {
      res.status(400).json({ success: false, error: error.message })
    }
  }
})

// 更新特定观察项
app.put('/api/kg/observations', async (req, res) => {
  try {
    const updates = req.body.updates || []
    const result = await kg.updateObservations(updates)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 更新实体所有观察项
app.put('/api/kg/entity-observations', async (req, res) => {
  try {
    const entityName = req.body.entityName
    const observations = req.body.observations
    if (!entityName) {
      return res.status(400).json({ success: false, error: '必须提供实体名称' })
    }
    const result = await kg.setEntityObservations({ entityName, observations })
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 更新实体属性
app.put('/api/kg/entity-properties', async (req, res) => {
  try {
    const entityName = req.body.entityName
    const properties = req.body.properties
    if (!entityName) {
      return res.status(400).json({ success: false, error: '必须提供实体名称' })
    }
    const result = await kg.updateEntityProperties(entityName, properties)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 删除实体
app.delete('/api/kg/entities', async (req, res) => {
  try {
    const entityNames = req.body.entityNames || []
    const result = await kg.deleteEntities(entityNames)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 删除观察
app.delete('/api/kg/observations', async (req, res) => {
  try {
    const deletions = req.body.deletions || []
    const result = await kg.deleteObservations(deletions)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 删除关系
app.delete('/api/kg/relations', async (req, res) => {
  try {
    const relations = req.body.relations || []
    const result = await kg.deleteRelations(relations)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 获取完整知识图谱
app.get('/api/kg/graph', (req, res) => {
  try {
    const result = kg.readGraph()
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 搜索节点
app.get('/api/kg/search', (req, res) => {
  try {
    const query = req.query.query || ''
    const result = kg.searchNodes(query)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 按名称检索节点
app.get('/api/kg/nodes', (req, res) => {
  try {
    const namesParam = req.query.names || ''
    const names = namesParam.split(',').map(name => name.trim()).filter(name => name)
    const result = kg.openNodes(names)
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 加载指定知识图谱文件
app.post('/api/kg/load-graph', async (req, res) => {
  try {
    const fileName = req.body.fileName || ''
    if (!fileName || fileName.includes('..')) {
      return res.status(400).json({ success: false, error: '无效的文件名或路径' })
    }
    let filePath
    if (!fileName.includes(path.sep) && !path.isAbsolute(fileName)) {
      filePath = path.join(KNOWLEDGE_GRAPH_DIR, fileName)
      if (!filePath.endsWith('.json')) filePath += '.json'
    } else {
      filePath = fileName
      if (!filePath.endsWith('.json')) filePath += '.json'
    }
    const success = await kg.loadFromFile(filePath)
    if (success) {
      res.status(200).json({ success: true, message: `成功加载知识图谱: ${filePath}`, path: filePath })
    } else {
      res.status(404).json({ success: false, error: `无法加载知识图谱文件: ${filePath}` })
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// 获取知识图谱文件列表
app.get('/api/kg/graph-files', async (req, res) => {
  try {
    if (!fs.existsSync(KNOWLEDGE_GRAPH_DIR)) {
      fs.mkdirSync(KNOWLEDGE_GRAPH_DIR, { recursive: true })
    }
    const files = (await fs.promises.readdir(KNOWLEDGE_GRAPH_DIR)).filter(file => file.endsWith('.json'))
    res.status(200).json({ success: true, data: { files, currentFile: path.basename(kg.storagePath), directory: KNOWLEDGE_GRAPH_DIR } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 删除知识图谱文件
app.delete('/api/kg/delete-graph', async (req, res) => {
  
  try {
    const { fileName } = req.body
    if (!fileName) {
      return res.status(400).json({ success: false, error: '未指定要删除的文件名' })
    }
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ success: false, error: '文件名不合法' })
    }
    const filePath = path.join(KNOWLEDGE_GRAPH_DIR, fileName)
    const result = await kg.deleteFile(filePath)
    if (result) {
      res.status(200).json({ success: true, message: `成功删除知识图谱文件: ${fileName}` })
    } else {
      res.status(404).json({ success: false, error: `删除知识图谱文件失败: ${fileName}` })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: `删除知识图谱文件失败: ${error.message}` })
  }
})

// ---------------- 云同步 API ----------------
// 检查WebDAV连接状态
app.get('/api/cloud/status', async (req, res) => {
  try {
    const status = await cloudSyncService.checkConnection()
    res.json(status)
  } catch (error) {
    res.status(500).json({ success: false, error: '检查WebDAV状态失败: ' + error.message })
  }
})

// 更新WebDAV设置
app.post('/api/settings/webdav', async (req, res) => {
  try {
    const { webdavUrl, webdavUsername, webdavPassword, autoSaveInterval, autoBackupEnabled } = req.body
    
    if (!webdavUrl || !webdavUsername || !webdavPassword || !autoSaveInterval) {
      return res.status(400).json({
        success: false,
        error: 'WebDAV配置不完整，请提供所有必要参数'
      })
    }
    
    // 更新环境变量
    const prevAutoBackupEnabled = process.env.AUTO_BACKUP_ENABLED === 'true'
    if (autoBackupEnabled !== undefined) {
      process.env.AUTO_BACKUP_ENABLED = String(autoBackupEnabled)
    }
    
    const envPath = path.join(__dirname, '.env')
    let envContent = ''
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }
    
    const webdavUrlRegex = /WEBDAV_URL=.*/
    const webdavUsernameRegex = /WEBDAV_USERNAME=.*/
    const webdavPasswordRegex = /WEBDAV_PASSWORD=.*/
    const cloudSyncIntervalRegex = /CLOUD_SYNC_INTERVAL=.*/
    const autoBackupEnabledRegex = /AUTO_BACKUP_ENABLED=.*/
    
    if (webdavUrlRegex.test(envContent)) {
      envContent = envContent.replace(webdavUrlRegex, `WEBDAV_URL=${webdavUrl}`)
    } else {
      envContent += `\nWEBDAV_URL=${webdavUrl}`
    }
    
    if (webdavUsernameRegex.test(envContent)) {
      envContent = envContent.replace(webdavUsernameRegex, `WEBDAV_USERNAME=${webdavUsername}`)
    } else {
      envContent += `\nWEBDAV_USERNAME=${webdavUsername}`
    }
    
    if (webdavPasswordRegex.test(envContent)) {
      envContent = envContent.replace(webdavPasswordRegex, `WEBDAV_PASSWORD=${webdavPassword}`)
    } else {
      envContent += `\nWEBDAV_PASSWORD=${webdavPassword}`
    }
    
    if (cloudSyncIntervalRegex.test(envContent)) {
      envContent = envContent.replace(cloudSyncIntervalRegex, `CLOUD_SYNC_INTERVAL=${autoSaveInterval}`)
    } else {
      envContent += `\nCLOUD_SYNC_INTERVAL=${autoSaveInterval}`
    }
    
    if (autoBackupEnabled !== undefined) {
      if (autoBackupEnabledRegex.test(envContent)) {
        envContent = envContent.replace(autoBackupEnabledRegex, `AUTO_BACKUP_ENABLED=${autoBackupEnabled}`)
      } else {
        envContent += `\nAUTO_BACKUP_ENABLED=${autoBackupEnabled}`
      }
    }
    fs.writeFileSync(envPath, envContent)
    process.env.WEBDAV_URL = webdavUrl
    process.env.WEBDAV_USERNAME = webdavUsername
    process.env.WEBDAV_PASSWORD = webdavPassword
    process.env.CLOUD_SYNC_INTERVAL = autoSaveInterval
    
    // 重新初始化云同步服务，确保新的配置生效
    cloudSyncService.initialize()
    
    // 更新同步间隔并处理自动备份状态变化
    cloudSyncService.syncInterval = Math.max(parseInt(autoSaveInterval), 60000)
    
    // 如果自动备份状态发生变化，更新服务状态
    if (autoBackupEnabled !== undefined && autoBackupEnabled !== prevAutoBackupEnabled) {
      cloudSyncService.setAutoBackupStatus(autoBackupEnabled)
    } else if (autoBackupEnabled && cloudSyncService.getAutoBackupStatus()) {
      // 如果设置保持为启用状态且之前也是启用状态，则重启以应用新的时间间隔
      cloudSyncService.restartAutoBackup()
    }
    
    const status = await cloudSyncService.checkConnection()
    if (status.success) {
      res.json({ success: true, message: 'WebDAV设置已更新，连接测试成功' })
    } else {
      res.json({ success: false, error: `WebDAV设置已更新，但连接测试失败: ${status.error || '未知错误'}` })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '更新WebDAV设置失败: ' + error.message })
  }
})

// 创建本地备份
app.post('/api/local/backup', async (req, res) => {
  try {
    const backupPath = await cloudSyncService.compressDataDir()
    res.json({ 
      success: true, 
      message: '本地备份创建成功',
      backupPath: backupPath
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建本地备份失败: ' + error.message })
  }
})



// 获取本地备份列表
app.get('/api/local/backups', async (req, res) => {
  try {
    const result = await cloudSyncService.getLocalBackupsList()
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: '获取本地备份列表失败: ' + error.message })
  }
})

// 从本地备份恢复
app.post('/api/local/restore', async (req, res) => {
  try {
    const { backupPath } = req.body
    if (!backupPath) {
      return res.status(400).json({ success: false, error: '未指定要恢复的备份路径' })
    }
    const result = await cloudSyncService.restoreFromLocal(backupPath)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: '从本地备份恢复失败: ' + error.message })
  }
})

// 删除本地备份
app.delete('/api/local/backups', async (req, res) => {
  try {
    const { backupPath } = req.body
    if (!backupPath) {
      return res.status(400).json({ success: false, error: '未指定要删除的备份路径' })
    }
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
      res.json({ success: true, message: '本地备份已删除' })
    } else {
      res.status(404).json({ success: false, error: '本地备份文件不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '删除本地备份失败: ' + error.message })
  }
})

// 手动执行云同步备份
app.post('/api/cloud/sync', async (req, res) => {
  try {
    const result = await cloudSyncService.syncToCloud()
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: '云同步失败: ' + error.message })
  }
})

// 获取云端备份列表
app.get('/api/cloud/backups', async (req, res) => {
  try {
    const result = await cloudSyncService.getBackupsList()
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: '获取云端备份列表失败: ' + error.message })
  }
})

// 从云端恢复
app.post('/api/cloud/restore', async (req, res) => {
  try {
    const { backupPath } = req.body
    if (!backupPath) {
      return res.status(400).json({ success: false, error: '未指定要恢复的备份路径' })
    }
    const result = await cloudSyncService.restoreFromCloud(backupPath)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: '从云端恢复备份失败: ' + error.message })
  }
})

// 删除云端备份
app.delete('/api/cloud/backups', async (req, res) => {
  try {
    const { backupPath } = req.body
    if (!backupPath) {
      return res.status(400).json({ success: false, error: '未指定要删除的备份路径' })
    }
    if (!cloudSyncService.webdavClient) {
      return res.status(500).json({ success: false, error: 'WebDAV客户端未初始化' })
    }
    await cloudSyncService.webdavClient.deleteFile(backupPath)
    res.json({ success: true, message: '备份已删除' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除云端备份失败: ' + error.message })
  }
})

// 自动备份开关
app.post('/api/cloud-sync/auto-backup', (req, res) => {
  try {
    const { enabled } = req.body
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: '参数错误：enabled必须是布尔值' })
    }

    // 更新环境变量
    const envPath = path.join(__dirname, '.env')
    let envContent = ''
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }
    
    const autoBackupEnabledRegex = /AUTO_BACKUP_ENABLED=.*/
    if (autoBackupEnabledRegex.test(envContent)) {
      envContent = envContent.replace(autoBackupEnabledRegex, `AUTO_BACKUP_ENABLED=${enabled}`)
    } else {
      envContent += `\nAUTO_BACKUP_ENABLED=${enabled}`
    }
    fs.writeFileSync(envPath, envContent)
    
    // 更新环境变量和云同步服务状态
    process.env.AUTO_BACKUP_ENABLED = String(enabled)
    const result = cloudSyncService.setAutoBackupStatus(enabled)
    
    res.json({ 
      success: true, 
      data: { 
        enabled: cloudSyncService.getAutoBackupStatus(), 
        status: result ? '操作成功' : '操作失败' 
      }
    })
  } catch (error) {
    console.error('设置自动备份状态失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取自动备份状态
app.get('/api/cloud-sync/auto-backup', (req, res) => {
  try {
    // 从环境变量和服务实例获取状态
    const envStatus = process.env.AUTO_BACKUP_ENABLED === 'true'
    const serviceStatus = cloudSyncService.getAutoBackupStatus()
    
    // 如果环境变量和服务实例状态不一致，更新服务实例状态
    if (envStatus !== serviceStatus) {
      cloudSyncService.setAutoBackupStatus(envStatus)
    }
    
    res.json({
      success: true,
      data: {
        enabled: cloudSyncService.getAutoBackupStatus(),
        interval: parseInt(process.env.CLOUD_SYNC_INTERVAL) || 3600000
      }
    })
  } catch (error) {
    console.error('获取自动备份状态失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 更新实体基本信息 (支持重命名)
app.put('/api/kg/entity', async (req, res) => {
  try {
    const { name, type, oldName } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ success: false, error: '缺少必要的实体参数' });
    }
    
    // 如果提供了oldName且与name不同，表示要重命名实体
    if (oldName && oldName !== name) {
      const result = await kg.renameEntity(oldName, name, type);
      res.status(200).json(result);
    } else {
      // 只更新类型
      const result = await kg.updateEntityType(name, type);
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新关系信息
app.put('/api/kg/relation', async (req, res) => {
  try {
    const { source, target, type, originalType } = req.body;
    
    if (!source || !target || !type || !originalType) {
      return res.status(400).json({ success: false, error: '缺少必要的关系参数' });
    }
    
    // 如果类型没有变化，直接返回成功
    if (type === originalType) {
      return res.status(200).json({ success: true, message: '关系类型未发生变化' });
    }
    
    // 查找原关系
    const graph = kg.readGraph();
    const existingRelation = graph.relations.find(
      r => r.source === source && r.target === target && r.type === originalType
    );
    
    if (!existingRelation) {
      return res.status(404).json({ success: false, error: '找不到原关系' });
    }
    
    // 保存原关系的属性
    const properties = existingRelation.properties || {};
    
    // 删除原关系
    const deleteResult = await kg.deleteRelations([{ source, target, type: originalType }]);
    
    if (!deleteResult || !deleteResult.find(r => r.status === 'deleted')) {
      return res.status(500).json({ success: false, error: '删除原关系失败' });
    }
    
    // 创建新关系
    const createResult = await kg.createRelations([{
      source,
      target,
      type,
      properties,
      overwrite: false
    }]);
    
    if (!createResult || !createResult.find(r => r.status === 'created')) {
      return res.status(500).json({ success: false, error: '创建新关系失败' });
    }
    
    res.status(200).json({ success: true, message: '关系更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
  
  // 测试 AI 检测器
  try {
    const testResult = await new AIDetector().analyze("这是一个测试文本");
  } catch (error) {
    console.error('AI检测器测试失败:', error);
  }
  
  // 确保云同步服务正确初始化
  if (process.env.AUTO_BACKUP_ENABLED === 'true') {
    console.log('自动云同步已开启');
    cloudSyncService.setAutoBackupStatus(true);
  } else {
    console.log('自动云同步未开启');
    cloudSyncService.setAutoBackupStatus(false);
  }
  
  APIDocService.getAllRoutes().forEach(route => {
    console.log(`${route.method.padEnd(6)} ${route.path.padEnd(30)} ${route.description}`)
  });
});