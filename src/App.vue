<template>
  <div class="container">    
    <!-- 其他视图内容 -->
    <div class="content-area" v-if="currentView !== 'editor'">
  
      <!-- 主要内容区域 -->
      <div v-if="currentView === 'main'" class="main-content">
        <!-- 左侧提示词模板区 -->
        <div class="prompt-panel" :style="{ width: promptPanelWidth + 'px' }">
          <div class="panel-header">
            <h2>(v{{ version }})</h2>
            <div class="header-actions" >
              <button @click="showTagModal = true" title="管理标签">
                <i class="fas fa-tags"></i> 
              </button>
              <button @click="createNewPrompt" title="新建提示词">
                <i class="fas fa-plus"></i> 
              </button>
              <button @click="showSettings = true" title="设置">
                <i class="fas fa-cog"></i>
              </button>
              <button @click="showBuiltInPrompts = true" title="导入提示词">
                <i class="fas fa-cloud-download-alt"></i>
              </button>
              <select class="category-select" v-model="selectedCategory" @change="filterPrompts">
                <option value="">所有分类</option>
                <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
              </select>
            </div>
          </div>
          <div class="prompt-panel-header">
            <div class="header-actions">
            <button @click="exportPrompts">
              <i class="fas fa-file-export"></i> 导出提示词
            </button>
            <label class="import-btn">
              <input 
                type="file" 
                multiple
                accept=".txt,.md,.json,.text"
                @change="importPrompts"
                ref="promptFileInput"
              >
              <i class="fas fa-file-import"></i> 导入提示词
            </label>
          </div>
          </div>
          <div class="prompt-list">
            <div 
              v-for="prompt in filteredPrompts" 
              :key="prompt.id"
              class="prompt-item"
              :class="{ 
                'can-insert': canInsertText(prompt),
                'has-content': hasInsertedContent(prompt),
                'drag-over': dragOverPromptId === prompt.id 
              }"
              @dragover="handlePromptDragOver(prompt, $event)"
              @dragleave="handlePromptDragLeave()"
              @drop="handlePromptDrop(prompt, $event)"
            >
              <div class="prompt-content">
                <h3>{{ prompt.title }}</h3>
                <div class="prompt-tags">
                  <span v-for="tag in prompt.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
                <div class="prompt-category">分类: {{ prompt.category }}</div>
                <div class="prompt-info">
                  <template v-if="canInsertText(prompt)">
                    <span>可插入数量: {{ getInsertCount(prompt.userPrompt) }}</span>
                    <div v-if="prompt.insertedContents?.length" class="inserted-contents">
                      <div v-for="(content, index) in prompt.insertedContents" 
                           :key="index" 
                           class="inserted-content">
                        <span>插入 {{index + 1}}: {{ truncateText(content.content) }}</span>
                        <button @click.stop="removeInsertedContent(prompt, index)">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <div class="card-footer">
                <div class="model-select">
                  <select v-model="prompt.selectedModel">
                    <option value="">选择模型</option>
                    <option 
                      v-for="model in models" 
                      :key="model.id" 
                      :value="model.id"
                    >
                      {{ model.name }}
                    </option>
                  </select>
                </div>
                <div class="action-buttons">
                  <button @click.stop="editPrompt(prompt)" class="edit-btn">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click.stop="deletePrompt(prompt.id)" class="delete-btn">
                    <i class="fas fa-trash"></i>
                  </button>
                  <button 
                    @click.stop="handleSendPrompt(prompt)"
                    :disabled="!canSendRequest(prompt) || !prompt.selectedModel"
                    class="send-btn"
                    :class="{ 'ready': canSendRequest(prompt) && prompt.selectedModel }"
                  >
                    <i class="fas fa-paper-plane"></i>
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- 面板调整器 -->
          <div 
            class="panel-resizer"
            @mousedown="startPanelResize"
          ></div>
        </div>

        <!-- 右侧内容区改为场景管理 -->
        <div class="scenes-container">
          <div class="scenes-header">
            <div class="scene-tabs">
              <draggable 
                v-model="scenes"
                class="scene-tabs"
                item-key="id"
                handle=".scene-name"
                @start="dragScene=true"
                @end="dragScene=false"
              >
                <template #item="{ element: scene }">
                  <div 
                    class="scene-tab"
                    :class="{ 
                      active: currentScene?.id === scene.id,
                      'is-dragging': dragScene && currentScene?.id === scene.id
                    }"
                  >
                    <span class="scene-name" @click="switchScene(scene)">
                      <i class="fas fa-grip-lines"></i>
                      {{ scene.name }}
                    </span>
                    <div class="scene-actions">
                      <button 
                        class="edit-name-btn"
                        @click.stop="editSceneName(scene)"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button 
                        v-if="scenes.length > 1"
                        @click.stop="deleteScene(scene.id)"
                        class="delete-scene-btn"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
            <button @click="createNewScene">
              <i class="fas fa-plus"></i> 新建场景
            </button>
            <label class="import-btn">
              <input 
                type="file" 
                multiple 
                accept=".txt,.md,.json,.jsonl"
                @change="handleFilesImport"
                ref="fileInput"
              >
              <i class="fas fa-file-import"></i> 导入场景
            </label>
            <button @click="exportScene">
              <i class="fas fa-file-export"></i> 导出
            </button>
          </div>
          
          <Scene
            v-if="currentScene"
            v-model:scene="currentScene"
            :scenes="scenes"
            :text-cards="textCards"
            :selected-cards="selectedCards"
            :prompts="prompts"
            :insertable-prompts="insertablePrompts"
            :models="models"
            :tags="tags"
            :selected-tags="selectedTags"
            @view-card="viewCardDetail"
            @delete-card="deleteCard"
            @update-card="updateCard"
            @insert-prompt-at-cursor="insertPromptAtCursor"
            @move-card="handleMoveCard"
            @merge-cards="handleMergeCards"
            @add-to-notepad="handleAddToNotepad"
            @delete-scene="handleDeleteScene"
            :scene="currentScene"
            :selected-prompt="selectedPrompt"
            @insert-to-prompt="handleInsertToPrompt"
            @remove-inserted-content="handleRemoveInsertedContent"
            @select-prompt="selectPrompt"
            @insert-prompt="handleInsertPrompt"
          />
        </div>
      </div>
          <!-- 暂时解决方案，以后记得修改路由方式，统一使用v-if-->
      <router-view />
      <BookSplitter 
        v-if="currentView === 'book'"
        :scenes="scenes"
        :prompts="prompts"
        :models="models"
        @convert-to-cards="handleBatchConvertToCards"
      />
      <ChatView
        v-else-if="currentView === 'chat'"
        :models="models"
        :scenes="scenes"
        :prompts="prompts"
        @add-cards-to-scene="handleAddCardsToScene"
      />
      <NotePad 
        v-if="currentView === 'note'" 
        :scenes="scenes"
        :initial-content="notepadInitialContent"
        :prompts="prompts"
        :models="models"
      />
      <AgentsView 
        v-else-if="currentView === 'agents'"
        :models="models"
        :scenes="scenes"
        @update-scene="handleSceneUpdate"
      />
      <AIDetector
        v-else-if="currentView === 'detector'"
        :models="models"
      />
      <KnowledgeBase 
        v-if="currentView === 'knowledge'"
        :models="models"
      />
      <KnowledgeGraph
        v-if="currentView === 'knowledgeGraph'"
      />
      <CloudSync
        v-if="currentView === 'cloudSync'"
      />
    </div>


    <router-view v-else />
    <!-- 视图切换按钮 -->
    <div class="view-switcher">
      <button 
        :class="{ active: currentView === 'main' }"
        @click="navigateTo('main')"
        title="首页/卡片"
      >
        <i class="fas fa-home"></i>
      </button>
      <button 
        :class="{ active: currentView === 'book' }"
        @click="navigateTo('book')"
        title="拆书"
      >
        <i class="fas fa-book"></i>
      </button>
      <button 
        :class="{ active: currentView === 'chat' }"
        @click="navigateTo('chat')"
        title="对话"
      >
        <i class="fas fa-comments"></i>
      </button>
      <button 
        :class="{ active: currentView === 'note' }"
        @click="navigateTo('note')"
        title="写作助手"
      >
        <i class="fas fa-sticky-note"></i>
      </button>
      <button 
        @click="navigateTo('agents')" 
        :class="{ active: currentView === 'agents' }"
        title="全自动工作流"
      >
        <i class="fas fa-robot"></i>
      </button>
      <button 
        @click="navigateTo('detector')" 
        :class="{ active: currentView === 'detector' }"
        title="AI检测"
      >
        <i class="fas fa-search"></i>
      </button>
      <button 
        @click="navigateTo('knowledge')" 
        :class="{ active: currentView === 'knowledge' }"
        title="知识库"
      >
        <i class="fas fa-database"></i>
      </button>
      <button 
        @click="() => { navigateTo('knowledgeGraph'); }" 
        :class="{ active: currentView === 'knowledgeGraph' }"
        title="知识图谱"
      >
        <i class="fas fa-project-diagram"></i>
      </button>
      <button 
        @click="() => { navigateTo('cloudSync'); }" 
        :class="{ active: currentView === 'cloudSync' }"
        title="云同步"
      >
        <i class="fas fa-cloud-upload-alt"></i>
      </button>
    </div>
  
  </div>

      <!-- 提示词选择模态框 -->
      <Teleport to="body">
      <div v-if="showPromptSelectModal" class="modal" @click="showPromptSelectModal = false">
        <div class="modal-content" @click.stop>
          <h3>选择提示词模板</h3>
          <div class="prompt-list">
            <div 
              v-for="prompt in prompts" 
              :key="prompt.id"
              class="prompt-item"
              @click="selectPromptAndCheck(prompt)"
            >
              <h4>{{ prompt.title || '未命名提示词' }}</h4>
              <p class="prompt-template">
                {{ prompt.userPrompt ? truncateText(prompt.userPrompt, 100) : '无内容' }}
              </p>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showPromptSelectModal = false" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </Teleport>


     <!-- 提示词编辑模态框 -->
     <div v-if="showPromptModal" class="modal" @click.self="closePromptModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPrompt ? '编辑提示词' : '新建提示词' }}</h3>
          <button @click="closePromptModal" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>标题</label>
            <input v-model="promptForm.title" placeholder="输入提示词标题">
          </div>
          <div class="form-group">
            <label>分类</label>
            <select v-model="promptForm.category">
              <option value="">选择分类</option>
              <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
            </select>
          </div>
          <div class="prompt-inputs">
            <div class="prompt-input-group">
              <label>
                系统提示词
                <i class="fas fa-info-circle" title="设置AI助手的角色和行为准则"></i>
              </label>
              <textarea
                v-model="promptForm.systemPrompt"
                class="system-prompt-input"
                placeholder="输入系统提示词，用于设置AI助手的角色和行为准则..."
              ></textarea>
            </div>
            <div class="prompt-input-group">
              <label>
                用户提示词
                <i class="fas fa-info-circle" title="使用{{text}}作为插入内容的占位符"></i>
              </label>
              <textarea
                v-model="promptForm.userPrompt"
                class="user-prompt-input"
                placeholder="输入用户提示词，使用{{text}}作为插入内容的占位符..."
              ></textarea>
            </div>
          </div>
          <div class="form-group">
            <label>默认模型</label>
            <select v-model="promptForm.defaultModel">
              <option value="">选择默认模型</option>
              <option 
                v-for="model in models" 
                :key="model.id" 
                :value="model.id"
              >
                {{ model.name }}
              </option>
            </select>
          </div>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="promptForm.detectKeywords"
                class="custom-checkbox"
              />
              <span class="checkbox-text">检测关键词</span>
              <span class="checkbox-description">
                启用后将自动检测提示词中的关键词并添加相关上下文
              </span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closePromptModal" class="cancel-btn">取消</button>
          <button @click="savePrompt" class="save-btn">保存</button>
        </div>
      </div>
    </div>

    <!-- 设置模态框 -->
    <div v-if="showSettings" class="modal">
      <div class="modal-content settings-modal">
        <div class="modal-header">
          <h3>应用设置</h3>
          <button @click="showSettings = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="settings-body">
          <!-- 添加字体大小设置部分 -->
          <div class="settings-section">
            <h4>界面设置</h4>
            <div class="form-group">
              <label>字体大小</label>
              <div class="font-size-control">
                <button @click="decreaseFontSize" class="font-size-btn">
                  <i class="fas fa-minus"></i>
                </button>
                <span class="font-size-value">{{ fontSizeLevel }}级 ({{ baseFontSize }}px)</span>
                <button @click="increaseFontSize" class="font-size-btn">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
            
            <!-- 添加卡片布局设置 -->
            <div class="form-group">
              <label>卡片布局</label>
              <div class="card-layout-control">
                <div class="layout-option">
                  <input 
                    type="radio" 
                    id="layout-auto" 
                    v-model="cardLayoutMode" 
                    value="auto"
                  />
                  <label for="layout-auto">自适应布局</label>
                </div>
                <div class="layout-option">
                  <input 
                    type="radio" 
                    id="layout-fixed" 
                    v-model="cardLayoutMode" 
                    value="fixed"
                  />
                  <label for="layout-fixed">固定列数</label>
                </div>
              </div>
              
              <!-- 固定列数时显示列数控制 -->
              <div v-if="cardLayoutMode === 'fixed'" class="columns-control">
                <label>每行显示列数</label>
                <div class="columns-slider">
                  <button @click="decreaseColumns" class="columns-btn">
                    <i class="fas fa-minus"></i>
                  </button>
                  <span class="columns-value">{{ cardColumns }}列</span>
                  <button @click="increaseColumns" class="columns-btn">
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
              </div>
            </div>
            <!-- 添加关键词检测设置 -->
            <div class="form-group">
              <label>关键词检测</label>
              <div class="keyword-detection-control">
                <div class="detection-option">
                  <input 
                    type="checkbox" 
                    id="show-keyword-modal" 
                    v-model="showKeywordDetectionModal"
                  />
                  <label for="show-keyword-modal">显示关键词匹配选择弹窗</label>
                  <span class="setting-description">
                    开启后，在处理提示词时会显示关键词匹配内容的选择弹窗
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="models-list">
            <div 
              v-for="model in models" 
              :key="model.id"
              class="model-item"
            >
              <div class="model-info">
                <div class="form-group">
                  <label>模型名称</label>
                  <input v-model="model.name" placeholder="模型显示名称"/>
                </div>
                <div class="form-group">
                  <label>提供商</label>
                  <select v-model="model.provider">
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="stepfun">阶跃星辰</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="ollama">Ollama</option>
                    <option value="embedding">嵌入式</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div class="form-group" v-if="model.provider === 'openai'">
                  <label>选择输入方式</label>
                  <select v-model="model.inputMethod">
                    <option value="input">输入模型</option>
                    <option value="fetch">拉取模型</option>
                  </select>
                </div>
                <div class="form-group" v-if="model.provider !== 'gemini'">
                  <label>API 地址</label>
                  <input 
                    v-model="model.apiUrl" 
                    placeholder="API 地址"
                  />
                </div>
                <div class="form-group">
                  <label>API Key</label>
                  <input 
                    v-model="model.apiKey" 
                    type="password" 
                    placeholder="API Key"
                    :disabled="model.provider === 'ollama'"
                  />
                </div>
                <div class="form-group">
                  <label>模型选择</label>
                  <div class="model-actions">
                    <template v-if="
                      model.provider === 'custom' || 
                      model.provider === 'gemini' || 
                      model.provider === 'embedding' || 
                      (model.provider === 'openai' && model.inputMethod === 'input')
                      ">
                      <input 
                        v-model="model.modelId"
                        :placeholder="model.provider === 'gemini' ? 'gemini-pro' : '输入模型ID'"
                        class="model-input"
                      />
                    </template>
                    <template v-else>
                      <select v-model="model.modelId" class="model-select">
                        <option value="">选择模型</option>
                        <option 
                          v-for="m in model.availableModels" 
                          :key="m.id" 
                          :value="m.id"
                        >
                          {{ m.name }}
                          <template v-if="model.provider === 'ollama' && m.digest">
                            ({{ m.digest.substring(0, 8) }})
                          </template>
                        </option>
                      </select>
                      <button 
                        @click="refreshModelList(model)"
                        class="refresh-btn"
                        :disabled="!model.apiUrl"
                      >
                        <i class="fas fa-sync-alt"></i>
                        刷新
                      </button>
                    </template>
                  </div>
                </div>
                <div class="form-group">
                  <label>最大 Tokens</label>
                  <input v-model="model.maxTokens" type="number" placeholder="2048"/>
                </div>
                <div class="form-group">
                  <label>Temperature</label>
                  <input 
                    v-model="model.temperature" 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="1" 
                    placeholder="0.7"
                  />
                </div>
              </div>
              <button @click="deleteModel(model.id)" class="delete-model-btn">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="settings-actions">
            <button @click="addModel" class="add-btn">
              <i class="fas fa-plus"></i> 添加模型
            </button>
            <button @click="saveModels" class="save-btn">
              <i class="fas fa-save"></i> 保存设置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示词详情模态框 -->
    <div v-if="showPromptDetailModal" class="modal">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <h3>{{ selectedPrompt.title }}</h3>
          <button @click="showPromptDetailModal = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <pre class="template-detail">{{ selectedPrompt.userPrompt }}</pre>
        </div>
      </div>
    </div>

    <!-- 卡片详情模态框 -->
    <div v-if="showCardDetailModal" class="modal">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <div class="card-title-input">
            <input 
              v-model="selectedCard.title" 
              placeholder="输入标题..."
              class="title-input"
            />
          </div>
          <div class="modal-actions">
            <button @click="togglePreview" class="preview-btn">
              <i :class="isPreview ? 'fas fa-edit' : 'fas fa-eye'"></i>
              {{ isPreview ? '编辑' : '预览' }}
            </button>
            <button @click="showCardDetailModal = false" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="modal-body">
          <div v-if="!isPreview" class="editor-container">
            <div class="editor-toolbar">
              <button @click="insertMdSyntax('**', '**')" title="粗体">
                <i class="fas fa-bold"></i>
              </button>
              <button @click="insertMdSyntax('*', '*')" title="斜体">
                <i class="fas fa-italic"></i>
              </button>
              <button @click="insertMdSyntax('### ', '')" title="标题">
                <i class="fas fa-heading"></i>
              </button>
              <button @click="insertMdSyntax('- ', '')" title="列表">
                <i class="fas fa-list"></i>
              </button>
              <button @click="insertMdSyntax('[', '](url)')" title="链接">
                <i class="fas fa-link"></i>
              </button>
              <button @click="insertMdSyntax('```\n', '\n```')" title="代码块">
                <i class="fas fa-code"></i>
              </button>
            </div>
            <textarea 
              v-model="selectedCard.content"
              class="card-detail-content"
              @input="updateCard(selectedCard)"
              ref="editorTextarea"
            ></textarea>
          </div>
          <div v-else class="preview-container markdown-body" v-html="renderedContent"></div>
        </div>
      </div>
    </div>

    <!-- 添加标签管理模态框 -->
    <div v-if="showTagModal" class="modal">
      <div class="modal-content tag-modal">
        <div class="modal-header">
          <h3>标签管理</h3>
          <button @click="showTagModal = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="tag-form">
          <div class="form-group">
            <input 
              v-model="newTagName" 
              placeholder="输入新标签名称"
              @keyup.enter="addTag"
            />
            <button @click="addTag" class="add-tag-btn">
              <i class="fas fa-plus"></i> 添加
            </button>
          </div>
        </div>
        <div class="tags-list">
          <div v-for="tag in tags" :key="tag.id" class="tag-item">
            <span>{{ tag.name }}</span>
            <div class="tag-actions">
              <button 
                class="toggle-keyword-btn"
                :class="{ 'is-keyword': tag.isKeyword }"
                @click="toggleTagKeyword(tag.id)"
                title="设为关键词标签"
              >
                <i class="fas fa-key"></i>
              </button>
              <button 
                class="delete-tag-btn"
                @click="deleteTag(tag.id)"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加内置提示词模态框 -->
    <div v-if="showBuiltInPrompts" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>内置提示词</h3>
          <button @click="showBuiltInPrompts = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="built-in-prompts-list">
            <div 
              v-for="prompt in builtInPrompts" 
              :key="prompt.id"
              class="built-in-prompt-item"
            >
              <div class="prompt-info">
                <h4>{{ prompt.title }}</h4>
                <div class="prompt-tags">
                  <span 
                    v-for="tag in prompt.tags" 
                    :key="tag" 
                    class="tag"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="prompt-category">{{ prompt.category }}</div>
              </div>
              <button 
                @click="importBuiltInPrompt(prompt)"
                :disabled="isPromptImported(prompt.id)"
              >
                <i class="fas fa-download"></i>
                {{ isPromptImported(prompt.id) ? '已导入' : '导入' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 在其他模态框后添加关键词选择模态框 -->
    <div v-if="showKeywordModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>选择要包含的关联内容</h3>
          <button @click="closeKeywordModal" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body keyword-matches">
          <div class="select-all">
            <label>
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                @change="toggleAll"
              >
              全选
            </label>
          </div>
          <div 
            v-for="(match, index) in keywordMatches" 
            :key="index" 
            class="keyword-match-item"
            :class="{ 'is-group': match.type === 'group' }"
          >
            <div class="match-header">
              <div class="match-title-group">
                <label>
                  <input 
                    type="checkbox"
                    v-model="match.selected"
                    @change="handleMatchSelection(match)"
                  >
                  <span class="keyword-title">{{ match.title }}</span>
                </label>
                <!-- 添加编辑按钮,仅卡组显示 -->
                <button 
                  v-if="match.type === 'group'"
                  @click="editGroupCards(match)"
                  class="edit-group-btn"
                  :class="{ 'is-edited': match.selectedCards?.length > 0 }"
                >
                  <i class="fas fa-edit"></i>
                  <span v-if="match.selectedCards?.length" class="selected-count">
                    {{ match.selectedCards.length }}
                  </span>
                </button>
              </div>
            </div>
            <div class="keyword-preview">{{ truncateText(match.content, 100) }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeKeywordModal" class="cancel-btn">取消</button>
          <button @click="confirmKeywordSelection" class="save-btn">确认</button>
        </div>
      </div>
    </div>

    <!-- 添加卡组卡片选择模态框 -->
    <div v-if="showGroupCardsModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>选择卡组内的卡片</h3>
          <button @click="closeGroupCardsModal" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="select-all">
            <label>
              <input 
                type="checkbox" 
                :checked="isAllGroupCardsSelected"
                @change="toggleAllGroupCards"
              >
              全选
            </label>
          </div>
          <div class="group-cards-list">
            <div 
              v-for="card in currentEditingGroup.cards" 
              :key="card.id"
              class="group-card-item"
            >
              <div class="group-card-content">
                <label>
                  <input 
                    type="checkbox"
                    v-model="selectedGroupCards"
                    :value="card"
                  >
                  <span>{{ card.title || '未命名卡片' }}</span>
                  <button 
                    @click="viewCardDetail(card)"
                    class="edit-card-btn"
                    title="编辑卡片"
                  >
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeGroupCardsModal" class="cancel-btn">取消</button>
          <button @click="confirmGroupCardSelection" class="save-btn">确认</button>
        </div>
      </div>
    </div>

    <!-- 添加占位符选择模态框 -->
    <div v-if="showPlaceholderModal" class="modal" @click="closePlaceholderModal">
      <div class="modal-content" @click.stop>
        <h3>选择要插入的位置</h3>
        <div class="placeholder-list">
          <div 
            v-for="(placeholder, index) in currentPlaceholders" 
            :key="index"
            class="placeholder-item"
            @click="handlePlaceholderSelect(index)"
          >
            <h4>占位符 {{index + 1}}</h4>
            <div class="placeholder-content">
              <div v-if="placeholder.hasContent" class="existing-content">
                当前内容: {{ truncateText(placeholder.content, 50) }}
              </div>
              <div class="placeholder-preview">
                位置预览: {{ getPlaceholderPreview(selectedPrompt.userPrompt, index) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>


<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'
import draggable from 'vuedraggable'
import Scene from './components/Scene.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import BookSplitter from './components/BookSplitter.vue'
import ChatView from './components/ChatView.vue'
import NotePad from './components/NotePad.vue'
import AgentsView from './components/AgentsView.vue'
import { showToast } from './utils/common'
import { useRoute, useRouter } from 'vue-router'
import { debugLog, setDebugMode } from './utils/debug'
import AIDetector from './components/AIDetector.vue'
import KnowledgeBase from './components/KnowledgeBase.vue'

import { 
  useScenes, 
  useCards, 
  usePrompts, 
  useTags, 
  useModels,
  useKeywordDetection,
  useUISettings,
  useDataManagement
} from './utils/composables'

// 添加版本号
const version = __APP_VERSION__

setDebugMode(true)

// 实用函数
const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

const route = useRoute()
const router = useRouter()

const currentView = ref('main')

// 路由监听
watch(() => route.path, (newPath) => {
  if (newPath === '/') {
    currentView.value = 'main'
  } else if (newPath.startsWith('/editor')) {
    currentView.value = 'editor'
    // 保存当前书籍ID
    const bookId = route.params.bookId
    if (bookId) {
      localStorage.setItem('currentBookId', bookId)
    }
  } else {
    // 从路径中提取视图名称
    const viewPath = newPath.substring(1) // 去掉开头的'/'
    if (['book', 'chat', 'note', 'agents', 'detector', 'knowledge', 'knowledgeGraph', 'cloudSync'].includes(viewPath)) {
      currentView.value = viewPath
    }
  }
})

// 初始化数据管理
const { 
  isLoading, 
  dataLoaded, 
  createSyncFunction, 
  loadAllData, 
  initializeData,
  handleFilesImport,
  saveImmediately
} = useDataManagement()

// 创建防抖的数据同步函数
const syncData = createSyncFunction(() => {
  if (!dataLoaded.value) return

  // 验证场景数据的完整性
  const validatedScenes = scenes.value.map(scene => ({
    ...scene,
    cards: (scene.cards || []).map(card => ({
      ...card,
      type: card.type || 'normal',
      cards: card.type === 'group' ? (card.cards || []) : undefined
    }))
  }))

  return {
    scenes: validatedScenes,
    prompts: prompts.value,
    tags: tags.value,
    chatSessions: window.chatSessions || [], // 尝试获取全局变量
    config: {
      models: models.value,
      notepadContent: notepadInitialContent.value,
      currentSceneId: currentScene.value?.id,
      selectedTags: selectedTags.value,
      currentView: currentView.value,
      fontSizeLevel: fontSizeLevel.value,
      cardLayoutMode: cardLayoutMode.value,
      cardColumns: cardColumns.value,
      showKeywordDetectionModal: showKeywordDetectionModal.value,
    }
  }
})

// Setup for notepad
const notepadInitialContent = ref('')
const editorTextarea = ref(null)

// Setup for drag
const dragScene = ref(false)
const dragOverPromptId = ref(null)

// Setup for card groups
const showGroupCardsModal = ref(false)
const currentEditingGroup = ref(null)
const selectedGroupCards = ref([])

// 初始化场景管理
const { 
  scenes, 
  currentScene, 
  createNewScene, 
  deleteScene,
  editSceneName,
  switchScene,
  exportScene,
  processCards,
  handleSceneUpdate,
  addCardsToScene
} = useScenes(syncData)

// 初始化卡片管理
const { 
  selectedCard, 
  showCardDetailModal, 
  deleteCard, 
  updateCard,
  viewCardDetail,
  moveCardToScene,
  addToNotepad,
  insertMdSyntax
} = useCards(syncData, scenes, currentScene)

// 初始化提示词管理
const { 
  prompts, 
  filteredPrompts,
  insertablePrompts,
  showPromptModal, 
  showPromptSelectModal,
  showPromptDetailModal,
  showPlaceholderModal,
  editingPrompt,
  selectedPrompt,
  promptForm,
  cardToInsert,
  currentPlaceholders,
  categories,
  selectedCategory,
  showBuiltInPrompts,
  builtInPrompts,
  createNewPrompt,
  editPrompt,
  closePromptModal,
  savePrompt,
  sendPromptRequest,
  importPrompts,
  exportPrompts,
  deletePrompt,
  insertContentToPrompt,
  hasInsertedContent,
  removeInsertedContent,
  selectPrompt,
  getInsertCount,
  canInsertText,
  canSendRequest,
  selectPromptAndCheck,
  handlePlaceholderSelect,
  closePlaceholderModal,
  getPlaceholderPreview,
  fetchBuiltInPrompts,
  isPromptImported,
  importBuiltInPrompt
} = usePrompts(syncData, scenes, currentScene)

// 初始化标签管理
const { 
  tags, 
  selectedTags, 
  showTagModal, 
  newTagName,
  addTag,
  deleteTag,
  toggleTagKeyword,
  toggleTagSelection,
  isTagSelected,
  getTagById,
  getTagNameById,
  filterCardsByTags
} = useTags(syncData, scenes)

// 初始化模型管理
const { 
  models, 
  showSettings, 
  PROVIDERS,
  createDefaultModel,
  addModel,
  deleteModel,
  saveModels,
  refreshModelList,
  findModelById,
  updateModel
} = useModels(syncData)

// 初始化关键词检测
const { 
  showKeywordModal, 
  keywordMatches, 
  showKeywordDetectionModal,
  isAllSelected,
  toggleAll,
  closeKeywordModal,
  confirmKeywordSelection,
  processKeywords,
  handleMatchSelection,
  toggleKeywordDetectionModal
} = useKeywordDetection(tags, scenes)

// 初始化 UI 设置
const { 
  fontSizeLevel,
  baseFontSize,
  cardLayoutMode,
  cardColumns,
  promptPanelWidth,
  isResizing,
  isPreview,
  increaseFontSize,
  decreaseFontSize,
  applyFontSize,
  increaseColumns,
  decreaseColumns,
  applyCardLayout,
  startPanelResize,
  handlePanelResize,
  stopPanelResize,
  preventTextSelection,
  togglePreview
} = useUISettings(syncData)

// 渲染 Markdown 内容
const renderedContent = computed(() => {
  if (!selectedCard.value?.content) return ''
  const rawHtml = marked(selectedCard.value.content)
  return DOMPurify.sanitize(rawHtml)
})

// 生命周期钩子
onMounted(async () => {
  try {
    // 加载数据
    const data = await loadAllData()
    
    // 初始化数据
    initializeData(data, {
      setScenes: (newScenes) => { scenes.value = newScenes.map(scene => ({ ...scene, cards: processCards(scene.cards || []) })) },
      setPrompts: (newPrompts) => { prompts.value = newPrompts },
      setTags: (newTags) => { tags.value = newTags },
      setModels: (newModels) => { models.value = newModels },
      setNotepadContent: (content) => { notepadInitialContent.value = content },
      setCurrentView: (view) => { currentView.value = view },
      setSelectedTags: (tags) => { selectedTags.value = tags },
      setCurrentScene: (scene) => { currentScene.value = scene },
      setFontSizeLevel: (level) => { 
        fontSizeLevel.value = level
        applyFontSize()
      },
      setCardLayoutMode: (mode) => { cardLayoutMode.value = mode },
      setCardColumns: (columns) => { 
        cardColumns.value = columns
        applyCardLayout()
      },
      setShowKeywordDetectionModal: (show) => { showKeywordDetectionModal.value = show }
    })
    
    // 设置自动同步
    setInterval(syncData, 10000) // 10秒自动同步一次
    
    // 获取内置提示词
    await fetchBuiltInPrompts()
    
    // 确保至少有一个场景
    if (scenes.value.length === 0) {
      await createNewScene()
    }
  } catch (error) {
    console.error('初始化失败:', error)
  }
})

// 监听数据变化
watch(
  [
    () => [...scenes.value], 
    () => currentScene.value,
    () => [...prompts.value],
    () => [...tags.value],
    () => [...models.value],
    () => selectedTags.value,
    () => currentView.value,
    () => dragScene.value
  ],
  async ([scenes, currentScene, prompts, tags, models, selectedTags, currentView, isDragging]) => {
    // 处理文本选择阻止
    preventTextSelection(isDragging)
    
    // 保存当前视图到本地存储
    if (currentView) {
      localStorage.setItem('currentView', currentView)
    }
    
    // 同步数据到后端
    await syncData()
  },
  { deep: true }
)

// 向子组件提供数据
provide('scenes', scenes)
provide('syncData', syncData)
provide('tags', tags)

// 向子组件提供移动到场景的方法
provide('moveToScene', (cardData, targetSceneId) => {
  const targetScene = scenes.value.find(s => s.id === targetSceneId)
  if (!targetScene) {
    console.error('Target scene not found:', targetSceneId)
    return
  }
  
  const newCard = {
    id: Date.now(),
    ...cardData
  }
  
  targetScene.cards.push(newCard)
  scenes.value = [...scenes.value]
  
  showToast(`已添加到场景「${targetScene.name}」`)
})

// 处理发送提示词请求
const handleSendPrompt = (prompt) => {
  if (!prompt) {
    showToast('提示词不存在', 'error')
    return
  }
  
  // 确保models和processKeywords都可用
  if (!Array.isArray(models.value)) {
    showToast('模型列表不可用', 'error')
    return
  }
  
  if (typeof processKeywords !== 'function') {
    console.error('processKeywords不是一个函数', processKeywords)
    showToast('关键词处理函数不可用', 'error')
    return
  }
  
  // 调用sendPromptRequest并传递所需参数
  return sendPromptRequest(prompt, processKeywords, models.value)
}

// 编辑卡组卡片
const editGroupCards = (group) => {
  currentEditingGroup.value = group
  selectedGroupCards.value = group.selectedCards || []
  showGroupCardsModal.value = true
}

// 计算卡组内是否全选
const isAllGroupCardsSelected = computed(() => {
  if (!currentEditingGroup.value?.cards) return false
  return currentEditingGroup.value.cards.length === selectedGroupCards.value.length
})

// 切换卡组内全选状态
const toggleAllGroupCards = (e) => {
  if (e.target.checked) {
    selectedGroupCards.value = [...(currentEditingGroup.value.cards || [])]
  } else {
    selectedGroupCards.value = []
  }
}

// 确认卡组卡片选择
const confirmGroupCardSelection = () => {
  if (currentEditingGroup.value) {
    currentEditingGroup.value.selectedCards = [...selectedGroupCards.value]
  }
  closeGroupCardsModal()
}

// 关闭卡组卡片选择模态框
const closeGroupCardsModal = () => {
  showGroupCardsModal.value = false
  currentEditingGroup.value = null
  selectedGroupCards.value = []
}

// 导航方法
const navigateTo = (view) => {
  if (view === 'main') {
    router.push('/')
  } else if (view === 'editor') {
    // 如果有当前选中的书籍，导航到该书籍
    const currentBookId = localStorage.getItem('currentBookId') || 'default'
    router.push(`/editor/${currentBookId}`)
  } else {
    // 导航到对应的路由
    router.push(`/${view}`)
  }
}

// 处理拖放
const handlePromptDragOver = (prompt, event) => {
  event.preventDefault()
  dragOverPromptId.value = prompt.id
}

const handlePromptDragLeave = () => {
  dragOverPromptId.value = null
}

const handlePromptDrop = async (prompt, event) => {
  event.preventDefault()
  dragOverPromptId.value = null
}

// 批量转换为卡片
const handleBatchConvertToCards = ({ cards, targetSceneId }) => {
  try {
    const targetScene = scenes.value.find(s => Number(s.id) === Number(targetSceneId));
    
    if (!targetScene) {
      throw new Error(`目标场景不存在 (ID: ${targetSceneId})`);
    }
    
    if (!Array.isArray(targetScene.cards)) {
      targetScene.cards = [];
    }
    
    targetScene.cards.push(...cards);
    
    syncData();
    
    currentView.value = 'main';
    currentScene.value = targetScene;
    
    showToast(`成功添加 ${cards.length} 个卡片到场景：${targetScene.name}`, 'success');
  } catch (error) {
    console.error('转换卡片失败:', error);
    showToast('转换卡片失败: ' + error.message, 'error');
  }
};

// 对外暴露方法
defineExpose({
  handleFilesImport: (event) => handleFilesImport(event, currentScene, scenes, syncData),
  exportScene
})
</script>

<style scoped>
@import url("./styles/app.css");
@import url("./styles/common.css");
</style>