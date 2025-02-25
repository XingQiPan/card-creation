import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const upload = multer({ dest: 'uploads/' })

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
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json')
const TAGS_FILE = path.join(DATA_DIR, 'tags.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json')

// 辅助函数：保存数据到文件
const saveData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error(`Error saving to ${filePath}:`, error)
    return false
  }
}

// 辅助函数：从文件加载数据
const loadData = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error(`Error loading from ${filePath}:`, error)
    return null
  }
}

// 确保所有数据文件存在
const initializeDataFiles = () => {
  const files = {
    [SCENES_FILE]: [],
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
      saveData(file, defaultData)
    }
  })
}

// 初始化数据文件
initializeDataFiles()

// 确保配置文件存在
function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_FILE)) {
    // 创建默认配置
    const defaultConfig = {
      models: [],
      agents: []
    };
    
    // 如果有模型数据，保留它
    const existingConfig = loadData(CONFIG_FILE);
    if (existingConfig && existingConfig.models) {
      defaultConfig.models = existingConfig.models;
    }
    
    // 保存默认配置
    saveData(CONFIG_FILE, defaultConfig);
    console.log('创建默认配置文件');
  }
}

// 在服务器启动时确保配置文件存在
ensureConfigFile();

// 调试路由 - 查看当前配置
app.get('/api/debug/config', (req, res) => {
  try {
    const config = loadData(CONFIG_FILE);
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '读取配置失败: ' + error.message
    });
  }
});

// API 路由
app.get('/api/load-scenes', (req, res) => {
  try {
    const scenes = loadData(SCENES_FILE) || []
    res.json({ success: true, data: scenes })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/load-prompts', (req, res) => {
  try {
    const prompts = loadData(PROMPTS_FILE) || []
    res.json({ success: true, data: prompts })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/load-tags', (req, res) => {
  try {
    const tags = loadData(TAGS_FILE) || []
    res.json({ success: true, data: tags })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/load-config', (req, res) => {
  try {
    const config = loadData(CONFIG_FILE) || {
      models: [],
      notepadContent: '',
      currentSceneId: null,
      selectedTags: [],
      currentView: 'main'
    }
    res.json({ success: true, data: config })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/save-scenes', (req, res) => {
  try {
    const scenes = req.body
    if (saveData(SCENES_FILE, scenes)) {
      res.json({ success: true })
    } else {
      throw new Error('Failed to save scenes')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/save-prompts', (req, res) => {
  try {
    const prompts = req.body
    if (saveData(PROMPTS_FILE, prompts)) {
      res.json({ success: true })
    } else {
      throw new Error('Failed to save prompts')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/save-tags', (req, res) => {
  try {
    const tags = req.body
    if (saveData(TAGS_FILE, tags)) {
      res.json({ success: true })
    } else {
      throw new Error('Failed to save tags')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/save-config', (req, res) => {
  try {
    const config = req.body
    if (saveData(CONFIG_FILE, config)) {
      res.json({ success: true })
    } else {
      throw new Error('Failed to save config')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 章节分割函数
function splitIntoChapters(text) {
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
    /^[【［][^】］]+[】］]/,
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

// 处理文件上传和分割
app.post('/api/split-book', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    const sceneId = req.body.sceneId
    
    // 读取文件内容
    const content = fs.readFileSync(file.path, 'utf8')
    
    // 分割章节
    const chapters = splitIntoChapters(content)
    
    // 删除临时文件
    fs.unlinkSync(file.path)
    
    // 返回处理结果
    res.json({
      success: true,
      sceneId,
      chapters
    })
    
  } catch (error) {
    console.error('Error processing file:', error)
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
      saveData(SCENES_FILE, scenes),
      saveData(PROMPTS_FILE, prompts), 
      saveData(TAGS_FILE, tags),
      saveData(CONFIG_FILE, config),
      agents ? saveData(AGENTS_FILE, agents) : true
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

// 添加获取所有数据的路由
app.get('/api/get-all-data', async (req, res) => {
  try {
    const data = {
      scenes: loadData(SCENES_FILE) || [],
      prompts: loadData(PROMPTS_FILE) || [],
      tags: loadData(TAGS_FILE) || [],
      agents: loadData(AGENTS_FILE) || [],
      config: loadData(CONFIG_FILE) || {
        models: [],
        notepadContent: '',
        currentSceneId: null,
        selectedTags: [],
        currentView: 'main'
      }
    }
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({
      success: false, 
      error: error.message
    })
  }
})

// 添加 Agent 相关的 API 路由
app.get('/api/agents', (req, res) => {
  try {
    const agents = loadData(AGENTS_FILE) || []
    res.json({ success: true, data: agents })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/agents', (req, res) => {
  try {
    const agent = req.body
    const agents = loadData(AGENTS_FILE) || []
    
    // 新建 agent
    if (!agent.id) {
      agent.id = Date.now()
      agent.createdAt = new Date().toISOString()
      agents.push(agent)
    } else {
      // 更新 agent
      const index = agents.findIndex(a => a.id === agent.id)
      if (index !== -1) {
        agent.updatedAt = new Date().toISOString()
        agents[index] = agent
      } else {
        agents.push({
          ...agent,
          id: Date.now(),
          createdAt: new Date().toISOString()
        })
      }
    }
    
    if (saveData(AGENTS_FILE, agents)) {
      res.json({ success: true, data: agent })
    } else {
      throw new Error('保存 Agent 失败')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/agents/:id', (req, res) => {
  try {
    const agents = loadData(AGENTS_FILE) || []
    const agent = agents.find(a => a.id.toString() === req.params.id)
    
    if (agent) {
      res.json({ success: true, data: agent })
    } else {
      res.status(404).json({
        success: false,
        error: '未找到该 Agent'
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.delete('/api/agents/:id', (req, res) => {
  try {
    const agents = loadData(AGENTS_FILE) || []
    const newAgents = agents.filter(a => a.id.toString() !== req.params.id)
    
    if (saveData(AGENTS_FILE, newAgents)) {
      res.json({ success: true })
    } else {
      throw new Error('删除 Agent 失败')
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 添加模型 API 端点
app.get('/api/models', (req, res) => {
  try {
    // 读取配置文件
    const config = loadData(CONFIG_FILE) || { models: [] };
    
    // 提取所有模型信息
    let allModels = [];
    
    // 处理主要模型
    if (config.models && Array.isArray(config.models)) {
      // 添加主要模型
      allModels = config.models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        modelId: model.modelId
      }));
      
      // 添加可用模型列表中的模型
      config.models.forEach(model => {
        if (model.availableModels && Array.isArray(model.availableModels)) {
          model.availableModels.forEach(availableModel => {
            // 避免重复添加
            if (!allModels.some(m => m.id === availableModel.id)) {
              allModels.push({
                id: availableModel.id,
                name: availableModel.name,
                provider: model.provider || 'unknown',
                modelId: availableModel.id
              });
            }
          });
        }
      });
    }
    
    res.json({
      success: true,
      data: allModels
    });
  } catch (error) {
    console.error('获取模型列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取模型列表失败: ' + error.message
    });
  }
});

// 更新代理 API 端点
app.put('/api/agents/:id', (req, res) => {
  try {
    const agentId = req.params.id;
    const agentData = req.body;
    
    console.log(`更新代理 ${agentId}`);
    
    // 读取配置文件
    const config = loadData(CONFIG_FILE) || { models: [] };
    
    // 如果配置中没有 agents 数组，则创建一个
    if (!config.agents) {
      config.agents = [];
    }
    
    // 查找要更新的代理
    const agentIndex = config.agents.findIndex(agent => agent.id.toString() === agentId);
    
    if (agentIndex === -1) {
      // 如果找不到代理，则添加为新代理
      console.log(`找不到代理 ${agentId}，添加为新代理`);
      agentData.id = agentId;
      agentData.updatedAt = Date.now();
      config.agents.push(agentData);
    } else {
      // 更新现有代理
      console.log(`更新现有代理 ${agentId}`);
      agentData.id = agentId; // 确保 ID 不变
      agentData.updatedAt = Date.now();
      config.agents[agentIndex] = agentData;
    }
    
    // 保存配置文件
    saveData(CONFIG_FILE, config);
    
    res.json({
      success: true,
      data: agentData
    });
  } catch (error) {
    console.error('更新代理失败:', error);
    res.status(500).json({
      success: false,
      error: '更新代理失败: ' + error.message
    });
  }
});

// 获取单个代理 API 端点
app.get('/api/agents/:id', (req, res) => {
  try {
    const agentId = req.params.id;
    
    console.log(`获取代理 ${agentId}`);
    
    // 读取配置文件
    const config = loadData(CONFIG_FILE) || { models: [] };
    
    // 如果配置中没有 agents 数组，则返回错误
    if (!config.agents || !Array.isArray(config.agents)) {
      return res.status(404).json({
        success: false,
        error: '找不到代理'
      });
    }
    
    // 查找代理
    const agent = config.agents.find(agent => agent.id.toString() === agentId);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: '找不到指定的代理'
      });
    }
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('获取代理失败:', error);
    res.status(500).json({
      success: false,
      error: '获取代理失败: ' + error.message
    });
  }
});

// 获取所有代理 API 端点
app.get('/api/agents', (req, res) => {
  try {
    // 读取配置文件
    const config = loadData(CONFIG_FILE) || { models: [] };
    
    // 如果配置中没有 agents 数组，则返回空数组
    if (!config.agents) {
      config.agents = [];
    }
    
    res.json({
      success: true,
      data: config.agents
    });
  } catch (error) {
    console.error('获取代理列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取代理列表失败: ' + error.message
    });
  }
});

// 创建新代理 API 端点
app.post('/api/agents', (req, res) => {
  try {
    const agentData = req.body;
    
    // 生成唯一ID
    agentData.id = Date.now();
    agentData.createdAt = Date.now();
    agentData.updatedAt = Date.now();
    
    console.log('创建新代理:', agentData.id);
    
    // 读取配置文件
    const config = loadData(CONFIG_FILE) || { models: [] };
    
    // 如果配置中没有 agents 数组，则创建一个
    if (!config.agents) {
      config.agents = [];
    }
    
    // 添加新代理
    config.agents.push(agentData);
    
    // 保存配置文件
    saveData(CONFIG_FILE, config);
    
    res.json({
      success: true,
      data: agentData
    });
  } catch (error) {
    console.error('创建代理失败:', error);
    res.status(500).json({
      success: false,
      error: '创建代理失败: ' + error.message
    });
  }
});

// 删除代理 API 端点
app.delete('/api/agents/:id', (req, res) => {
  try {
    const agentId = req.params.id;
    
    console.log(`删除代理 ${agentId}`);
    
    // 读取配置文件
    const config = loadData(CONFIG_FILE) || { models: [] };
    
    // 如果配置中没有 agents 数组，则返回错误
    if (!config.agents || !Array.isArray(config.agents)) {
      return res.status(404).json({
        success: false,
        error: '找不到代理'
      });
    }
    
    // 查找要删除的代理索引
    const agentIndex = config.agents.findIndex(agent => agent.id.toString() === agentId);
    
    if (agentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '找不到指定的代理'
      });
    }
    
    // 删除代理
    config.agents.splice(agentIndex, 1);
    
    // 保存配置文件
    saveData(CONFIG_FILE, config);
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除代理失败:', error);
    res.status(500).json({
      success: false,
      error: '删除代理失败: ' + error.message
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
}) 