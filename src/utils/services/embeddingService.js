import { dataService } from './dataService';
import { showToast } from '../common';
import { debugLog } from '../debug';

export class EmbeddingService {
  constructor() {
    // 初始化为空数组，然后异步加载
    this.knowledgeBases = [];
    this.defaultConfig = {
      chunkSize: 500,
      overlapSize: 50,
      similarityThreshold: 0.5,
      maxChunks: 15,
      maxResults: 10
    };
    // 异步初始化
    this.initializeAsync();
  }
  
  /**
   * 异步初始化，从后端加载知识库数据
   */
  async initializeAsync() {
    try {
      // 尝试从后端加载知识库
      this.knowledgeBases = await this.loadKnowledgeBasesFromBackend();
      console.log('成功从后端加载知识库数据');
    } catch (error) {
      console.error('从后端加载知识库失败，尝试使用本地缓存:', error);
      // 如果后端加载失败，尝试使用本地缓存
      const allData = await dataService.loadAllData();
      this.knowledgeBases = allData.knowledgeBases || [];
    }
  }

  // Utility function to handle errors
  handleError(message, error) {
    console.error(`${message}:`, error);
    showToast(`${message}: ${error.message}`, 'error'); // Consistent error reporting.
    throw error;
  }

  /**
   * 加载知识库 - 从后端数据库加载
   */
  async loadKnowledgeBasesFromBackend() {
    try {
      // 使用dataService加载全部数据，提取knowledgeBases
      const allData = await dataService.loadAllData();
      return allData.knowledgeBases || [];
    } catch (error) {
      console.error('加载知识库失败:', error);
      throw error;
    }
  }

  /**
   * 保存知识库 - 使用dataService保存到后端
   */
  async saveKnowledgeBases() {
    try {
      await dataService.saveItem('knowledgeBases', this.knowledgeBases);
      return true;
    } catch (error) {
      console.error('保存知识库失败:', error);
      return false;
    }
  }

  /**
   * 获取所有知识库
   */
  getAllKnowledgeBases() {
    // 直接返回内存中的数据，不再重新加载
    return this.knowledgeBases;
  }

  /**
   * 获取指定ID的知识库
   */
  getKnowledgeBase(id) {
    // 不再重新加载数据，直接从内存中查找
    return this.knowledgeBases.find(kb => kb.id === id);
  }

  /**
   * 添加知识库
   */
  async addKnowledgeBase(name, description = '') {
    const id = Date.now().toString();
    const newKnowledgeBase = {
      id,
      name,
      description,
      embeddings: [],
      config: { ...this.defaultConfig },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.knowledgeBases.push(newKnowledgeBase);
    await this.saveKnowledgeBases();
    return newKnowledgeBase;
  }

  /**
   * 更新知识库
   */
  async updateKnowledgeBase(id, data) {
    const index = this.knowledgeBases.findIndex(kb => kb.id === id);
    if (index === -1) {
      throw new Error(`知识库 ${id} 不存在`);
    }

    // 确保配置有效
    if (data.config) {
      this.validateConfig(data.config);
    }

    const updatedKnowledgeBase = {
      ...this.knowledgeBases[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.knowledgeBases[index] = updatedKnowledgeBase;
    await this.saveKnowledgeBases();
    return updatedKnowledgeBase;
  }

  /**
   * 删除知识库
   */
  async deleteKnowledgeBase(id) {
    // 直接使用内存中的数据，从数组中过滤掉要删除的知识库
    this.knowledgeBases = this.knowledgeBases.filter(kb => kb.id !== id);
    await this.saveKnowledgeBases();
    return true;
  }

  /**
   * 添加嵌入向量到知识库
   */
  async addEmbedding(knowledgeBaseId, text, vector, metadata = {}) {
    const knowledgeBase = this.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error(`知识库 ${knowledgeBaseId} 不存在`);
    }

    const id = Date.now().toString();
    const embedding = {
      id,
      text,
      vector,
      metadata,
      createdAt: new Date().toISOString()
    };

    knowledgeBase.embeddings = knowledgeBase.embeddings || [];
    knowledgeBase.embeddings.push(embedding);
    await this.saveKnowledgeBases();
    return embedding;
  }

  /**
   * 从知识库中删除嵌入向量
   */
  async removeEmbedding(knowledgeBaseId, embeddingId) {
    const knowledgeBase = this.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error(`知识库 ${knowledgeBaseId} 不存在`);
    }

    const embeddings = knowledgeBase.embeddings || [];
    const index = embeddings.findIndex(e => e.id === embeddingId);
    if (index === -1) {
      throw new Error(`嵌入向量 ${embeddingId} 不存在`);
    }

    knowledgeBase.embeddings.splice(index, 1);
    await this.saveKnowledgeBases();
    return true;
  }

  /**
   * 计算两个向量之间的余弦相似度
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 在知识库中搜索最相似的嵌入向量
   */
  async searchSimilar(knowledgeBaseId, queryVector, topK = 5, similarityThreshold = 0.7) {
    const knowledgeBase = this.getKnowledgeBase(knowledgeBaseId);
    if (!knowledgeBase) {
      throw new Error(`知识库 ${knowledgeBaseId} 不存在`);
    }

    const { embeddings } = knowledgeBase;
    if (!embeddings || embeddings.length === 0) {
      return [];
    }

    const results = embeddings
      .map(embedding => ({
        ...embedding,
        similarity: this.cosineSimilarity(queryVector, embedding.vector)
      }))
      .filter(item => item.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  // Get default config
  getDefaultConfig() {
    return {
      chunkSize: 500,
      overlapSize: 50,
      similarityThreshold: 0.3,
      maxChunks: 15,
      maxResults: 50,
      threshold: 0.3
    };
  }

  // Create knowledge base with validated config
  async createKnowledgeBase(data) {
    try {
      const config = {
        ...this.getDefaultConfig(),
        model: data.model
      };

      const kb = {
        id: this.generateId(),
        name: data.name,
        config,
        documents: []
      };

      this.validateConfig(config);
      this.knowledgeBases.push(kb);
      this.saveKnowledgeBases();

      return kb;
    } catch (error) {
      throw new Error(`创建知识库失败: ${error.message}`);
    }
  }

  // Add a document to a knowledge base
  async addDocumentToKnowledgeBase(kbId, document, models) {
    try {
      this.knowledgeBases = this.loadKnowledgeBases();  // Ensure fresh data
      const kb = this.getKnowledgeBase(kbId);
      if (!kb) {
        throw new Error('知识库不存在');
      }

      const model = models.find(m => m.id === kb.config.model);
      if (!model) {
        throw new Error('模型配置不存在');
      }

      kb.documents = kb.documents || []; // Initialize if null

      const newDoc = {
        id: Date.now(),
        name: document.name,
        content: document.content,
        createdAt: new Date().toISOString(),
        chunks: [] // initialize chunks here
      };

      const chunks = this.splitTextIntoChunks(document.content, kb.config);
      const maxChunks = kb.config.maxChunks || this.defaultConfig.maxChunks;
      const batchSize = 5;
      const limitedChunks = chunks.slice(0, maxChunks);
      const embeddings = [];  // Initialize empty array

      for (let i = 0; i < limitedChunks.length; i += batchSize) {
        const batch = limitedChunks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (chunk) => { // Use async here
          try {
            const embedding = await this.createEmbedding(chunk, model);  // Await the embedding
            return {
              text: chunk,
              embedding: embedding.data[0].embedding,
              metadata: {
                docId: newDoc.id,
                docName: newDoc.name,
                chunkIndex: i + batch.indexOf(chunk),  // Correct index
              }
            };
          } catch (embeddingError) {
            // Handle embedding errors within the batch
            debugLog(`Error creating embedding for chunk: ${chunk}`, embeddingError)
            // Optionally re-throw, or return a placeholder
            return null; // Or some error indicator
          }
        });

        const batchResults = (await Promise.all(batchPromises)).filter(result => result !== null); // Await and filter out nulls
        embeddings.push(...batchResults);
      }

      newDoc.chunks = embeddings;  // Assign after all embeddings are created
      kb.documents.push(newDoc);
      this.saveKnowledgeBases();

      return newDoc;
    } catch (error) {
      return this.handleError('Failed to add document', error);
    }
  }

  // Create an embedding
  async createEmbedding(text, modelConfig) {
    try {
      if (!modelConfig?.apiUrl) {
        throw new Error('模型配置无效');
      }

      const limitedText = text.slice(0, modelConfig.maxTokens); // Use maxTokens if available

      const requestBody = {
        input: limitedText,
        model: modelConfig.modelId || 'BAAI/bge-m3',
      };

      const response = await fetch(modelConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(modelConfig.apiKey && { Authorization: `Bearer ${modelConfig.apiKey}` }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
      }

      const result = await response.json();
      if (!result.data?.[0]?.embedding) {
        throw new Error('API 返回的嵌入向量格式无效');
      }

      return result;
    } catch (error) {
      debugLog('Embedding creation failed:', error); // More specific debug log
      throw error; // Re-throw for consistent handling
    }
  }

  // Calculate cosine similarity
  calculateCosineSimilarity(vec1, vec2) {
    if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length !== vec2.length) {
      console.error('Invalid vectors:', { vec1, vec2 });
      return 0; // Return 0 for invalid input, avoiding throwing errors during search
    }

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    if (norm1 === 0 || norm2 === 0) {
      console.error('Zero norm detected:', { norm1, norm2 });
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  // Process a document (refactored for clarity and consistency)
  async processDocument(doc, kbId, models) {
    try {
      const kb = this.getKnowledgeBase(kbId);
      if (!kb) throw new Error('知识库不存在');

      const model = models.find(m => m.id === kb.config.model);
      if (!model) throw new Error('模型配置不存在');

      const chunks = this.splitTextIntoChunks(doc.content, kb.config);
      const maxChunks = kb.config.maxChunks || this.defaultConfig.maxChunks;
      const limitedChunks = chunks.slice(0, maxChunks);
      const embeddings = [];

      const batchSize = 5;
      for (let i = 0; i < limitedChunks.length; i += batchSize) {
        const batch = limitedChunks.slice(i, i + batchSize);
        const batchPromises = batch.map(async chunk => {
          try {
            const embeddingResult = await this.createEmbedding(chunk, model);
            return {
              text: chunk,
              embedding: embeddingResult.data[0].embedding,
              metadata: { docId: doc.id, docName: doc.name, chunkIndex: i + batch.indexOf(chunk) }
            };
          } catch (error) {
            debugLog(`Error processing chunk: ${chunk}`, error)
            return null;
          }
        });
        const batchResults = (await Promise.all(batchPromises)).filter(res => res !== null);
        embeddings.push(...batchResults);
      }
      const docIndex = kb.documents.findIndex(d => d.id === doc.id);
      const updatedDoc = {
        ...doc, // Keep original doc data
        chunks: embeddings,
        processedAt: new Date().toISOString()
      }

      if (docIndex !== -1) {
        kb.documents[docIndex] = updatedDoc;
      } else {
        kb.documents.push(updatedDoc);
      }

      this.saveKnowledgeBases();
      return embeddings;
    } catch (error) {
      return this.handleError('处理文档失败', error);
    }
  }

  // Search a knowledge base
  async searchKnowledgeBase(kbId, query, models) {
    try {
      const kb = this.getKnowledgeBase(kbId);
      if (!kb) throw new Error('知识库不存在');

      const threshold = kb.config?.similarityThreshold || this.defaultConfig.similarityThreshold;
      const maxResults = kb.config?.maxResults || this.defaultConfig.maxResults;
      const chunkSize = kb.config?.chunkSize || this.defaultConfig.chunkSize;

      const model = models.find(m => m.id === kb.config.model);
      if (!model) throw new Error('模型配置不存在');

      const queryEmbedding = await this.createEmbedding(query, model);
      const queryVector = queryEmbedding.data[0].embedding;

      // 使用 Map 来存储每个文档的最佳匹配
      const docBestMatches = new Map();

      // 遍历所有文档和块
      for (const doc of (kb.documents || [])) {
        if (!doc.chunks) continue;

        // 存储当前文档的所有匹配块
        const docMatches = [];

        for (const chunk of doc.chunks) {
          if (!chunk.embedding) continue;

          const similarity = this.calculateCosineSimilarity(queryVector, chunk.embedding);
          
          if (similarity >= threshold) {
            docMatches.push({
              text: chunk.text,
              similarity,
              metadata: chunk.metadata || {},
              position: chunk.metadata?.chunkIndex || 0
            });
          }
        }

        // 如果文档有匹配的块
        if (docMatches.length > 0) {
          // 按相似度排序
          docMatches.sort((a, b) => b.similarity - a.similarity);
          
          // 获取最相关的上下文
          const relevantContext = this.mergeRelevantChunks(docMatches, chunkSize);

          docBestMatches.set(doc.id, {
            docId: doc.id,
            docName: doc.name,
            text: relevantContext,
            similarity: docMatches[0].similarity, // 使用最高相似度
            matchCount: docMatches.length
          });
        }
      }

      // 转换为数组并排序
      const results = Array.from(docBestMatches.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      return results;
    } catch (error) {
      return this.handleError('Search failed', error);
    }
  }

  // 合并相关块为连贯上下文
  mergeRelevantChunks(matches, maxLength) {
    if (matches.length === 0) return '';

    // 按位置排序
    matches.sort((a, b) => a.position - b.position);

    let context = '';
    let currentLength = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const text = match.text.trim();
      
      // 如果是第一个匹配块或当前长度还没超过限制
      if (i === 0 || currentLength < maxLength) {
        if (currentLength === 0) {
          context = text;
          currentLength = text.length;
        } else {
          // 检查是否有重叠
          const overlap = this.findOverlap(context, text);
          if (overlap > 0) {
            context += text.slice(overlap);
            currentLength = context.length;
          } else {
            // 添加分隔符并继续
            context += ' ... ' + text;
            currentLength = context.length;
          }
        }
      } else {
        break;
      }
    }

    // 如果最终文本超过长度限制，进行截断
    if (context.length > maxLength) {
      context = context.slice(0, maxLength) + '...';
    }

    return context;
  }

  // 查找文本重叠
  findOverlap(text1, text2) {
    const minOverlap = 10; // 最小重叠长度
    const maxOverlap = Math.min(text1.length, text2.length);

    for (let i = maxOverlap; i >= minOverlap; i--) {
      const end1 = text1.slice(-i);
      const start2 = text2.slice(0, i);
      if (end1 === start2) {
        return i;
      }
    }

    return 0;
  }

  // Get model configuration (simplified)
  getModelConfig(modelId) {
    try {
      const appData = dataService.loadFromLocalStorage('appData', { models: [] });
      const models = appData.models || [];
      const model = models.find(m => m.id === Number(modelId) || m.id === modelId);  // Support both number and string IDs

      if (!model) {
        console.error(`找不到模型配置，ID: ${modelId}`);
        return null; // Return null if not found
      }
      return {
        apiUrl: model.apiUrl || 'https://api.siliconflow.cn/v1',
        apiKey: model.apiKey || '',
        modelId: model.modelId || 'BAAI/bge-m3',
        provider: model.provider || 'embedding',
        maxTokens: model.maxTokens // Add maxTokens
      };
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return null; // Return null on error
    }
  }

  // Remove a document
  removeDocument(kbId, docId) {
    this.knowledgeBases = this.loadKnowledgeBases();
    const kb = this.knowledgeBases.find(kb => kb.id === kbId);
    if (kb) {
      kb.documents = kb.documents.filter(doc => doc.id !== docId);
      this.saveKnowledgeBases();
    }
  }

  // Split text into chunks with exact character count
  splitTextIntoChunks(text, config = {}) {
    if (typeof text !== 'string') {
      console.warn('Invalid text input:', text);
      return [];
    }

    const {
      chunkSize = this.defaultConfig.chunkSize,
      overlapSize = this.defaultConfig.overlapSize,
      maxChunks = this.defaultConfig.maxChunks,
    } = config;

    if (chunkSize <= 0 || overlapSize < 0 || overlapSize >= chunkSize || maxChunks <= 0) {
      console.warn('Invalid config parameters:', { chunkSize, overlapSize, maxChunks });
      return [];
    }

    // 预处理文本：清除所有回车符，替换为空格，并清理多余空格
    text = text.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();

    const chunks = [];
    let currentPosition = 0;

    // 句子结束标记（只包括中英文标点，不包括换行符）
    const sentenceEndings = /([.!?。！？][\s]*)/g;

    while (currentPosition < text.length && chunks.length < maxChunks) {
      // 计算当前块的结束位置
      let endPosition = currentPosition + chunkSize;
      
      // 如果还没到文本末尾
      if (endPosition < text.length) {
        // 在块大小范围内查找最后一个句子结束位置
        const searchText = text.slice(currentPosition, endPosition);
        let lastSentenceEnd = -1;
        let match;
        
        sentenceEndings.lastIndex = 0;
        while ((match = sentenceEndings.exec(searchText)) !== null) {
          lastSentenceEnd = match.index + match[0].length;
        }

        // 如果找到了句子结束位置，就在那里截断
        if (lastSentenceEnd > 0) {
          endPosition = currentPosition + lastSentenceEnd;
        }
      } else {
        endPosition = text.length;
      }

      // 提取当前块并清理空格
      const chunk = text.slice(currentPosition, endPosition).trim();
      
      if (chunk) {
        chunks.push(chunk);
      }

      // 移动到下一个位置，考虑重叠
      currentPosition = Math.max(currentPosition, endPosition - overlapSize);
      
      // 确保至少前进一个字符，避免死循环
      if (currentPosition === endPosition) {
        currentPosition++;
      }
    }

    // 返回非空的块
    return chunks.filter(chunk => chunk.length > 0);
  }

  // Reprocess a document
  async reprocessDocument(kbId, docId, models) {
    try {
      const kb = this.getKnowledgeBase(kbId);
      if (!kb) throw new Error('知识库不存在');

      const doc = kb.documents.find(d => d.id === docId);
      if (!doc) throw new Error('文档不存在');

      const model = models.find(m => m.id === kb.config.model);
      if (!model) throw new Error('模型配置不存在');

      // 分割文档内容并限制数量
      const chunks = this.splitTextIntoChunks(doc.content, kb.config)
      const maxChunks = kb.config.maxChunks || this.defaultConfig.maxChunks
      const batchSize = 5
      const limitedChunks = chunks.slice(0, maxChunks)
      const embeddings = []

      // 分批处理文档块
      for (let i = 0; i < limitedChunks.length; i += batchSize) {
        const batch = limitedChunks.slice(i, i + batchSize)
        const batchPromises = batch.map(chunk => 
          this.createEmbedding(chunk, model)
            .then(embedding => ({
              text: chunk,
              embedding: embedding.data[0].embedding,
              metadata: {
                docId: doc.id,
                docName: doc.name,
                chunkIndex: embeddings.length
              }
            }))
        )

        const batchResults = await Promise.all(batchPromises)
        embeddings.push(...batchResults)
      }

      // 更新文档
      doc.chunks = embeddings;
      doc.processedAt = new Date().toISOString();

      this.saveKnowledgeBases();
      return doc;
    } catch (error) {
      return this.handleError('Failed to reprocess document', error);
    }
  }

  // Reprocess all documents in a knowledge base
  async reprocessAllDocuments(kbId, models) {
    try {
      const kb = this.getKnowledgeBase(kbId);
      if (!kb) {
        throw new Error('知识库不存在');
      }

      if (!kb.documents || kb.documents.length === 0) {
        return []; // Return empty array if no documents
      }

      const results = [];
      for (const doc of kb.documents) {
        const processedDoc = await this.reprocessDocument(kbId, doc.id, models);
        results.push(processedDoc);
      }

      return results;
    } catch (error) {
      return this.handleError('Failed to reprocess all documents', error);
    }
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Validate configuration
  validateConfig(config) {
    if (!config) throw new Error('配置不能为空');
    
    if (!config.model) throw new Error('必须选择模型');
    
    if (config.chunkSize < 100 || config.chunkSize > 2000) {
      throw new Error('分段大小必须在 100-2000 之间');
    }
    
    if (config.overlapSize < 0 || config.overlapSize >= config.chunkSize) {
      throw new Error('重叠大小必须大于等于 0 且小于分段大小');
    }
    
    if (config.similarityThreshold < 0.1 || config.similarityThreshold > 0.9) {
      throw new Error('相似度阈值必须在 0.1-0.9 之间');
    }
    
    if (config.maxChunks < 5 || config.maxChunks > 50) {
      throw new Error('最大分段数量必须在 5-50 之间');
    }
    
    if (config.maxResults < 10 || config.maxResults > 100) {
      throw new Error('最大返回结果数必须在 10-100 之间');
    }
  }
}

// 导出单例实例
export const embeddingService = new EmbeddingService();