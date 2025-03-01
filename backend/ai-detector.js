import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AIDetector {
  constructor() {
    this.initialized = true;
    this.features = {
      repetitivePatterns: 0.15,
      vocabularyDiversity: 0.2,
      sentenceStructure: 0.15,
      coherenceScore: 0.2,
      modelPrediction: 0.3
    };
    
    // AI特征词典
    this.aiPatterns = {
      phrases: [
        '值得注意的是', '需要指出的是', '不可否认', '毋庸置疑', '显而易见',
        '总的来说', '综上所述', '总而言之', '总结一下', '归根结底',
        '首先', '其次', '再次', '最后', '此外', '另外', '同时', '因此', '所以', '然而'
      ],
      transitions: [
        '换句话说', '也就是说', '简而言之', '具体来说', '从另一个角度看',
        '从这个角度来看', '从这个意义上说', '从这个层面上讲'
      ]
    };
  }

  // 计算文本重复模式
  analyzeRepetitivePatterns(text) {
    const sentences = text.split(/[.!?。！？]/);
    const phrases = new Set();
    let repetitionCount = 0;
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 10) {
        if (phrases.has(trimmed)) {
          repetitionCount++;
        } else {
          phrases.add(trimmed);
        }
      }
    });
    
    const repetitionRate = sentences.length > 0 ? repetitionCount / sentences.length : 0;
    return Math.max(0, 1 - repetitionRate * 5);
  }

  // 分析词汇多样性
  analyzeVocabularyDiversity(text) {
    const words = text.toLowerCase().match(/[\u4e00-\u9fa5a-zA-Z]+/g) || [];
    const uniqueWords = new Set(words);
    const ttr = words.length > 0 ? uniqueWords.size / words.length : 0;
    return Math.min(ttr * 2, 1);
  }

  // 分析句子结构
  analyzeSentenceStructure(text) {
    const sentences = text.split(/[.!?。！？]/);
    let lengthVariation = 0;
    let totalLength = 0;
    
    sentences.forEach(sentence => {
      const length = sentence.trim().length;
      if (length > 0) {
        totalLength += length;
      }
    });
    
    const avgLength = totalLength / sentences.length;
    
    sentences.forEach(sentence => {
      const length = sentence.trim().length;
      if (length > 0) {
        lengthVariation += Math.abs(length - avgLength);
      }
    });
    
    const variationRate = sentences.length > 0 ? lengthVariation / (avgLength * sentences.length) : 0;
    return Math.min(variationRate * 2, 1);
  }

  // 分析文本连贯性
  analyzeCoherence(text) {
    const connectors = ['但是', '然而', '因此', '所以', '因为', '虽然', '尽管', '不过', '而且', '并且', '此外', '同时', '接着', '然后', '最后'];
    let connectorCount = 0;
    
    connectors.forEach(connector => {
      const regex = new RegExp(connector, 'g');
      const matches = text.match(regex);
      if (matches) {
        connectorCount += matches.length;
      }
    });
    
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const connectorRatio = paragraphs.length > 0 ? connectorCount / paragraphs.length : 0;
    return Math.min(connectorRatio, 1);
  }

  // 简化的模型预测（使用基本规则）
  modelPrediction(text) {
    // 简单的规则：基于句子长度的变化和标点符号的使用
    const sentences = text.split(/[.!?。！？]/);
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
    const punctuationCount = (text.match(/[,.!?;:，。！？；：]/g) || []).length;
    const textLength = text.length;
    
    // 计算标点符号密度
    const punctuationDensity = punctuationCount / textLength;
    // 计算句子长度的一致性
    const lengthConsistency = sentences.reduce((sum, s) => 
      sum + Math.abs(s.trim().length - avgLength), 0) / (sentences.length * avgLength);
    
    // 返回0-1之间的分数，值越高表示越可能是AI生成
    return Math.min((punctuationDensity * 5 + lengthConsistency) / 2, 1);
  }

  // 新增：逐行分析文本
  analyzeByLine(text) {
    const lines = text.split('\n');
    const lineAnalysis = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        lineAnalysis.push({
          text: '',
          score: 0,
          isAI: false,
          confidence: 0
        });
        continue;
      }
      
      // 计算当前行的AI特征
      const aiPhraseCount = this.countAIPhrases(line);
      const sentenceStructureScore = this.analyzeSentenceStructure(line);
      const vocabularyScore = this.analyzeVocabularyDiversity(line);
      
      // 计算AI得分 (0-100)
      const aiScore = Math.min(100, Math.round(
        (aiPhraseCount * 15 + 
        (1 - sentenceStructureScore) * 40 + 
        (1 - vocabularyScore) * 45) 
      ));
      
      // 判断是否为AI生成
      const isAI = aiScore > 65;
      
      lineAnalysis.push({
        text: line,
        score: aiScore,
        isAI,
        confidence: aiScore / 100,
        features: {
          aiPhrases: aiPhraseCount,
          sentenceStructure: sentenceStructureScore,
          vocabularyDiversity: vocabularyScore
        }
      });
    }
    
    return lineAnalysis;
  }
  
  // 计算AI常用短语出现次数
  countAIPhrases(text) {
    let count = 0;
    
    // 检查AI常用短语
    this.aiPatterns.phrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'g');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    
    // 检查过渡词
    this.aiPatterns.transitions.forEach(transition => {
      const regex = new RegExp(transition, 'g');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length * 1.5; // 过渡词权重更高
      }
    });
    
    return Math.min(count / (text.length / 50), 1); // 归一化
  }

  // 综合分析
  async analyze(text) {
    if (!text || text.length < 100) {
      return {
        isAIGenerated: false,
        confidence: 0,
        message: '文本太短，无法进行有效分析',
        details: {},
        lineAnalysis: []
      };
    }
    
    // 计算各项特征分数
    const repetitiveScore = this.analyzeRepetitivePatterns(text);
    const vocabularyScore = this.analyzeVocabularyDiversity(text);
    const structureScore = this.analyzeSentenceStructure(text);
    const coherenceScore = this.analyzeCoherence(text);
    const modelScore = this.modelPrediction(text);
    
    // 计算加权总分
    const totalScore = 
      repetitiveScore * this.features.repetitivePatterns +
      vocabularyScore * this.features.vocabularyDiversity +
      structureScore * this.features.sentenceStructure +
      coherenceScore * this.features.coherenceScore +
      modelScore * this.features.modelPrediction;
    
    // 判断结果
    const isAIGenerated = totalScore > 0.65;
    
    // 逐行分析
    const lineAnalysis = this.analyzeByLine(text);
    
    // 计算AI、人工和不确定的百分比
    const aiPercentage = Math.round((1 - totalScore) * 100);
    const humanPercentage = Math.round(totalScore * 70); // 人工占比
    const uncertainPercentage = 100 - aiPercentage - humanPercentage; // 不确定占比
    
    return {
      isAIGenerated,
      confidence: totalScore,
      message: isAIGenerated 
        ? `检测结果：AI生成概率高 (${Math.round((1-totalScore) * 100)}%)` 
        : `检测结果：人工创作概率高 (${Math.round(totalScore * 100)}%)`,
      details: {
        repetitivePatterns: repetitiveScore,
        vocabularyDiversity: vocabularyScore,
        sentenceStructure: structureScore,
        coherence: coherenceScore,
        modelPrediction: modelScore
      },
      lineAnalysis,
      ai: aiPercentage,
      human: humanPercentage,
      uncertain: uncertainPercentage
    };
  }
}

// 如果需要默认实例，可以额外导出
export const aiDetector = new AIDetector();
export default AIDetector;