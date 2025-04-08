<template>
  <div class="editor-container" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 顶部导航栏 -->
    <div class="editor-header">
      <div class="header-left">
        <button class="icon-btn" @click="toggleSidebar" title="显示/隐藏侧边栏">
          <i class="fas fa-bars"></i>
        </button>
        <button class="tool-btn" @click="fontSettings.showModal = true" title="字体">
          <i class="fas fa-font"></i> 字体
        </button>
        <button class="tool-btn" @click="backgroundSettings.showModal = true" title="背景">
          <i class="fas fa-palette"></i> 背景
        </button>
        <button class="icon-btn" @click="undo" title="撤销 (Ctrl+Z)">
          <i class="fas fa-undo"></i>
        </button>
        <button class="icon-btn" @click="redo" title="重做 (Ctrl+Shift+Z 或 Ctrl+Y)">
          <i class="fas fa-redo"></i>
        </button>
        <button class="tool-btn" @click="formatContent" title="一键排版 (首行缩进2空格)">
          <i class="fas fa-align-left"></i> 排版
        </button>
      </div>
      <div class="header-right">
        <button :disabled="isLoading" @click="saveCurrentChapter">
          <i class="fas" :class="isLoading ? 'fa-spinner fa-spin' : 'fa-save'"></i>
          {{ isLoading ? '保存中...' : '保存' }}
        </button>
        <button class="icon-btn" @click="toggleFullscreen" title="全屏">
          <i class="fas fa-expand"></i>
        </button>
        <button class="icon-btn" title="查找" @click="searchState.showModal = true">
          <i class="fas fa-search"></i>
        </button>
      </div>
    </div>

    <div class="function-buttons-container">
      <div class="function-buttons-wrapper">
        <button class="function-btn" @click="openPanel('opening')">
          <i class="fas fa-pen"></i> AI开篇
        </button>
        <button class="function-btn" @click="openPanel('writing')">
          <i class="fas fa-edit"></i> AI写作
        </button>
        <button class="function-btn" @click="openPanel('continuation')">
          <i class="fas fa-indent"></i> 续写
        </button>
        <button class="function-btn" @click="openPanel('editing')">
          <i class="fas fa-tools"></i> AI编辑
        </button>
        <button class="function-btn" @click="openPanel('character')">
          <i class="fas fa-id-card"></i> 人物卡
        </button>
        <button class="function-btn" @click="openPanel('entry')">
          <i class="fas fa-tags"></i> 词条卡
        </button>
      </div>
    </div>

    <!-- 主体内容区 -->
    <div class="editor-body">
      <!-- 左侧章节列表 -->
      <div class="chapter-sidebar" :class="{ 'collapsed': !showSidebar }">
        <div class="sidebar-tabs">
          <div class="tab" :class="{ 'active': sidebarTab === 'directory' }" @click="switchSidebarTab('directory')">目录</div>
          <div class="tab" :class="{ 'active': sidebarTab === 'outline' }" @click="switchSidebarTab('outline')">大纲</div>
          <div class="tab-indicator" :style="{ transform: sidebarTab === 'outline' ? 'translateX(100%)' : 'translateX(0)' }"></div>
        </div>
        
        <div class="sidebar-content">
          <!-- 目录内容 - 章节列表 -->
          <div class="sidebar-tab-content" :class="{ 'active': sidebarTab === 'directory' }">
            <div class="chapter-header">
              <span>目录 (章节右键菜单)</span>
              <button class="add-chapter-btn" @click="createNewChapter">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            
            <div 
              v-for="chapter in chapters" 
              :key="chapter.id"
              :class="['chapter-item', { 'active': chapter.id === currentChapterId }]"
              @click="openChapter(chapter.id)"
              @contextmenu.prevent="showContextMenu($event, chapter)"
            >
              <div class="chapter-info">
                <span class="chapter-name">{{ chapter.title }}</span>
                <div class="chapter-actions">
                  <button class="edit-btn" title="编辑标题" @click.stop="renameChapter(chapter)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="expand-btn" title="展开/收起" @click.stop="toggleChapterOutline(chapter.id)">
                    <i class="fas fa-chevron-down"></i>
                  </button>
                </div>
              </div>
              
              <div class="chapter-content" v-if="expandedChapters.includes(chapter.id)">
                <div class="chapter-title">章纲</div>
                
                <div class="chapter-outline-editor">
                  <div class="outline-actions">
                    <button class="ai-generate-btn" @click.stop="openAIOutlineGenerator(chapter)">
                      <i class="fas fa-robot"></i> 提取本章章纲
                    </button>
                  </div>
                  <textarea placeholder="在这里写下本章的章纲..." v-model="chapter.outline"></textarea>
                </div>
                
                <div class="chapter-footer">
                  <span class="outline-word-count">{{ calculateOutlineWordCount(chapter.outline) }} 字</span>
                  <button class="save-chapter-outline" @click="saveChapterOutline(chapter)">保存大纲</button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 大纲内容 -->
          <div class="sidebar-tab-content" :class="{ 'active': sidebarTab === 'outline' }">
            <!-- 大纲卡片区域 -->
            <div class="outline-card">
              <div class="card-header">
                <span>等级设定</span>
                <div class="card-actions">
                  <button class="expand-btn" title="展开/收起" @click="toggleOutlineCard('levelSetting')">
                    <i :class="['fas', expandedOutlineCards.includes('levelSetting') ? 'fa-compress-alt' : 'fa-expand-alt']"></i>
                  </button>
                  <button class="edit-btn" title="放大编辑" @click="openOutlineEditor('levelSetting')">
                    <i class="fas fa-external-link-alt"></i>
                  </button>
                </div>
              </div>
              <div class="card-content" v-show="expandedOutlineCards.includes('levelSetting')">
                <textarea v-model="outlineSettings.levelSetting" placeholder="描述小说的等级体系..."></textarea>
              </div>
            </div>
            
            <!-- 大纲卡片区域 -->
            <div class="outline-card">
              <div class="card-header">
                <span>世界观设定</span>
                <div class="card-actions">
                  <button class="expand-btn" title="展开/收起" @click="toggleOutlineCard('worldSetting')">
                    <i :class="['fas', expandedOutlineCards.includes('worldSetting') ? 'fa-compress-alt' : 'fa-expand-alt']"></i>
                  </button>
                  <button class="edit-btn" title="放大编辑" @click="openOutlineEditor('worldSetting')">
                    <i class="fas fa-external-link-alt"></i>
                  </button>
                </div>
              </div>
              <div class="card-content" v-show="expandedOutlineCards.includes('worldSetting')">
                <textarea v-model="outlineSettings.worldSetting" placeholder="描述小说的世界观设定..."></textarea>
              </div>
            </div>
            
            <!-- 大纲卡片区域 -->
            <div class="outline-card">
              <div class="card-header">
                <span>金手指设定</span>
                <div class="card-actions">
                  <button class="expand-btn" title="展开/收起" @click="toggleOutlineCard('abilitySetting')">
                    <i :class="['fas', expandedOutlineCards.includes('abilitySetting') ? 'fa-compress-alt' : 'fa-expand-alt']"></i>
                  </button>
                  <button class="edit-btn" title="放大编辑" @click="openOutlineEditor('abilitySetting')">
                    <i class="fas fa-external-link-alt"></i>
                  </button>
                </div>
              </div>
              <div class="card-content" v-show="expandedOutlineCards.includes('abilitySetting')">
                <textarea v-model="outlineSettings.abilitySetting" placeholder="描述小说的金手指设定..."></textarea>
              </div>
            </div>
            
            <!-- 大纲卡片区域 -->
            <div class="outline-card">
              <div class="card-header">
                <span>支线剧情</span>
                <div class="card-actions">
                  <button class="expand-btn" title="展开/收起" @click="toggleOutlineCard('sideStory')">
                    <i :class="['fas', expandedOutlineCards.includes('sideStory') ? 'fa-compress-alt' : 'fa-expand-alt']"></i>
                  </button>
                  <button class="edit-btn" title="放大编辑" @click="openOutlineEditor('sideStory')">
                    <i class="fas fa-external-link-alt"></i>
                  </button>
                </div>
              </div>
              <div class="card-content" v-show="expandedOutlineCards.includes('sideStory')">
                <textarea v-model="outlineSettings.sideStory" placeholder="描述小说的支线剧情..."></textarea>
              </div>
            </div>
            
            <!-- 底部字数统计和保存按钮 -->
            <div class="outline-footer">
              <span class="word-count">0 字</span>
              <button class="save-outline-btn">保存大纲</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央编辑器区域 -->
      <div class="editor-content" :class="{ 'full-width': !showAiPanel }">
        <!-- 章节标题编辑区 -->
        <div class="chapter-title-container">
          <input 
            v-model="currentChapter.title" 
            class="chapter-title-input" 
            @input="titleChanged = true"
            placeholder="请输入章节标题" 
          />
          <div class="word-count-display">
            {{ wordCount }} 字
          </div>
        </div>
        
        <textarea 
          ref="editorContent"
          v-model="currentChapter.content" 
          class="content-editor" 
          @input="onContentUpdate"
          @keydown.tab.prevent="insertTab"
          @mouseup="onSelectionChange"
          @keyup="onSelectionChange"
          placeholder="在这里写下章节内容..."
        ></textarea>
        
        <!-- 文本选择悬浮菜单 -->
        <div 
          v-if="selectionMenu.show" 
          ref="selectionMenuRef"
          class="selection-menu" 
          :style="{ top: `${selectionMenu.y}px`, left: `${selectionMenu.x}px` }"
          :data-direction="selectionMenu.y < 60 ? 'up' : 'down'"
        >
          <button class="menu-item" @click="handleSelectionAction('润色')" title="润色">
            <i class="fas fa-paint-brush"></i> 润色
          </button>
          <button class="menu-item" @click="handleSelectionAction('扩写')" title="扩写">
            <i class="fas fa-expand"></i> 扩写
          </button>
          <button class="menu-item" @click="handleSelectionAction('改写')" title="改写">
            <i class="fas fa-sync-alt"></i> 改写
          </button>
          <button class="menu-item" @click="handleSelectionAction('同义词')" title="同义词/句替换">
            <i class="fas fa-exchange-alt"></i> 同义词
          </button>
        </div>
      </div>
      
      <!-- 章节右键菜单 -->
      <div v-if="contextMenu.show" 
           class="context-menu" 
           :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">
        <div class="context-menu-item" @click="renameChapter">
          <i class="fas fa-edit"></i> 重命名
        </div>
        <div class="context-menu-item" @click="moveChapterUp">
          <i class="fas fa-arrow-up"></i> 上移
        </div>
        <div class="context-menu-item" @click="moveChapterDown">
          <i class="fas fa-arrow-down"></i> 下移
        </div>
        <div class="context-menu-item delete" @click="deleteChapter">
          <i class="fas fa-trash"></i> 删除
        </div>
      </div>

      <!-- 右侧功能面板 -->
      <div class="ai-panel-wrapper" :class="{ 'collapsed': !showAiPanel }">
        <!-- 面板头部 -->
        <div class="panel-header">
          <h3>{{ currentPanelTitle }}</h3>
          <div class="panel-controls">
            <button class="icon-btn close-panel-btn" @click="closeAiPanel" title="关闭面板">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <!-- AI写作面板 -->
        <AIWrit 
          v-if="currentPanel === 'writing'" 
          :availableModels="availableModels" 
          :aiSettings="aiSettings" 
          :panelState="aiPanelStates.writing"
          :categories="categories"
          :prompts="prompts"
          @update:state="updatePanelState('writing', $event)"
          @close="closeAiPanel" 
        />
        
        <!-- AI续写面板 -->
        <AIContinuation 
          v-if="currentPanel === 'continuation'" 
          :availableModels="availableModels" 
          :aiSettings="aiSettings" 
          :panelState="aiPanelStates.continuation"
          :categories="categories"
          :prompts="prompts"
          :chapters="chapters"
          @update:state="updatePanelState('continuation', $event)"
          @close="closeAiPanel" 
        />
        
        <!-- AI编辑面板 -->
        <AIEdit 
          v-if="currentPanel === 'editing'" 
          :availableModels="availableModels" 
          :aiSettings="aiSettings" 
          :panelState="aiPanelStates.editing"
          @update:state="updatePanelState('editing', $event)"
          @close="closeAiPanel" 
        />
        
        <!-- 黄金开篇面板 -->
        <AIOpen 
          v-if="currentPanel === 'opening'" 
          :availableModels="availableModels" 
          :aiSettings="aiSettings"
          :categories="categories"
          :prompts="prompts"
          :panelState="aiPanelStates.opening"
          @update:state="updatePanelState('opening', $event)"
          @close="closeAiPanel" 
        />

        <!-- 人物卡面板 -->
        <CharacterCardPanel 
          v-if="currentPanel === 'character'" 
          :appScenes="appScenes"
          :currentAppScene="currentAppScene"
          @close="closeCharacterCardPanel"
          @editEntry="handleEditEntry"
          @updateCharacter="handleCharacterUpdate"
          @character-scene-changed="handleCharacterSceneChanged"
        />
        
        <!-- 词条卡面板 -->
        <EntryCardPanel 
          v-if="currentPanel === 'entry'" 
          ref="entryCardPanelRef"
          @close="closeEntryCardPanel" 
        />
      </div>
    </div>
  </div>

  <div v-if="fontSettings.showModal" class="settings-modal">
    <div class="modal-content">
      <h3>字体设置</h3>
      <div class="setting-group">
        <label>字体:</label>
        <select v-model="fontSettings.family">
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="SimSun">宋体</option>
          <option value="Microsoft YaHei">微软雅黑</option>
        </select>
      </div>
      <div class="setting-group">
        <label>大小:</label>
        <input type="range" v-model="fontSettings.size" min="12" max="36" step="1">
        <span>{{ fontSettings.size }}px</span>
      </div>
      <div class="setting-group">
        <label>颜色:</label>
        <input type="color" v-model="fontSettings.color">
      </div>
      <div class="modal-actions">
        <button @click="applyFontSettings">应用</button>
        <button @click="fontSettings.showModal = false">取消</button>
      </div>
    </div>
  </div>

  <!-- 背景颜色 -->
  <div v-if="backgroundSettings.showModal" class="settings-modal">
    <div class="modal-content">
      <h3>背景设置</h3>
      <div class="setting-group">
        <label>类型:</label>
        <select v-model="backgroundSettings.type">
          <option value="color">纯色</option>
          <option value="image">图片</option>
        </select>
      </div>
      
      <div v-if="backgroundSettings.type === 'color'" class="setting-group">
        <label>颜色:</label>
        <input type="color" v-model="backgroundSettings.color">
      </div>
      
      <div v-else class="setting-group">
        <label>图片:</label>
        <input type="file" accept="image/*" @change="handleImageUpload">
        <div v-if="backgroundSettings.imageUrl" class="image-preview">
          <img :src="backgroundSettings.imageUrl" alt="背景预览">
        </div>
        <div class="setting-group">
          <label>透明度: {{ backgroundSettings.opacity }}</label>
          <input 
            type="range" 
            v-model="backgroundSettings.opacity" 
            min="0" 
            max="1" 
            step="0.1"
          >
        </div>
      </div>
      
      <div class="modal-actions">
        <button @click="applyBackgroundSettings">应用</button>
        <button @click="backgroundSettings.showModal = false">取消</button>
      </div>
    </div>
  </div>

  <!-- 查找替换模态框 -->
  <div v-if="searchState.showModal" class="search-modal">
    <div class="modal-content">
      <h3>查找替换</h3>
      <div class="search-group">
        <input v-model="searchState.searchText" placeholder="查找内容">
        <input v-model="searchState.replaceText" placeholder="替换为">
      </div>
      <div class="search-options">
        <label>
          <input type="checkbox" v-model="searchState.caseSensitive"> 区分大小写
        </label>
      </div>
      <div class="modal-actions">
        <button @click="findText">查找</button>
        <button @click="replaceText">替换</button>
        <button @click="searchState.showModal = false">关闭</button>
      </div>
    </div>
  </div>

  <!-- 大纲编辑弹窗 -->
  <div v-if="outlineEditorModal.show" class="modal-overlay">
    <div class="outline-editor-modal">
      <div class="modal-header">
        <h3>{{ outlineEditorModal.title }}</h3>
        <button class="close-modal-btn" @click="closeOutlineEditor">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <textarea 
          class="outline-editor-textarea" 
          v-model="outlineEditorModal.content" 
          placeholder="请输入详细内容..."
        ></textarea>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="closeOutlineEditor">取消</button>
        <button class="save-btn" @click="saveOutlineEditor">保存</button>
      </div>
    </div>
  </div>

  <!-- AI大纲生成弹窗 -->
  <div v-if="aiOutlineModal.show" class="modal-overlay" @click.self="closeAIOutlineGenerator">
    <div class="ai-outline-modal">
      <div class="modal-header">
        <h3>AI大纲</h3>
        <button class="close-modal-btn" @click="closeAIOutlineGenerator">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="ai-setting-section">
          <div class="setting-label">AI 模型</div>
          <select v-model="aiOutlineModal.model" class="model-selector">
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>
        
        <div class="ai-setting-section">
          <div class="setting-row">
            <span>启用会话连续性</span>
            <div class="toggle-switch-container">
              <span class="toggle-label">关闭</span>
              <div class="toggle-switch">
                <input type="checkbox" v-model="aiOutlineModal.continuity" id="ai-outline-continuity">
                <label for="ai-outline-continuity"></label>
              </div>
              <span class="toggle-label">开启</span>
            </div>
          </div>
        </div>
        
        <div class="ai-setting-section">
          <div class="setting-label">提示词模式</div>
          <div class="tab-buttons">
            <button 
              :class="['tab-btn', aiOutlineModal.promptMode === 'template' ? 'active' : '']" 
              @click="aiOutlineModal.promptMode = 'template'"
            >提示词模板</button>
            <button 
              :class="['tab-btn', aiOutlineModal.promptMode === 'custom' ? 'active' : '']" 
              @click="aiOutlineModal.promptMode = 'custom'"
            >自定义提示词</button>
          </div>
        </div>
        
        <div v-if="aiOutlineModal.promptMode === 'template'" class="ai-setting-section">
          <div class="setting-label">提示词模板</div>
          <div class="template-selector">
            <input type="text" readonly placeholder="请选择提示词模板" class="prompt-display" :value="aiOutlineModal.selectedTemplate">
            <button class="select-prompt-btn" @click="showPromptTemplates">选择提示词</button>
          </div>
        </div>
        
        <div class="ai-setting-section">
          <div class="setting-label">需要生成大纲的正文 <span class="required-mark">*</span></div>
          <textarea 
            class="outline-content-input" 
            v-model="aiOutlineModal.content" 
            placeholder="请输入需要扩写的内容..."
          ></textarea>
        </div>
        
        <div class="ai-setting-section">
          <div class="setting-label">关联章节</div>
          <div class="chapter-tags">
            <span class="warning-text">未保证写作效果，请关联章节，默认关联近两章</span>
            <div class="chapter-selector">
              <button class="chapter-tag selected">选择章节</button>
              <button class="chapter-tag">未选择章节</button>
            </div>
          </div>
        </div>
        
        <div class="ai-setting-section">
          <div class="setting-label">关联角色 (可选)</div>
          <button class="select-character-btn">选择角色</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="closeAIOutlineGenerator">取消</button>
        <button class="generate-btn" @click="generateAIOutline">开始生成</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { debounce, showToast } from '../utils/common'
import { debugLog } from '../utils/debug'
import AIOpen from './Editors/AIOpen.vue'
import AIWrit from './Editors/AIWrit.vue'
import AIContinuation from './Editors/AIContinuation.vue'
import AIEdit from './Editors/AIEdit.vue'
import CharacterCardPanel from './Editors/CharacterCardPanel.vue'
import EntryCardPanel from './Editors/EntryCardPanel.vue'
import { DataService } from '../utils/services/dataService'

// 创建dataService实例
const dataService = new DataService();

// Props 定义
const props = defineProps({
  bookId: {
    type: String,
    required: true
  },
  selectedModel: {
    type: Object,
    required: false,
    default: () => ({ 
      id: 'default-model',
      name: '默认模型'
    })
  },
  sectionId: {
    type: String,
    required: false
  }
})

// 基础状态
const route = useRoute()
const bookId = ref(props.bookId || 'default')
// const isCharacterCardPanelOpen = ref(false)
// const isEntryCardPanelOpen = ref(false)

// 从localStorage加载模型数据
const loadModelInfo = () => {
  const savedData = localStorage.getItem('allData')
  if (savedData) {
    const parsedData = JSON.parse(savedData)
    return parsedData.config.models || [props.selectedModel]
  }
  return [props.selectedModel]
}

// 加载模型信息
const modelInfo = ref(loadModelInfo())

// 获取可用模型列表
const availableModels = computed(() => {
  return modelInfo.value || []
})

// AI设置
const aiSettings = reactive({
  model: modelInfo.value[0]?.id || 'gemini-2.0',
  continuity: false,
  promptMode: 'template',
  outlineDirection: '',
  userIdea: '',
  customPrompt: '',
  selectedPrompt: '',
  promptContent: '',
  // 续写相关
  useOutline: true,
  mainPlot: '',
  continuationPlot: '',
  linkedChapters: [],
  linkedCharacters: [],
  selectedCardsInfo: '',
  linkedEntries: [],
  // 编辑相关
  editMode: 'polish',
  editRange: 'selection',
  editStyle: 'neutral',
  styleIntensity: 5,
  customEditRequest: '',
  editNotes: ''
})

// AI大纲生成弹窗
const aiOutlineModal = reactive({
  show: false,
  chapter: null,
  model: modelInfo.value[0]?.id || 'gemini-2.0',
  continuity: false,
  promptMode: 'template',
  selectedTemplate: '',
  content: '',
  selectedChapters: []
})

// 核心状态变量
const isFullscreen = ref(false)
const showSidebar = ref(true)
const editorContent = ref(null)
const chapters = ref([])
const currentChapterId = ref(null)
const currentChapter = reactive({
  id: null,
  title: '',
  content: ''
})
const contentChanged = ref(false)
const titleChanged = ref(false)
const wordCount = ref(0)
const autoSaveTimeout = ref(null)

// 上下文菜单状态
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  targetChapter: null
})

// 字体和背景设置
const fontSettings = reactive({
  showModal: false,
  family: 'Arial',
  size: 16,
  color: '#333333'
})

const backgroundSettings = reactive({
  showModal: false,
  type: 'color',
  color: '#ffffff',
  image: null,
  imageUrl: '',
  opacity: 0.8
})

// 历史记录
const history = reactive({
  stack: [],
  index: -1,
  maxSize: 20
})

// 搜索替换功能
const searchState = reactive({
  showModal: false,
  searchText: '',
  replaceText: '',
  caseSensitive: false
})

// AI面板状态
const showAiPanel = ref(false)
const currentPanel = ref('')
const currentPanelTitle = computed(() => {
  debugLog(currentPanel.value)
  switch(currentPanel.value) {
    case 'writing': return 'AI写作';
    case 'continuation': return 'AI续写';
    case 'editing': return 'AI编辑';
    case 'opening': return '黄金开篇';
    case 'character': return '人物卡';
    case 'entry': return '词条卡';
    default: return '';
  }
})

// 侧边栏状态
const sidebarTab = ref('directory')
const expandedChapters = ref([])

// 大纲卡片显示状态
const expandedOutlineCards = ref(['levelSetting', 'worldSetting'])

// 大纲相关状态
const outlineSettings = reactive({
  levelSetting: '',
  worldSetting: '',
  abilitySetting: '',
  sideStory: ''
})

// 大纲编辑弹窗
const outlineEditorModal = reactive({
  show: false,
  title: '',
  type: '',
  content: ''
})

// 添加文本选择菜单状态
const selectionMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0
})

const selectionMenuRef = ref(null)

// 添加一个标记来追踪最近是否保存过
const recentlySaved = ref(false)

// 提示词相关数据
const categories = ref(['扩写', '润色', '续写', '改写', '大纲相关', '细纲生成', '概要生成', '优化建议', '灵感迸发', '拆书', '金手指生成', '黄金开篇生成', '写作要求', '简介生成', '书名生成', '取名生成', '人设生成', '审稿'])
const prompts = ref([])

// 在其他 ref 变量附近添加以下代码
const isLoading = ref(false)

// 添加各个AI面板的数据状态
const aiPanelStates = reactive({
  opening: {
    novelName: '',
    novelDescription: '',
    selectedCategory: '',
    selectedPrompt: '',
    customContent: ''
  },
  writing: {
    content: '',
    prompt: '',
    selectedTemplate: ''
  },
  continuation: {
    content: '',
    prompt: '',
    useOutline: true
  },
  editing: {
    content: '',
    editMode: 'polish',
    customRequest: ''
  },
  inspiration: {
    theme: '',
    direction: '',
    customPrompt: ''
  }
})

// 更新AI面板状态的方法
const updatePanelState = (panel, data) => {
  if (aiPanelStates[panel]) {
    debugLog(`更新${panel}面板状态:`, data);
    Object.assign(aiPanelStates[panel], data);
  }
}

// 函数定义
// 键盘快捷键处理
const handleKeyDown = (event) => {
  // 保存快捷键 (Ctrl+S)
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveCurrentChapter()
  }
  
  // 撤销/重做快捷键
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'z' && !event.shiftKey) {
      undo()
      event.preventDefault()
    } else if ((event.key === 'Z' && event.shiftKey) || (event.key === 'y' && !event.shiftKey)) {
      redo()
      event.preventDefault()
    }
  }
}

// 撤销/重做功能
const undo = () => {
  if (history.index <= 0) {
    showToast('已到达最早记录', 'info')
    return
  }
  
  history.index--
  applyHistoryState()
}

const redo = () => {
  if (history.index >= history.stack.length - 1) {
    showToast('已到达最新记录', 'info')
    return
  }
  
  history.index++
  applyHistoryState()
}

// 章节操作
const loadChapters = async () => {
  try {
    const response = await fetch(`/api/books/${bookId.value}/chapters`)
    if (!response.ok) {
      throw new Error('加载章节失败')
    }
    chapters.value = await response.json()
    if (chapters.value.length > 0) {
      openChapter(chapters.value[0].id)
    }
  } catch (error) {
    console.error('加载章节出错:', error)
    showToast('加载章节失败', 'error')
  }
}

const openChapter = async (chapterId) => {
  if ((contentChanged.value || titleChanged.value) && currentChapterId.value) {
    await saveCurrentChapter()
  }
  
  const chapter = chapters.value.find(c => c.id === chapterId)
  if (chapter) {
    currentChapterId.value = chapter.id
    
    currentChapter.id = chapter.id
    currentChapter.title = chapter.title
    currentChapter.content = chapter.content
    
    calculateWordCount()
    
    // 明确重置状态
    contentChanged.value = false
    titleChanged.value = false
    recentlySaved.value = true
    
    // 短暂延迟后重置保存状态
    setTimeout(() => {
      recentlySaved.value = false
    }, 2000)
    
    history.stack = [{
      content: chapter.content || '',
      title: chapter.title,
      timestamp: new Date().getTime()
    }]
    history.index = 0
  }
}

const saveCurrentChapter = async () => {
  try {
    if (!currentChapterId.value) return
    
    isLoading.value = true  // 开始保存时设置为 true
    
    const index = chapters.value.findIndex(c => c.id === currentChapterId.value)
    if (index === -1) return
    
    chapters.value[index] = {
      ...chapters.value[index],
      title: currentChapter.title,
      content: currentChapter.content,
      updatedAt: new Date().toISOString()
    }
    
    await saveChaptersToBackend()
    
    // 成功保存后重置状态标记
    contentChanged.value = false
    titleChanged.value = false
    
    // 设置最近保存标记为 true，并在短时间后重置
    recentlySaved.value = true
    setTimeout(() => {
      recentlySaved.value = false
    }, 2000)
    
    showToast('章节保存成功', 'success')
  } catch (error) {
    console.error('保存章节失败:', error)
    showToast('保存章节失败', 'error')
  } finally {
    isLoading.value = false  // 无论成功或失败都设置为 false
  }
}

const saveChaptersToBackend = async () => {
  try {
    const response = await fetch(`/api/books/${bookId.value}/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chapters.value)
    })
    if (!response.ok) {
      throw new Error('保存章节失败')
    }
  } catch (error) {
    console.error('保存章节到后端失败:', error)
    showToast('保存章节到后端失败', 'error')
  }
}

const createNewChapter = async () => {
  try {
    if (!Array.isArray(chapters.value)) {
      chapters.value = []
    }
    
    const newChapter = {
      id: uuidv4(),
      title: '新建章节',
      content: '',
      order: chapters.value.length,
      isVolume: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    chapters.value.push(newChapter)
    openChapter(newChapter.id)
    
    await saveCurrentChapter()
    showToast('章节创建成功', 'success')
  } catch (error) {
    console.error('创建章节失败:', error)
    showToast('创建章节失败', 'error')
  }
}

const deleteChapter = async () => {
  if (!contextMenu.targetChapter) return
  
  const targetId = contextMenu.targetChapter.id
  const index = chapters.value.findIndex(c => c.id === targetId)
  
  if (index !== -1) {
    chapters.value.splice(index, 1)
    
    if (currentChapterId.value === targetId) {
      if (chapters.value.length > 0) {
        const nextIndex = index < chapters.value.length ? index : index - 1
        openChapter(chapters.value[nextIndex].id)
      } else {
        createNewChapter()
      }
    }
    
    await saveCurrentChapter()
  }
  
  closeContextMenu()
}

// 上下文菜单
const showContextMenu = (event, chapter) => {
  contextMenu.show = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.targetChapter = chapter
  
  document.addEventListener('click', closeContextMenuOnOutsideClick)
}

const closeContextMenu = () => {
  contextMenu.show = false
  document.removeEventListener('click', closeContextMenuOnOutsideClick)
}

const closeContextMenuOnOutsideClick = (event) => {
  const menu = document.querySelector('.context-menu')
  if (menu && !menu.contains(event.target)) {
    closeContextMenu()
  }
}

// 内容更新处理
const onContentUpdate = () => {
  contentChanged.value = true
  calculateWordCount()
  recordHistory()
}

// 计算字数
const calculateWordCount = () => {
  wordCount.value = currentChapter.content.replace(/\s+/g, '').length
}

// 编辑器功能
const insertTab = () => {
  document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;')
}

const onPaste = (event) => {
  event.preventDefault()
  const text = (event.clipboardData || window.clipboardData).getData('text/plain')
  document.execCommand('insertText', false, text)
}

// 全屏切换
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    document.documentElement.requestFullscreen().catch(err => {
      showToast(`无法进入全屏: ${err}`, 'error')
    })
  } else {
    document.exitFullscreen().catch(err => {
      showToast(`无法退出全屏: ${err}`, 'error')
    })
  }
  showToast(isFullscreen.value ? '已进入全屏模式' : '已退出全屏模式', 'success')
}

// 侧边栏切换
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

// 字体和背景设置
const applyFontSettings = () => {
  if (editorContent.value) {
    editorContent.value.style.fontFamily = fontSettings.family
    editorContent.value.style.fontSize = `${fontSettings.size}px`
    editorContent.value.style.color = fontSettings.color
  }
}

const applyBackgroundSettings = () => {
  const editorContainer = document.querySelector('.editor-container')
  if (editorContainer) {
    if (backgroundSettings.type === 'color') {
      editorContainer.style.background = backgroundSettings.color
      editorContainer.style.backgroundImage = 'none'
    } else {
      editorContainer.style.backgroundColor = `rgba(255, 255, 255, ${1 - backgroundSettings.opacity})`
      editorContainer.style.backgroundImage = `url(${backgroundSettings.imageUrl})`
      editorContainer.style.backgroundSize = 'cover'
      editorContainer.style.backgroundAttachment = 'fixed'
    }
  }
}

const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    backgroundSettings.image = file
    backgroundSettings.imageUrl = URL.createObjectURL(file)
  }
}

// 历史记录
const recordHistory = debounce(() => {
  const content = currentChapter.content
  const title = currentChapter.title
  
  if (history.stack[history.index]?.content === content && 
      history.stack[history.index]?.title === title) {
    return
  }
  
  if (history.index < history.stack.length - 1) {
    history.stack = history.stack.slice(0, history.index + 1)
  }
  
  history.stack.push({
    content,
    title,
    timestamp: new Date().getTime()
  })
  
  if (history.stack.length > history.maxSize) {
    history.stack.shift()
  } else {
    history.index = history.stack.length - 1
  }
}, 500)

const applyHistoryState = () => {
  const state = history.stack[history.index]
  if (!state) return
  
  currentChapter.title = state.title
  currentChapter.content = state.content
  calculateWordCount()
}

// 一键排版
const formatContent = () => {
  debugLog('使用了一键排版')
  let content = currentChapter.content
  debugLog('content\n', content)
  if (!content) return

  const formattedContent = content.split('\n').map(line => {
    return line.trimStart().replace(/^\s*/, '    ')
  }).join('\n')

  currentChapter.content = formattedContent
  debugLog('formattedContent\n', formattedContent)
  onContentUpdate()
  showToast('排版完成', 'success')
}

// 查找替换
const findText = () => {
  if (!searchState.searchText) return
  
  const editor = editorContent.value
  const content = editor.innerHTML
  const flags = searchState.caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(searchState.searchText, flags)
  
  editor.innerHTML = content.replace(regex, match => 
    `<span class="search-highlight">${match}</span>`
  )
}

const replaceText = () => {
  if (!searchState.searchText) return
  
  const editor = editorContent.value
  const flags = searchState.caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(searchState.searchText, flags)
  
  editor.innerHTML = editor.innerHTML.replace(
    /<span class="search-highlight">(.*?)<\/span>/g, 
    searchState.replaceText
  ).replace(regex, searchState.replaceText)
  
  showToast(`已替换所有匹配项`, 'success')
}

const openPanel = (panelName) => {
  currentPanel.value = panelName
  showAiPanel.value = true
}

const closeAiPanel = () => {
  showAiPanel.value = false
  currentPanel.value = ''
}

// 侧边栏功能
const switchSidebarTab = (tab) => {
  sidebarTab.value = tab
}

const toggleChapterOutline = (chapterId) => {
  if (expandedChapters.value.includes(chapterId)) {
    expandedChapters.value = expandedChapters.value.filter(id => id !== chapterId)
  } else {
    expandedChapters.value.push(chapterId)
  }
}

// 计算大纲字数
const calculateOutlineWordCount = (outline) => {
  if (!outline) return 0
  return outline.replace(/\s+/g, '').length
}

// 大纲编辑器功能
const openOutlineEditor = (type) => {
  let title = ''
  let content = ''
  
  switch(type) {
    case 'levelSetting':
      title = '等级设定'
      content = outlineSettings.levelSetting
      break
    case 'worldSetting':
      title = '世界观设定'
      content = outlineSettings.worldSetting
      break
    case 'abilitySetting':
      title = '金手指设定'
      content = outlineSettings.abilitySetting
      break
    case 'sideStory':
      title = '支线剧情'
      content = outlineSettings.sideStory
      break
  }
  
  outlineEditorModal.title = title
  outlineEditorModal.type = type
  outlineEditorModal.content = content
  outlineEditorModal.show = true
}

const closeOutlineEditor = () => {
  outlineEditorModal.show = false
}

const saveOutlineEditor = () => {
  switch(outlineEditorModal.type) {
    case 'levelSetting':
      outlineSettings.levelSetting = outlineEditorModal.content
      break
    case 'worldSetting':
      outlineSettings.worldSetting = outlineEditorModal.content
      break
    case 'abilitySetting':
      outlineSettings.abilitySetting = outlineEditorModal.content
      break
    case 'sideStory':
      outlineSettings.sideStory = outlineEditorModal.content
      break
  }
  
  closeOutlineEditor()
  showToast('大纲内容已保存', 'success')
}

// AI大纲功能
const openAIOutlineGenerator = (chapter) => {
  debugLog('Opening AI outline generator for chapter:', chapter.title)
  aiOutlineModal.show = true
  aiOutlineModal.chapter = chapter
  aiOutlineModal.content = chapter.content || ''
  
  // 默认选择当前章节和前两章
  aiOutlineModal.selectedChapters = [chapter.id]
  
  const chapterIndex = chapters.value.findIndex(c => c.id === chapter.id)
  if (chapterIndex > 0) {
    aiOutlineModal.selectedChapters.push(chapters.value[chapterIndex - 1].id)
    if (chapterIndex > 1) {
      aiOutlineModal.selectedChapters.push(chapters.value[chapterIndex - 2].id)
    }
  }
}

const closeAIOutlineGenerator = () => {
  debugLog('Closing AI outline generator')
  aiOutlineModal.show = false
}

const showPromptTemplates = () => {
  aiOutlineModal.selectedTemplate = '大纲生成-【详细大纲】'
}

const toggleOutlineCard = (cardType) => {
  if (expandedOutlineCards.value.includes(cardType)) {
    expandedOutlineCards.value = expandedOutlineCards.value.filter(type => type !== cardType)
  } else {
    expandedOutlineCards.value.push(cardType)
  }
}

// 章节上下移动
const moveChapterUp = async () => {
  if (!contextMenu.targetChapter) return
  
  const targetId = contextMenu.targetChapter.id
  const index = chapters.value.findIndex(c => c.id === targetId)
  
  if (index > 0) {
    [chapters.value[index], chapters.value[index - 1]] = [chapters.value[index - 1], chapters.value[index]]
    await saveCurrentChapter()
    showToast('章节已上移', 'success')
  } else {
    showToast('已经是第一章', 'info')
  }
  
  closeContextMenu()
}

const moveChapterDown = async () => {
  if (!contextMenu.targetChapter) return
  
  const targetId = contextMenu.targetChapter.id
  const index = chapters.value.findIndex(c => c.id === targetId)
  
  if (index !== -1 && index < chapters.value.length - 1) {
    [chapters.value[index], chapters.value[index + 1]] = [chapters.value[index + 1], chapters.value[index]]
    await saveCurrentChapter()
    showToast('章节已下移', 'success')
  } else {
    showToast('已经是最后一章', 'info')
  }
  
  closeContextMenu()
}

// 重命名
const renameChapter = (chapter = null) => {
  const targetChapter = chapter || contextMenu.targetChapter
  if (!targetChapter) return
  
  openChapter(targetChapter.id)
  
  nextTick(() => {
    const titleInput = document.querySelector('.chapter-title-input')
    if (titleInput) {
      titleInput.focus()
      titleInput.select()
    }
  })
  
  if (!chapter) {
    closeContextMenu()
  }
}

// 添加缺失的generateAIOutline函数
const generateAIOutline = () => {
  if (!aiOutlineModal.content) {
    showToast('请输入需要生成大纲的正文', 'error')
    return
  }
  
  const chapter = aiOutlineModal.chapter
  if (chapter) {
    showToast('AI大纲生成中...', 'info')
    
    setTimeout(() => {
      chapter.outline = `${chapter.title}的大纲：
1. 开场：描述主要场景和人物
2. 发展：展示核心冲突和关键事件
3. 高潮：推动情节到达顶点
4. 结局：解决主要问题和伏笔

* 主要角色：${chapter.title}中的角色设定
* 场景描写：重要场景的详细描述
* 情节安排：详细的章节脉络`

      const index = chapters.value.findIndex(c => c.id === chapter.id)
      if (index !== -1) {
        chapters.value[index].outline = chapter.outline
        saveCurrentChapter()
      }
      
      closeAIOutlineGenerator()
      showToast('AI大纲生成成功', 'success')
    }, 1000)
  } else {
    showToast('无效的章节', 'error')
  }
}

// 生命周期钩子
const beforeUnloadHandler = (event) => {
  // 仅当有实际更改且本地没有保存成功时才显示提示
  if ((contentChanged.value || titleChanged.value) && !recentlySaved.value) {
    event.preventDefault()
    event.returnValue = '您有未保存的更改，确定要离开吗？'
    return event.returnValue
  }
}

// 添加自动保存功能
const setupAutoSave = () => {
  // 清除之前的自动保存计时器
  if (autoSaveTimeout.value) {
    clearInterval(autoSaveTimeout.value)
  }
  
  // 设置新的自动保存计时器 (每30秒)
  autoSaveTimeout.value = setInterval(() => {
    if (contentChanged.value || titleChanged.value) {
      saveCurrentChapter()
    }
  }, 30000) // 30秒
}

// 在onMounted中加载App场景数据
const loadAppScenes = async () => {
  // 尝试从dataService加载场景数据
  try {
    // 保存当前选中的场景ID，以便刷新后可以恢复选中状态
    const currentSceneId = currentAppScene.value?.id;
    
    let allData;
    try {
      // 尝试从后端加载数据
      allData = await dataService.loadAllData();
    } catch (error) {
      console.warn('从后端加载场景数据失败，使用本地数据:', error);
      // 从localStorage获取备份数据
      const savedScenes = localStorage.getItem('app-scenes');
      if (savedScenes) {
        allData = { scenes: JSON.parse(savedScenes) };
      } else {
        return; // 如果没有任何数据可用，直接返回
      }
    }
    
    if (allData && allData.scenes && Array.isArray(allData.scenes)) {
      // 检查场景数据是否有实质性变化，以避免不必要的刷新
      const hasSceneChanges = !appScenes.value.length || 
        JSON.stringify(appScenes.value.map(s => ({id: s.id, name: s.name}))) !== 
        JSON.stringify(allData.scenes.map(s => ({id: s.id, name: s.name})));
      
      if (hasSceneChanges) {
        // 保存当前状态下的场景引用
        let currentSceneAfterUpdate = null;
        
        // 批量更新场景，但不改变当前选中场景
        appScenes.value = allData.scenes.map(newScene => {
          // 如果这是当前选中的场景，保存更新后的引用
          if (currentSceneId && newScene.id === currentSceneId) {
            currentSceneAfterUpdate = newScene;
          }
          return newScene;
        });
        
        // 如果找到当前场景的更新版本，保持选中
        if (currentSceneId && currentSceneAfterUpdate) {
          currentAppScene.value = currentSceneAfterUpdate;
        }
        
        // 保存到localStorage以备份
        localStorage.setItem('app-scenes', JSON.stringify(appScenes.value));
        
        // 如果有当前场景，也保存它
        if (currentAppScene.value) {
          localStorage.setItem('current-app-scene', JSON.stringify(currentAppScene.value));
        }
        
        debugLog('App场景数据已更新，保持当前选中场景');
        
        // 如果有当前场景，确保加载其卡片
        if (currentAppScene.value && currentAppScene.value.id) {
          await loadSceneCards(currentAppScene.value.id);
        }
        
        // 已处理场景更新，直接返回
        return;
      }
      
      // 如果到这里，说明场景数据没有变化，但可能有选中场景需要处理
      
      // 当前没有选中场景，但有场景数据
      if (!currentAppScene.value && appScenes.value.length > 0) {
        // 用户之前可能选过场景，尝试从localStorage恢复
        const savedCurrentScene = localStorage.getItem('current-app-scene');
        if (savedCurrentScene) {
          try {
            const parsedScene = JSON.parse(savedCurrentScene);
            const matchedScene = appScenes.value.find(s => s.id === parsedScene.id);
            if (matchedScene) {
              currentAppScene.value = matchedScene;
              await loadSceneCards(currentAppScene.value.id);
            } else {
              // 找不到匹配的场景才选第一个
              currentAppScene.value = appScenes.value[0];
              await loadSceneCards(currentAppScene.value.id);
            }
          } catch (error) {
            console.warn('解析保存的场景数据失败', error);
            // 出错时选第一个
            currentAppScene.value = appScenes.value[0];
            await loadSceneCards(currentAppScene.value.id);
          }
        } else {
          // 本地没有保存，选第一个
          currentAppScene.value = appScenes.value[0];
          await loadSceneCards(currentAppScene.value.id);
        }
        
        // 保存当前场景
        if (currentAppScene.value) {
          localStorage.setItem('current-app-scene', JSON.stringify(currentAppScene.value));
        }
      }
    }
    
    // 去掉这条打印，避免干扰用户
    // debugLog('App场景数据已加载, 当前场景:', currentAppScene.value?.id);
  } catch (error) {
    console.error('加载App场景数据失败:', error);
    // 尝试从localStorage恢复数据
    try {
      const savedScenes = localStorage.getItem('app-scenes');
      if (savedScenes) {
        appScenes.value = JSON.parse(savedScenes);
        
        const savedCurrentScene = localStorage.getItem('current-app-scene');
        if (savedCurrentScene) {
          currentAppScene.value = JSON.parse(savedCurrentScene);
        } else if (appScenes.value.length > 0) {
          currentAppScene.value = appScenes.value[0];
        }
        
        debugLog('已从localStorage恢复场景数据');
      }
    } catch (localError) {
      console.error('从localStorage恢复数据失败:', localError);
    }
  }
}

// 定义interval引用，用于在组件卸载时清除
let sceneCheckInterval = null

onMounted(async () => {
  // 加载App场景数据
  await loadAppScenes();
  
  // 设置定时器定期检查场景数据更新
  sceneCheckInterval = setInterval(async () => {
    await loadAppScenes();
  }, 30000); // 每30秒检查一次
  
  // 添加场景更新事件监听器
  window.addEventListener('scene-updated', handleSceneUpdated);
  
  // 添加场景卡片加载事件监听器
  window.addEventListener('load-scene-cards', handleLoadSceneCards);
  
  // 以下是原有的功能
  window.addEventListener('beforeunload', beforeUnloadHandler);
  await loadChapters();
  
  if (chapters.value.length > 0 && !currentChapterId.value) {
    openChapter(chapters.value[0].id);
  }
  
  window.addEventListener('keydown', handleKeyDown);
  
  const latestModelInfo = loadModelInfo();
  modelInfo.value = latestModelInfo;
  
  if (latestModelInfo[0]?.id) {
    aiSettings.model = latestModelInfo[0].id;
    aiOutlineModal.model = latestModelInfo[0].id;
  }
  
  // 启动自动保存
  setupAutoSave();

  try {
    // 加载所有数据
    const data = await dataService.loadAllData();
    
    // 如果data中有prompts数据，则更新prompts
    if (data && data.prompts) {
      prompts.value = data.prompts;
    }
  } catch (error) {
    console.error('加载提示词数据失败:', error);
  }
  
  document.addEventListener('click', closeContextMenuOnOutsideClick);
});

// 处理场景更新事件
const handleSceneUpdated = async (event) => {
  debugLog('接收到场景更新事件:', event.detail);
  if (event.detail && event.detail.sceneId) {
       // 防止重复加载
       const currentSceneId = currentAppScene.value?.id;
       if (currentSceneId === event.detail.sceneId) {
         await loadSceneCards(event.detail.sceneId);
       }
     }
};

// 添加处理场景卡片加载事件的函数
const handleLoadSceneCards = (event) => {
  if (event.detail && event.detail.sceneId) {
    const sceneId = event.detail.sceneId;
    debugLog('接收到场景卡片加载事件:', sceneId);
    
    // 直接从本地appScenes找到对应场景
    const scene = appScenes.value.find(s => s.id === sceneId);
    if (scene) {
      // 更新当前场景（如果是当前选中的）
      if (currentAppScene.value && currentAppScene.value.id === sceneId) {
        // 创建一个新对象以触发响应式更新
        currentAppScene.value = { ...scene };
        
        // 保存到本地存储
        localStorage.setItem('current-app-scene', JSON.stringify(currentAppScene.value));
        
        debugLog('已从本地数据刷新场景:', sceneId);
      }
    } else {
      console.warn('场景不存在:', sceneId);
    }
  }
};

onBeforeUnmount(() => {
  if (contentChanged.value || titleChanged.value) {
    saveCurrentChapter();
  }
  
  // 清除场景检查定时器
  if (sceneCheckInterval) {
    clearInterval(sceneCheckInterval);
    sceneCheckInterval = null;
  }
  
  // 移除场景更新事件监听器
  window.removeEventListener('scene-updated', handleSceneUpdated);
  window.removeEventListener('load-scene-cards', handleLoadSceneCards);
  
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  document.removeEventListener('click', closeContextMenuOnOutsideClick);
  
  if (autoSaveTimeout.value) {
    clearInterval(autoSaveTimeout.value);
  }
  
  window.removeEventListener('keydown', handleKeyDown);
});

// 添加人物卡和词条卡的状态变量
const isCharacterCardPanelOpen = ref(false)
const isEntryCardPanelOpen = ref(false)

// 添加关闭人物卡的方法
const closeCharacterCardPanel = () => {
  isCharacterCardPanelOpen.value = false
  if (!currentPanel.value) {
    showAiPanel.value = false
  }
}

// 添加关闭词条卡的方法
const closeEntryCardPanel = () => {
  isEntryCardPanelOpen.value = false
  if (!currentPanel.value) {
    showAiPanel.value = false
  }
}

// 处理文本选择事件
const onSelectionChange = (event) => {
  const textarea = editorContent.value
  if (!textarea) return

  // 获取选定的文本
  const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
  
  // 如果没有选择文本，隐藏菜单
  if (!selectedText || selectedText.trim() === '') {
    selectionMenu.show = false
    return
  }
  
  // 保存选择的文本和位置
  selectionMenu.selectedText = selectedText
  selectionMenu.selectionStart = textarea.selectionStart
  selectionMenu.selectionEnd = textarea.selectionEnd
  
  // 获取文本域的位置和尺寸
  const textareaRect = textarea.getBoundingClientRect()
  
  // 更精确地计算选中文本的位置
  const mouseX = event.clientX || textareaRect.left + textareaRect.width / 2
  const mouseY = event.clientY || textareaRect.top + 20
  
  // 设置菜单位置 - 使用鼠标位置或者事件触发位置
  selectionMenu.x = mouseX - 200 // 向左偏移一点，确保居中
  selectionMenu.y = mouseY - 50  // 在选中文本上方显示
  
  // 确保菜单不会超出文本域的左右边界
  selectionMenu.x = Math.max(textareaRect.left + 10, selectionMenu.x)
  selectionMenu.x = Math.min(textareaRect.right - 200, selectionMenu.x)
  
  // 确保菜单不会超出屏幕顶部
  if (selectionMenu.y < 60) {
    selectionMenu.y = mouseY + 20 // 如果太靠上，则显示在下方
    
    // 翻转气泡尖角的方向
    document.documentElement.style.setProperty('--arrow-direction', 'up')
  } else {
    document.documentElement.style.setProperty('--arrow-direction', 'down')
  }
  
  // 显示菜单
  selectionMenu.show = true
  
  // 点击其他地方隐藏菜单
  setTimeout(() => {
    document.addEventListener('click', hideSelectionMenuOnClick)
  }, 100)
}

// 点击外部隐藏菜单
const hideSelectionMenuOnClick = (event) => {
  const menu = selectionMenuRef.value
  if (menu && !menu.contains(event.target) && event.target !== editorContent.value) {
    selectionMenu.show = false
    document.removeEventListener('click', hideSelectionMenuOnClick)
  }
}

// 处理选择菜单的操作
const handleSelectionAction = (action) => {
  // 确保有选中的文本
  if (!selectionMenu.selectedText) {
    selectionMenu.show = false
    return
  }
  
  const selectedText = selectionMenu.selectedText
  
  // 根据不同操作执行相应逻辑
  switch (action) {
    case '润色':
      // 打开AI编辑面板，设置为润色模式
      aiSettings.editMode = 'polish'
      aiSettings.customEditRequest = `润色以下文本，提升其文学性：\n${selectedText}`
      aiSettings.editRange = 'selection'
      openPanel('editing')
      break
    
    case '扩写':
      // 打开AI编辑面板，设置为扩写模式
      aiSettings.editMode = 'expand'
      aiSettings.customEditRequest = `扩写以下文本，增加细节和描述：\n${selectedText}`
      aiSettings.editRange = 'selection'
      openPanel('editing')
      break
    
    case '改写':
      // 打开AI编辑面板，设置为自定义模式
      aiSettings.editMode = 'custom'
      aiSettings.customEditRequest = `改写以下文本，保持意思但使用不同的表达方式：\n${selectedText}`
      aiSettings.editRange = 'selection'
      openPanel('editing')
      break
    
    case '同义词':
      // 打开AI编辑面板，设置为同义词替换
      aiSettings.editMode = 'custom'
      aiSettings.customEditRequest = `为以下文本提供同义词或同义句替换：\n${selectedText}`
      aiSettings.editRange = 'selection'
      openPanel('editing')
      break
  }
  
  // 隐藏菜单
  selectionMenu.show = false
  document.removeEventListener('click', hideSelectionMenuOnClick)
}

// 在 script setup 中添加
const entryCardPanelRef = ref(null);

// 处理词条编辑
const handleEditEntry = (entry) => {
  // 切换到词条卡面板
  openPanel('entry');
  
  // 等待词条卡面板组件挂载完成
  nextTick(() => {
    // 调用词条卡面板的编辑方法
    if (entryCardPanelRef.value) {
      entryCardPanelRef.value.showEntryModal('edit', entry);
    }
  });
};

// App场景相关数据
const appScenes = ref([])
const currentAppScene = ref(null)

// 处理人物卡更新
const handleCharacterUpdate = (character) => {
  debugLog('角色已更新:', character);
  // 这里可以添加额外的处理逻辑
};

// 加载指定场景的卡片
const loadSceneCards = async (sceneId) => {
  if (!sceneId) return;
  
  try {
    debugLog('加载场景卡片:', sceneId);
    
    // 尝试从dataService获取最新数据
    let allData;
    try {
      allData = await dataService.loadAllData();
    } catch (error) {
      console.error('从后端加载数据失败，尝试使用本地数据:', error);
      // 使用本地数据作为备份
      allData = { scenes: appScenes.value };
    }
    
    // 找到指定的场景
    const scene = allData.scenes?.find(s => s.id === sceneId);
    if (!scene) {
      console.error('场景不存在:', sceneId);
      return null;
    }
    
    // 确保场景有cards数组
    if (!scene.cards) {
      scene.cards = [];
    }
    
    // 更新本地场景数据
    const sceneIndex = appScenes.value.findIndex(s => s.id === sceneId);
    if (sceneIndex !== -1) {
      // 创建新数组以触发响应式更新
      appScenes.value = [
        ...appScenes.value.slice(0, sceneIndex),
        scene,
        ...appScenes.value.slice(sceneIndex + 1)
      ];
    }
    
    // 更新当前场景
    if (currentAppScene.value && currentAppScene.value.id === sceneId) {
      currentAppScene.value = scene;
      
      // 保存到本地存储
      localStorage.setItem('current-app-scene', JSON.stringify(currentAppScene.value));
    }
    
    // 保存到localStorage以备份
    localStorage.setItem('app-scenes', JSON.stringify(appScenes.value));
    
    debugLog('场景卡片加载完成:', sceneId);
    return scene;
  } catch (error) {
    console.error('加载场景卡片失败:', error);
    return null;
  }
};

// 处理人物卡场景变化
const handleCharacterSceneChanged = async (character, oldSceneId, newSceneId) => {
  debugLog('角色场景变化:', character?.id, '从', oldSceneId, '到', newSceneId);
  
  // 检查参数是否存在
  if (!character) {
    console.error('角色对象为空');
    return;
  }
  
  try {
    // 检查新场景是否存在，如果不存在且newSceneId非空，则创建一个新场景
    if (newSceneId && !appScenes.value.find(s => s.id === newSceneId)) {
      debugLog('目标场景不存在，创建新场景:', newSceneId);
      const newScene = {
        id: newSceneId,
        name: `场景 ${newSceneId}`,
        cards: [],
        characterCount: 0
      };
      appScenes.value.push(newScene);
      // 保存新场景到本地存储
      localStorage.setItem('app-scenes', JSON.stringify(appScenes.value));
    }
    
    // 如果当前没有选中场景，切换到新场景
    if (!currentAppScene.value && newSceneId) {
      currentAppScene.value = appScenes.value.find(s => s.id === newSceneId);
      // 保存当前场景到本地
      if (currentAppScene.value) {
        localStorage.setItem('current-app-scene', JSON.stringify(currentAppScene.value));
      }
    }
    
    // 触发场景更新事件
    const updateEvent = new CustomEvent('scene-updated', { 
      detail: { sceneId: newSceneId || oldSceneId } 
    });
    window.dispatchEvent(updateEvent);
    
    // 如果当前正在编辑相关场景，刷新其卡片
    if (currentAppScene.value?.id === newSceneId || currentAppScene.value?.id === oldSceneId) {
      // 触发一个事件让视图更新
      const refreshEvent = new CustomEvent('load-scene-cards', {
        detail: { sceneId: currentAppScene.value.id }
      });
      window.dispatchEvent(refreshEvent);
    }
    
  } catch (error) {
    console.error('处理角色场景变更失败:', error);
  }
};

// 只刷新当前场景数据，不切换选择的场景
const refreshCurrentSceneOnly = async () => {
  try {
    // 保存当前选中的场景ID
    const currentSceneId = currentAppScene.value?.id;
    if (!currentSceneId) return;
    
    // 尝试从dataService加载最新数据
    let latestData;
    try {
      latestData = await dataService.loadAllData();
    } catch (error) {
      console.warn('从后端加载场景数据失败，使用本地数据:', error);
      // 如果后端加载失败，使用本地存储数据
      return;
    }
    
    // 如果找到当前场景，只更新它
    if (latestData && latestData.scenes) {
      const updatedSceneIndex = latestData.scenes.findIndex(s => s.id === currentSceneId);
      if (updatedSceneIndex !== -1) {
        const updatedScene = latestData.scenes[updatedSceneIndex];
        
        // 在本地场景中找到并更新
        const localSceneIndex = appScenes.value.findIndex(s => s.id === currentSceneId);
        if (localSceneIndex !== -1) {
          // 只更新卡片数据，保留其他属性
          appScenes.value[localSceneIndex].cards = updatedScene.cards;
          
          // 更新当前场景引用
          if (currentAppScene.value.id === currentSceneId) {
            currentAppScene.value = appScenes.value[localSceneIndex];
          }
          
          // 保存到localStorage
          localStorage.setItem('app-scenes', JSON.stringify(appScenes.value));
          if (currentAppScene.value) {
            localStorage.setItem('current-app-scene', JSON.stringify(currentAppScene.value));
          }
          
          debugLog('当前场景数据已刷新:', currentSceneId);
        }
      }
    }
  } catch (error) {
    console.error('刷新当前场景数据失败:', error);
  }
};

// 刷新场景数据
const refreshSceneData = async () => {
  try {
    // 尝试从dataService加载最新数据
    let latestData;
    try {
      latestData = await dataService.loadAllData();
    } catch (error) {
      console.warn('从后端加载场景数据失败，使用本地数据:', error);
      // 如果后端加载失败，使用本地存储数据
      const savedScenes = localStorage.getItem('app-scenes');
      if (savedScenes) {
        latestData = { scenes: JSON.parse(savedScenes) };
      } else {
        latestData = { scenes: appScenes.value };
      }
    }
    
    // 更新本地场景数据
    if (latestData && latestData.scenes) {
      appScenes.value = latestData.scenes;
      
      // 同步到localStorage
      localStorage.setItem('app-scenes', JSON.stringify(appScenes.value));
    } else {
      // 如果dataService没有数据，则从localStorage加载
      const savedScenes = localStorage.getItem('app-scenes');
      if (savedScenes) {
        appScenes.value = JSON.parse(savedScenes);
      }
    }
    
    // 确保当前选中的场景仍然有效
    if (currentAppScene.value) {
      const sceneStillExists = appScenes.value.some(scene => scene.id === currentAppScene.value.id);
      if (!sceneStillExists) {
        currentAppScene.value = null;
      } else {
        // 找到当前场景并更新
        const updatedScene = appScenes.value.find(scene => scene.id === currentAppScene.value.id);
        if (updatedScene) {
          currentAppScene.value = updatedScene;
        }
      }
    }
    
    // 触发自定义事件，通知App组件刷新场景
    const event = new CustomEvent('scene-updated', { 
      detail: { 
        sceneId: currentAppScene.value?.id 
      } 
    });
    window.dispatchEvent(event);
    
    debugLog('场景数据已刷新，当前场景:', currentAppScene.value?.id);
  } catch (error) {
    console.error('刷新场景数据失败:', error);
  }
};
</script>

<style>
@import url('../styles/editor.css');

/* 添加文本选择菜单样式 */
.selection-menu {
  position: absolute;
  display: flex;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 4px;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.selection-menu::after {
  content: '';
  position: absolute;
  left: 50%;
  margin-left: -8px;
  border-width: 8px;
  border-style: solid;
}

/* 根据方向变换气泡角 */
.selection-menu[data-direction="down"]::after {
  top: 100%;
  border-color: white transparent transparent transparent;
}

.selection-menu[data-direction="up"]::after {
  bottom: 100%;
  border-color: transparent transparent white transparent;
}

.selection-menu .menu-item {
  background: none;
  border: none;
  padding: 6px 10px;
  margin: 0 2px;
  border-radius: 3px;
  cursor: pointer;
  color: #333;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.selection-menu .menu-item i {
  margin-right: 4px;
}

.selection-menu .menu-item:hover {
  background-color: #f0f7ff;
  color: #1890ff;
}

.user-text {
  color: #1890ff;
}
</style>