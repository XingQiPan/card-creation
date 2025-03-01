<template>
  <div class="ai-detector-container">
    <div class="detector-layout">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <div class="detector-header">
          <h2>AI 小说检测工具</h2>
          <p class="description">
            上传小说文本或粘贴内容，检测是否由 AI 生成。本工具通过分析文本特征和使用机器学习模型来判断内容的来源。
          </p>
          <p>
            <strong>模型介绍：</strong>
            RoBERTa 大型 OpenAI 检测器是 GPT-2 输出检测器模型，通过使用 1.5B 参数 GPT-2 模型的输出对 RoBERTa 大型模型进行微调而获得。该模型可用于预测文本是否由 GPT-2 模型生成。  
          </p>
          <p>目前没有找到更好的模型了，等有更好的模型会进行切换，效果和朱雀相差较大</p>
          <p>朱雀的模型地址：<a href="https://matrix.tencent.com/ai-detect/ai_gen_txt?utm_source=ai-bot.cn" target="_blank">https://matrix.tencent.com/ai-detect/ai_gen_txt?utm_source=ai-bot.cn</a></p>
        </div>

        <div class="input-section">
          <div class="tab-group">
            <button 
              :class="['tab-button', { active: activeTab === 'text' }]"
              @click="activeTab = 'text'"
            >
              文本输入
            </button>
            <button 
              :class="['tab-button', { active: activeTab === 'file' }]"
              @click="activeTab = 'file'"
            >
              文件上传
            </button>
          </div>
          
          <div v-if="activeTab === 'text'" class="text-input-area">
            <textarea
              v-model="textContent"
              placeholder="请输入要检测的文本内容..."
              @input="result = null"
            ></textarea>
            <button 
              class="detect-button"
              @click="detectAI"
              :disabled="!textContent || isLoading"
            >
              {{ isLoading ? '检测中...' : '开始检测' }}
            </button>
          </div>
          
          <div
            v-else
            class="file-upload-area"
            :class="{ dragging: isDragging }"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
          >
            <input
              type="file"
              @change="handleFileChange"
              accept=".txt,.doc,.docx,.pdf"
              style="display: none"
              ref="fileInput"
            >
            <div class="upload-content">
              <i class="upload-icon">📁</i>
              <p>拖放文件到此处或点击上传</p>
              <button @click="$refs.fileInput.click()">选择文件</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <div v-if="isLoading" class="loading-section">
          <div class="spinner"></div>
          <p>正在分析文本，请稍候...</p>
        </div>
        
        <div v-else-if="result" class="result-section">
          <div class="result-header">
            <div class="status-banner" :class="{ 'is-ai': result.ai > 50 }">
              <i class="status-icon">✓</i>
              {{ result.ai > 50 ? '可能是AI生成' : '不太可能是AI生成' }}
            </div>
          </div>

          <div class="result-content">
            <div class="percentage-text">
              疑似AI生成内容占比：{{ result.ai }}%
            </div>
            
            <div class="donut-chart">
              <svg viewBox="0 0 100 100">
                <!-- 背景圆环 -->
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#eee"
                  stroke-width="10"
                />
                
                <!-- AI占比（红色） -->
                <circle
                  v-if="result.ai > 0"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ff4d4f"
                  stroke-width="10"
                  :stroke-dasharray="`${result.ai * 2.51} ${251 - result.ai * 2.51}`"
                  stroke-dashoffset="62.75"
                  transform="rotate(-90 50 50)"
                />
                
                <!-- 人工占比（绿色） -->
                <circle
                  v-if="result.human > 0"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#52c41a"
                  stroke-width="10"
                  :stroke-dasharray="`${result.human * 2.51} ${251 - result.human * 2.51}`"
                  stroke-dashoffset="-${result.ai * 2.51 + 62.75}"
                  transform="rotate(-90 50 50)"
                />
                
                <!-- 不确定占比（黄色） -->
                <circle
                  v-if="result.uncertain > 0"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#faad14"
                  stroke-width="10"
                  :stroke-dasharray="`${result.uncertain * 2.51} ${251 - result.uncertain * 2.51}`"
                  :stroke-dashoffset="`${(result.ai + result.human) * 2.51 + 62.75}`"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>

            <div class="chart-legend">
              <div class="legend-item">
                <span class="color-dot human"></span>
                <span>人工</span>
              </div>
              <div class="legend-item">
                <span class="color-dot ai"></span>
                <span>AI</span>
              </div>
              <div class="legend-item">
                <span class="color-dot uncertain"></span>
                <span>疑似AI</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-result">
          <p>请在左侧输入或上传文本进行检测</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AIDetector',
  data() {
    return {
      activeTab: 'text',
      textContent: '',
      selectedFile: null,
      isDragging: false,
      isLoading: false,
      result: null,
      apiBaseUrl: 'http://localhost:3000'
    }
  },
  methods: {
    async detectAI() {
      if (this.isLoading) return
      
      try {
        this.isLoading = true
        this.result = null
        
        let response
        if (this.activeTab === 'text') {
          response = await fetch(`${this.apiBaseUrl}/api/detect-ai-text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: this.textContent })
          })
        } else {
          const formData = new FormData()
          formData.append('file', this.selectedFile)
          
          response = await fetch(`${this.apiBaseUrl}/api/detect-ai-file`, {
            method: 'POST',
            body: formData
          })
        }
        
        if (!response.ok) {
          throw new Error('检测请求失败')
        }
        
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || '检测失败')
        }
        
        this.result = data.data
        
      } catch (error) {
        console.error('AI检测失败:', error)
        alert('检测失败: ' + error.message)
      } finally {
        this.isLoading = false
      }
    },
    
    handleFileChange(event) {
      const file = event.target.files[0]
      if (file) {
        this.selectedFile = file
        this.detectAI()
      }
    },
    
    handleDrop(event) {
      event.preventDefault()
      this.isDragging = false
      
      const file = event.dataTransfer.files[0]
      if (file) {
        this.selectedFile = file
        this.detectAI()
      }
    },
    
    handleDragOver(event) {
      event.preventDefault()
      this.isDragging = true
    },
    
    handleDragLeave(event) {
      event.preventDefault()
      this.isDragging = false
    }
  }
}
</script>

<style scoped>
.ai-detector-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px;
}

.detector-layout {
  display: flex;
  gap: 30px;
  min-height: 600px;
}

.left-panel {
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.right-panel {
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.text-input-area textarea {
  margin: 10px;
  width: 90%;
  height: 190px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.detect-button {
  width: 100%;
  padding: 12px;
  margin-top: 15px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.detect-button:disabled {
  background: #ccc;
}

.result-header {
  text-align: center;
  margin-bottom: 30px;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 10px;
  display: block;
}

.percentage-bar {
  margin: 20px 0;
}

.bar-container {
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  margin-top: 10px;
}

.bar {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.bar-container .percentage {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.score-details {
  margin-top: 30px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.empty-result {
  color: #666;
  text-align: center;
}

.loading-section {
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 添加新的样式 */
.status-banner {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 8px 16px;
  border-radius: 4px;
  color: #52c41a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-banner.is-ai {
  background: #fff2f0;
  border-color: #ffccc7;
  color: #ff4d4f;
}

.status-icon {
  font-size: 18px;
}

.donut-chart {
  width: 200px;
  height: 200px;
  margin: 20px auto;
}

.percentage-text {
  text-align: center;
  font-size: 18px;
  margin-bottom: 20px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.color-dot.human {
  background-color: #52c41a;
}

.color-dot.ai {
  background-color: #ff4d4f;
}

.color-dot.uncertain {
  background-color: #faad14;
}

/* 更新现有样式 */
.result-section {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.result-header {
  margin-bottom: 30px;
}

.result-content {
  text-align: center;
}
</style>