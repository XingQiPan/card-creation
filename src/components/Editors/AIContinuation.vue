<template>
  <div class="ai-continuation-panel">
    <div class="ai-continuation-content">
      <!-- AI模型选择 -->
      <div class="panel-section">
        <div class="section-header">AI 模型</div>
        <select v-model="aiSettings.model" class="model-selector">
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
      
      <!-- 会话连续性 -->
      <div class="panel-section">
        <div class="section-header-row">
          <div class="tooltip-container">
            <span class="continuity-label">启用会话连续性</span>
            <span class="tooltip-text">开启后AI将记住上下文，重新生成时可填入自定义要求，但字数会明请谨慎开启,对话模式默认关联上下文！</span>
          </div>
          <div class="toggle-switch">
            <input type="checkbox" v-model="aiSettings.continuity" id="continuation-continuity">
            <label for="continuation-continuity"></label>
          </div>
        </div>
        <div class="section-info">开启</div>
      </div>
      
      <!-- 关联大纲信息 -->
      <div class="panel-section">
        <div class="section-header-row">
          <span>关联大纲信息</span>
          <div class="toggle-switch">
            <input type="checkbox" v-model="aiSettings.useOutline" id="outline-toggle">
            <label for="outline-toggle"></label>
          </div>
        </div>
        <div class="section-info">开启</div>
      </div>
      
      <!-- 提示词模式 -->
      <div class="panel-section">
        <div class="section-header">提示词模式</div>
        <div class="tab-buttons">
          <button 
            :class="['tab-btn', aiSettings.promptMode === 'template' ? 'active' : '']" 
            @click="aiSettings.promptMode = 'template'">提示词模板</button>
          <button 
            :class="['tab-btn', aiSettings.promptMode === 'custom' ? 'active' : '']" 
            @click="aiSettings.promptMode = 'custom'">自定义提示词</button>
        </div>
      </div>
      
      <!-- 提示词模板 -->
      <div v-if="aiSettings.promptMode === 'template'" class="panel-section">
        <div class="template-selector">
          <div class="prompt-selection">
            <div class="selected-prompt" v-if="aiSettings.selectedPrompt">
              <div class="prompt-title">{{ aiSettings.selectedPrompt }}</div>
              <button class="change-prompt-btn" @click="showPromptSelection">更换</button>
            </div>
            <button v-else class="prompt-select-btn" @click="showPromptSelection">点击选择提示词</button>
          </div>
        </div>
      </div>
      
      <!-- 自定义提示词 -->
      <div v-if="aiSettings.promptMode === 'custom'" class="panel-section">
        <textarea class="custom-prompt" placeholder="请输入自定义提示词..." v-model="aiSettings.customPrompt"></textarea>
      </div>
      
      <!-- 当前主线 -->
      <div class="panel-section">
        <div class="section-header">当前主线 (可选) <span class="highlight-text">请简要描述当前剧情主线，用于AI更好地理解剧情，不要超过100字！</span></div>
        <textarea class="idea-input" placeholder="请简要描述当前主线剧情..." v-model="aiSettings.mainPlot"></textarea>
      </div>
      
      <!-- 续写剧情 -->
      <div class="panel-section">
        <div class="section-header">续写剧情 <span class="highlight-text">*一次5~10个剧情点效果最佳，不要太多也不要太少，否则AI容易自由发挥！</span></div>
        <textarea class="idea-input" placeholder="请简要描述接下来要续写的剧情发展..." v-model="aiSettings.continuationPlot"></textarea>
      </div>
      
      <!-- 关联章节 -->
      <div class="panel-section">
        <div class="section-header">关联章节</div>
        <div class="link-buttons">
          <button class="link-btn" :class="{ 'active': aiSettings.linkedChapters?.length > 0 }" @click="showChapterSelection">
            {{ aiSettings.linkedChapters?.length > 0 ? `已选择 ${aiSettings.linkedChapters.length} 章` : '选择章节' }}
          </button>
        </div>
      </div>
      
      <!-- 相关角色 -->
      <div class="panel-section">
        <div class="section-header">相关角色</div>
        <div class="link-buttons">
          <button class="link-btn" :class="{ 'active': aiSettings.linkedCharacters?.length > 0 }" @click="showCharacterSelection">
            <span v-if="aiSettings.linkedCharacters?.length > 0">
              已选择 {{ aiSettings.linkedCharacters.length }} 个角色
              <span v-if="aiSettings.selectedCardsInfo" class="selected-cards-preview">
                ({{ aiSettings.selectedCardsInfo }})
              </span>
            </span>
            <span v-else>选择角色</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="dialog-btn" @click="startDialog">开始对话</button>
      <button class="generate-btn" @click="startGenerate">开始生成</button>
    </div>
    
    <!-- 提示词选择弹窗 -->
    <PromptSelectionDialog
      :visible="promptSelectionVisible"
      :categories="categories"
      :prompts="prompts"
      :defaultCategory="'续写'"
      @close="promptSelectionVisible = false"
      @select="handlePromptSelect"
    />
    
    <!-- 章节选择弹窗 -->
    <ChapterSelectionDialog
      :visible="chapterSelectionVisible"
      :chapters="availableChapters"
      :selectedChapters="aiSettings.linkedChapters"
      :selectedOutlines="aiSettings.linkedOutlines"
      @close="chapterSelectionVisible = false"
      @confirm="handleChapterSelection"
    />
    
    <!-- 角色选择弹窗 -->
    <CharacterSelectionDialog
      :visible="characterSelectionVisible"
      :characters="availableCharacters"
      :scenes="availableScenes"
      :selectedCharacters="aiSettings.linkedCharacters"
      @close="characterSelectionVisible = false"
      @confirm="handleCharacterSelection"
    />
  </div>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue';
import PromptSelectionDialog from '../Prompt/PromptSelectionDialog.vue';
import ChapterSelectionDialog from '../Prompt/ChapterSelectionDialog.vue';
import CharacterSelectionDialog from '../Prompt/CharacterSelectionDialog.vue';

const props = defineProps({
  availableModels: {
    type: Array,
    required: true
  },
  aiSettings: {
    type: Object,
    required: true
  },
  panelState: {
    type: Object,
    required: false,
    default: () => ({
      content: '',
      prompt: '',
      useOutline: true
    })
  },
  categories: {
    type: Array,
    required: false,
    default: () => ['扩写', '润色', '续写', '改写', '大纲相关']
  },
  prompts: {
    type: Array,
    required: false,
    default: () => []
  },
  chapters: {
    type: Array,
    required: false,
    default: () => []
  }
});

// 使用传入的 panelState 初始化数据
const aiSettings = reactive({
  ...props.aiSettings,
  continuationPlot: props.panelState.content || '',
  customPrompt: props.panelState.prompt || '',
  useOutline: props.panelState.useOutline
});

// 提示词选择弹窗状态
const promptSelectionVisible = ref(false);

// 章节选择相关的状态和方法
const chapterSelectionVisible = ref(false);
const availableChapters = ref([]);

// 角色选择相关的状态和方法
const characterSelectionVisible = ref(false);
const availableCharacters = ref([]);
const availableScenes = ref([]);

// 方法
const showPromptSelection = () => {
  promptSelectionVisible.value = true;
}

const handlePromptSelect = (prompt) => {
  aiSettings.selectedPrompt = prompt.title;
  aiSettings.selectedPromptId = prompt.id;
  aiSettings.selectedPromptContent = prompt.systemPrompt;
  promptSelectionVisible.value = false;
}

const startDialog = () => {
  console.log('开始对话');
  // 这里可以添加开始对话的逻辑
}

const startGenerate = () => {
  console.log('开始生成续写内容');
  // 这里可以添加开始生成的逻辑
}

// 显示章节选择弹窗
const showChapterSelection = () => {
  // 从父组件获取章节数据
  availableChapters.value = props.chapters || [];
  chapterSelectionVisible.value = true;
};

// 处理章节选择
const handleChapterSelection = (selection) => {
  aiSettings.linkedChapters = selection.chapters;
  aiSettings.linkedOutlines = selection.outlines;
  
  // 更新章节信息显示
  const selectedChapters = availableChapters.value
    .filter(chapter => selection.chapters.includes(chapter.id))
    .map(chapter => chapter.title);
  
  aiSettings.selectedChaptersInfo = selectedChapters.join('、');
};

// 显示角色选择弹窗
const showCharacterSelection = () => {
  // 从localStorage加载角色和场景数据
  try {
    const savedCharacters = localStorage.getItem('character-card-characters');
    const savedScenes = localStorage.getItem('character-card-scenes');
    
    if (savedCharacters) {
      availableCharacters.value = JSON.parse(savedCharacters);
    }
    
    if (savedScenes) {
      availableScenes.value = JSON.parse(savedScenes);
    }
  } catch (error) {
    console.error('加载角色数据出错:', error);
  }
  
  characterSelectionVisible.value = true;
};

// 处理角色选择
const handleCharacterSelection = (selectedIds) => {
  aiSettings.linkedCharacters = selectedIds;
  
  // 更新角色信息显示
  const selectedCharacters = availableCharacters.value
    .filter(character => selectedIds.includes(character.id))
    .map(character => character.name);
  
  aiSettings.selectedCardsInfo = selectedCharacters.join('、');
};

// 监听数据变化，更新父组件状态
const emit = defineEmits(['close', 'update:state']);

// 监视数据变化
watch(() => [aiSettings.continuationPlot, aiSettings.customPrompt, aiSettings.useOutline], () => {
  emit('update:state', {
    content: aiSettings.continuationPlot,
    prompt: aiSettings.customPrompt,
    useOutline: aiSettings.useOutline
  });
}, { deep: true });
</script>

<style scoped>
.ai-continuation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-continuation-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.panel-section {
  margin-bottom: 20px;
}

.section-header {
  font-weight: bold;
  margin-bottom: 8px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-info {
  color: #4caf50;
  font-size: 0.85em;
  margin-top: 4px;
}

.highlight-text {
  color: #ff5722;
  font-size: 0.85em;
  font-weight: normal;
}

.idea-input, .custom-prompt {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.tab-buttons {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
}

.tab-btn.active {
  color: #ffffff;
  font-weight: bold;
}

.tab-btn.active:after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #ffffff;
}

.template-selector {
  margin-bottom: 16px;
}

.prompt-selection {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-prompt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex: 1;
}

.prompt-title {
  font-weight: bold;
}

.change-prompt-btn, .prompt-select-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
}

.link-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.link-btn {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  width: 100%;
}

.link-btn.active {
  background-color: #4caf50;
  color: white;
  border-color: #388e3c;
}

.panel-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f8f8;
}

.close-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #2196f3;
  background-color: #2196f3;
  color: white;
  cursor: pointer;
}

.generate-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #388e3c;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
}

.dialog-btn:hover {
  background-color: #0b7dda;
}

.generate-btn:hover {
  background-color: #388e3c;
}

.model-selector {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.tooltip-container {
  position: relative;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: #4caf50;
}

.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.selected-cards-preview {
  font-size: 0.85em;
  color: #e0e0e0;
}
</style> 