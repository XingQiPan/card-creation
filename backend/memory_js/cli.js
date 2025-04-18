#!/usr/bin/env node
// cli.js
// 知识图谱系统的命令行接口

import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import KnowledgeGraph from './knowledge_graph.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 后端数据目录
const backendDir = path.resolve(__dirname, '..');
const kgDataDir = path.join(backendDir, 'data', 'KnowledgeGraph');

// 确保数据目录存在
try {
  if (!fs.existsSync(kgDataDir)) {
    fs.mkdirSync(kgDataDir, { recursive: true });
  }
} catch (err) {
  console.error('创建数据目录失败:', err);
}

// 初始化知识图谱（使用默认路径）
let kg = new KnowledgeGraph();

program
  .name('knowledge-graph-cli')
  .description('知识图谱管理命令行工具')
  .version('1.0.0');

// 添加实体命令
program
  .command('add-entity')
  .description('添加新实体')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '输入实体名称:',
        validate: input => input.trim() !== '' || '名称不能为空'
      },
      {
        type: 'input',
        name: 'entityType',
        message: '输入实体类型:'
      },
      {
        type: 'input',
        name: 'observations',
        message: '输入观察项 (用逗号分隔):',
      }
    ]);

    const observations = answers.observations
      ? answers.observations.split(',').map(item => item.trim()).filter(item => item)
      : [];

    const entity = {
      name: answers.name,
      entityType: answers.entityType,
      observations
    };

    try {
      const result = await kg.createEntities([entity]);
      console.log('实体创建成功:', result);
    } catch (error) {
      console.error('创建实体失败:', error.message);
    }
  });

// 添加关系命令
program
  .command('add-relation')
  .description('添加新关系')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'from',
        message: '输入源实体名称:',
        validate: input => input.trim() !== '' || '名称不能为空'
      },
      {
        type: 'input',
        name: 'to',
        message: '输入目标实体名称:',
        validate: input => input.trim() !== '' || '名称不能为空'
      },
      {
        type: 'input',
        name: 'relationType',
        message: '输入关系类型:',
        validate: input => input.trim() !== '' || '关系类型不能为空'
      }
    ]);

    const relation = {
      from: answers.from,
      to: answers.to,
      relationType: answers.relationType
    };

    try {
      const result = await kg.createRelations([relation]);
      console.log('关系创建成功:', result);
    } catch (error) {
      console.error('创建关系失败:', error.message);
    }
  });

// 搜索实体命令
program
  .command('search')
  .description('搜索实体')
  .argument('<query>', '搜索查询字符串')
  .action((query) => {
    try {
      const result = kg.searchNodes(query);
      console.log('搜索结果:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('搜索失败:', error.message);
    }
  });

// 查看所有实体和关系
program
  .command('list')
  .description('列出所有实体和关系')
  .action(() => {
    try {
      const result = kg.readGraph();
      console.log('知识图谱:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('读取知识图谱失败:', error.message);
    }
  });

// 删除实体命令
program
  .command('delete-entity')
  .description('删除实体')
  .argument('<name>', '实体名称')
  .action(async (name) => {
    try {
      const result = await kg.deleteEntities([name]);
      console.log('删除结果:', result);
    } catch (error) {
      console.error('删除实体失败:', error.message);
    }
  });

// 加载知识图谱文件
program
  .command('load')
  .description('加载知识图谱文件')
  .argument('<filePath>', '文件路径')
  .action(async (filePath) => {
    try {
      // 如果没有提供扩展名，添加.json扩展名
      if (!path.extname(filePath)) {
        filePath += '.json';
      }
      
      // 如果只提供了文件名而不是完整路径，则在KnowledgeGraph目录中查找
      if (!path.isAbsolute(filePath) && !filePath.includes(path.sep)) {
        filePath = path.join(kgDataDir, filePath);
      }
      
      const success = await kg.loadFromFile(filePath);
      if (success) {
        console.log(`成功加载知识图谱文件: ${filePath}`);
      } else {
        console.error(`无法加载知识图谱文件: ${filePath}`);
      }
    } catch (error) {
      console.error('加载知识图谱文件失败:', error.message);
    }
  });

// 列出可用的知识图谱文件
program
  .command('list-files')
  .description('列出可用的知识图谱文件')
  .action(() => {
    try {
      // 确保数据目录存在
      if (!fs.existsSync(kgDataDir)) {
        fs.mkdirSync(kgDataDir, { recursive: true });
      }
      
      // 获取所有.json文件
      const files = fs.readdirSync(kgDataDir).filter(file => file.endsWith('.json'));
      
      console.log('可用的知识图谱文件:');
      files.forEach(file => {
        const isCurrentFile = file === path.basename(kg.storagePath);
        console.log(`${isCurrentFile ? '* ' : '  '}${file}`);
      });
      
      console.log(`\n当前加载的文件: ${path.basename(kg.storagePath)}`);
    } catch (error) {
      console.error('获取文件列表失败:', error.message);
    }
  });

// 启动Web服务器
program
  .command('serve')
  .description('启动Web服务器')
  .option('-p, --port <port>', '指定端口号', '5000')
  .action((options) => {
    try {
      // 动态导入以避免在CLI模式下加载不必要的依赖
      const app = require('./app');
      const PORT = options.port || 5000;
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`服务器已启动，监听端口 ${PORT}`);
        console.log(`访问地址: http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('启动服务器失败:', error.message);
    }
  });

// 处理命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 