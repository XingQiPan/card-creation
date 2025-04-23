// knowledge_graph.js
// 知识图谱的核心实现

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Entity, Relation } from './models.js';

class KnowledgeGraph {
  async deleteFile(filePath) {
    try {
      console.log(`开始删除文件: ${filePath}`);
      if (!fs.existsSync(filePath)) {
        console.error(`文件不存在: ${filePath}`);
        return { success: false, error: '文件不存在' };
      }

      fs.unlinkSync(filePath);
      
      // 如果删除的是当前存储路径文件则重置数据
      if (this.storagePath === filePath) {
        this.graph = { entities: {}, relations: [] };
        const defaultPath = path.join(path.dirname(this.storagePath), 'knowledge_graph.json');
        this.storagePath = defaultPath;
        this.loadGraph();
      }

      console.log(`文件删除成功: ${filePath}`);
      return { success: true, message: '文件删除成功' };
    } catch (error) {
      console.error('删除文件失败:', error);
      return { success: false, error: `文件删除失败: ${error.message}` };
    }
  }

  /**
   * 创建新的知识图谱文件
   * @param {string} fileName - 知识图谱文件名，不需要包含路径和扩展名
   * @returns {Object} - 创建结果，包含成功标志和文件路径
   */
  async createNewGraph(fileName) {
    try {
      console.log(`开始创建新的知识图谱文件: ${fileName}`);
      
      // 检验文件名是否合法
      if (!fileName || typeof fileName !== 'string') {
        console.error('创建知识图谱失败: 文件名无效');
        return { success: false, error: '文件名无效' };
      }
      
      // 处理文件名，去除不安全字符
      const safeName = fileName.replace(/[\/\\?%*:|"<>]/g, '_');
      
      // 获取默认存储目录
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const backendDir = path.resolve(__dirname, '..');
      const kgDataDir = path.join(backendDir, 'data', 'KnowledgeGraph');
      
      // 确保目录存在
      if (!fs.existsSync(kgDataDir)) {
        fs.mkdirSync(kgDataDir, { recursive: true });
      }
      
      // 构建完整文件路径
      const filePath = path.join(kgDataDir, `${safeName}.json`);
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        console.error(`创建知识图谱失败: 文件已存在 ${filePath}`);
        return { success: false, error: '该名称的知识图谱文件已存在' };
      }
      
      // 创建空的知识图谱数据结构
      const emptyGraph = {
        entities: {},
        relations: []
      };
      
      // 写入文件
      fs.writeFileSync(filePath, JSON.stringify(emptyGraph, null, 2), 'utf8');
      
      console.log(`成功创建新的知识图谱文件: ${filePath}`);
      
      return { 
        success: true, 
        message: '知识图谱文件创建成功',
        path: filePath,
        fileName: `${safeName}.json` 
      };
    } catch (error) {
      console.error(`创建知识图谱文件失败: ${error.message}`);
      return { success: false, error: `创建知识图谱文件失败: ${error.message}` };
    }
  }

  /**
   * 初始化知识图谱
   * 
   * @param {string|null} storagePath - 数据存储文件路径。可以是：
   *   1. null或空值：使用默认路径 (backend/data/KnowledgeGraph/knowledge_graph.json)
   *   2. 文件名：将在默认目录中查找该文件名
   *   3. 完整路径：直接使用提供的完整路径
   */
  constructor(storagePath = null) {
    // 如果没有提供存储路径，则使用默认路径
    if (!storagePath) {
      // 从当前目录向上一级找到backend目录，然后定位到data/KnowledgeGraph
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const backendDir = path.resolve(__dirname, '..');
      const kgDataDir = path.join(backendDir, 'data', 'KnowledgeGraph');
      
      // 确保目录存在
      if (!fs.existsSync(kgDataDir)) {
        fs.mkdirSync(kgDataDir, { recursive: true });
      }
      
      storagePath = path.join(kgDataDir, 'knowledge_graph.json');
    }
    
    this.storagePath = storagePath;
    this.graph = {
      entities: {},
      relations: []
    };
    this.loadGraph();
  }

  /**
   * 加载知识图谱
   */
  loadGraph() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        this.graph = JSON.parse(data);
        console.log(`已加载知识图谱: ${this.storagePath}`);
        return true;
      } else {
        // 如果文件不存在，就用空图初始化
        this.saveGraph();
        console.log(`创建新的知识图谱: ${this.storagePath}`);
        return true;
      }
    } catch (error) {
      console.error(`加载知识图谱失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 从指定文件加载知识图谱
   * @param {string} filePath - 知识图谱数据文件的路径
   * @returns {boolean} - 加载是否成功
   */
  async loadFromFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        this.graph = JSON.parse(data);
        this.storagePath = filePath;
        console.log(`已加载知识图谱: ${filePath}`);
        return true;
      } else {
        console.error(`知识图谱文件不存在: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`加载知识图谱失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 保存知识图谱到文件
   */
  saveGraph() {
    try {
      // 确保目录存在
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 保存图谱数据
      fs.writeFileSync(this.storagePath, JSON.stringify(this.graph, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`保存知识图谱失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 创建新实体
   * @param {Array} entities - 实体数据列表，每个元素包含name、entityType和observations
   * @returns {Object} - 成功创建的实体列表
   */
  async createEntities(entities) {
    console.log(`开始创建实体，数量: ${entities.length}`);
    if (!Array.isArray(entities) || entities.length === 0) {
      console.error('创建实体失败: 实体必须是非空数组');
      throw new Error('实体必须是非空数组');
    }

    const results = [];
    for (const entity of entities) {
      if (!entity.name || typeof entity.name !== 'string') {
        throw new Error('实体必须有有效的名称');
      }

      // 检查实体名称是否已存在
      if (this.graph.entities[entity.name]) {
        // 如果存在但要求覆盖，更新实体
        if (entity.overwrite) {
          this.graph.entities[entity.name] = {
            ...entity,
            observations: entity.observations || [],
            properties: entity.properties || {}
          };
          results.push({
            name: entity.name,
            status: 'updated'
          });
        } else {
          results.push({
            name: entity.name,
            status: 'exists'
          });
        }
      } else {
        // 创建新实体
        this.graph.entities[entity.name] = {
          name: entity.name,
          type: entity.type || 'unknown',
          observations: entity.observations || [],
          properties: entity.properties || {}
        };
        results.push({
          name: entity.name,
          status: 'created'
        });
      }
    }

    // 保存更改
    await this.saveGraph();
    console.log(`实体创建完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 创建新关系
   * @param {Array} relations - 关系数据列表，每个元素包含from、to和relationType
   * @returns {Object} - 成功创建的关系列表
   */
  async createRelations(relations) {
    console.log(`开始创建关系，数量: ${relations.length}`);
    if (!Array.isArray(relations) || relations.length === 0) {
      console.error('创建关系失败: 关系必须是非空数组');
      throw new Error('关系必须是非空数组');
    }

    const results = [];
    for (const relation of relations) {
      if (!relation.source || !relation.target || !relation.type) {
        throw new Error('关系必须包含源实体、目标实体和类型');
      }

      // 验证源实体和目标实体存在
      if (!this.graph.entities[relation.source]) {
        throw new Error(`源实体不存在: ${relation.source}`);
      }
      if (!this.graph.entities[relation.target]) {
        throw new Error(`目标实体不存在: ${relation.target}`);
      }

      // 检查关系是否已存在
      const existingRelation = this.graph.relations.find(
        r => r.source === relation.source && 
             r.target === relation.target && 
             r.type === relation.type
      );

      if (existingRelation) {
        // 如果存在且要求覆盖，更新关系
        if (relation.overwrite) {
          const index = this.graph.relations.indexOf(existingRelation);
          this.graph.relations[index] = {
            ...existingRelation,
            ...relation,
            properties: relation.properties || existingRelation.properties || {}
          };
          results.push({
            source: relation.source,
            target: relation.target,
            type: relation.type,
            status: 'updated'
          });
        } else {
          results.push({
            source: relation.source,
            target: relation.target,
            type: relation.type,
            status: 'exists'
          });
        }
      } else {
        // 创建新关系
        this.graph.relations.push({
          source: relation.source,
          target: relation.target,
          type: relation.type,
          properties: relation.properties || {}
        });
        results.push({
          source: relation.source,
          target: relation.target,
          type: relation.type,
          status: 'created'
        });
      }
    }

    // 保存更改
    await this.saveGraph();
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 向实体添加观察
   * @param {Array} observations - 观察项数据列表，每个元素包含entityName和contents
   * @returns {Object} - 每个实体新增的观察项
   * @throws {Error} - 如果实体不存在
   */
  async addObservations(observations) {
    console.log(`开始添加观察项，数量: ${observations.length}`);
    if (!Array.isArray(observations) || observations.length === 0) {
      console.error('添加观察失败: 观察必须是非空数组');
      throw new Error('观察必须是非空数组');
    }

    const results = [];
    for (const observation of observations) {
      if (!observation.entityName || !observation.content) {
        throw new Error('观察必须包含实体名称和内容');
      }

      // 验证实体存在
      if (!this.graph.entities[observation.entityName]) {
        throw new Error(`实体不存在: ${observation.entityName}`);
      }

      // 添加观察
      const entity = this.graph.entities[observation.entityName];
      entity.observations = entity.observations || [];
      
      // 检查是否已存在相同内容的观察
      const existingObservation = entity.observations.find(
        obs => obs.content === observation.content
      );

      if (existingObservation) {
        results.push({
          entityName: observation.entityName,
          status: 'exists',
          content: observation.content
        });
      } else {
        entity.observations.push({
          content: observation.content,
          timestamp: observation.timestamp || new Date().toISOString(),
          source: observation.source || 'user'
        });
        results.push({
          entityName: observation.entityName,
          status: 'added',
          content: observation.content
        });
      }
    }

    // 保存更改
    await this.saveGraph();
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项添加完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 删除实体及其关联关系
   * @param {Array} entityNames - 要删除的实体名称列表
   * @returns {Object} - 删除操作的结果
   */
  async deleteEntities(entityNames) {
    console.log(`开始删除实体，数量: ${entityNames.length}`);
    if (!Array.isArray(entityNames) || entityNames.length === 0) {
      console.error('删除实体失败: 实体名称必须是非空数组');
      throw new Error('实体名称必须是非空数组');
    }

    const results = [];
    for (const entityName of entityNames) {
      if (!this.graph.entities[entityName]) {
        results.push({
          name: entityName,
          status: 'not_found'
        });
        continue;
      }

      // 删除实体
      delete this.graph.entities[entityName];
      results.push({
        name: entityName,
        status: 'deleted'
      });

      // 删除与该实体相关的所有关系
      this.graph.relations = this.graph.relations.filter(
        relation => relation.source !== entityName && relation.target !== entityName
      );
    }

    // 保存更改
    await this.saveGraph();
    console.log(`实体创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项添加完成，结果: ${JSON.stringify(results)}`);
    console.log(`实体删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系删除完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 删除实体的特定观察项
   * @param {Array} deletions - 删除数据列表，每个元素包含entityName和observations
   * @returns {Object} - 删除操作的结果
   */
  async deleteObservations(deletions) {
    console.log(`开始删除观察项，数量: ${deletions.length}`);
    if (!Array.isArray(deletions) || deletions.length === 0) {
      console.error('删除观察失败: 删除请求必须是非空数组');
      throw new Error('删除请求必须是非空数组');
    }

    const results = [];
    for (const deletion of deletions) {
      if (!deletion.entityName || deletion.index === undefined) {
        throw new Error('删除请求必须包含实体名称和观察索引');
      }

      // 验证实体存在
      if (!this.graph.entities[deletion.entityName]) {
        results.push({
          entityName: deletion.entityName,
          index: deletion.index,
          status: 'entity_not_found'
        });
        continue;
      }

      const entity = this.graph.entities[deletion.entityName];
      
      // 验证观察索引有效
      if (!entity.observations || deletion.index < 0 || deletion.index >= entity.observations.length) {
        results.push({
          entityName: deletion.entityName,
          index: deletion.index,
          status: 'index_out_of_range'
        });
        continue;
      }

      // 删除观察
      entity.observations.splice(deletion.index, 1);
      results.push({
        entityName: deletion.entityName,
        index: deletion.index,
        status: 'deleted'
      });
    }

    // 保存更改
    await this.saveGraph();
    console.log(`实体创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项添加完成，结果: ${JSON.stringify(results)}`);
    console.log(`实体删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系删除完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 删除图谱中的特定关系
   * @param {Array} relations - 关系数据列表，每个元素包含from、to和relationType
   * @returns {Object} - 删除操作的结果
   */
  async deleteRelations(relations) {
    console.log(`开始删除关系，数量: ${relations.length}`);
    if (!Array.isArray(relations) || relations.length === 0) {
      console.error('删除关系失败: 关系必须是非空数组');
      throw new Error('关系必须是非空数组');
    }

    const results = [];
    for (const relation of relations) {
      if (!relation.source || !relation.target || !relation.type) {
        throw new Error('关系必须包含源实体、目标实体和类型');
      }

      // 尝试找到匹配的关系
      const index = this.graph.relations.findIndex(
        r => r.source === relation.source && 
             r.target === relation.target && 
             r.type === relation.type
      );

      if (index === -1) {
        results.push({
          source: relation.source,
          target: relation.target,
          type: relation.type,
          status: 'not_found'
        });
        continue;
      }

      // 删除关系
      this.graph.relations.splice(index, 1);
      results.push({
        source: relation.source,
        target: relation.target,
        type: relation.type,
        status: 'deleted'
      });
    }

    // 保存更改
    await this.saveGraph();
    console.log(`实体创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项添加完成，结果: ${JSON.stringify(results)}`);
    console.log(`实体删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系删除完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 获取关系的属性
   * @param {string} source - 源实体名称
   * @param {string} target - 目标实体名称
   * @param {string} type - 关系类型
   * @returns {Object|null} - 关系的属性对象，如果关系不存在则返回null
   */
  getRelationProperties(source, target, type) {
    const relation = this.graph.relations.find(
      r => r.source === source && 
           r.target === target && 
           r.type === type
    );
    
    return relation ? relation.properties : null;
  }

  /**
   * 更新关系的属性
   * @param {string} source - 源实体名称
   * @param {string} target - 目标实体名称
   * @param {string} type - 关系类型
   * @param {Object} properties - 要更新的属性对象
   * @returns {Object} - 更新操作的结果
   */
  async updateRelationProperties(source, target, type, properties) {
    console.log(`开始更新关系属性: ${source} -> ${target} (${type})`);
    
    try {
      // 查找关系
      const relation = this.graph.relations.find(r => 
        r.source === source && 
        r.target === target && 
        r.type === type
      );
      
      if (!relation) {
        console.error(`关系不存在: ${source} -> ${target} (${type})`);
        return { success: false, error: '关系不存在' };
      }
      
      // 更新属性
      relation.properties = properties || {};
      
      // 保存更改
      await this.saveGraph();
      console.log(`关系属性更新成功: ${source} -> ${target} (${type})`);
      return { success: true };
    } catch (error) {
      console.error(`更新关系属性失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 读取整个知识图谱
   * @returns {Object} - 包含所有实体和关系的完整图谱结构
   */
  readGraph() {
    return {
      entities: this.graph.entities,
      relations: this.graph.relations
    };
  }

  /**
   * 根据查询条件搜索节点
   * @param {string} query - 搜索查询字符串
   * @returns {Object} - 匹配的实体及其关系
   */
  searchNodes(query) {
    if (!query) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    // 搜索实体
    for (const [name, entity] of Object.entries(this.graph.entities)) {
      if (name.toLowerCase().includes(lowerQuery) || 
          entity.type.toLowerCase().includes(lowerQuery)) {
        results.push({
          ...entity,
          matchType: 'entity'
        });
        continue;
      }

      // 搜索实体属性
      if (entity.properties) {
        let foundInProperties = false;
        for (const [propKey, propValue] of Object.entries(entity.properties)) {
          if (propKey.toLowerCase().includes(lowerQuery) || 
              (typeof propValue === 'string' && propValue.toLowerCase().includes(lowerQuery))) {
            results.push({
              ...entity,
              matchType: 'entity_property'
            });
            foundInProperties = true;
            break;
          }
        }
        if (foundInProperties) continue;
      }

      // 搜索实体观察
      if (entity.observations && entity.observations.length > 0) {
        for (const observation of entity.observations) {
          if (observation.content.toLowerCase().includes(lowerQuery)) {
            results.push({
              ...entity,
              matchType: 'entity_observation'
            });
            break;
          }
        }
      }
    }

    console.log(`实体创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项添加完成，结果: ${JSON.stringify(results)}`);
    console.log(`实体删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系删除完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 按名称检索多个节点
   * @param {Array} names - 实体名称列表
   * @returns {Object} - 请求的实体及其之间的关系
   */
  openNodes(names) {
    if (!Array.isArray(names) || names.length === 0) {
      return [];
    }

    const results = [];
    for (const name of names) {
      if (this.graph.entities[name]) {
        const entity = this.graph.entities[name];
        
        // 获取与该实体相关的所有关系
        const relations = this.graph.relations.filter(
          relation => relation.source === name || relation.target === name
        );
        
        results.push({
          entity,
          relations
        });
      }
    }

    console.log(`实体创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系创建完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项添加完成，结果: ${JSON.stringify(results)}`);
    console.log(`实体删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`观察项删除完成，结果: ${JSON.stringify(results)}`);
    console.log(`关系删除完成，结果: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * 更新实体类型
   * @param {string} entityName - 实体名称
   * @param {string} newType - 新的实体类型
   * @returns {Object} - 操作结果
   */
  async updateEntityType(entityName, newType) {
    console.log(`开始更新实体类型: ${entityName} -> ${newType}`);
    
    try {
      // 验证实体存在
      if (!this.graph.entities[entityName]) {
        console.error(`实体不存在: ${entityName}`);
        return { success: false, error: `实体不存在: ${entityName}` };
      }
      
      // 更新类型
      this.graph.entities[entityName].type = newType;
      
      // 保存更改
      await this.saveGraph();
      console.log(`实体类型更新成功: ${entityName} -> ${newType}`);
      return { success: true, message: '实体类型更新成功' };
    } catch (error) {
      console.error(`更新实体类型失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 重命名实体
   * @param {string} oldName - 旧的实体名称
   * @param {string} newName - 新的实体名称
   * @param {string} type - 实体类型
   * @returns {Object} - 操作结果
   */
  async renameEntity(oldName, newName, type) {
    console.log(`开始重命名实体: ${oldName} -> ${newName}`);
    
    try {
      // 验证旧实体存在
      if (!this.graph.entities[oldName]) {
        console.error(`实体不存在: ${oldName}`);
        return { success: false, error: `实体不存在: ${oldName}` };
      }
      
      // 检查新名称是否已存在
      if (this.graph.entities[newName]) {
        console.error(`实体已存在: ${newName}`);
        return { success: false, error: `新名称已被使用: ${newName}` };
      }
      
      // 创建新实体
      this.graph.entities[newName] = {
        ...this.graph.entities[oldName],
        name: newName,
        type: type // 同时更新类型
      };
      
      // 更新所有相关的关系
      this.graph.relations.forEach(relation => {
        if (relation.source === oldName) {
          relation.source = newName;
        }
        if (relation.target === oldName) {
          relation.target = newName;
        }
      });
      
      // 删除旧实体
      delete this.graph.entities[oldName];
      
      // 保存更改
      await this.saveGraph();
      console.log(`实体重命名成功: ${oldName} -> ${newName}`);
      return { success: true, message: '实体重命名成功' };
    } catch (error) {
      console.error(`重命名实体失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 设置实体的所有观察项
   * @param {Object} params - 参数对象
   * @param {string} params.entityName - 实体名称
   * @param {Array} params.observations - 观察项数组
   * @returns {Object} - 操作结果
   */
  async setEntityObservations({ entityName, observations }) {
    console.log(`开始设置实体观察项: ${entityName}`);
    
    try {
      // 验证实体存在
      if (!this.graph.entities[entityName]) {
        console.error(`实体不存在: ${entityName}`);
        return { success: false, error: `实体不存在: ${entityName}` };
      }
      
      // 设置观察项
      this.graph.entities[entityName].observations = observations || [];
      
      // 保存更改
      await this.saveGraph();
      console.log(`实体观察项设置成功: ${entityName}`);
      return { 
        success: true, 
        data: {
          entityName: entityName,
          status: 'observations_updated'
        }
      };
    } catch (error) {
      console.error(`设置实体观察项失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新实体的属性
   * @param {string} entityName - 实体名称
   * @param {Object} properties - 要设置的属性对象
   * @returns {Object} - 操作结果
   */
  async updateEntityProperties(entityName, properties) {
    console.log(`开始更新实体属性: ${entityName}`);
    
    try {
      // 验证实体存在
      if (!this.graph.entities[entityName]) {
        console.error(`实体不存在: ${entityName}`);
        return { success: false, error: `实体不存在: ${entityName}` };
      }
      
      // 更新属性
      this.graph.entities[entityName].properties = properties || {};
      
      // 保存更改
      await this.saveGraph();
      console.log(`实体属性更新成功: ${entityName}`);
      return { 
        success: true, 
        data: {
          entityName: entityName,
          status: 'properties_updated'
        }
      };
    } catch (error) {
      console.error(`更新实体属性失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default KnowledgeGraph;