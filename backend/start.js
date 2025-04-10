import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJsonPath = path.join(__dirname, '..', 'package.json')

// 确保better-sqlite3依赖已安装
async function checkDependencies() {
  try {
    console.log('检查依赖...')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    if (!packageJson.dependencies['better-sqlite3']) {
      console.log('未找到better-sqlite3依赖，正在安装...')
      await runCommand('npm', ['install', 'better-sqlite3', '--save'])
    } else {
      console.log('依赖检查完成')
    }
  } catch (error) {
    console.error('依赖检查失败:', error)
    process.exit(1)
  }
}

// 运行命令的辅助函数
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`执行命令: ${command} ${args.join(' ')}`)
    const proc = spawn(command, args, { stdio: 'inherit', shell: true })
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`))
      }
    })
    
    proc.on('error', (err) => {
      reject(err)
    })
  })
}

// 启动服务器
async function startServer() {
  try {
    console.log('启动服务器...')
    await runCommand('node', ['server.js'])
  } catch (error) {
    console.error('启动服务器失败:', error)
    process.exit(1)
  }
}

// 主函数
async function main() {
  try {
    console.log('===== 启动SQLite数据库服务 =====')
    await checkDependencies()
    await startServer()
  } catch (error) {
    console.error('启动失败:', error)
    process.exit(1)
  }
}

// 运行主函数
main() 