import { initDb, closeDb } from './db.js';

console.log('开始数据库迁移...');

// 初始化数据库连接
const db = initDb();

// 迁移函数
function migrateDatabase() {
  try {
    // 检查tags表是否有isKeyword列
    const tableInfo = db.prepare("PRAGMA table_info(tags)").all();
    const hasIsKeywordColumn = tableInfo.some(column => column.name === 'isKeyword');
    
    if (!hasIsKeywordColumn) {
      console.log('正在向tags表添加isKeyword字段...');
      db.prepare('ALTER TABLE tags ADD COLUMN isKeyword INTEGER DEFAULT 0').run();
      console.log('isKeyword字段添加成功');
    } else {
      console.log('isKeyword字段已存在，无需迁移');
    }
    
    console.log('数据库迁移完成');
  } catch (error) {
    console.error('数据库迁移失败:', error);
  } finally {
    // 关闭数据库连接
    closeDb();
  }
}

// 执行迁移
migrateDatabase(); 