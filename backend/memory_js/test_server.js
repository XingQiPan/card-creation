// test_server.js
// 测试脚本，用于启动memory_js的网页界面并测试知识图谱功能

import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确定服务器路径
const serverAppPath = path.join(__dirname, 'app.js');

// 定义前端服务器的端口
const MEMORY_JS_PORT = 5000;
const BACKEND_PORT = 3000;

// 确保知识图谱数据目录存在
const backendDir = path.resolve(__dirname, '..');
const kgDataDir = path.join(backendDir, 'data', 'KnowledgeGraph');
if (!fs.existsSync(kgDataDir)) {
  fs.mkdirSync(kgDataDir, { recursive: true });
}

console.log('===== 知识图谱测试工具 =====');
console.log(`启动知识图谱前端界面 (端口: ${MEMORY_JS_PORT})`);
console.log('=============================');

// 启动知识图谱前端界面
const memoryJsServer = spawn('node', [serverAppPath], {
  stdio: 'pipe'
});

memoryJsServer.stdout.on('data', (data) => {
  console.log(`[前端] ${data.toString().trim()}`);
});

memoryJsServer.stderr.on('data', (data) => {
  console.error(`[前端错误] ${data.toString().trim()}`);
});

// 创建一个简单的控制台应用
const app = express();
const CONSOLE_PORT = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// 主控制台界面
app.get('/', (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>知识图谱测试控制台</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
      <style>
        :root {
          --primary-color: #3498db;
          --secondary-color: #2ecc71;
          --danger-color: #e74c3c;
          --info-color: #2196F3;
          --dark-color: #2c3e50;
          --light-color: #ecf0f1;
          --border-color: #ddd;
          --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          --transition: all 0.3s ease;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body { 
          font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif; 
          margin: 0; 
          padding: 0; 
          color: #333;
          background-color: #f9f9f9;
          line-height: 1.6;
        }
        
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 20px;
        }
        
        .header {
          background-color: var(--dark-color);
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 30px;
          border-radius: 8px;
          box-shadow: var(--shadow);
        }
        
        .header h1 {
          margin: 0;
          font-size: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .header h1 i {
          margin-right: 10px;
          color: var(--primary-color);
        }
        
        .panel { 
          background-color: white; 
          padding: 25px; 
          margin-bottom: 30px; 
          border-radius: 8px; 
          box-shadow: var(--shadow);
          transition: var(--transition);
        }
        
        .panel:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }
        
        h1, h2, h3 { 
          color: var(--dark-color); 
          margin-bottom: 15px;
        }
        
        h2 {
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: 10px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }
        
        h2 i {
          margin-right: 10px;
          color: var(--primary-color);
        }
        
        h3 {
          margin-top: 20px;
          margin-bottom: 10px;
          color: var(--dark-color);
          display: flex;
          align-items: center;
        }
        
        h3 i {
          margin-right: 8px;
          color: var(--primary-color);
        }
        
        .btn { 
          background-color: var(--primary-color); 
          border: none; 
          color: white; 
          padding: 10px 16px; 
          text-align: center; 
          text-decoration: none; 
          display: inline-block; 
          font-size: 16px; 
          margin: 5px 2px; 
          cursor: pointer; 
          border-radius: 4px;
          transition: var(--transition);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .btn:hover { 
          background-color: #2980b9; 
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .btn:active {
          transform: translateY(1px);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .btn-danger { background-color: var(--danger-color); }
        .btn-danger:hover { background-color: #c0392b; }
        
        .btn-info { background-color: var(--info-color); }
        .btn-info:hover { background-color: #0b7dda; }
        
        .btn-secondary { background-color: var(--secondary-color); }
        .btn-secondary:hover { background-color: #27ae60; }
        
        .btn i {
          margin-right: 5px;
        }
        
        pre { 
          background-color: #f5f5f5; 
          padding: 15px; 
          border-radius: 5px; 
          overflow: auto; 
          font-family: Consolas, Monaco, 'Andale Mono', monospace;
          line-height: 1.5;
          max-height: 400px;
          border-left: 4px solid var(--primary-color);
        }
        
        .status { 
          margin-top: 20px; 
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: var(--shadow);
        }
        
        .status .indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .status .online { 
          background-color: var(--secondary-color); 
          box-shadow: 0 0 8px var(--secondary-color);
        }
        
        .status .offline { 
          background-color: var(--danger-color); 
          box-shadow: 0 0 8px var(--danger-color);
        }
        
        .status-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
          transition: var(--transition);
        }
        
        .status-item:hover {
          background-color: #e9ecef;
        }
        
        .status-item a {
          color: var(--primary-color);
          text-decoration: none;
          margin-left: 5px;
          transition: var(--transition);
        }
        
        .status-item a:hover {
          text-decoration: underline;
          color: #2980b9;
        }
        
        input[type="text"], input[type="number"] {
          width: 200px;
          padding: 10px 12px;
          margin: 5px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          transition: var(--transition);
        }
        
        input[type="text"]:focus, input[type="number"]:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
        }
        
        .form-group {
          margin: 15px 0;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          transition: var(--transition);
        }
        
        .form-group:hover {
          background-color: #e9ecef;
        }
        
        label {
          display: inline-block;
          margin-right: 5px;
          font-weight: 600;
          color: #555;
        }
        
        .results-container {
          margin-top: 20px;
          position: relative;
        }
        
        .results-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .copy-btn {
          padding: 5px 10px;
          font-size: 14px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: var(--transition);
        }
        
        .copy-btn:hover {
          background-color: #5a6268;
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          background-color: var(--secondary-color);
          color: white;
          border-radius: 4px;
          box-shadow: var(--shadow);
          opacity: 0;
          transform: translateY(-20px);
          transition: var(--transition);
          z-index: 1000;
        }
        
        .notification.show {
          opacity: 1;
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 10px;
          }
          
          .panel {
            padding: 15px;
          }
          
          input[type="text"], input[type="number"] {
            width: 100%;
            margin: 5px 0;
          }
          
          .btn {
            width: 100%;
            margin: 5px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1><i class="fas fa-project-diagram"></i> 知识图谱测试控制台</h1>
        </div>
        
        <div class="status">
          <h3><i class="fas fa-server"></i> 服务状态</h3>
          <div class="status-item">
            <span class="indicator online" id="frontend-status"></span> 
            <strong>知识图谱前端:</strong> <a href="http://localhost:${MEMORY_JS_PORT}" target="_blank">http://localhost:${MEMORY_JS_PORT}</a>
          </div>
          <div class="status-item">
            <span class="indicator online" id="backend-status"></span> 
            <strong>主后端服务:</strong> <a href="http://localhost:${BACKEND_PORT}" target="_blank">http://localhost:${BACKEND_PORT}</a>
          </div>
        </div>

        <div class="panel">
          <h2><i class="fas fa-flask"></i> 测试主后端知识图谱功能</h2>
          <form id="testForm">
            <div class="form-group">
              <h3><i class="fas fa-plus-circle"></i> 创建实体</h3>
              <label>实体名称:</label>
              <input type="text" id="entityName" value="测试实体">
              <label>实体类型:</label>
              <input type="text" id="entityType" value="测试">
              <button type="button" class="btn" onclick="createEntity()"><i class="fas fa-save"></i> 创建实体</button>
            </div>
            
            <div class="form-group">
              <h3><i class="fas fa-comment"></i> 添加观察</h3>
              <label>实体名称:</label>
              <input type="text" id="obsEntityName" value="测试实体">
              <label>观察内容:</label>
              <input type="text" id="obsContent" value="这是一个观察内容">
              <button type="button" class="btn" onclick="addObservation()"><i class="fas fa-plus"></i> 添加观察</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-link"></i> 创建关系</h3>
              <label>源实体:</label>
              <input type="text" id="sourceEntity" value="实体1">
              <label>目标实体:</label>
              <input type="text" id="targetEntity" value="实体2">
              <label>关系类型:</label>
              <input type="text" id="relationType" value="朋友">
              <button type="button" class="btn" onclick="createRelation()"><i class="fas fa-link"></i> 创建关系</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-trash-alt"></i> 删除实体</h3>
              <label>实体名称:</label>
              <input type="text" id="deleteEntityName" value="测试实体">
              <button type="button" class="btn btn-danger" onclick="deleteEntity()"><i class="fas fa-trash-alt"></i> 删除实体</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-unlink"></i> 删除关系</h3>
              <label>源实体:</label>
              <input type="text" id="deleteSourceEntity" value="实体1">
              <label>目标实体:</label>
              <input type="text" id="deleteTargetEntity" value="实体2">
              <label>关系类型:</label>
              <input type="text" id="deleteRelationType" value="朋友">
              <button type="button" class="btn btn-danger" onclick="deleteRelation()"><i class="fas fa-unlink"></i> 删除关系</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-comment-slash"></i> 删除观察</h3>
              <label>实体名称:</label>
              <input type="text" id="deleteObsEntityName" value="测试实体">
              <label>观察索引:</label>
              <input type="number" id="deleteObsIndex" value="0">
              <button type="button" class="btn btn-danger" onclick="deleteObservation()"><i class="fas fa-comment-slash"></i> 删除观察</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-edit"></i> 更新观察</h3>
              <label>实体名称:</label>
              <input type="text" id="updateObsEntityName" value="测试实体">
              <label>观察索引:</label>
              <input type="number" id="updateObsIndex" value="0">
              <label>新内容:</label>
              <input type="text" id="updateObsContent" value="更新后的观察内容">
              <button type="button" class="btn btn-secondary" onclick="updateObservation()"><i class="fas fa-edit"></i> 更新观察</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-file-alt"></i> 知识图谱文件操作</h3>
              <label>文件名:</label>
              <input type="text" id="graphFileName" value="knowledge_graph.json">
              <button type="button" class="btn btn-info" onclick="loadGraphFile()"><i class="fas fa-file-import"></i> 加载文件</button>
              <button type="button" class="btn btn-info" onclick="getGraphFiles()"><i class="fas fa-list"></i> 获取文件列表</button>
            </div>
            
            <div class="form-group">
              <h3><i class="fas fa-database"></i> 获取图谱数据</h3>
              <button type="button" class="btn btn-info" onclick="getGraphData()"><i class="fas fa-download"></i> 获取数据</button>
            </div>
            
            <div class="form-group">
              <h3><i class="fas fa-search"></i> 搜索节点</h3>
              <label>搜索关键词:</label>
              <input type="text" id="searchQuery" value="测试">
              <button type="button" class="btn btn-info" onclick="searchNodes()"><i class="fas fa-search"></i> 搜索</button>
            </div>

            <div class="form-group">
              <h3><i class="fas fa-sitemap"></i> 查找特定节点</h3>
              <label>节点名称(多个用逗号分隔):</label>
              <input type="text" id="nodeNames" value="实体1,实体2">
              <button type="button" class="btn btn-info" onclick="findNodes()"><i class="fas fa-search-plus"></i> 查找节点</button>
            </div>
          </form>
          
          <div class="results-container">
            <div class="results-title">
              <h3><i class="fas fa-clipboard-list"></i> 结果</h3>
              <button id="copyResultBtn" class="copy-btn" onclick="copyResults()"><i class="fas fa-copy"></i> 复制</button>
            </div>
            <pre id="results">结果将显示在这里...</pre>
          </div>
        </div>
      </div>
      
      <div id="notification" class="notification"></div>
      
      <script>
        // 显示通知
        function showNotification(message, type = 'success') {
          const notification = document.getElementById('notification');
          notification.textContent = message;
          notification.className = 'notification';
          
          if (type === 'error') {
            notification.style.backgroundColor = '#e74c3c';
          } else if (type === 'warning') {
            notification.style.backgroundColor = '#f39c12';
          } else {
            notification.style.backgroundColor = '#2ecc71';
          }
          
          notification.classList.add('show');
          
          setTimeout(() => {
            notification.classList.remove('show');
          }, 3000);
        }
        
        // 复制结果
        function copyResults() {
          const results = document.getElementById('results').textContent;
          navigator.clipboard.writeText(results)
            .then(() => {
              showNotification('结果已复制到剪贴板');
            })
            .catch(err => {
              showNotification('复制失败: ' + err, 'error');
            });
        }
        
        // 测试创建实体
        async function createEntity() {
          const entityName = document.getElementById('entityName').value;
          const entityType = document.getElementById('entityType').value;
          
          if (!entityName || !entityType) {
            showNotification('请填写实体名称和类型', 'warning');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/entities'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                entities: [
                  {
                    name: entityName,
                    type: entityType,
                    observations: []
                  }
                ]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }
        
        // 测试添加观察
        async function addObservation() {
          const entityName = document.getElementById('obsEntityName').value;
          const content = document.getElementById('obsContent').value;
          
          if (!entityName || !content) {
            alert('请填写实体名称和观察内容');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/observations'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                observations: [
                  {
                    entityName: entityName,
                    content: content
                  }
                ]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }
        
        // 获取图谱数据
        async function getGraphData() {
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/graph'.replace('${BACKEND_PORT}', ${BACKEND_PORT}));
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }
        
        // 搜索节点
        async function searchNodes() {
          const query = document.getElementById('searchQuery').value;
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/search?query='.replace('${BACKEND_PORT}', ${BACKEND_PORT}) + encodeURIComponent(query));
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }

        // 创建关系
        async function createRelation() {
          const source = document.getElementById('sourceEntity').value;
          const target = document.getElementById('targetEntity').value;
          const type = document.getElementById('relationType').value;
          
          if (!source || !target || !type) {
            alert('请填写源实体、目标实体和关系类型');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/relations'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                relations: [
                  {
                    source: source,
                    target: target,
                    type: type,
                    properties: {}
                  }
                ]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }

        // 删除实体
        async function deleteEntity() {
          const entityName = document.getElementById('deleteEntityName').value;
          
          if (!entityName) {
            alert('请填写要删除的实体名称');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/entities'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                entityNames: [entityName]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }

        // 删除关系
        async function deleteRelation() {
          const source = document.getElementById('deleteSourceEntity').value;
          const target = document.getElementById('deleteTargetEntity').value;
          const type = document.getElementById('deleteRelationType').value;
          
          if (!source || !target || !type) {
            alert('请填写源实体、目标实体和关系类型');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/relations'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                relations: [
                  {
                    source: source,
                    target: target,
                    type: type
                  }
                ]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }

        // 删除观察
        async function deleteObservation() {
          const entityName = document.getElementById('deleteObsEntityName').value;
          const index = parseInt(document.getElementById('deleteObsIndex').value);
          
          if (!entityName || isNaN(index)) {
            alert('请填写实体名称和有效的观察索引');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/observations'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                deletions: [
                  {
                    entityName: entityName,
                    index: index
                  }
                ]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }
        
        // 更新观察
        async function updateObservation() {
          const entityName = document.getElementById('updateObsEntityName').value;
          const index = document.getElementById('updateObsIndex').value;
          const content = document.getElementById('updateObsContent').value;
          
          if (!entityName || !content || index === '') {
            showNotification('请填写实体名称、观察索引和新内容', 'warning');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/observations'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                updates: [
                  {
                    entityName: entityName,
                    index: parseInt(index),
                    content: content
                  }
                ]
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
            showNotification('观察项更新成功');
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
            showNotification('更新失败: ' + error.message, 'error');
          }
        }

        // 加载知识图谱文件
        async function loadGraphFile() {
          const fileName = document.getElementById('graphFileName').value;
          
          if (!fileName) {
            alert('请填写文件名');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/load-graph'.replace('${BACKEND_PORT}', ${BACKEND_PORT}), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileName: fileName
              }),
            });
            
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }

        // 获取知识图谱文件列表
        async function getGraphFiles() {
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/graph-files'.replace('${BACKEND_PORT}', ${BACKEND_PORT}));
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }

        // 查找特定节点
        async function findNodes() {
          const names = document.getElementById('nodeNames').value;
          
          if (!names) {
            alert('请填写节点名称');
            return;
          }
          
          try {
            const response = await fetch('http://localhost:${BACKEND_PORT}/api/kg/nodes?names='.replace('${BACKEND_PORT}', ${BACKEND_PORT}) + encodeURIComponent(names));
            const data = await response.json();
            document.getElementById('results').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('results').textContent = 'Error: ' + error.message;
          }
        }
        
        // 页面加载完成后检查服务状态
        window.onload = async function() {
          // 检查前端服务
          try {
            await fetch('http://localhost:${MEMORY_JS_PORT}'.replace('${MEMORY_JS_PORT}', ${MEMORY_JS_PORT}));
            document.querySelectorAll('.indicator')[0].className = 'indicator online';
          } catch (error) {
            document.querySelectorAll('.indicator')[0].className = 'indicator offline';
          }
          
          // 检查后端服务
          try {
            await fetch('http://localhost:${BACKEND_PORT}/health'.replace('${BACKEND_PORT}', ${BACKEND_PORT}));
            document.querySelectorAll('.indicator')[1].className = 'indicator online';
          } catch (error) {
            document.querySelectorAll('.indicator')[1].className = 'indicator offline';
          }
        };
      </script>
    </body>
    </html>
  `;
  res.send(htmlContent);
});

// 启动控制台服务
app.listen(CONSOLE_PORT, () => {
  console.log(`[控制台] 测试控制台已启动: http://localhost:${CONSOLE_PORT}`);
  console.log('=============================');
  console.log('请在浏览器中访问上述地址进行测试');
  console.log(`后端知识图谱界面: http://localhost:${MEMORY_JS_PORT}`);
  console.log(`主后端服务API: http://localhost:${BACKEND_PORT}/api/kg/graph`);
});

// 处理进程关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务...');
  memoryJsServer.kill();
  if (backendServer) {
    backendServer.kill();
  }
  process.exit();
});