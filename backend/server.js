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
    const { scenes, prompts, tags, config } = req.body
    
    // 保存所有数据
    const results = await Promise.all([
      saveData(SCENES_FILE, scenes),
      saveData(PROMPTS_FILE, prompts), 
      saveData(TAGS_FILE, tags),
      saveData(CONFIG_FILE, config)
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

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
}) 