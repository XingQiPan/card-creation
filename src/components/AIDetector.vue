<template>
  <div class="ai-detector-container">
    <div class="detector-layout">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <div class="detector-header">
          <h2>AI检测</h2>
        </div>

        <div class="input-section">
          <div class="text-input-area">
            <textarea
              v-model="textContent"
              placeholder="请输入要检测的文本内容..."
              @input="handleInput"
            ></textarea>
          </div>
          
          <div class="action-buttons">
            <button 
              class="detect-button"
              @click="detectAI"
              :disabled="!textContent || isLoading"
            >
              {{ isLoading ? '检测中...' : '重新检测' }}
            </button>
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
          <!-- 总体分析结果 -->
          <div class="overall-result">
            <h3>当前选中文本原创值 {{ result.human }}%</h3>
            <div class="donut-chart-container">
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
                  
                  <!-- AI占比 -->
                  <circle
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
                  
                  <!-- 人工占比 -->
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#52c41a"
                    stroke-width="10"
                    :stroke-dasharray="`${result.human * 2.51} ${251 - result.human * 2.51}`"
                    :stroke-dashoffset="`${result.ai * 2.51 + 62.75}`"
                    transform="rotate(-90 50 50)"
                  />
                  
                  <!-- 不确定占比 -->
                  <circle
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
            </div>
          </div>

          <!-- 逐行分析结果 -->
          <div class="line-analysis">
            <div 
              v-for="(line, index) in result.lineAnalysis" 
              :key="index"
              class="line-item"
              :class="{ 'is-ai': line.isAI }"
            >
              <div class="line-text">{{ line.text }}</div>
              <div class="line-score">
                <div class="score-bar">
                  <div 
                    class="score-fill"
                    :style="{ width: `${line.score}%` }"
                    :class="{ 'high-score': line.score > 65 }"
                  ></div>
                </div>
                <span class="score-value">{{ line.score }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-result">
          <p>请在左侧输入文本进行检测</p>
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
      textContent: '',
      isLoading: false,
      result: null,
      apiBaseUrl: 'http://localhost:3000'
    }
  },
  methods: {
    handleInput() {
      // 可以在这里添加防抖处理
      this.result = null;
    },
    
    async detectAI() {
      if (this.isLoading || !this.textContent) return;
      
      try {
        this.isLoading = true;
        this.result = null;
        
        const response = await fetch(`${this.apiBaseUrl}/api/detect-ai-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: this.textContent })
        });
        
        if (!response.ok) {
          throw new Error('检测请求失败');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || '检测失败');
        }
        
        this.result = data.data;
        
      } catch (error) {
        console.error('AI检测失败:', error);
        alert('检测失败: ' + error.message);
      } finally {
        this.isLoading = false;
      }
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

.line-analysis {
  margin-top: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.line-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line-item.is-ai {
  background-color: #fff1f0;
}

.line-text {
  font-size: 14px;
  color: #333;
}

.line-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-bar {
  flex: 1;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background-color: #52c41a;
  transition: width 0.3s ease;
}

.score-fill.high-score {
  background-color: #ff4d4f;
}

.score-value {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.overall-result {
  text-align: center;
  margin-bottom: 20px;
}

.overall-result h3 {
  margin-bottom: 16px;
  color: #333;
}

.donut-chart-container {
  width: 200px;
  margin: 0 auto;
}
</style>