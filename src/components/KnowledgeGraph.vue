<template>
    <div class="knowledge-graph-container">
      <header>
        <h1>Ast的星象图</h1>
        <div class="search-container">
          <input type="text" v-model="searchQuery" placeholder="搜索实体、类型或观察项...">
          <button @click="handleSearch">搜索</button>
          <button @click="resetGraph" class="reset-btn" :disabled="!isFiltered">重置</button>
          <button @click="showModal('typeColor')" class="color-btn">类型颜色</button>
        </div>
      </header>
  
      <main>
        <div class="sidebar">
          <div class="panel">
            <h2>实体详情</h2>
            <div id="entity-details" v-if="selectedNode">
              <div class="entity-name">{{ selectedNode.name }}</div>
              <div class="entity-type">{{ selectedNode.type }}</div>
              <div class="entity-color">
                <span class="color-label">颜色:</span>
                <span class="color-preview" :style="{ backgroundColor: selectedNode.color }"></span>
                <button class="color-edit-btn" @click="toggleNodeColorPicker(selectedNode)">修改颜色</button>
                <div v-if="isColorPickerVisible && selectedNodeForColor && selectedNodeForColor.name === selectedNode.name" class="inline-color-picker">
                  <input type="color" v-model="selectedNodeForColor.color" @change="updateNodeColor">
                  <button @click="toggleNodeColorPicker(null)" class="color-close-btn">关闭</button>
                </div>
              </div>
              <div class="observations">
                <h3>观察项</h3>
                <ul class="observations-list">
                  <li v-for="(observation, index) in filterObservations(selectedNode.observations)" :key="index">
                    {{ observation.content }}
                    <span class="observation-meta" v-if="observation.timestamp">
                      ({{ formatDate(observation.timestamp) }})
                    </span>
                    <button class="delete-btn" @click="deleteObservation(selectedNode.name, getOriginalIndex(selectedNode.observations, index))">
                      删除
                    </button>
                  </li>
                  <li v-if="!hasVisibleObservations(selectedNode.observations)">
                    暂无观察项
                  </li>
                </ul>
              </div>
              <div class="relations" v-if="relatedLinks.length">
                <h3>相关关系</h3>
                <ul class="relations-list">
                  <li v-for="(link, index) in relatedLinks" :key="index">
                    {{ link.direction === 'outgoing' ? '→' : '←' }}
                    {{ link.direction === 'outgoing' ? link.target : link.source }}
                    <span class="relation-type">({{ link.type }})</span>
                    <button class="delete-btn" @click="confirmDeleteRelation(link)">
                      删除
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <p class="placeholder" v-else>选择一个实体查看详情</p>
          </div>
          
          <div class="panel">
            <h2>操作</h2>
            <div class="actions">
              <button @click="showModal('entity')">创建实体</button>
              <button @click="showModal('relation')">创建关系</button>
              <button @click="showModal('observation')">添加观察项</button>
              <button @click="confirmDeleteEntity" :disabled="!selectedNode">删除实体</button>
            </div>
          </div>
          
          <div class="panel">
            <h2>知识图谱文件</h2>
            <div class="graph-file-selector">
              <select v-model="selectedGraphFile">
                <option v-for="file in graphFiles" :key="file" :value="file">{{ file }}</option>
                <option v-if="graphFiles.length === 0" value="">没有可用的图谱文件</option>
              </select>
              <button @click="loadGraphFile">加载图谱</button>
            </div>
          </div>
        </div>
  
        <div class="graph-container" ref="graphContainer">
          <!-- 知识图谱将在这里渲染 -->
        </div>
      </main>
  
      <!-- 模态框 -->
      <div class="modal" v-if="modal.entity.show">
        <div class="modal-content">
          <span class="close" @click="hideModal('entity')">&times;</span>
          <h2>创建实体</h2>
          <form @submit.prevent="handleCreateEntity">
            <div class="form-group">
              <label for="entity-name">实体名称</label>
              <input type="text" id="entity-name" v-model="modal.entity.name" required>
            </div>
            <div class="form-group">
              <label for="entity-type">实体类型</label>
              <input type="text" id="entity-type" v-model="modal.entity.type" required>
            </div>
            <div class="form-group">
              <label for="entity-color">实体颜色</label>
              <div class="color-picker-container">
                <input type="color" id="entity-color" v-model="modal.entity.customColor">
                <span class="color-preview" :style="{ backgroundColor: modal.entity.customColor }"></span>
              </div>
            </div>
            <div class="form-group">
              <label for="entity-observations">观察项（每行一个）</label>
              <textarea id="entity-observations" v-model="modal.entity.observations" rows="4"></textarea>
            </div>
            <button type="submit">保存</button>
          </form>
        </div>
      </div>
  
      <div class="modal" v-if="modal.relation.show">
        <div class="modal-content">
          <span class="close" @click="hideModal('relation')">&times;</span>
          <h2>创建关系</h2>
          <form @submit.prevent="handleCreateRelation">
            <div class="form-group">
              <label for="relation-source">源实体</label>
              <select id="relation-source" v-model="modal.relation.source" required>
                <option v-for="entity in entities" :key="entity.name" :value="entity.name">
                  {{ entity.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="relation-type">关系类型</label>
              <input type="text" id="relation-type" v-model="modal.relation.type" required>
            </div>
            <div class="form-group">
              <label for="relation-target">目标实体</label>
              <select id="relation-target" v-model="modal.relation.target" required>
                <option v-for="entity in entities" :key="entity.name" :value="entity.name">
                  {{ entity.name }}
                </option>
              </select>
            </div>
            <button type="submit">保存</button>
          </form>
        </div>
      </div>
  
      <div class="modal" v-if="modal.observation.show">
        <div class="modal-content">
          <span class="close" @click="hideModal('observation')">&times;</span>
          <h2>添加观察项</h2>
          <form @submit.prevent="handleAddObservation">
            <div class="form-group">
              <label for="observation-entity">实体</label>
              <select id="observation-entity" v-model="modal.observation.entityName" required>
                <option v-for="entity in entities" :key="entity.name" :value="entity.name">
                  {{ entity.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="observation-content">观察项（每行一个）</label>
              <textarea id="observation-content" v-model="modal.observation.content" rows="4" required></textarea>
            </div>
            <button type="submit">保存</button>
          </form>
        </div>
      </div>
  
      <div class="modal" v-if="modal.typeColor.show">
        <div class="modal-content">
          <span class="close" @click="hideModal('typeColor')">&times;</span>
          <h2>设置类型颜色</h2>
          <div class="type-color-picker">
            <div v-for="type in Object.keys(modal.typeColor.typeColors)" :key="type" class="type-color-item">
              <span class="type-name">{{ type }}</span>
              <div class="color-pick-container">
                <input type="color" v-model="modal.typeColor.typeColors[type]">
                <span class="color-preview" :style="{ backgroundColor: modal.typeColor.typeColors[type] }"></span>
                <button @click="handleSetSingleTypeColor(type)" class="type-color-apply-single-btn">
                  应用此类型颜色
                </button>
              </div>
            </div>
            <div v-if="Object.keys(modal.typeColor.typeColors).length === 0" class="no-types-message">
              没有找到实体类型
            </div>
          </div>
          <button @click="handleSetTypeColor" class="type-color-apply-btn">应用所有类型颜色</button>
        </div>
      </div>
  
      <div class="notification" v-if="notification.show">
        <div :class="['notification-content', notification.type]">
          {{ notification.message }}
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import * as d3 from 'd3';
  import ForceGraph from 'force-graph';
  
  export default {
    name: 'KnowledgeGraph',
    data() {
      return {
        graphData: { nodes: [], links: [] },
        originalGraphData: { nodes: [], links: [] }, // 存储原始图谱数据
        graphInstance: null,
        selectedNode: null,
        selectedNodeForColor: null, // 用于颜色选择器
        isColorPickerVisible: false, // 控制颜色选择器显示
        relatedLinks: [],
        entities: [],
        searchQuery: '',
        graphFiles: [],
        selectedGraphFile: '',
        currentGraphFile: '',
        isFiltered: false, // 标记图谱是否被过滤
        notification: {
          show: false,
          message: '',
          type: 'info',
          timeout: null
        },
        modal: {
          entity: {
            show: false,
            name: '',
            type: '',
            observations: '',
            customColor: '' // 自定义颜色
          },
          relation: {
            show: false,
            source: '',
            target: '',
            type: ''
          },
          observation: {
            show: false,
            entityName: '',
            content: ''
          },
          // 新增 - 类型颜色设置模态框
          typeColor: {
            show: false,
            typeColors: {} // 存储类型和颜色的映射关系
          }
        },
        // 新增 - 颜色相关
        colorPickerVisible: false,
        defaultColors: [
          '#3498db', // 蓝色
          '#e74c3c', // 红色
          '#2ecc71', // 绿色
          '#f39c12', // 橙色
          '#9b59b6', // 紫色
          '#1abc9c', // 青色
          '#34495e', // 深蓝灰色
          '#e67e22', // 橙黄色
          '#95a5a6', // 灰色
          '#d35400'  // 深橙色
        ]
      };
    },
    computed: {
      apiBaseUrl() {
        return '/api/kg';  // 知识图谱API的基础URL
      }
    },
    mounted() {
      this.initialize();
    },
    methods: {
      async initialize() {
        // 加载可用的知识图谱文件列表
        await this.loadGraphFileList();
        
        // 加载知识图谱数据
        await this.loadGraphData();
        
        // 初始化图谱可视化
        this.initializeGraph();
      },
      
      async loadGraphFileList() {
        try {
          const response = await fetch(`${this.apiBaseUrl}/graph-files`);
          if (!response.ok) {
            throw new Error('获取图谱文件列表失败');
          }
          
          const data = await response.json();
          if (data.success) {
            this.graphFiles = data.data.files || [];
            this.currentGraphFile = data.data.currentFile || '';
            this.selectedGraphFile = this.currentGraphFile;
          } else {
            throw new Error(data.error || '获取图谱文件列表失败');
          }
        } catch (error) {
          console.error('加载图谱文件列表出错:', error);
          this.showNotification(error.message, 'error');
        }
      },
      
      async loadGraphData() {
        try {
          const response = await fetch(`${this.apiBaseUrl}/graph`);
          if (!response.ok) {
            throw new Error('获取图谱数据失败');
          }
          
          const data = await response.json();
          if (data.success) {
            this.processGraphData(data.data);
          } else {
            throw new Error(data.error || '获取图谱数据失败');
          }
          
          return true;
        } catch (error) {
          console.error('加载图谱数据出错:', error);
          this.showNotification('加载图谱数据失败: ' + error.message, 'error');
          return false;
        }
      },
      
      processGraphData(data) {
        // 清空现有数据
        this.graphData = { nodes: [], links: [] };
        this.entities = [];
        
        // 处理实体数据
        if (data.entities) {
          // 转换对象为数组
          const entitiesArray = Object.values(data.entities);
          this.entities = entitiesArray;
          
          // 创建节点
          this.graphData.nodes = entitiesArray.map(entity => {
            // 从观察项中解析颜色
            const customColor = this.parseColorFromObservations(entity.observations);
            
            return {
              id: entity.name,
              name: entity.name,
              type: entity.type || '未知类型',
              observations: entity.observations || [],
              color: customColor || this.getEntityColor(entity.type)
            };
          });
        }
        
        // 处理关系数据
        if (data.relations && Array.isArray(data.relations)) {
          // 创建连接
          this.graphData.links = data.relations.map(relation => ({
            source: relation.source,
            target: relation.target,
            type: relation.type,
            properties: relation.properties || {}
          }));
        }
        
        // 保存原始图谱数据副本
        this.originalGraphData = JSON.parse(JSON.stringify(this.graphData));
        this.isFiltered = false;
        
        // 如果图谱实例存在，则更新数据
        if (this.graphInstance) {
          // 预处理连接数据
          this.processLinks();
          this.graphInstance.graphData(this.graphData);
        }
        
        // 收集所有实体类型并初始化类型颜色映射
        this.initTypeColorMap();
      },
      
      // 新增 - 解析观察项中的颜色信息
      parseColorFromObservations(observations) {
        if (!observations || observations.length === 0) return null;
        
        // 检查第一个观察项是否包含颜色信息
        const firstObservation = observations[0];
        if (!firstObservation || !firstObservation.content) return null;
        
        // 使用正则表达式匹配颜色格式 color=#RRGGBB
        const colorMatch = firstObservation.content.match(/color=#([0-9A-Fa-f]{6})/);
        if (colorMatch && colorMatch[1]) {
          return '#' + colorMatch[1];
        }
        
        return null;
      },
      
      // 初始化类型颜色映射
      initTypeColorMap() {
        const typeSet = new Set();
        this.entities.forEach(entity => {
          if (entity.type) {
            typeSet.add(entity.type);
          }
        });
        
        // 初始化类型颜色映射
        const typeColors = {};
        const types = Array.from(typeSet);
        types.forEach(type => {
          // 查找该类型的第一个节点，使用其颜色作为默认值
          const firstNode = this.graphData.nodes.find(node => node.type === type);
          typeColors[type] = firstNode ? firstNode.color : this.getEntityColor(type);
        });
        
        this.modal.typeColor.typeColors = typeColors;
      },
      
      getEntityColor(type) {
        if (!type) return '#95a5a6'; // 默认灰色
        
        const colorMap = {
          '人物': '#3498db',      // 蓝色
          '组织': '#e74c3c',      // 红色
          '地点': '#2ecc71',      // 绿色
          '事件': '#f39c12',      // 橙色
          '概念': '#9b59b6'       // 紫色
        };
        
        return colorMap[type] || '#95a5a6'; // 不匹配则返回灰色
      },
      
      initializeGraph() {
        // 确保容器存在
        const container = this.$refs.graphContainer;
        if (!container) return;
  
        // 预处理连接数据，将同向的多种关系合并
        this.processLinks();
        
        // 使用Force-Graph库创建图谱
        this.graphInstance = ForceGraph()(container)
          .graphData(this.graphData)
          .nodeId('id')
          .nodeLabel(node => `${node.name} (${node.type})`)
          .nodeColor('color')
          .nodeRelSize(6)
          .linkDirectionalArrowLength(3.5)
          .linkDirectionalArrowRelPos(1)
          .onNodeClick(node => this.handleNodeClick(node))
          .linkWidth(1)
          .linkColor(() => '#999')
          .linkCurvature(link => {
            // 使用曲线处理双向关系
            if (link.isBidirectional) {
              // 使用预设的曲率值
              return link.curvature;
            }
            return 0; // 单向关系使用直线
          })
          .nodeCanvasObject((node, ctx, globalScale) => {
            // 绘制节点
            const label = node.name;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
            
            // 绘制节点圆形
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 绘制文本背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y + 6,
              bckgDimensions[0],
              bckgDimensions[1]
            );
            
            // 绘制文本
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#333';
            ctx.fillText(label, node.x, node.y + 6 + fontSize/2);
            
            // 保存实际渲染的节点半径
            node.__r = 5;
          })
          .linkCanvasObjectMode(() => 'after')
          .linkCanvasObject((link, ctx, globalScale) => {
            // 不绘制关系类型标签，如果没有类型
            if (!link.type) return;
            
            const start = link.source;
            const end = link.target;
            
            // 确保坐标存在
            if (!start.x || !end.x) return;
            
            // 为双向关系计算更适合的标签位置
            let textPos;
            
            if (link.curvature) {
              // 曲线连接的标签位置计算
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // 曲线控制点
              const curvature = typeof link.curvature === 'number' ? link.curvature : 0.3;
              
              // 计算曲线中点
              // 控制点
              const cpX = (start.x + end.x) / 2 + curvature * (dy / dist) * 30;
              const cpY = (start.y + end.y) / 2 - curvature * (dx / dist) * 30;
              
              // 贝塞尔曲线上的一点（t=0.5为中点）
              const t = link.labelPos || 0.5;
              const t1 = 1 - t;
              
              // 二次贝塞尔曲线公式计算标签位置
              textPos = {
                x: t1 * t1 * start.x + 2 * t1 * t * cpX + t * t * end.x,
                y: t1 * t1 * start.y + 2 * t1 * t * cpY + t * t * end.y
              };
            } else {
              // 直线连接的标签位置
              textPos = {
                x: start.x + (end.x - start.x) * (link.labelPos || 0.5),
                y: start.y + (end.y - start.y) * (link.labelPos || 0.5)
              };
            }
            
            // 绘制关系文本的字体大小
            const fontSize = 10 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // 计算文本宽度
            const textWidth = ctx.measureText(link.type).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
            
            // 绘制文本背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              textPos.x - bckgDimensions[0] / 2,
              textPos.y - bckgDimensions[1] / 2,
              bckgDimensions[0],
              bckgDimensions[1]
            );
            
            // 绘制关系文本
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#3498db'; // 使用蓝色显示关系文本
            ctx.fillText(link.type, textPos.x, textPos.y);
          });
      },
      
      // 预处理连接数据，合并同向的多种关系，处理双向关系
      processLinks() {
        if (!this.graphData.links || this.graphData.links.length === 0) return;
        
        // 创建临时映射来跟踪已处理的连接
        const linkMap = new Map();
        const processedLinks = [];
        
        // 遍历所有连接
        this.graphData.links.forEach((link) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          // 创建双向映射键
          const forwardKey = `${sourceId}->${targetId}`;
          const backwardKey = `${targetId}->${sourceId}`;
          
          // 检查是否存在反向连接
          if (linkMap.has(backwardKey)) {
            // 存在反向连接，我们不合并，而是分别保持两个方向的连接
            const existingLink = linkMap.get(backwardKey);
            
            // 设置现有链接的位置（向上弯曲的曲线）
            existingLink.curvature = 0.3;
            existingLink.labelPos = 0.4; // 标签位置在曲线中点
            
            // 设置当前链接的位置（向下弯曲的曲线）
            link.curvature = 0.3; // 相反的曲率
            link.labelPos = 0.4; // 标签位置在曲线中点
            
            // 记录这是双向链接的一部分
            link.isBidirectional = true;
            existingLink.isBidirectional = true;
            
            // 添加到处理后的链接
            processedLinks.push(link);
          } else if (linkMap.has(forwardKey)) {
            // 已存在同向连接，合并关系类型
            const existingLink = linkMap.get(forwardKey);
            existingLink.type = `${existingLink.type}、${link.type}`;
          } else {
            // 新连接，添加到映射
            linkMap.set(forwardKey, link);
            processedLinks.push(link);
          }
        });
        
        // 更新图谱链接数据
        this.graphData.links = processedLinks;
      },
      
      handleNodeClick(node) {
        this.selectedNode = node;
        this.updateRelatedLinks(node);
      },
      
      updateRelatedLinks(node) {
        this.relatedLinks = [];
        
        if (!node || !this.graphData.links) return;
        
        // 查找与所选节点相关的所有连接
        this.graphData.links.forEach(link => {
          if (link.source.id === node.id || link.source === node.id) {
            this.relatedLinks.push({
              source: link.source.id || link.source,
              target: link.target.id || link.target,
              type: link.type,
              direction: 'outgoing'
            });
          } else if (link.target.id === node.id || link.target === node.id) {
            this.relatedLinks.push({
              source: link.source.id || link.source,
              target: link.target.id || link.target,
              type: link.type,
              direction: 'incoming'
            });
          }
        });
      },
      
      formatDate(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleString();
      },
      
      async handleSearch() {
        if (!this.searchQuery) {
          // 如果搜索框为空且图谱已过滤，则重置图谱
          if (this.isFiltered) {
            this.resetGraph();
          }
          return;
        }
        
        try {
          const response = await fetch(`${this.apiBaseUrl}/search?query=${encodeURIComponent(this.searchQuery)}`);
          if (!response.ok) {
            throw new Error('搜索失败');
          }
          
          const data = await response.json();
          if (data.success && data.data.length > 0) {
            // 获取匹配的实体名称列表
            const matchedEntityNames = data.data.map(item => item.name);
            
            // 过滤节点，只保留匹配的节点
            const filteredNodes = this.originalGraphData.nodes.filter(node => 
              matchedEntityNames.includes(node.id)
            );
            
            if (filteredNodes.length > 0) {
              // 找出与过滤后的节点有关的连接
              const nodeIds = filteredNodes.map(node => node.id);
              const relatedNodeIds = new Set(nodeIds);
              const filteredLinks = [];
              
              // 查找所有相关联的连接和节点
              this.originalGraphData.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                
                // 如果连接的源或目标在匹配节点中，则保留该连接
                if (nodeIds.includes(sourceId) || nodeIds.includes(targetId)) {
                  filteredLinks.push(link);
                  
                  // 将相关联的节点ID添加到集合中
                  relatedNodeIds.add(sourceId);
                  relatedNodeIds.add(targetId);
                }
              });
              
              // 获取所有需要显示的节点（包括匹配节点和关联节点）
              const allVisibleNodes = this.originalGraphData.nodes.filter(node => 
                relatedNodeIds.has(node.id)
              );
              
              // 更新图谱数据
              this.graphData = {
                nodes: allVisibleNodes,
                links: filteredLinks
              };
              
              // 更新图谱可视化
              this.graphInstance.graphData(this.graphData);
              
              // 聚焦到一个匹配的节点
              const firstMatchedNode = this.graphData.nodes.find(node => nodeIds.includes(node.id));
              if (firstMatchedNode) {
                // 选中找到的节点
                this.handleNodeClick(firstMatchedNode);
                
                // 聚焦到该节点
                this.graphInstance.centerAt(
                  firstMatchedNode.x,
                  firstMatchedNode.y,
                  1000 // 动画持续时间（毫秒）
                );
                this.graphInstance.zoom(1.5, 1000); // 放大，但要能看到周围关联节点
              }
              
              this.isFiltered = true;
              this.showNotification(
                `已过滤显示 ${filteredNodes.length} 个匹配实体及其关联节点`, 
                'info'
              );
            } else {
              this.showNotification('找到了实体，但无法在图谱中定位', 'warning');
            }
          } else {
            this.showNotification('未找到匹配的实体', 'warning');
          }
        } catch (error) {
          console.error('搜索出错:', error);
          this.showNotification('搜索失败: ' + error.message, 'error');
        }
      },
      
      // 重置图谱，恢复显示所有节点
      async resetGraph() {
        // 重置搜索查询和过滤状态
        this.searchQuery = '';
        this.isFiltered = false;
        
        // 重新加载图谱数据
        await this.loadGraphData();
        
        // 强制重新渲染整个图谱
        if (this.graphInstance) {
          this.graphInstance.graphData(this.graphData);
          this.graphInstance.d3Force('charge').restart();
          this.graphInstance.zoomToFit(400);
        }
        
        this.showNotification('已重置图谱显示', 'success');
      },
      
      async loadGraphFile() {
        if (!this.selectedGraphFile) {
          this.showNotification('请选择一个图谱文件', 'warning');
          return;
        }
        
        try {
          this.showNotification('正在加载知识图谱...', 'info');
          
          const response = await fetch(`${this.apiBaseUrl}/load-graph`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileName: this.selectedGraphFile })
          });
          
          const data = await response.json();
          
          if (data.success) {
            this.showNotification(data.message || '成功加载图谱文件', 'success');
            this.currentGraphFile = this.selectedGraphFile;
            
            // 重新加载图谱数据
            const dataLoaded = await this.loadGraphData();
            
            if (!dataLoaded) {
              this.showNotification('图谱数据加载失败，无法显示图谱', 'error');
            }
          } else {
            throw new Error(data.error || '加载图谱文件失败');
          }
        } catch (error) {
          console.error('加载图谱文件出错:', error);
          this.showNotification('加载图谱文件失败: ' + error.message, 'error');
        }
      },
      
      // 模态框操作
      showModal(type) {
        // 重置模态框数据
        this.resetModal(type);
        
        // 如果是关系或观察项，预先选择当前选中的实体
        if (type === 'relation' && this.selectedNode) {
          this.modal.relation.source = this.selectedNode.name;
        } else if (type === 'observation' && this.selectedNode) {
          this.modal.observation.entityName = this.selectedNode.name;
        }
        
        // 显示模态框
        this.modal[type].show = true;
      },
      
      hideModal(type) {
        this.modal[type].show = false;
      },
      
      resetModal(type) {
        if (type === 'entity') {
          this.modal.entity.name = '';
          this.modal.entity.type = '';
          this.modal.entity.observations = '';
          this.modal.entity.customColor = '#3498db'; // 重置为默认颜色
        } else if (type === 'relation') {
          this.modal.relation.source = '';
          this.modal.relation.target = '';
          this.modal.relation.type = '';
        } else if (type === 'observation') {
          this.modal.observation.entityName = '';
          this.modal.observation.content = '';
        } else if (type === 'typeColor') {
          this.modal.typeColor.typeColors = {};
          this.initTypeColorMap(); // 重新初始化类型颜色映射
        }
      },
      
      // 实体操作
      async handleCreateEntity(e) {
        e.preventDefault();
        
        // 准备实体数据
        const entityName = this.modal.entity.name;
        const entityType = this.modal.entity.type;
        
        // 处理观察项
        const observations = [];
        
        // 如果设置了自定义颜色，添加到第一个观察项
        if (this.modal.entity.customColor && this.modal.entity.customColor !== '') {
          observations.push({
            content: `color=${this.modal.entity.customColor}`,
            timestamp: new Date().toISOString(),
            source: 'user'
          });
        }
        
        // 添加用户输入的其他观察项
        if (this.modal.entity.observations && this.modal.entity.observations.trim() !== '') {
          const userObservations = this.modal.entity.observations
            .split('\n')
            .filter(obs => obs.trim() !== '')
            .map(obs => ({
              content: obs.trim(),
              timestamp: new Date().toISOString(),
              source: 'user'
            }));
          
          observations.push(...userObservations);
        }
        
        try {
          const response = await fetch(`${this.apiBaseUrl}/entities`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entities: [
                {
                  name: entityName,
                  type: entityType,
                  observations: observations,
                  overwrite: false
                }
              ]
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            this.showNotification(`成功创建实体: ${entityName}`, 'success');
            this.hideModal('entity');
            
            // 重新加载图谱数据
            await this.loadGraphData();
          } else {
            throw new Error(data.error || '创建实体失败');
          }
        } catch (error) {
          console.error('创建实体出错:', error);
          this.showNotification('创建实体失败: ' + error.message, 'error');
        }
      },
      
      async handleCreateRelation(e) {
        e.preventDefault();
        
        try {
          const response = await fetch(`${this.apiBaseUrl}/relations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              relations: [
                {
                  source: this.modal.relation.source,
                  target: this.modal.relation.target,
                  type: this.modal.relation.type,
                  properties: {},
                  overwrite: false
                }
              ]
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            this.showNotification(`成功创建关系: ${this.modal.relation.source} → ${this.modal.relation.target}`, 'success');
            this.hideModal('relation');
            
            // 重新加载图谱数据
            await this.loadGraphData();
            
            // 如果当前有选中的节点，更新其相关连接
            if (this.selectedNode) {
              this.updateRelatedLinks(this.selectedNode);
            }
          } else {
            throw new Error(data.error || '创建关系失败');
          }
        } catch (error) {
          console.error('创建关系出错:', error);
          this.showNotification('创建关系失败: ' + error.message, 'error');
        }
      },
      
      async handleAddObservation(e) {
        e.preventDefault();
        
        // 分割观察项
        const observations = this.modal.observation.content
          .split('\n')
          .filter(obs => obs.trim() !== '')
          .map(obs => obs.trim());
        
        if (observations.length === 0) {
          this.showNotification('请输入至少一个观察项', 'warning');
          return;
        }
        
        try {
          const observationPromises = observations.map(content => 
            fetch(`${this.apiBaseUrl}/observations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                observations: [
                  {
                    entityName: this.modal.observation.entityName,
                    content: content,
                    timestamp: new Date().toISOString(),
                    source: 'user'
                  }
                ]
              })
            })
          );
          
          const responses = await Promise.all(observationPromises);
          const results = await Promise.all(responses.map(r => r.json()));
          
          if (results.every(r => r.success)) {
            this.showNotification(`成功添加 ${observations.length} 个观察项`, 'success');
            this.hideModal('observation');
            
            // 重新加载图谱数据
            await this.loadGraphData();
            
            // 如果添加的是当前选中节点的观察项，则刷新节点信息
            if (this.selectedNode && this.selectedNode.name === this.modal.observation.entityName) {
              const updatedNode = this.graphData.nodes.find(n => n.id === this.selectedNode.name);
              if (updatedNode) {
                this.selectedNode = updatedNode;
              }
            }
          } else {
            throw new Error('添加观察项失败');
          }
        } catch (error) {
          console.error('添加观察项出错:', error);
          this.showNotification('添加观察项失败: ' + error.message, 'error');
        }
      },
      
      async confirmDeleteEntity() {
        if (!this.selectedNode) return;
        
        if (confirm(`确定要删除实体 "${this.selectedNode.name}" 吗？这将同时删除所有相关的关系。`)) {
          await this.deleteEntity(this.selectedNode.name);
        }
      },
      
      async deleteEntity(entityName) {
        try {
          const response = await fetch(`${this.apiBaseUrl}/entities`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entityNames: [entityName]
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            this.showNotification(`成功删除实体: ${entityName}`, 'success');
            
            // 重置选中的节点
            if (this.selectedNode && this.selectedNode.name === entityName) {
              this.selectedNode = null;
              this.relatedLinks = [];
            }
            
            // 重新加载图谱数据
            await this.loadGraphData();
          } else {
            throw new Error(data.error || '删除实体失败');
          }
        } catch (error) {
          console.error('删除实体出错:', error);
          this.showNotification('删除实体失败: ' + error.message, 'error');
        }
      },
      
      async confirmDeleteRelation(relation) {
        if (confirm(`确定要删除关系 "${relation.source} ${relation.direction === 'outgoing' ? '→' : '←'} ${relation.target} (${relation.type})" 吗？`)) {
          await this.deleteRelation(relation);
        }
      },
      
      async deleteRelation(relation) {
        try {
          const response = await fetch(`${this.apiBaseUrl}/relations`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              relations: [
                {
                  source: relation.direction === 'outgoing' ? relation.source : relation.target,
                  target: relation.direction === 'outgoing' ? relation.target : relation.source,
                  type: relation.type
                }
              ]
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            this.showNotification('成功删除关系', 'success');
            
            // 重新加载图谱数据
            await this.loadGraphData();
            
            // 更新选中节点的相关连接
            if (this.selectedNode) {
              this.updateRelatedLinks(this.selectedNode);
            }
          } else {
            throw new Error(data.error || '删除关系失败');
          }
        } catch (error) {
          console.error('删除关系出错:', error);
          this.showNotification('删除关系失败: ' + error.message, 'error');
        }
      },
      
      async deleteObservation(entityName, index) {
        if (confirm('确定要删除这个观察项吗？')) {
          try {
            const response = await fetch(`${this.apiBaseUrl}/observations`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                deletions: [
                  {
                    entityName: entityName,
                    index: index
                  }
                ]
              })
            });
            
            const data = await response.json();
            
            if (data.success) {
              this.showNotification('成功删除观察项', 'success');
              
              // 重新加载图谱数据
              await this.loadGraphData();
              
              // 更新选中节点
              if (this.selectedNode && this.selectedNode.name === entityName) {
                const updatedNode = this.graphData.nodes.find(n => n.id === entityName);
                if (updatedNode) {
                  this.selectedNode = updatedNode;
                }
              }
            } else {
              throw new Error(data.error || '删除观察项失败');
            }
          } catch (error) {
            console.error('删除观察项出错:', error);
            this.showNotification('删除观察项失败: ' + error.message, 'error');
          }
        }
      },
      
      showNotification(message, type = 'info') {
        // 清除任何现有的超时
        if (this.notification.timeout) {
          clearTimeout(this.notification.timeout);
        }
        
        // 设置通知信息
        this.notification.show = true;
        this.notification.message = message;
        this.notification.type = type;
        
        // 设置超时自动隐藏
        this.notification.timeout = setTimeout(() => {
          this.notification.show = false;
        }, 3000);
      },
      
      // 显示/隐藏内联颜色选择器
      toggleNodeColorPicker(node) {
        if (node) {
          this.selectedNodeForColor = {
            name: node.name,
            color: node.color || '#3498db'
          };
          this.isColorPickerVisible = true;
        } else {
          this.isColorPickerVisible = false;
          this.selectedNodeForColor = null;
        }
      },
      
      // 更新节点颜色（内联颜色选择器）
      async updateNodeColor() {
        if (!this.selectedNodeForColor) return;
        
        const entityName = this.selectedNodeForColor.name;
        const newColor = this.selectedNodeForColor.color;
        
        try {
          // 查找实体
          const entity = this.entities.find(e => e.name === entityName);
          if (!entity) {
            throw new Error('找不到指定的实体');
          }
          
          // 检查是否已有颜色观察项
          let hasColorObs = false;
          let observations = [...(entity.observations || [])];
          
          if (observations.length > 0) {
            const firstObs = observations[0];
            hasColorObs = firstObs.content && firstObs.content.match(/color=#([0-9A-Fa-f]{6})/);
          }
          
          if (hasColorObs) {
            // 使用新的API更新第一个观察项
            observations[0] = {
              ...observations[0],
              content: `color=${newColor}`,
              timestamp: new Date().toISOString()
            };
            
            const response = await fetch(`${this.apiBaseUrl}/entity-observations`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                entityName: entityName,
                observations: observations
              })
            });
            
            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.error || '更新颜色失败');
            }
          } else {
            // 创建新的颜色观察项并加到列表前面
            const newObservation = {
              content: `color=${newColor}`,
              timestamp: new Date().toISOString(),
              source: 'user'
            };
            
            observations = [newObservation, ...observations];
            
            const response = await fetch(`${this.apiBaseUrl}/entity-observations`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                entityName: entityName,
                observations: observations
              })
            });
            
            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.error || '设置颜色失败');
            }
          }
          
          this.showNotification(`成功设置实体颜色: ${entityName}`, 'success');
          
          // 更新本地节点颜色
          const node = this.graphData.nodes.find(n => n.id === entityName);
          if (node) {
            node.color = newColor;
          }
          
          // 如果是当前选中的节点，更新选中节点信息
          if (this.selectedNode && this.selectedNode.name === entityName) {
            this.selectedNode.color = newColor;
          }
          
          // 刷新图谱
          this.graphInstance.graphData(this.graphData);
          
          // 重新加载图谱数据
          await this.loadGraphData();
          
          // 关闭颜色选择器
          this.toggleNodeColorPicker(null);
        } catch (error) {
          console.error('设置实体颜色出错:', error);
          this.showNotification('设置实体颜色失败: ' + error.message, 'error');
        }
      },
      
      // 设置单个类型颜色
      async handleSetSingleTypeColor(type) {
        const typeColors = this.modal.typeColor.typeColors;
        if (!typeColors || !typeColors[type]) {
          this.showNotification('找不到指定的类型颜色', 'warning');
          return;
        }
        
        const color = typeColors[type];
        
        try {
          // 更新所有该类型节点的颜色
          this.graphData.nodes.forEach(node => {
            if (node.type === type) {
              node.color = color;
            }
          });
          
          // 刷新图谱
          this.graphInstance.graphData(this.graphData);
          
          this.showNotification(`成功设置类型${type}的颜色`, 'success');
        } catch (error) {
          console.error('设置类型颜色出错:', error);
          this.showNotification('设置类型颜色失败: ' + error.message, 'error');
        }
      },
      
      // 设置所有类型颜色
      async handleSetTypeColor() {
        const typeColors = this.modal.typeColor.typeColors;
        if (!typeColors || Object.keys(typeColors).length === 0) {
          this.showNotification('没有类型颜色需要设置', 'warning');
          return;
        }
        
        try {
          // 将颜色设置应用到所有相应类型的实体
          const updatePromises = [];
          
          for (const [type, color] of Object.entries(typeColors)) {
            // 找出所有属于此类型的实体
            const typeEntities = this.entities.filter(e => e.type === type);
            
            for (const entity of typeEntities) {
              // 检查是否已有颜色观察项
              let hasColorObs = false;
              let observations = [...(entity.observations || [])];
              
              if (observations.length > 0) {
                const firstObs = observations[0];
                hasColorObs = firstObs.content && firstObs.content.match(/color=#([0-9A-Fa-f]{6})/);
              }
              
              if (hasColorObs) {
                // 更新第一个观察项
                observations[0] = {
                  ...observations[0],
                  content: `color=${color}`,
                  timestamp: new Date().toISOString()
                };
              } else {
                // 创建新的颜色观察项并加到列表前面
                const newObservation = {
                  content: `color=${color}`,
                  timestamp: new Date().toISOString(),
                  source: 'user'
                };
                
                observations = [newObservation, ...observations];
              }
              
              // 使用新的API更新所有观察项
              updatePromises.push(
                fetch(`${this.apiBaseUrl}/entity-observations`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    entityName: entity.name,
                    observations: observations
                  })
                })
              );
              
              // 更新本地节点颜色
              const node = this.graphData.nodes.find(n => n.id === entity.name);
              if (node) {
                node.color = color;
              }
            }
          }
          
          // 执行所有更新请求
          const responses = await Promise.all(updatePromises);
          const results = await Promise.all(responses.map(r => r.json()));
          
          if (results.every(r => r.success)) {
            this.showNotification('成功设置所有类型颜色', 'success');
            
            // 刷新图谱
            this.graphInstance.graphData(this.graphData);
            
            // 重新加载图谱数据
            await this.loadGraphData();
            
            this.hideModal('typeColor');
          } else {
            throw new Error('部分类型颜色设置失败');
          }
        } catch (error) {
          console.error('设置类型颜色出错:', error);
          this.showNotification('设置类型颜色失败: ' + error.message, 'error');
        }
      },
      
      // 过滤掉颜色观察项
      filterObservations(observations) {
        if (!observations || observations.length === 0) return [];
        
        return observations.filter(obs => {
          if (!obs.content) return true;
          return !obs.content.match(/color=#([0-9A-Fa-f]{6})/);
        });
      },
      
      // 获取过滤后的观察项在原始数组中的索引
      getOriginalIndex(observations, filteredIndex) {
        if (!observations || observations.length === 0) return filteredIndex;
        
        let count = 0;
        for (let i = 0; i < observations.length; i++) {
          const obs = observations[i];
          if (!obs.content || !obs.content.match(/color=#([0-9A-Fa-f]{6})/)) {
            if (count === filteredIndex) {
              return i;
            }
            count++;
          }
        }
        return filteredIndex;
      },
      
      // 检查是否有可见的观察项
      hasVisibleObservations(observations) {
        if (!observations || observations.length === 0) return false;
        
        return observations.some(obs => {
          if (!obs.content) return true;
          return !obs.content.match(/color=#([0-9A-Fa-f]{6})/);
        });
      }
    }
  };
  </script>
  
  <style scoped>
  /* 全局样式 */
  .knowledge-graph-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    font-family: 'Microsoft YaHei', Arial, sans-serif;
  }
  
  /* 头部样式 */
  header {
    background-color: #2c3e50;
    color: white;
    padding: 0.8rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }
  
  header h1 {
    font-size: 1.3rem;
    font-weight: 500;
  }
  
  .search-container {
    display: flex;
    gap: 0.5rem;
  }
  
  .search-container input {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    width: 300px;
    font-size: 0.9rem;
  }
  
  .search-container button {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .search-container button:hover {
    background-color: #2980b9;
  }
  
  .reset-btn {
    background-color: #95a5a6 !important;
  }
  
  .reset-btn:hover {
    background-color: #7f8c8d !important;
  }
  
  .search-container button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* 主内容区样式 */
  main {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  
  /* 侧边栏样式 */
  .sidebar {
    width: 280px;
    background-color: white;
    border-right: 1px solid #e1e4e8;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    z-index: 5;
    transition: transform 0.3s ease;
  }
  
  .panel {
    padding: 1rem;
    border-bottom: 1px solid #e1e4e8;
  }
  
  .panel h2 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    color: #b0d2f4;
  }
  
  .placeholder {
    color: #7f8c8d;
    font-style: italic;
  }
  
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  /* 图谱文件选择器样式 */
  .graph-file-selector {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .graph-file-selector select {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #e1e4e8;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .graph-file-selector button {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .graph-file-selector button:hover {
    background-color: #2980b9;
  }
  
  .actions button {
    background-color: #ecf0f1;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
    padding: 0.5rem;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .actions button:hover {
    background-color: #d5dbdb;
  }
  
  .actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* 图谱容器样式 */
  .graph-container {
    flex: 1;
    background-color: #f9f9f9;
    overflow: hidden;
    position: relative;
    width: calc(100% - 280px);
    height: 100%;
  }
  
  /* 实体详情样式 */
  #entity-details {
    background-color: #f8f9fa;
    border-radius: 4px;
    padding: 1rem;
  }
  
  .entity-name {
    font-weight: bold;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .entity-type {
    color: #7f8c8d;
    margin-bottom: 1rem;
  }
  
  .entity-color {
    margin-bottom: 1rem;
    position: relative;
  }
  
  .color-label {
    font-weight: bold;
    margin-right: 0.5rem;
  }
  
  .color-preview {
    display: inline-block;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    margin-right: 0.5rem;
    vertical-align: middle;
  }
  
  .color-edit-btn {
    background-color: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0;
    opacity: 0.5;
    transition: opacity 0.3s;
  }
  
  .color-edit-btn:hover {
    opacity: 1;
  }
  
  .observations h3, 
  .relations h3 {
    font-size: 1rem;
    margin: 0.5rem 0;
  }
  
  .observations-list,
  .relations-list {
    list-style-type: none;
    padding: 0;
  }
  
  .observations-list li,
  .relations-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #ecf0f1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .observation-meta {
    font-size: 0.8rem;
    color: #7f8c8d;
  }
  
  .relation-type {
    font-size: 0.8rem;
    color: #7f8c8d;
    margin-left: 0.3rem;
  }
  
  .delete-btn {
    background-color: transparent;
    color: #e74c3c;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    opacity: 0.5;
    transition: opacity 0.3s;
  }
  
  .delete-btn:hover {
    opacity: 1;
  }
  
  /* 模态框样式 */
  .modal {
    position: fixed;
    z-index: 100;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    width: 500px;
    max-width: 90%;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    position: relative;
  }
  
  .close {
    position: absolute;
    right: 1rem;
    top: 1rem;
    font-size: 1.5rem;
    cursor: pointer;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
  }
  
  form button {
    background-color: #2ecc71;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    float: right;
    margin-top: 1rem;
  }
  
  form button:hover {
    background-color: #27ae60;
  }
  
  /* 通知样式 */
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
  }
  
  .notification-content {
    padding: 1rem;
    border-radius: 4px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
    margin-bottom: 10px;
    min-width: 300px;
    max-width: 500px;
  }
  
  .info {
    background-color: #3498db;
    color: white;
  }
  
  .success {
    background-color: #2ecc71;
    color: white;
  }
  
  .warning {
    background-color: #f39c12;
    color: white;
  }
  
  .error {
    background-color: #e74c3c;
    color: white;
  }
  
  /* 新增 - 颜色相关 */
  .color-btn {
    background-color: #9b59b6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .color-btn:hover {
    background-color: #8e44ad;
  }
  
  .color-picker-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .color-preview {
    display: inline-block;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .type-color-picker {
    margin: 1rem 0;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 10px;
  }
  
  .type-color-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #ecf0f1;
    margin-bottom: 0.5rem;
  }
  
  .type-name {
    font-weight: 500;
  }
  
  .color-pick-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .no-types-message {
    color: #7f8c8d;
    font-style: italic;
    text-align: center;
    padding: 1rem 0;
  }
  
  .type-color-apply-btn {
    background-color: #9b59b6;
    color: white;
    width: 100%;
    margin-top: 1rem;
  }
  
  .inline-color-picker {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: white;
    padding: 0.8rem;
    border: 1px solid #e1e4e8;
    border-radius: 4px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 5px;
  }
  
  .inline-color-picker input[type="color"] {
    border: none;
    width: 30px;
    height: 30px;
    padding: 0;
    background: none;
    cursor: pointer;
  }
  
  .color-close-btn {
    background-color: #95a5a6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
    transition: background-color 0.3s;
  }
  
  .color-close-btn:hover {
    background-color: #7f8c8d;
  }
  </style>