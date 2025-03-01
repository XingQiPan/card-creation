import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { AIDetector } from './ai-detector.js'

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
      }
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

// 添加章节分割函数
const splitIntoChapters = (text) => {
  const chapters = []
  const lines = text.split('\n')
  let currentChapter = {
    title: '',
    content: []
  }
  
  // 章节匹配模式
  const chapterPatterns = [
    /^第[一二三四五六七八九十百千]+[章节]/,
    /^第\d+[章节]/,
    /^[一二三四五六七八九十][、.．]/,
    /^[（(]\d+[)）]/,
    /^#+\s+/
  ]
  
  const isChapterTitle = (line) => {
    const trimmedLine = line.trim()
    if (trimmedLine.length > 100) return false
    return chapterPatterns.some(pattern => pattern.test(trimmedLine))
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (isChapterTitle(line)) {
      if (currentChapter.title && currentChapter.content.length > 0) {
        chapters.push({
          ...currentChapter,
          content: currentChapter.content.join('\n')
        })
      }
      currentChapter = {
        title: line,
        content: []
      }
    } else if (currentChapter.title) {
      currentChapter.content.push(line)
    } else {
      currentChapter.title = '引言'
      currentChapter.content.push(line)
    }
  }
  
  // 保存最后一章
  if (currentChapter.title && currentChapter.content.length > 0) {
    chapters.push({
      ...currentChapter,
      content: currentChapter.content.join('\n')
    })
  }
  
  return chapters
}

// 修改文件处理服务
const FileProcessingService = {
  async processBookFile(file) {
    console.log('处理文件:', file.originalname, '大小:', file.size)
    
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

  // 注册路由
  registerRoute(method, path, description) {
    this.routes.push({ method, path, description })
  },

  // 获取所有路由信息
  getAllRoutes() {
    return this.routes
  },

  // 初始化所有路由文档
  initializeDocs() {
    // 健康检查
    this.registerRoute('GET', '/health', '服务器健康检查')
    this.registerRoute('GET', '/api/test', '测试API服务器是否正常工作')
    
    // 调试路由
    this.registerRoute('GET', '/api/debug/config', '查看当前配置')
    
    // 数据加载路由
    this.registerRoute('GET', '/api/load-scenes', '加载场景数据')
    this.registerRoute('GET', '/api/load-prompts', '加载提示词数据')
    this.registerRoute('GET', '/api/load-tags', '加载标签数据')
    this.registerRoute('GET', '/api/load-config', '加载配置数据')
    this.registerRoute('GET', '/api/get-all-data', '获取所有数据')
    
    // 数据保存路由
    this.registerRoute('POST', '/api/save-scenes', '保存场景数据')
    this.registerRoute('POST', '/api/save-prompts', '保存提示词数据')
    this.registerRoute('POST', '/api/save-tags', '保存标签数据')
    this.registerRoute('POST', '/api/save-config', '保存配置数据')
    this.registerRoute('POST', '/api/sync-data', '同步所有数据')
    
    // 代理相关路由
    this.registerRoute('GET', '/api/agents', '获取所有代理')
    this.registerRoute('GET', '/api/agents/:id', '获取特定代理')
    this.registerRoute('POST', '/api/agents', '创建或更新代理')
    
    // 模型相关路由
    this.registerRoute('GET', '/api/models', '获取所有可用模型')
    
    // 文件处理路由
    this.registerRoute('POST', '/api/split-book', '上传并分割书籍文件')
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
    const { scenes, prompts, tags, config, agents } = req.body
    
    // 保存所有数据
    const results = await Promise.all([
      FileUtils.saveData(SCENES_FILE, scenes),
      FileUtils.saveData(PROMPTS_FILE, prompts), 
      FileUtils.saveData(TAGS_FILE, tags),
      FileUtils.saveData(CONFIG_FILE, config),
      agents ? FileUtils.saveData(AGENTS_FILE, agents) : true
    ])

    if(results.every(r => r)) {
      res.json({ success: true })
    } else {
      throw new Error('Failed to save some data')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message 
    })
  }
})

// 更新路由处理，使用封装的函数
app.get('/api/get-all-data', async (req, res) => {
  try {
    const data = DataManager.getAllData()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({
      success: false, 
      error: error.message
    })
  }
})

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

// 更新模型路由
app.get('/api/models', (req, res) => {
  try {
    const models = ModelService.getAllModels()
    ResponseHandler.success(res, models)
  } catch (error) {
    ResponseHandler.error(res, error)
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

        console.log('接收到文本内容，长度:', text.length);

        const detector = new AIDetector();
        const result = await detector.analyze(text);
        
        console.log('AI检测结果:', result);

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
        console.log('文件内容读取成功，长度:', fileContent.length);

        // 删除临时文件
        fs.unlinkSync(req.file.path);

        const detector = new AIDetector();
        const result = await detector.analyze(fileContent);
        
        console.log('AI检测结果:', result);

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

// 添加拆书场景相关的路由
app.get('/api/load-book-scenes', RouteHandler.loadData(BOOK_SCENES_FILE))
app.post('/api/save-book-scenes', RouteHandler.saveData(BOOK_SCENES_FILE))

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // 测试 AI 检测器
  try {
    const testResult = await new AIDetector().analyze("这是一个测试文本");
    console.log('AI检测器测试成功:', testResult);
  } catch (error) {
    console.error('AI检测器测试失败:', error);
  }
  
  console.log(`Data directory: ${DATA_DIR}`);
  console.log('\nAvailable API Routes:');
  APIDocService.getAllRoutes().forEach(route => {
    console.log(`${route.method.padEnd(6)} ${route.path.padEnd(30)} ${route.description}`)
  });
});