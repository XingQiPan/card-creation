import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_DIR = path.join(__dirname, 'data')
const DB_PATH = path.join(DB_DIR, 'app.db')

// 确保数据目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// 创建数据库连接
let db

// 初始化数据库
export function initDb() {
  try {
    console.log('正在初始化数据库...')
    db = new Database(DB_PATH, { verbose: console.log })
    
    // 启用外键约束
    db.pragma('foreign_keys = ON')
    
    // 创建表
    createTables()
    
    // 检查并更新表结构
    migrateDatabase()
    
    console.log('数据库初始化完成')
    return db
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

// 关闭数据库连接
export function closeDb() {
  if (db) {
    db.close()
  }
}

// 获取数据库连接
export function getDb() {
  if (!db) {
    return initDb()
  }
  return db
}

// 创建所有必要的表
function createTables() {
  // 创建场景表
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      cards TEXT,
      tags TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
  
  // 创建提示词表
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      title TEXT,
      systemPrompt TEXT,
      userPrompt TEXT,
      category TEXT,
      tags TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
  
  // 创建标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      isKeyword INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
  
  // 创建知识库表
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      embeddings TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
  
  // 创建代理表
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      avatar TEXT,
      systemPrompt TEXT,
      settings TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
  
  // 创建任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      dueDate TEXT,
      assignedTo TEXT
    )
  `)
  
  // 创建配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      id TEXT PRIMARY KEY,
      value TEXT
    )
  `)
  
  // 创建书籍场景表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_scenes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      bookId TEXT,
      chapterNumber INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
  
  // 创建内置提示词表
  db.exec(`
    CREATE TABLE IF NOT EXISTS built_in_prompts (
      id TEXT PRIMARY KEY,
      title TEXT,
      systemPrompt TEXT,
      userPrompt TEXT,
      category TEXT,
      tags TEXT
    )
  `)
  
  // 创建聊天会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      messages TEXT,
      modelId TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
}

// 数据库迁移 - 添加缺失的列
function migrateDatabase() {
  try {
    const db = getDb()
    
    // 检查scenes表是否有cards列
    const tableInfo = db.prepare("PRAGMA table_info(scenes)").all()
    const hasCardsColumn = tableInfo.some(column => column.name === 'cards')
    
    if (!hasCardsColumn) {
      console.log('正在升级scenes表结构，添加cards列...')
      
      // 由于SQLite不支持直接添加列，我们需要以下步骤：
      // 1. 创建临时表
      // 2. 复制数据
      // 3. 删除旧表
      // 4. 重命名新表
      
      db.transaction(() => {
        // 创建新表
        db.prepare(`
          CREATE TABLE IF NOT EXISTS scenes_new (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            cards TEXT,
            tags TEXT,
            createdAt TEXT,
            updatedAt TEXT
          )
        `).run()
        
        // 复制数据
        const rows = db.prepare('SELECT * FROM scenes').all()
        const insertStmt = db.prepare(`
          INSERT INTO scenes_new (id, title, content, cards, tags, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        
        rows.forEach(row => {
          insertStmt.run(
            row.id,
            row.title,
            row.content,
            '[]', // 默认空数组
            row.tags || '[]',
            row.createdAt || new Date().toISOString(),
            row.updatedAt || new Date().toISOString()
          )
        })
        
        // 删除旧表
        db.prepare('DROP TABLE scenes').run()
        
        // 重命名新表
        db.prepare('ALTER TABLE scenes_new RENAME TO scenes').run()
        
        console.log('scenes表结构升级完成')
      })()
    }
    
    // 检查chat_sessions表是否存在
    try {
      db.prepare("SELECT 1 FROM chat_sessions LIMIT 1").all()
    } catch (error) {
      console.log('聊天会话表不存在，正在创建...')
      db.exec(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          title TEXT,
          messages TEXT,
          modelId TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )
      `)
    }
  } catch (error) {
    console.error('数据库迁移失败:', error)
    // 继续执行，不抛出异常中断应用
    console.log('迁移失败，但将继续启动应用')
  }
}

// 数据库操作工具
export const dbUtils = {
  // 通用查询方法
  query(sql, params = []) {
    try {
      const db = getDb()
      return db.prepare(sql).all(params)
    } catch (error) {
      console.error('查询失败:', error)
      throw error
    }
  },
  
  // 通用执行方法
  exec(sql, params = []) {
    try {
      const db = getDb()
      return db.prepare(sql).run(params)
    } catch (error) {
      console.error('执行失败:', error)
      throw error
    }
  },
  
  // 通用获取单条记录方法
  get(sql, params = []) {
    try {
      const db = getDb()
      return db.prepare(sql).get(params)
    } catch (error) {
      console.error('获取记录失败:', error)
      throw error
    }
  },
  
  // 开始事务
  transaction(callback) {
    const db = getDb()
    const transaction = db.transaction(callback)
    return transaction()
  }
}

// 数据管理工具
export const DataManager = {
  // 初始化默认数据
  initializeDefaultData() {
    const db = getDb()
    
    // 初始化配置
    const configExists = db.prepare('SELECT COUNT(*) as count FROM config WHERE id = ?').get('app')
    if (!configExists || configExists.count === 0) {
      const defaultConfig = {
        models: [],
        notepadContent: '',
        currentSceneId: null,
        selectedTags: [],
        currentView: 'main'
      }
      
      db.prepare('INSERT INTO config (id, value) VALUES (?, ?)').run('app', JSON.stringify(defaultConfig))
    }
    
    // 初始化内置提示词
    const promptsExist = db.prepare('SELECT COUNT(*) as count FROM built_in_prompts').get()
    if (!promptsExist || promptsExist.count === 0) {
      const stmt = db.prepare(`
        INSERT INTO built_in_prompts (id, title, systemPrompt, userPrompt, category, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        'built-in-1',
        '文章改写助手',
        '你是一个专业的文章改写助手，善于保持原文含义的同时改写文章结构和用词。',
        '请改写以下文章，保持原意的同时使其更加通顺易读：\n\n{{text}}',
        '写作辅助',
        JSON.stringify(['写作', '改写'])
      )
    }
  },
  
  // 获取所有数据
  getAllData() {
    const db = getDb()
    
    const scenes = db.prepare('SELECT * FROM scenes').all()
    const prompts = db.prepare('SELECT * FROM prompts').all()
    const tags = db.prepare('SELECT * FROM tags').all()
    const agents = db.prepare('SELECT * FROM agents').all()
    const configJson = db.prepare('SELECT value FROM config WHERE id = ?').get('app')
    
    // 处理JSON字段
    const parsedScenes = scenes.map(scene => ({
      id: scene.id,
      name: scene.title,
      content: scene.content,
      cards: JSON.parse(scene.cards || '[]'),
      tags: JSON.parse(scene.tags || '[]'),
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt
    }))
    
    const parsedPrompts = prompts.map(prompt => ({
      ...prompt,
      tags: JSON.parse(prompt.tags || '[]')
    }))
    
    const config = configJson ? JSON.parse(configJson.value) : {
      models: [],
      notepadContent: '',
      currentSceneId: null,
      selectedTags: [],
      currentView: 'main'
    }
    
    return {
      scenes: parsedScenes,
      prompts: parsedPrompts,
      tags,
      agents,
      config
    }
  },
  
  // 同步所有数据 - 添加更好的错误处理
  syncData(data) {
    const db = getDb()
    
    try {
      return dbUtils.transaction(() => {
        // 同步场景
        if (data.scenes && Array.isArray(data.scenes)) {
          try {
            // 清空当前数据
            db.prepare('DELETE FROM scenes').run()
            
            // 插入新数据
            const stmt = db.prepare(`
              INSERT INTO scenes (id, title, content, cards, tags, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            
            data.scenes.forEach(scene => {
              stmt.run(
                scene.id,
                scene.name,
                scene.content || null,
                JSON.stringify(scene.cards || []),
                JSON.stringify(scene.tags || []),
                scene.createdAt || new Date().toISOString(),
                scene.updatedAt || new Date().toISOString()
              )
            })
          } catch (error) {
            console.error('同步场景失败:', error)
            throw new Error(`同步场景失败: ${error.message}`)
          }
        }
        
        // 同步提示词
        if (data.prompts && Array.isArray(data.prompts)) {
          // 清空当前数据
          db.prepare('DELETE FROM prompts').run()
          
          // 插入新数据
          const stmt = db.prepare(`
            INSERT INTO prompts (id, title, systemPrompt, userPrompt, category, tags, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          data.prompts.forEach(prompt => {
            stmt.run(
              prompt.id,
              prompt.title,
              prompt.systemPrompt,
              prompt.userPrompt,
              prompt.category,
              JSON.stringify(prompt.tags || []),
              prompt.createdAt || new Date().toISOString(),
              prompt.updatedAt || new Date().toISOString()
            )
          })
        }
        
        // 同步标签
        if (data.tags && Array.isArray(data.tags)) {
          // 清空当前数据
          db.prepare('DELETE FROM tags').run()
          
          // 插入新数据
          const stmt = db.prepare(`
            INSERT INTO tags (id, name, color, isKeyword, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          
          data.tags.forEach(tag => {
            stmt.run(
              tag.id,
              tag.name,
              tag.color,
              tag.isKeyword ? 1 : 0,
              tag.createdAt || new Date().toISOString(),
              tag.updatedAt || new Date().toISOString()
            )
          })
        }
        
        // 同步知识库
        if (data.knowledgeBases && Array.isArray(data.knowledgeBases)) {
          // 清空当前数据
          db.prepare('DELETE FROM knowledge_bases').run()
          
          // 插入新数据
          const stmt = db.prepare(`
            INSERT INTO knowledge_bases (id, name, description, embeddings, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          
          data.knowledgeBases.forEach(kb => {
            stmt.run(
              kb.id,
              kb.name,
              kb.description,
              JSON.stringify(kb.embeddings || []),
              kb.createdAt || new Date().toISOString(),
              kb.updatedAt || new Date().toISOString()
            )
          })
        }
        
        // 同步配置
        if (data.config) {
          // 更新配置
          db.prepare('DELETE FROM config WHERE id = ?').run('app')
          db.prepare('INSERT INTO config (id, value) VALUES (?, ?)').run('app', JSON.stringify(data.config))
        }
        
        // 同步代理
        if (data.agents && Array.isArray(data.agents)) {
          // 清空当前数据
          db.prepare('DELETE FROM agents').run()
          
          // 插入新数据
          const stmt = db.prepare(`
            INSERT INTO agents (id, name, description, avatar, systemPrompt, settings, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          data.agents.forEach(agent => {
            stmt.run(
              agent.id,
              agent.name,
              agent.description,
              agent.avatar,
              agent.systemPrompt,
              JSON.stringify(agent.settings || {}),
              agent.createdAt || new Date().toISOString(),
              agent.updatedAt || new Date().toISOString()
            )
          })
        }
        
        return { success: true }
      })
    } catch (error) {
      console.error('数据同步失败:', error)
      // 返回错误信息而不是抛出异常
      return { success: false, error: error.message }
    }
  },
  
  // 获取场景数据
  getScenes() {
    const scenes = dbUtils.query('SELECT * FROM scenes')
    return scenes.map(scene => ({
      id: scene.id,
      name: scene.title,
      content: scene.content,
      cards: JSON.parse(scene.cards || '[]'),
      tags: JSON.parse(scene.tags || '[]'),
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt
    }))
  },
  
  // 获取提示词数据
  getPrompts() {
    const prompts = dbUtils.query('SELECT * FROM prompts')
    return prompts.map(prompt => ({
      ...prompt,
      tags: JSON.parse(prompt.tags || '[]')
    }))
  },
  
  // 获取标签数据
  getTags() {
    const tags = dbUtils.query('SELECT * FROM tags')
    return tags.map(tag => ({
      ...tag,
      isKeyword: tag.isKeyword === 1
    }))
  },
  
  // 获取配置数据
  getConfig() {
    const config = dbUtils.get('SELECT value FROM config WHERE id = ?', ['app'])
    return config ? JSON.parse(config.value) : {
      models: [],
      notepadContent: '',
      currentSceneId: null,
      selectedTags: [],
      currentView: 'main'
    }
  },
  
  // 获取代理数据
  getAgents() {
    const agents = dbUtils.query('SELECT * FROM agents')
    return agents.map(agent => ({
      ...agent,
      settings: JSON.parse(agent.settings || '{}')
    }))
  },
  
  // 获取单个代理
  getAgent(id) {
    const agent = dbUtils.get('SELECT * FROM agents WHERE id = ?', [id])
    if (!agent) return null
    
    return {
      ...agent,
      settings: JSON.parse(agent.settings || '{}')
    }
  },
  
  // 保存代理
  saveAgent(agentData) {
    const db = getDb()
    const now = new Date().toISOString()
    
    if (agentData.id) {
      // 检查是否存在
      const exists = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentData.id)
      
      if (exists) {
        // 更新
        db.prepare(`
          UPDATE agents
          SET name = ?, description = ?, avatar = ?, systemPrompt = ?, settings = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          agentData.name,
          agentData.description,
          agentData.avatar,
          agentData.systemPrompt,
          JSON.stringify(agentData.settings || {}),
          now,
          agentData.id
        )
      } else {
        // 插入
        db.prepare(`
          INSERT INTO agents (id, name, description, avatar, systemPrompt, settings, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          agentData.id,
          agentData.name,
          agentData.description,
          agentData.avatar,
          agentData.systemPrompt,
          JSON.stringify(agentData.settings || {}),
          now,
          now
        )
      }
    } else {
      // 新建
      const id = Date.now().toString()
      db.prepare(`
        INSERT INTO agents (id, name, description, avatar, systemPrompt, settings, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        agentData.name,
        agentData.description,
        agentData.avatar,
        agentData.systemPrompt,
        JSON.stringify(agentData.settings || {}),
        now,
        now
      )
      
      agentData.id = id
    }
    
    return agentData
  },
  
  // 删除代理
  deleteAgent(id) {
    return dbUtils.exec('DELETE FROM agents WHERE id = ?', [id])
  },
  
  // 获取内置提示词
  getBuiltInPrompts() {
    const prompts = dbUtils.query('SELECT * FROM built_in_prompts')
    return prompts.map(prompt => ({
      ...prompt,
      tags: JSON.parse(prompt.tags || '[]')
    }))
  },
  
  // 获取任务
  getTasks() {
    return dbUtils.query('SELECT * FROM tasks')
  },
  
  // 保存任务
  saveTasks(tasks) {
    const db = getDb()
    
    return dbUtils.transaction(() => {
      // 清空当前数据
      db.prepare('DELETE FROM tasks').run()
      
      // 插入新数据
      if (Array.isArray(tasks)) {
        const stmt = db.prepare(`
          INSERT INTO tasks (id, title, description, status, createdAt, updatedAt, dueDate, assignedTo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        
        tasks.forEach(task => {
          stmt.run(
            task.id,
            task.title,
            task.description,
            task.status,
            task.createdAt || new Date().toISOString(),
            task.updatedAt || new Date().toISOString(),
            task.dueDate,
            task.assignedTo
          )
        })
      }
      
      return { success: true }
    })
  },
  
  // 删除任务
  deleteTasks() {
    return dbUtils.exec('DELETE FROM tasks')
  },
  
  // 获取聊天会话
  getChatSessions() {
    const sessions = dbUtils.query('SELECT * FROM chat_sessions')
    return sessions.map(session => ({
      ...session,
      messages: JSON.parse(session.messages || '[]')
    }))
  },
  
  // 保存聊天会话
  saveChatSessions(sessions) {
    const db = getDb()
    
    return dbUtils.transaction(() => {
      // 清空当前数据
      db.prepare('DELETE FROM chat_sessions').run()
      
      // 插入新数据
      if (Array.isArray(sessions)) {
        const stmt = db.prepare(`
          INSERT INTO chat_sessions (id, title, messages, modelId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        sessions.forEach(session => {
          stmt.run(
            session.id,
            session.title,
            JSON.stringify(session.messages || []),
            session.modelId,
            session.createdAt || new Date().toISOString(),
            session.updatedAt || new Date().toISOString()
          )
        })
      }
      
      return { success: true }
    })
  }
} 