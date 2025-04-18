/**
 * WebDAV云同步功能测试脚本
 * 
 * 此脚本用于测试WebDAV云同步与版本控制的各项功能
 * 包括：连接检查、手动备份、获取备份列表、恢复备份、删除备份等
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

// 加载环境变量
dotenv.config();

// 服务器地址
const API_BASE = 'http://localhost:' + (process.env.PORT || 3000);

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 彩色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[信息]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[成功]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[警告]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[错误]${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`)
};

// 工具函数 - 检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// 显示菜单
function showMenu() {
  log.title('WebDAV云同步功能测试菜单');
  console.log('1. 测试WebDAV连接');
  console.log('2. 创建手动备份');
  console.log('3. 获取云端备份列表');
  console.log('4. 获取本地备份列表');
  console.log('5. 恢复指定云端备份');
  console.log('6. 恢复指定本地备份');
  console.log('7. 删除指定备份');
  console.log('0. 退出程序');
  console.log('');
}

// 获取用户输入
function getUserInput(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// 测试WebDAV连接
async function testConnection() {
  log.title('测试WebDAV连接');
  
  try {
    const response = await fetch(`${API_BASE}/api/cloud/status`);
    const data = await response.json();
    
    if (data.success) {
      log.success('WebDAV连接成功！');
    } else {
      log.error(`WebDAV连接失败: ${data.error || '未知错误'}`);
      log.info('请检查.env文件中的WebDAV配置是否正确');
    }
    
    return data.success;
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
    log.info('请确保后端服务器正在运行');
    return false;
  }
}

// 测试手动备份
async function testBackup() {
  log.title('测试手动备份');
  
  try {
    const response = await fetch(`${API_BASE}/api/cloud/sync`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      log.success(`备份成功创建并上传至: ${data.path}`);
    } else {
      log.error(`备份失败: ${data.error || '未知错误'}`);
    }
    
    return data;
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
  }
}

// 测试获取云端备份列表
async function testListBackups() {
  log.title('测试获取云端备份列表');
  
  try {
    const response = await fetch(`${API_BASE}/api/cloud/backups`);
    const data = await response.json();
    
    if (data.success) {
      if (data.backups && data.backups.length > 0) {
        log.success(`成功获取 ${data.backups.length} 个云端备份`);
        
        // 显示所有备份
        data.backups
          .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
          .forEach((backup, index) => {
            const size = (backup.size / (1024 * 1024)).toFixed(2);
            log.info(`备份 ${index + 1}: ${backup.name} (${size} MB) - ${new Date(backup.lastModified).toLocaleString()}`);
          });
      } else {
        log.warn('没有找到任何云端备份');
      }
    } else {
      log.error(`获取云端备份列表失败: ${data.error || '未知错误'}`);
    }
    
    return data.backups || [];
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
    return [];
  }
}



// 测试获取本地备份列表
async function testListLocalBackups() {
  log.title('测试获取本地备份列表');
  
  try {
    const response = await fetch(`${API_BASE}/api/local/backups`);
    const data = await response.json();
    
    if (data.success) {
      if (data.backups && data.backups.length > 0) {
        log.success(`成功获取 ${data.backups.length} 个本地备份`);
        
        // 显示所有备份
        data.backups.forEach((backup, index) => {
          const size = (backup.size / (1024 * 1024)).toFixed(2);
          log.info(`备份 ${index + 1}: ${backup.name} (${size} MB) - ${new Date(backup.lastModified).toLocaleString()}`);
        });
      } else {
        log.warn('没有找到任何本地备份');
      }
    } else {
      log.error(`获取本地备份列表失败: ${data.error || '未知错误'}`);
    }
    
    return data.backups || [];
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
    return [];
  }
}



// 测试删除备份
async function testDeleteBackup(backupPath) {
  log.title(`测试删除备份: ${path.basename(backupPath)}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/cloud/backups`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ backupPath })
    });
    
    const data = await response.json();
    
    if (data.success) {
      log.success(`成功删除备份: ${path.basename(backupPath)}`);
    } else {
      log.error(`删除备份失败: ${data.error || '未知错误'}`);
    }
    
    return data.success;
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
    return false;
  }
}

// 测试恢复备份
async function testRestoreBackup(backupPath) {
  log.title(`测试恢复备份: ${path.basename(backupPath)}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/cloud/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ backupPath })
    });
    
    const data = await response.json();
    
    if (data.success) {
      log.success(`成功恢复备份: ${path.basename(backupPath)}`);
      log.info(`本地备份已创建: ${path.basename(data.localBackup)}`);
      log.info(`备份路径: ${data.localBackup}`);
    } else {
      log.error(`恢复备份失败: ${data.error || '未知错误'}`);
    }
    
    return data.success;
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
    return false;
  }
}

async function testRestoreLocalBackup(backupPath) {
  log.title(`测试恢复本地备份: ${path.basename(backupPath)}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/local/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ backupPath })
    });
    
    const data = await response.json();
    
    if (data.success) {
      log.success(`成功恢复本地备份: ${path.basename(backupPath)}`);
    } else {
      log.error(`恢复本地备份失败: ${data.error || '未知错误'}`);
    }
    
    return data.success;
  } catch (error) {
    log.error(`请求失败: ${error.message}`);
    return false;
  }
}

// 选择备份
async function selectBackup(action, listType = 'cloud') {
  const backups = listType === 'local' 
    ? await testListLocalBackups()
    : await testListBackups();
  if (backups.length === 0) return null;
  
  const answer = await getUserInput('请输入要' + action + '的备份编号 (1-' + backups.length + '): ');
  const index = parseInt(answer) - 1;
  
  if (index >= 0 && index < backups.length) {
    return backups[index].path;
  } else {
    log.error('无效的备份编号');
    return null;
  }
}

// 主函数
async function main() {
  try {
    // 检查环境变量
    if (!process.env.WEBDAV_URL || !process.env.WEBDAV_USERNAME || !process.env.WEBDAV_PASSWORD) {
      log.error('WebDAV配置不完整，请检查.env文件');
      log.info('请确保WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD已正确设置');
      return;
    }
    
    while (true) {
      showMenu();
      const choice = await getUserInput('请选择要执行的功能 (0-5): ');
      
      switch (choice) {
        case '1':
          await testConnection();
          break;
        case '2':
          await testBackup();
          break;
        case '3':
          await testListBackups();
          break;
        case '4':
          await testListLocalBackups();
          break;
        case '5':
          const restorePath = await selectBackup('恢复');
          if (restorePath) await testRestoreBackup(restorePath);
          break;
        case '6':
          const restoreLocalPath = await selectBackup('恢复本地', 'local');
          if (restoreLocalPath) await testRestoreLocalBackup(restoreLocalPath);
          break;
        case '7':
          const deletePath = await selectBackup('删除');
          if (deletePath) await testDeleteBackup(deletePath);
          break;
        case '0':
          log.info('程序退出');
          rl.close();
          return;
        default:
          log.error('无效的选择，请重试');
      }
      
      console.log('\n按回车键继续...');
      await getUserInput('');
    }
  } catch (error) {
    log.error(`测试过程中发生错误: ${error.message}`);
    console.error(error);
  } finally {
    rl.close();
  }
}

// 启动测试
main();