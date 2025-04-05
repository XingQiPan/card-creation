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
        <button class="function-btn" @click="openPanel('inspiration')">
          <i class="fas fa-lightbulb"></i> 灵感风暴
        </button>
        <button class="function-btn" @click="openCharacterCardPanel">
          <i class="fas fa-id-card"></i> 人物卡
        </button>
        <button class="function-btn" @click="openEntryCardPanel">
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
                <div class="chapter-title">章节大纲</div>
                
                <div class="chapter-outline-editor">
                  <div class="outline-actions">
                    <button class="ai-generate-btn" @click.stop="openAIOutlineGenerator(chapter)">
                      <i class="fas fa-robot"></i> 正文AI生成
                    </button>
                  </div>
                  <textarea placeholder="在这里写下《{{ chapter.title }}》的大纲..." v-model="chapter.outline"></textarea>
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
          placeholder="在这里写下章节内容..."
        ></textarea>
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
        
        <!-- AI灵感风暴面板 -->
        <div v-if="currentPanel === 'inspiration'" class="panel-content">
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
                <input type="checkbox" v-model="aiSettings.continuity" id="continuity-toggle">
                <label for="continuity-toggle"></label>
              </div>
            </div>
          </div>
          
          <!-- 提示词模式 -->
          <div class="panel-section">
            <div class="section-header">提示词模式</div>
            <div class="tab-buttons">
              <button :class="['tab-btn', aiSettings.promptMode === 'template' ? 'active' : '']" 
                      @click="aiSettings.promptMode = 'template'">提示词模板</button>
              <button :class="['tab-btn', aiSettings.promptMode === 'custom' ? 'active' : '']" 
                      @click="aiSettings.promptMode = 'custom'">自定义提示词</button>
            </div>
          </div>
          
          <!-- 提示词模板 -->
          <div v-if="aiSettings.promptMode === 'template'" class="panel-section">
            <div class="template-selector">
              <div class="template-item">
                <div class="template-header">灵感生成-【灵感速写】</div>
                <button class="action-btn">点击选择提示词</button>
              </div>
            </div>
            
            <!-- 大纲方向 -->
            <div class="panel-section">
              <div class="section-header">大纲的方向（悲剧情，虐剧情，日常，甜剧情）</div>
              <input type="text" class="direction-input" placeholder="请输入大纲的方向" v-model="aiSettings.outlineDirection">
            </div>
            
            <!-- 想法输入框 -->
            <div class="panel-section">
              <div class="section-header">你的想法 <span class="highlight-text">*请描述你的想法，AI将基于此提供后续发展方向的灵感！</span></div>
              <textarea class="idea-input" placeholder="请描述你的想法..." v-model="aiSettings.userIdea"></textarea>
            </div>
            
            <!-- 关联章节 -->
            <div class="panel-section">
              <div class="section-header">关联章节 <span class="note-text">为保证写作效果，建议关联章节，默认关联前两章</span></div>
              <div class="chapter-selector">
                <button class="chapter-btn selected">选择章节</button>
                <button class="chapter-btn">未选择章节</button>
              </div>
            </div>
          </div>
          
          <!-- 自定义提示词 -->
          <div v-if="aiSettings.promptMode === 'custom'" class="panel-section">
            <textarea class="custom-prompt" placeholder="请输入自定义提示词..." v-model="aiSettings.customPrompt"></textarea>
          </div>
          
          <!-- 操作按钮 -->
          <div class="panel-actions">
            <button class="close-btn" @click="toggleAiPanel">关闭</button>
            <button class="generate-btn" @click="generateIdea">开始生成</button>
          </div>
        </div>
        
        <!-- AI写作面板 -->
        <AIWrit v-if="currentPanel === 'writing'" :availableModels="availableModels" :aiSettings="aiSettings" @close="closeAiPanel" />
        
        <!-- AI续写面板 -->
        <div v-if="currentPanel === 'continuation'" class="panel-content">
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
              <button :class="['tab-btn', 'active']">提示词模板</button>
              <button :class="['tab-btn']">自定义提示词</button>
            </div>
          </div>
          
          <!-- 提示词模板 -->
          <div class="panel-section">
            <div class="template-selector">
              <div class="prompt-selection">
                <input type="text" placeholder="请选择提示词模板" disabled class="prompt-display">
                <button class="prompt-select-btn">点击选择提示词</button>
              </div>
            </div>
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
          
          <!-- 操作按钮 -->
          <div class="panel-actions">
            <button class="close-btn" @click="toggleAiPanel">关闭</button>
            <button class="generate-btn">开始对话</button>
            <button class="primary-btn">开始生成</button>
          </div>
        </div>
        
        <!-- AI编辑面板 -->
        <div v-if="currentPanel === 'editing'" class="panel-content">
          <!-- 待实现 -->
          <div class="panel-section">
            <p>AI编辑功能面板</p>
          </div>
          
          <!-- 操作按钮 -->
          <div class="panel-actions">
            <button class="close-btn" @click="toggleAiPanel">关闭</button>
            <button class="generate-btn">开始编辑</button>
          </div>
        </div>
        
        <!-- 黄金开篇面板 -->
        <AIOpen v-if="currentPanel === 'opening'" :aiSettings="aiSettings" @close="closeAiPanel" />

        <!-- 人物卡面板 -->
        <CharacterCardPanel v-if="isCharacterCardPanelOpen" @close="closeCharacterCardPanel" />
        
        <!-- 词条卡面板 -->
        <EntryCardPanel v-if="isEntryCardPanelOpen" @close="closeEntryCardPanel" />
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

  <!-- 在现有模态框后添加章节选择模态框 -->
  <div v-if="showChapterSelectModal" class="select-modal chapter-select-modal" @click="closeChapterSelectModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>选择关联章节</h3>
        <button @click="closeChapterSelectModal" class="close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="search-box">
        <input type="text" v-model="chapterSearchKeyword" placeholder="搜索章节...">
      </div>
      <div class="select-list">
        <div class="select-all-container">
          <label>
            <input type="checkbox" :checked="isAllChaptersSelected" @change="toggleSelectAllChapters">
            全选
          </label>
        </div>
        <div v-for="chapter in filteredChapters" :key="chapter.id" class="select-item">
          <label>
            <input type="checkbox" v-model="selectedChapterIds" :value="chapter.id">
            {{ chapter.title || '未命名章节' }}
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="confirmChaptersSelection" class="confirm-btn">
          确认选择 ({{ selectedChapterIds.length }})
        </button>
        <button @click="closeChapterSelectModal" class="cancel-btn">取消</button>
      </div>
    </div>
  </div>

  <!-- 场景选择模态框 -->
  <div v-if="showSceneSelectModal" class="select-modal scene-select-modal" @click="closeSceneSelectModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>选择场景</h3>
        <button @click="closeSceneSelectModal" class="close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="search-box">
        <input type="text" v-model="sceneSearchKeyword" placeholder="搜索场景...">
      </div>
      
      <!-- 添加调试信息和刷新按钮 -->
      <div v-if="filteredScenes.length === 0" class="debug-info">
        <p>未找到场景数据。请确保您已经在Data部分创建了场景。</p>
        <button @click="refreshSceneData" class="refresh-btn">
          <i class="fas fa-sync-alt"></i> 刷新场景数据
        </button>
      </div>
      
      <div class="scene-list">
        <div v-for="scene in filteredScenes" 
             :key="scene.id" 
             class="scene-item"
             @click="selectScene(scene)">
          <div class="scene-name">{{ scene.name }}</div>
          <i class="fas fa-chevron-right"></i>
        </div>
      </div>
    </div>
  </div>

  <!-- 角色选择模态框 (卡片选择) -->
  <div v-if="showCharacterSelectModal" class="select-modal character-select-modal" @click="closeCharacterSelectModal">
  <div class="modal-content" @click.stop>
    <div class="modal-header">
      <h3>选择角色 ({{ currentScene?.name }})</h3>
      <button @click="closeCharacterSelectModal" class="close-btn">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="search-box">
      <input type="text" v-model="cardSearchKeyword" placeholder="搜索卡片...">
    </div>
    <div class="select-list">
      <div class="select-all-container">
        <label>
          <input type="checkbox" :checked="isAllCardsSelected" @change="toggleSelectAllCards">
          全选
        </label>
      </div>
      <div v-for="card in filteredSceneCards"
        :key="card.id"
        class="select-item"
        >
        <label>
          <input type="checkbox" v-model="selectedCardIds" :value="card.id"> 
          {{ card.title || '未命名卡片' }}
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button @click="confirmCardsSelection" class="confirm-btn">
        确认选择 ({{ selectedCardIds.length }})
      </button>
      <button @click="closeCharacterSelectModal" class="cancel-btn">返回场景选择</button>
    </div>
  </div>
</div>

  <!-- 词条选择模态框 -->
  <div v-if="showEntrySelectModal" class="select-modal entry-select-modal" @click="closeEntrySelectModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>选择词条</h3>
        <button @click="closeEntrySelectModal" class="close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="tab-buttons">
        <button 
          :class="['tab-btn', entrySelectTab === 'cards' ? 'active' : '']"
          @click="entrySelectTab = 'cards'">
          选择卡片
        </button>
        <button 
          :class="['tab-btn', entrySelectTab === 'groups' ? 'active' : '']"
          @click="entrySelectTab = 'groups'">
          选择卡组
        </button>
      </div>
      <div class="search-box">
        <input type="text" v-model="entrySearchKeyword" placeholder="搜索...">
      </div>
      <div v-if="entrySelectTab === 'cards'" class="select-list">
        <div class="select-all-container">
          <label>
            <input type="checkbox" :checked="isAllEntriesSelected" @change="toggleSelectAllEntries">
            全选
          </label>
        </div>
        <div v-for="card in filteredEntryCards" 
             :key="card.id" 
             class="select-item"
             v-if="card.type !== 'group'">
          <label>
            <input type="checkbox" v-model="selectedEntryIds" :value="card.id">
            {{ card.title || '未命名卡片' }}
          </label>
        </div>
      </div>
      <div v-else class="select-list">
        <div class="select-all-container">
          <label>
            <input type="checkbox" :checked="isAllGroupsSelected" @change="toggleSelectAllGroups">
            全选
          </label>
        </div>
        <div v-for="group in filteredEntryGroups" 
             :key="group.id" 
             class="select-item">
          <label>
            <input type="checkbox" v-model="selectedEntryIds" :value="group.id">
            {{ group.title || '未命名卡组' }}
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="confirmEntrySelection" class="confirm-btn">
          确认选择 ({{ selectedEntryIds.length }})
        </button>
        <button @click="closeEntrySelectModal" class="cancel-btn">取消</button>
      </div>
    </div>
  </div>

</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { debounce, showToast } from '../utils/common'
import { debugLog } from '../utils/debug'
import AIOpen from './Editors/AIOpen.vue'; // 引入AIOpen组件
import AIWrit from './Editors/AIWrit.vue'; // 引入AIWrit组件

export default {
  name: 'Editor',
  props: {
    bookId: {
      type: String,
      required: true
    },
    selectedModel: {
      type: Object,
      required: true
    }
  },
  components: {
    AIOpen,
    AIWrit,
  },
  setup(props) {
    const route = useRoute()
    const bookId = ref(props.bookId || 'default')
    const isCharacterCardPanelOpen = ref(false);
    const isEntryCardPanelOpen = ref(false);
    
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
    
    // 简化后的AI设置 - 使用加载的默认模型
    const aiSettings = reactive({
      model: modelInfo.value[0]?.id || 'gemini-2.0',
      continuity: false,
      promptMode: 'template',
      outlineDirection: '',
      userIdea: '',
      customPrompt: '',
      selectedPrompt: '',
      promptContent: ''
    })
    
    // AI大纲生成弹窗 - 使用加载的默认模型
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

    // 字体和背景设置 - 保留这些
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

    // 历史记录 - 撤销/重做功能
    const history = reactive({
      stack: [],
      index: -1,
      maxSize: 20
    })

    // 搜索替换功能 - 保留
    const searchState = reactive({
      showModal: false,
      searchText: '',
      replaceText: '',
      caseSensitive: false
    })

    // AI面板状态 - 简化但保留显示结构
    const showAiPanel = ref(false)
    const currentPanel = ref('')
    const currentPanelTitle = computed(() => {
      switch(currentPanel.value) {
        case 'inspiration': return '灵感风暴';
        case 'writing': return 'AI写作';
        case 'continuation': return 'AI续写';
        case 'editing': return 'AI编辑';
        case 'opening': return '黄金开篇';
        default: return '';
      }
    })
    
    // 左侧栏选项卡状态 - 修改默认值为'directory'
    const sidebarTab = ref('directory')
    const expandedChapters = ref([])
    
    // 键盘快捷键处理 - 保留
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

    const undo = () => {
      if (history.index <= 0) {
        showToast('已到达最早记录', 'info');
        return;
      }
      
      history.index--;
      applyHistoryState(); // 应用历史状态
    }

    const redo = () => {
      if (history.index >= history.stack.length - 1) {
        showToast('已到达最新记录', 'info');
        return;
      }
      
      history.index++;
      applyHistoryState(); // 应用历史状态
    }


    const loadChapters = async () => {
      try {
        const response = await fetch(`/api/books/${bookId.value}/chapters`);
        if (!response.ok) {
          throw new Error('加载章节失败');
        }
        chapters.value = await response.json(); // 加载章节数据
        if (chapters.value.length > 0) {
          openChapter(chapters.value[0].id); // 打开第一章
        }
      } catch (error) {
        console.error('加载章节出错:', error);
        showToast('加载章节失败', 'error');
      }
    }

    // 打开章节
    const openChapter = async (chapterId) => {
      // 如果有未保存的更改，先保存当前章节
      if ((contentChanged.value || titleChanged.value) && currentChapterId.value) {
        await saveCurrentChapter()
      }
      
      // 查找并加载新章节
      const chapter = chapters.value.find(c => c.id === chapterId)
      if (chapter) {
        currentChapterId.value = chapter.id
        
        // 更新当前章节数据
        currentChapter.id = chapter.id
        currentChapter.title = chapter.title
        currentChapter.content = chapter.content // 确保内容更新
        
        // 更新字数统计
        calculateWordCount(); // 更新字数统计

        // 重置变更标志
        contentChanged.value = false
        titleChanged.value = false
        
        // 清除并初始化历史记录
        history.stack = [{
          content: chapter.content || '',
          title: chapter.title,
          timestamp: new Date().getTime()
        }]
        history.index = 0
      }
    }

    // 保存当前章节
    const saveCurrentChapter = async () => {
      try {
        if (!currentChapterId.value) return
        
        // 确保章节数据是最新的
        currentChapter.content = currentChapter.content.trim();
        
        // 找到当前章节索引
        const index = chapters.value.findIndex(c => c.id === currentChapterId.value)
        if (index === -1) return
        
        // 更新章节数据
        chapters.value[index] = {
          ...chapters.value[index],
          title: currentChapter.title, // 确保标题更新
          content: currentChapter.content,
          updatedAt: new Date().toISOString()
        }
        
        // 调用后端 API 保存章节
        await saveChaptersToBackend(); // 新增调用后端保存章节的函数
        showToast('章节保存成功', 'success'); // 提示保存成功
      } catch (error) {
        console.error('保存章节失败:', error)
        showToast('保存章节失败', 'error')
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
        });
        if (!response.ok) {
          throw new Error('保存章节失败');
        }
      } catch (error) {
        console.error('保存章节到后端失败:', error);
        showToast('保存章节到后端失败', 'error');
      }
    }

    // 创建新章节
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

    // 基础章节操作
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

    // 上下文菜单操作 - 简化
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
      contentChanged.value = true;
      calculateWordCount(); // 更新字数统计
      recordHistory();
    }

    // 计算字数
    const calculateWordCount = () => {
      // 更新字数统计
      wordCount.value = currentChapter.content.replace(/\s+/g, '').length;
    }

    // 基础编辑器功能
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

    // 字体和背景设置 - 保留
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

    // 历史记录功能 - 保留
    const recordHistory = debounce(() => {
      // 记录当前章节的标题和内容
      const content = currentChapter.content; // 使用 currentChapter.content 获取内容
      const title = currentChapter.title;
      
      // 检查当前内容是否与历史记录相同
      if (history.stack[history.index]?.content === content && 
          history.stack[history.index]?.title === title) {
        return;
      }
      
      // 如果历史记录索引小于栈的长度，截断历史记录
      if (history.index < history.stack.length - 1) {
        history.stack = history.stack.slice(0, history.index + 1);
      }
      
      // 添加新的历史记录
      history.stack.push({
        content,
        title,
        timestamp: new Date().getTime()
      });
      
      // 如果历史记录超过最大长度，移除最旧的记录
      if (history.stack.length > history.maxSize) {
        history.stack.shift();
      } else {
        history.index = history.stack.length - 1; // 更新索引
      }
    }, 500);

    const applyHistoryState = () => {
      const state = history.stack[history.index];
      if (!state) return; // 如果没有状态，直接返回
      
      // 更新当前章节的标题和内容
      currentChapter.title = state.title;
      currentChapter.content = state.content; // 使用历史记录中的内容
      calculateWordCount(); // 更新字数统计
    }

    // 一键排版 - 保留
    const formatContent = () => {
      debugLog('使用了一键排版');
      // 获取当前内容
      let content = currentChapter.content; // 使用 currentChapter.content 获取内容
      debugLog('content\n', content);
      if (!content) return; // 确保内容存在

      // 处理每一行，确保每行前有一个制表符
      const formattedContent = content.split('\n').map(line => {
        // 确保每行前有一个制表符，并处理空行
        return line.trimStart().replace(/^\s*/, '    '); // 确保每行前有一个制表符
      }).join('\n');

      // 更新章节内容
      currentChapter.content = formattedContent; // 更新 currentChapter.content
      debugLog('formattedContent\n', formattedContent);
      // 更新历史记录和字数统计
      onContentUpdate();
      showToast('排版完成', 'success');
    }

   
    // 查找替换功能 - 保留
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

    // 面板切换
    const toggleAiPanel = () => {
      showAiPanel.value = !showAiPanel.value
    }

    const openPanel = (panelName) => {
      currentPanel.value = panelName
      showAiPanel.value = true
    }

    const closeAiPanel = () => {
      showAiPanel.value = false
      currentPanel.value = '' // 关闭时重置当前面板
    }

    // AI生成功能的简化版 - 主要展示界面
    const generateIdea = () => {
      showToast('AI功能示例：已触发灵感生成功能', 'success')
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

    // 大纲相关状态 - 简化保留
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

    // 大纲编辑器函数 - 简化
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

    // 关键功能 - 需要暴露给模板的AI大纲函数
    const openAIOutlineGenerator = (chapter) => {
      debugLog('Opening AI outline generator for chapter:', chapter.title);
      aiOutlineModal.show = true;
      aiOutlineModal.chapter = chapter;
      aiOutlineModal.content = chapter.content || '';
      
      // 默认选择当前章节和前两章
      aiOutlineModal.selectedChapters = [chapter.id];
      
      const chapterIndex = chapters.value.findIndex(c => c.id === chapter.id);
      if (chapterIndex > 0) {
        aiOutlineModal.selectedChapters.push(chapters.value[chapterIndex - 1].id);
        if (chapterIndex > 1) {
          aiOutlineModal.selectedChapters.push(chapters.value[chapterIndex - 2].id);
        }
      }
    };

    const closeAIOutlineGenerator = () => {
      debugLog('Closing AI outline generator');
      aiOutlineModal.show = false;
    }

    const generateAIOutline = () => {
      if (!aiOutlineModal.content) {
        showToast('请输入需要生成大纲的正文', 'error')
        return
      }
      
      // 简化为显示消息
      showToast('AI大纲生成示例：已触发生成功能', 'success')
      closeAIOutlineGenerator()
    }

    const showPromptTemplates = () => {
      aiOutlineModal.selectedTemplate = '大纲生成-【详细大纲】'
    }

    // 大纲卡片显示状态
    const expandedOutlineCards = ref(['levelSetting', 'worldSetting'])

    const toggleOutlineCard = (cardType) => {
      if (expandedOutlineCards.value.includes(cardType)) {
        expandedOutlineCards.value = expandedOutlineCards.value.filter(type => type !== cardType)
      } else {
        expandedOutlineCards.value.push(cardType)
      }
    }

    // 添加章节上移功能
    const moveChapterUp = async () => {
      if (!contextMenu.targetChapter) return
      
      const targetId = contextMenu.targetChapter.id
      const index = chapters.value.findIndex(c => c.id === targetId)
      
      if (index > 0) {
        // 交换当前章节与上一章节
        [chapters.value[index], chapters.value[index - 1]] = [chapters.value[index - 1], chapters.value[index]]
        await saveCurrentChapter()
        showToast('章节已上移', 'success')
      } else {
        showToast('已经是第一章', 'info')
      }
      
      closeContextMenu()
    }

    // 添加章节下移功能
    const moveChapterDown = async () => {
      if (!contextMenu.targetChapter) return
      
      const targetId = contextMenu.targetChapter.id
      const index = chapters.value.findIndex(c => c.id === targetId)
      
      if (index !== -1 && index < chapters.value.length - 1) {
        // 交换当前章节与下一章节
        [chapters.value[index], chapters.value[index + 1]] = [chapters.value[index + 1], chapters.value[index]]
        await saveCurrentChapter()
        showToast('章节已下移', 'success')
      } else {
        showToast('已经是最后一章', 'info')
      }
      
      closeContextMenu()
    }

    // 修改重命名功能
    const renameChapter = (chapter = null) => {
      // 确定目标章节
      const targetChapter = chapter || contextMenu.targetChapter
      if (!targetChapter) return
      
      // 先打开章节
      openChapter(targetChapter.id)
      
      // 使用nextTick确保UI已更新
      nextTick(() => {
        // 找到标题输入框并聚焦
        const titleInput = document.querySelector('.chapter-title-input')
        if (titleInput) {
          titleInput.focus()
          // 选中全部文本以便用户可以直接覆盖
          titleInput.select()
        }
      })
      
      // 关闭上下文菜单(如果是从上下文菜单调用)
      if (!chapter) {
        closeContextMenu()
      }
    }

    // 组件生命周期钩子
    onMounted(async () => {
      window.addEventListener('beforeunload', beforeUnloadHandler)
      await loadChapters()
      
      if (chapters.value.length > 0 && !currentChapterId.value) {
        openChapter(chapters.value[0].id)
      }
      
      window.addEventListener('keydown', handleKeyDown)
      
      // 重新加载最新的模型信息
      const latestModelInfo = loadModelInfo()
      modelInfo.value = latestModelInfo
      
      // 设置默认模型
      if (latestModelInfo[0]?.id) {
        aiSettings.model = latestModelInfo[0].id
        aiOutlineModal.model = latestModelInfo[0].id
      }
    })

    onBeforeUnmount(() => {
      if (contentChanged.value || titleChanged.value) {
        saveCurrentChapter()
      }
      
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      document.removeEventListener('click', closeContextMenuOnOutsideClick)
      
      if (autoSaveTimeout.value) {
        clearTimeout(autoSaveTimeout.value)
      }
      
      window.removeEventListener('keydown', handleKeyDown)
    })

    const beforeUnloadHandler = (event) => {
      if (contentChanged.value || titleChanged.value) {
        event.preventDefault()
        event.returnValue = '您有未保存的更改，确定要离开吗？'
        return event.returnValue
      }
    }

    return {
      // 编辑器基础
      isFullscreen,
      showSidebar,
      editorContent,
      chapters,
      currentChapterId,
      currentChapter,
      wordCount,
      contextMenu,
      
      // 编辑器核心功能
      openChapter,
      saveCurrentChapter,
      createNewChapter,
      showContextMenu,
      deleteChapter,
      onContentUpdate,
      insertTab,
      onPaste,
      toggleFullscreen,
      toggleSidebar,
      
      // 设置相关
      fontSettings,
      backgroundSettings,
      applyFontSettings,
      applyBackgroundSettings,
      handleImageUpload,
      
      // 历史记录与格式化
      undo,
      redo,
      history,
      formatContent,
      
      // 搜索替换
      searchState,
      findText,
      replaceText,
      calculateWordCount,
      
      // AI面板相关 - 简化保留
      showAiPanel,
      currentPanel,
      currentPanelTitle,
      aiSettings,
      openPanel,
      toggleAiPanel,
      generateIdea,
      closeAiPanel,
      
      // 侧边栏和大纲
      sidebarTab,
      expandedChapters,
      switchSidebarTab,
      toggleChapterOutline,
      calculateOutlineWordCount,
      outlineSettings,
      outlineEditorModal,
      aiOutlineModal,
      openOutlineEditor,
      closeOutlineEditor,
      saveOutlineEditor,
      
      // 重要的：确保暴露这些AI大纲函数给模板
      openAIOutlineGenerator,
      closeAIOutlineGenerator,
      showPromptTemplates,
      generateAIOutline,
      expandedOutlineCards,
      toggleOutlineCard,

      // 新增章节上移和下移功能
      moveChapterUp,
      moveChapterDown,
      renameChapter,

      // 添加模型信息
      modelInfo,
      availableModels,
    }
  }
}
</script>

<style>
@import url('../styles/editor.css');
</style> 