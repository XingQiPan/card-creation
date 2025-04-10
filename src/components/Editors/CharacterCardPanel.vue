<template>
  <div class="character-card-panel">
    <div class="character-card-content">
      <!-- 添加tab切换 -->
      <div class="panel-tabs">
        <div class="tab" :class="{ 'active': currentTab === 'scene' }" @click="switchTab('scene')">场景</div>
        <div class="tab" :class="{ 'active': currentTab === 'character' }" @click="switchTab('character')">人物卡</div>
        <div class="tab-indicator" :style="{ transform: currentTab === 'character' ? 'translateX(100%)' : 'translateX(0)' }"></div>
      </div>

      <!-- 场景视图 -->
      <div v-if="currentTab === 'scene'" class="panel-section">
        <div class="section-header-row">
          <div class="section-header">场景列表</div>
          <button class="add-btn" @click="openAddSceneModal">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="scene-filter">
          <input type="text" v-model="sceneSearchKeyword" placeholder="搜索场景..." class="search-input" />
        </div>
        <div class="scene-list">
          <div v-if="filteredScenes.length === 0" class="empty-state">
            <p>未找到场景</p>
            <button @click="refreshSceneData" class="refresh-btn">
              <i class="fas fa-sync-alt"></i> 刷新场景数据
            </button>
          </div>
          <div v-else class="scene-items">
            <div 
              v-for="scene in filteredScenes" 
              :key="scene.id"
              :class="['scene-item', { 'active': selectedScene && selectedScene.id === scene.id }]"
              @click="selectScene(scene)"
            >
              <div class="scene-name">{{ scene.name }}</div>
              <div class="scene-actions">
                <div class="scene-info">{{ scene.characterCount || 0 }} 个角色</div>
                <button class="delete-btn" title="删除场景" @click.stop="confirmDeleteScene(scene)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 人物卡视图 -->
      <div v-if="currentTab === 'character'" class="panel-section character-full-height">
        <div class="section-header-row">
          <div class="section-header">所有人物卡</div>
          <button class="add-btn" @click="openAddCharacterModal">
            <i class="fas fa-plus"></i> 添加人物
          </button>
        </div>
        <div class="character-filter">
          <input type="text" v-model="allCharacterSearchKeyword" placeholder="搜索所有角色..." class="search-input" />
        </div>
        
        <div class="character-list full-height">
          <div v-if="filteredAllCharacters.length === 0" class="empty-state">
            <p>暂无角色</p>
          </div>
          <div v-else class="character-items">
            <div 
              v-for="character in filteredAllCharacters" 
              :key="character.id"
              class="character-card"
              @click="openCharacterDetail(character)"
            >
              <div class="character-header">
                <h4>{{ character.name }}</h4>
                <div class="character-actions">
                  <button class="edit-btn" title="编辑" @click.stop="editCharacter(character)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="delete-btn" title="删除" @click.stop="confirmDeleteCharacter(character)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="character-info">
                <div class="info-row"><span class="info-label">身份:</span> {{ character.role || '未知' }}</div>
                <div class="info-row"><span class="info-label">简介:</span> {{ character.description ? (character.description.length > 50 ? character.description.substring(0, 50) + '...' : character.description) : '暂无简介' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="selectedScene && currentTab === 'scene'" class="panel-section">
        <div class="section-header-row">
          <div class="section-header">{{ selectedScene.name }} - 角色列表</div>
          <button class="add-btn" @click="openAddCharacterModal">
            <i class="fas fa-plus"></i> 新增角色
          </button>
        </div>
        
        <div class="character-filter">
          <input type="text" v-model="characterSearchKeyword" placeholder="搜索角色..." class="search-input" />
        </div>
        
        <div class="character-list">
          <div v-if="filteredCharacters.length === 0" class="empty-state">
            <p>该场景下暂无角色</p>
          </div>
          <div v-else class="character-items">
            <div 
              v-for="character in filteredCharacters" 
              :key="character.id"
              class="character-card"
              @click="openCharacterDetail(character)"
            >
              <div class="character-header">
                <h4>{{ character.name }}</h4>
                <div class="character-actions">
                  <button class="edit-btn" title="编辑" @click.stop="editCharacter(character)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="delete-btn" title="删除" @click.stop="confirmDeleteCharacter(character)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="character-info">
                <div class="info-row"><span class="info-label">身份:</span> {{ character.role || '未知' }}</div>
                <div class="info-row"><span class="info-label">简介:</span> {{ character.description ? (character.description.length > 50 ? character.description.substring(0, 50) + '...' : character.description) : '暂无简介' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="primary-btn" @click="selectCharactersForCurrentChapter" v-if="selectedScene && currentTab === 'scene'">为当前章节选择角色</button>
    </div>
    
    <!-- 新增/编辑角色模态框 -->
    <div v-if="showCharacterFormModal" class="modal-overlay" @click.self="closeCharacterFormModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEditMode ? '编辑角色' : '新增角色' }}</h3>
          <button class="close-modal-btn" @click="closeCharacterFormModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>角色名称 <span class="required">*</span></label>
            <input type="text" v-model="characterForm.name" class="form-input" placeholder="请输入角色名称" />
          </div>
          <div class="form-row">
            <label>场景 <span class="required">*</span></label>
            <div class="scene-select-container">
              <input 
                type="text" 
                v-model="sceneFilterKeyword" 
                class="form-input scene-search" 
                placeholder="搜索或选择场景..." 
                @focus="showSceneDropdown = true"
                @input="filterScenes"
              />
              <div class="selected-scene" v-if="selectedSceneForCharacter">
                <span class="scene-tag">{{ selectedSceneForCharacter.name }}</span>
              </div>
              <div class="scene-dropdown" v-if="showSceneDropdown">
                <div class="dropdown-item" v-for="scene in filteredScenesForDropdown" :key="scene.id" @click="selectSceneForCharacter(scene)">
                  {{ scene.name }}
                </div>
                <div class="dropdown-empty" v-if="filteredScenesForDropdown.length === 0">
                  未找到匹配的场景
                </div>
              </div>
            </div>
          </div>
          <div class="form-row">
            <label>角色身份</label>
            <input type="text" v-model="characterForm.role" class="form-input" placeholder="如：主角、配角、反派等" />
          </div>
          <div class="form-row">
            <label>角色描述</label>
            <textarea v-model="characterForm.description" class="form-textarea" placeholder="描述角色的外貌、背景等基本信息"></textarea>
          </div>
          <div class="form-row">
            <label>性格特点</label>
            <textarea v-model="characterForm.personality" class="form-textarea" placeholder="描述角色的性格、行为模式等"></textarea>
          </div>
          <div class="form-row">
            <label>角色目标</label>
            <textarea v-model="characterForm.goals" class="form-textarea" placeholder="描述角色的动机、追求的目标等"></textarea>
          </div>
          <div class="form-row">
            <label>角色关系</label>
            <textarea v-model="characterForm.relationships" class="form-textarea" placeholder="描述与其他角色的关系"></textarea>
          </div>
          <div class="form-row">
            <label>词条</label>
            <div class="entry-select-container">
              <input 
                type="text" 
                v-model="entrySearchKeyword" 
                class="form-input entry-search" 
                placeholder="搜索词条..." 
                @focus="showEntryDropdown = true"
              />
              <div class="selected-entries" v-if="characterForm.entries.length > 0">
                <div v-for="entry in characterForm.entries" :key="entry.id" class="entry-tag">
                  {{ entry.title }}
                  <button class="remove-entry-btn" @click.stop="toggleEntry(entry)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <div class="entry-dropdown" v-if="showEntryDropdown">
                <div 
                  v-for="entry in filteredEntries" 
                  :key="entry.id"
                  class="dropdown-item"
                  @click="toggleEntry(entry)"
                >
                  <input type="checkbox" :checked="isEntrySelected(entry)" />
                  <div class="entry-info">
                    <div class="entry-title">{{ entry.title }}</div>
                    <div class="entry-description">{{ entry.description || '无描述' }}</div>
                  </div>
                </div>
                <div class="dropdown-empty" v-if="filteredEntries.length === 0">
                  未找到匹配的词条
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeCharacterFormModal">取消</button>
          <button class="save-btn" @click="saveCharacter">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 新增场景模态框 -->
    <div v-if="showSceneFormModal" class="modal-overlay" @click.self="closeSceneFormModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>新增场景</h3>
          <button class="close-modal-btn" @click="closeSceneFormModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>场景名称 <span class="required">*</span></label>
            <input type="text" v-model="sceneForm.name" class="form-input" placeholder="请输入场景名称" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeSceneFormModal">取消</button>
          <button class="save-btn" @click="saveScene">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 删除场景确认模态框 -->
    <div v-if="showDeleteSceneModal" class="modal-overlay" @click.self="closeDeleteSceneModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认删除场景</h3>
          <button class="close-modal-btn" @click="closeDeleteSceneModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>确定要删除场景 "{{ sceneToDelete?.name }}" 吗？此操作将同时删除该场景下的所有角色，且不可恢复。</p>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDeleteSceneModal">取消</button>
          <button class="delete-btn danger" @click="deleteScene">删除</button>
        </div>
      </div>
    </div>
    
    <!-- 删除确认模态框 -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay" @click.self="closeDeleteConfirmModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认删除</h3>
          <button class="close-modal-btn" @click="closeDeleteConfirmModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>确定要删除角色 "{{ characterToDelete?.name }}" 吗？此操作不可恢复。</p>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDeleteConfirmModal">取消</button>
          <button class="delete-btn danger" @click="deleteCharacter">删除</button>
        </div>
      </div>
    </div>

    <!-- 角色详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>角色详情</h3>
          <button class="close-modal-btn" @click="closeDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="character-detail">
            <div class="detail-header">
              <div class="detail-avatar" :style="{ backgroundImage: selectedCharacter && selectedCharacter.avatar ? `url(${selectedCharacter.avatar})` : 'none' }">
                <div v-if="!selectedCharacter || !selectedCharacter.avatar" class="avatar-placeholder large">
                  {{ selectedCharacter ? (selectedCharacter.name ? selectedCharacter.name.charAt(0).toUpperCase() : '?') : '?' }}
                </div>
              </div>
              <div class="detail-title">
                <h3>{{ selectedCharacter ? selectedCharacter.name : '' }}</h3>
                <div class="detail-subtitle">
                  {{ selectedCharacter ? (selectedCharacter.role || '未知身份') : '' }} 
                  ({{ selectedCharacter ? getSceneName(selectedCharacter.sceneId) : '' }})
                </div>
              </div>
            </div>
            
            <div class="detail-content">
              <div class="detail-row">
                <div class="detail-label">描述</div>
                <div class="detail-text">{{ selectedCharacter ? (selectedCharacter.description || '暂无描述') : '' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">性格</div>
                <div class="detail-text">{{ selectedCharacter ? (selectedCharacter.personality || '暂无性格描述') : '' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">目标</div>
                <div class="detail-text">{{ selectedCharacter ? (selectedCharacter.goals || '暂无目标描述') : '' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">关系</div>
                <div class="detail-text">{{ selectedCharacter ? (selectedCharacter.relationships || '暂无关系描述') : '' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">词条</div>
                <div class="detail-text">
                  <div v-if="selectedCharacter && selectedCharacter.entries && selectedCharacter.entries.length > 0" class="character-entries">
                    <div 
                      v-for="entry in selectedCharacter.entries" 
                      :key="entry.id"
                      class="entry-tag clickable"
                      @click="openEntryDetail(entry)"
                    >
                      {{ entry.title }}
                    </div>
                  </div>
                  <div v-else>暂无关联词条</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDetailModal">关闭</button>
          <button class="primary-btn" @click="editSelectedCharacter">编辑</button>
        </div>
      </div>
    </div>

    <!-- 词条详情弹窗 -->
    <div v-if="showEntryDetailModal" class="modal-overlay" @click.self="closeEntryDetailModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>词条详情</h3>
          <button class="close-modal-btn" @click="closeEntryDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="entry-detail">
            <div class="detail-header">
              <div class="detail-title">
                <h3>{{ selectedEntry ? selectedEntry.title : '' }}</h3>
              </div>
            </div>
            
            <div class="detail-content">
              <div class="detail-row">
                <div class="detail-label">描述</div>
                <div class="detail-text">{{ selectedEntry ? (selectedEntry.description || '无描述') : '' }}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">详细内容</div>
                <div class="detail-text markdown">{{ selectedEntry ? (selectedEntry.content || '无内容') : '' }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEntryDetailModal">关闭</button>
          <button class="primary-btn" @click="editSelectedEntry">编辑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, inject } from 'vue';
import { showToast } from '../../utils/common';
import { v4 as uuidv4 } from 'uuid';

// 从App.vue注入scenes数据和数据同步方法
const appScenes = inject('scenes');
const syncAppData = inject('syncData');
const appTags = inject('tags',ref([])); // 注入tags数据，提供默认值防止undefined

// 场景和角色数据 - 初始化为空数组，之后从App.vue的scenes加载
const scenes = ref([]);
const characters = ref([]);

// 角色标签ID
const characterTagId = ref(null);

// 确保存在"角色"标签
const ensureCharacterTag = () => {
  try {
    // 查找是否已有"角色"标签
    const characterTag = appTags.value?.find(tag => tag.name === '角色' && tag.isKeyword === true);
    
    if (characterTag) {
      // 如果已存在，保存其ID
      characterTagId.value = characterTag.id;
      console.log('找到已存在的角色标签:', characterTagId.value);
    } else {
      // 创建新的"角色"标签
      const newTag = {
        id: Date.now(),
        name: '角色',
        isKeyword: true
      };
      
      // 确保appTags.value是数组
      if (!appTags.value) appTags.value = [];
      
      appTags.value.push(newTag);

      characterTagId.value = newTag.id;
      console.log('创建了新角色标签:', newTag, '当前tags:', appTags.value);
      setTimeout(() => {
        console.log('同步数据前tags:', appTags.value);
        syncAppData();
        console.log('同步数据后tags:', appTags.value);
      }, 0);
    }
  } catch (error) {
    console.error('创建角色标签出错:', error);
    // 设置一个临时ID，确保后续操作不会失败
    characterTagId.value = 'character-tag';
  }
};

// 加载数据
const loadData = () => {
  try {
    // 确保"角色"标签存在
    ensureCharacterTag();
    
    // 从App.vue注入的scenes数据中加载场景
    scenes.value = appScenes.value.map(scene => ({
      id: scene.id,
      name: scene.name,
      // 计算场景中的角色数量，如果没有characterTagId则返回所有normal类型卡片
      characterCount: scene.cards ? scene.cards.filter(card => 
        card.type === 'normal' && 
        (!characterTagId.value || !card.tags || card.tags.includes(characterTagId.value))
      ).length : 0
    }));
    
    // 从场景的cards中提取人物卡数据
    const allCharacters = [];
    appScenes.value.forEach(scene => {
      if (scene.cards && Array.isArray(scene.cards)) {
        // 获取卡片，如果没有characterTagId则获取所有normal类型卡片
        scene.cards.filter(card => 
          card.type === 'normal' && 
          (!characterTagId.value || !card.tags || card.tags.includes(characterTagId.value))
        ).forEach(card => {
          // 从卡片内容中解析角色信息
          let characterData = {
            id: card.id,
            sceneId: scene.id,
            name: card.title || '未命名角色',
            role: '',
            description: '',
            personality: '',
            goals: '',
            relationships: '',
            entries: [] // 确保每个角色对象都有entries数组属性
          };
          
          // 解析content中的角色信息
          if (card.content) {
            const contentLines = card.content.split('\n');
            contentLines.forEach(line => {
              if (line.includes('身份:')) characterData.role = line.split('身份:')[1]?.trim();
              if (line.includes('描述:')) characterData.description = line.split('描述:')[1]?.trim();
              if (line.includes('性格:')) characterData.personality = line.split('性格:')[1]?.trim();
              if (line.includes('目标:')) characterData.goals = line.split('目标:')[1]?.trim();
              if (line.includes('关系:')) characterData.relationships = line.split('关系:')[1]?.trim();
              if (line.includes('词条:')) {
                const entriesStr = line.split('词条:')[1]?.trim();
                if (entriesStr) {
                  // 假设词条以逗号分隔
                  const entryTitles = entriesStr.split(',').map(e => e.trim());
                  characterData.entries = entryTitles.map(title => ({
                    id: Date.now() + Math.random(),
                    title
                  }));
                }
              }
            });
          }
          
          allCharacters.push(characterData);
        });
      }
    });
    
    characters.value = allCharacters;
  } catch (error) {
    console.error('加载数据出错:', error);
    showToast('加载数据出错', 'error');
  }
};

// 添加当前标签页状态
const currentTab = ref('scene');

// 搜索关键词
const sceneSearchKeyword = ref('');
const characterSearchKeyword = ref('');
const allCharacterSearchKeyword = ref('');

// 选中的场景和角色
const selectedScene = ref(null);
const selectedCharacter = ref(null);

// 表单模态框状态
const showCharacterFormModal = ref(false);
const isEditMode = ref(false);
const characterForm = reactive({
  id: '',
  sceneId: '',
  name: '',
  role: '',
  avatar: '',
  description: '',
  personality: '',
  goals: '',
  relationships: '',
  entries: []
});

// 场景表单模态框状态
const showSceneFormModal = ref(false);
const sceneForm = reactive({
  name: ''
});

// 删除确认模态框
const showDeleteConfirmModal = ref(false);
const characterToDelete = ref(null);

// 删除场景确认模态框
const showDeleteSceneModal = ref(false);
const sceneToDelete = ref(null);

// 角色详情弹窗
const showDetailModal = ref(false);

// 场景选择相关状态
const sceneFilterKeyword = ref('');
const showSceneDropdown = ref(false);
const selectedSceneForCharacter = ref(null);

// 词条选择相关状态
const entrySearchKeyword = ref('');
const showEntryDropdown = ref(false);
const allEntries = ref([]);

// 在script部分添加以下状态和方法
const showEntryDetailModal = ref(false);
const selectedEntry = ref(null);

// 计算过滤后的场景列表
const filteredScenes = computed(() => {
  if (!sceneSearchKeyword.value) return scenes.value;
  
  return scenes.value.filter(scene => 
    scene.name.toLowerCase().includes(sceneSearchKeyword.value.toLowerCase())
  );
});

// 计算过滤后的角色列表
const filteredCharacters = computed(() => {
  if (!selectedScene.value) return [];
  
  let filtered = characters.value.filter(char => char.sceneId === selectedScene.value.id);
  
  if (characterSearchKeyword.value) {
    filtered = filtered.filter(char => 
      char.name.toLowerCase().includes(characterSearchKeyword.value.toLowerCase()) ||
      char.role?.toLowerCase().includes(characterSearchKeyword.value.toLowerCase())
    );
  }
  
  return filtered;
});

// 计算过滤后的所有角色列表
const filteredAllCharacters = computed(() => {
  let filtered = characters.value;
  
  if (allCharacterSearchKeyword.value) {
    filtered = filtered.filter(char => 
      char.name.toLowerCase().includes(allCharacterSearchKeyword.value.toLowerCase()) ||
      char.role?.toLowerCase().includes(allCharacterSearchKeyword.value.toLowerCase()) ||
      getSceneName(char.sceneId).toLowerCase().includes(allCharacterSearchKeyword.value.toLowerCase())
    );
  }
  
  return filtered;
});

// 计算过滤后的场景列表（用于场景选择器下拉列表）
const filteredScenesForDropdown = computed(() => {
  if (!sceneFilterKeyword.value) return scenes.value;
  
  return scenes.value.filter(scene => 
    scene.name.toLowerCase().includes(sceneFilterKeyword.value.toLowerCase())
  );
});

// 计算过滤后的词条列表
const filteredEntries = computed(() => {
  if (!entrySearchKeyword.value) return allEntries.value;
  
  return allEntries.value.filter(entry => 
    entry.title.toLowerCase().includes(entrySearchKeyword.value.toLowerCase()) ||
    entry.description?.toLowerCase().includes(entrySearchKeyword.value.toLowerCase())
  );
});

// 切换标签页
const switchTab = (tab) => {
  currentTab.value = tab;
  // 切换标签时重置选中状态
  if (tab === 'character') {
    selectedScene.value = null;
  }
};

// 获取场景名称
const getSceneName = (sceneId) => {
  const scene = scenes.value.find(s => s.id === sceneId);
  return scene ? scene.name : '未知场景';
};

// 打开新增场景模态框
const openAddSceneModal = () => {
  sceneForm.name = '';
  showSceneFormModal.value = true;
};

// 关闭场景表单模态框
const closeSceneFormModal = () => {
  showSceneFormModal.value = false;
};

// 保存场景
const saveScene = () => {
  if (!sceneForm.name) {
    showToast('请输入场景名称', 'error');
    return;
  }
  
  const newScene = {
    id: uuidv4(),
    name: sceneForm.name,
    cards: []
  };
  
  // 更新本地scenes引用
  scenes.value.push({
    id: newScene.id,
    name: newScene.name,
    characterCount: 0
  });
  
  // 更新App.vue中的scenes数据
  appScenes.value.push(newScene);
  
  // 同步数据
  syncAppData();
  showToast('场景已添加', 'success');
  closeSceneFormModal();
};

// 确认删除场景
const confirmDeleteScene = (scene) => {
  sceneToDelete.value = scene;
  showDeleteSceneModal.value = true;
};

// 关闭删除场景确认模态框
const closeDeleteSceneModal = () => {
  showDeleteSceneModal.value = false;
  sceneToDelete.value = null;
};

// 删除场景
const deleteScene = () => {
  if (!sceneToDelete.value) return;
  
  const sceneId = sceneToDelete.value.id;
  
  // 删除场景下的所有角色
  characters.value = characters.value.filter(char => char.sceneId !== sceneId);
  
  // 删除本地场景
  scenes.value = scenes.value.filter(scene => scene.id !== sceneId);
  
  // 删除App.vue中的场景
  const sceneIndex = appScenes.value.findIndex(s => s.id === sceneId);
  if (sceneIndex !== -1) {
    appScenes.value.splice(sceneIndex, 1);
  }
  
  // 如果当前显示的是被删除的场景，重置选中的场景
  if (selectedScene.value && selectedScene.value.id === sceneId) {
    selectedScene.value = null;
  }
  
  // 同步数据
  syncAppData();
  showToast('场景及其角色已删除', 'success');
  closeDeleteSceneModal();
};

// 刷新场景数据
const refreshSceneData = () => {
  // 这里可以实现从后端加载场景数据的逻辑
  // 暂时使用示例数据
  showToast('场景数据已刷新', 'success');
};

// 选择场景
const selectScene = (scene) => {
  selectedScene.value = scene;
  selectedCharacter.value = null; // 重置选中的角色
  characterSearchKeyword.value = ''; // 重置搜索关键词
};

// 选择角色
const selectCharacter = (character) => {
  selectedCharacter.value = character;
};

// 打开新增角色模态框
const openAddCharacterModal = () => {
  isEditMode.value = false;
  
  // 重置表单
  Object.keys(characterForm).forEach(key => {
    if (key === 'entries') {
      characterForm[key] = []; // 确保entries被重置为空数组
    } else {
      characterForm[key] = '';
    }
  });
  
  // 如果是从场景视图添加，预设场景
  if (selectedScene.value) {
    characterForm.sceneId = selectedScene.value.id;
    selectedSceneForCharacter.value = selectedScene.value;
    sceneFilterKeyword.value = selectedScene.value.name;
  } else {
    // 从人物卡界面添加，不预设场景
    selectedSceneForCharacter.value = null;
    sceneFilterKeyword.value = '';
    characterForm.sceneId = '';
  }
  
  showCharacterFormModal.value = true;
};

// 编辑角色
const editCharacter = (character) => {
  isEditMode.value = true;
  
  // 填充表单
  Object.keys(characterForm).forEach(key => {
    if (key === 'entries') {
      characterForm[key] = character[key] || []; // 确保entries有默认值
    } else {
      characterForm[key] = character[key] || '';
    }
  });
  
  // 设置选中的场景
  const scene = scenes.value.find(s => s.id === character.sceneId);
  selectedSceneForCharacter.value = scene;
  if (scene) {
    sceneFilterKeyword.value = scene.name;
  }
  
  showCharacterFormModal.value = true;
};

// 关闭角色表单模态框
const closeCharacterFormModal = () => {
  showCharacterFormModal.value = false;
};

// 保存角色
const saveCharacter = () => {
  // 验证必填字段
  if (!characterForm.name) {
    showToast('请输入角色名称', 'error');
    return;
  }
  
  if (!characterForm.sceneId) {
    showToast('请选择场景', 'error');
    return;
  }
  
  if (isEditMode.value) {
    // 编辑现有角色
    const index = characters.value.findIndex(char => char.id === characterForm.id);
    if (index !== -1) {
      // 获取旧场景ID用于更新计数
      const oldSceneId = characters.value[index].sceneId;
      
      // 更新角色
      characters.value[index] = { ...characterForm };
      
      // 如果场景有变更，更新场景中的角色数量
      if (oldSceneId !== characterForm.sceneId) {
        // 减少旧场景的角色数量
        const oldSceneIndex = scenes.value.findIndex(scene => scene.id === oldSceneId);
        if (oldSceneIndex !== -1 && scenes.value[oldSceneIndex].characterCount > 0) {
          scenes.value[oldSceneIndex].characterCount--;
        }
        
        // 增加新场景的角色数量
        const newSceneIndex = scenes.value.findIndex(scene => scene.id === characterForm.sceneId);
        if (newSceneIndex !== -1) {
          scenes.value[newSceneIndex].characterCount = (scenes.value[newSceneIndex].characterCount || 0) + 1;
        }
      }
      
      // 如果当前正在查看此角色，更新选中的角色
      if (selectedCharacter.value && selectedCharacter.value.id === characterForm.id) {
        selectedCharacter.value = { ...characterForm };
      }
    }
  } else {
    // 添加新角色
    const newCharacter = {
      ...characterForm,
      id: uuidv4()
    };
    
    characters.value.push(newCharacter);
    
    // 更新场景中的角色数量
    const sceneIndex = scenes.value.findIndex(scene => scene.id === newCharacter.sceneId);
    if (sceneIndex !== -1) {
      scenes.value[sceneIndex].characterCount = (scenes.value[sceneIndex].characterCount || 0) + 1;
    }
  }
  
  // 更新appScenes数据并同步
  updateAppScenesWithCharacters();
  syncAppData();
  showToast(isEditMode.value ? '角色已更新' : '角色已添加', 'success');
  closeCharacterFormModal();
};

// 确认删除角色
const confirmDeleteCharacter = (character) => {
  characterToDelete.value = character;
  showDeleteConfirmModal.value = true;
};

// 关闭删除确认模态框
const closeDeleteConfirmModal = () => {
  showDeleteConfirmModal.value = false;
  characterToDelete.value = null;
};

// 删除角色
const deleteCharacter = () => {
  if (!characterToDelete.value) return;
  
  const index = characters.value.findIndex(char => char.id === characterToDelete.value.id);
  if (index !== -1) {
    const deletedChar = characters.value[index];
    characters.value.splice(index, 1);
    
    // 更新场景中的角色数量
    const sceneIndex = scenes.value.findIndex(scene => scene.id === deletedChar.sceneId);
    if (sceneIndex !== -1 && scenes.value[sceneIndex].characterCount > 0) {
      scenes.value[sceneIndex].characterCount--;
    }
    
    // 如果当前正在查看此角色，重置选中的角色
    if (selectedCharacter.value && selectedCharacter.value.id === deletedChar.id) {
      selectedCharacter.value = null;
    }
  }
  
  // 更新appScenes数据并同步
  updateAppScenesWithCharacters();
  syncAppData();
  showToast('角色已删除', 'success');
  closeDeleteConfirmModal();
};

// 新增方法：更新appScenes中的角色数据
const updateAppScenesWithCharacters = () => {
  try {
    appScenes.value.forEach(scene => {
      // 获取该场景下的所有角色
      const sceneCharacters = characters.value.filter(char => char.sceneId === scene.id);
      
      // 保留非人物卡片和没有角色标签的人物卡片
      const nonCharacterCards = scene.cards ? scene.cards.filter(card => 
        card.type !== 'normal' || 
        (characterTagId.value && card.tags && !card.tags.includes(characterTagId.value))
      ) : [];
      
      // 将角色转换为卡片格式
      const characterCards = sceneCharacters.map(char => {
        // 构建content内容
        let content = '';
        if (char.role) content += `身份: ${char.role}\n`;
        if (char.description) content += `描述: ${char.description}\n`;
        if (char.personality) content += `性格: ${char.personality}\n`;
        if (char.goals) content += `目标: ${char.goals}\n`;
        if (char.relationships) content += `关系: ${char.relationships}\n`;
        
        // 添加词条
        if (char.entries && char.entries.length > 0) {
          const entryTitles = char.entries.map(entry => entry.title).join(', ');
          content += `词条: ${entryTitles}`;
        }
        
        // 添加角色标签 - 只有当characterTagId存在时才添加
        const tags = characterTagId.value ? [characterTagId.value] : [];
        
        return {
          id: char.id,
          title: char.name,
          content: content.trim(),
          type: 'normal',
          height: '120px',
          tags: tags,
          insertedContents: [],
          titleColor: '#333333'
        };
      });
      
      // 更新场景的cards
      scene.cards = [...nonCharacterCards, ...characterCards];
    });
  } catch (error) {
    console.error('更新角色数据出错:', error);
    showToast('更新角色数据出错', 'error');
  }
};

// 为当前章节选择角色
const selectCharactersForCurrentChapter = () => {
  showToast('为当前章节关联角色功能待实现', 'info');
  // 实际实现中，可能需要打开一个选择角色的模态框，允许用户选择多个角色
};

// 打开角色详情弹窗
const openCharacterDetail = (character) => {
  selectedCharacter.value = character;
  showDetailModal.value = true;
};

// 关闭角色详情弹窗
const closeDetailModal = () => {
  showDetailModal.value = false;
};

// 编辑选中的角色
const editSelectedCharacter = () => {
  if (selectedCharacter.value) {
    editCharacter(selectedCharacter.value);
    closeDetailModal();
  }
};

// 过滤场景
const filterScenes = () => {
  // 当用户输入搜索关键词时，显示下拉列表
  showSceneDropdown.value = true;
};

// 选择场景（用于角色编辑）
const selectSceneForCharacter = (scene) => {
  characterForm.sceneId = scene.id;
  selectedSceneForCharacter.value = scene;
  showSceneDropdown.value = false;
  sceneFilterKeyword.value = scene.name;
};

// 点击页面其他地方关闭下拉菜单
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.scene-select-container');
  if (dropdown && !dropdown.contains(event.target)) {
    showSceneDropdown.value = false;
  }
  
  const entryDropdown = document.querySelector('.entry-select-container');
  if (entryDropdown && !entryDropdown.contains(event.target)) {
    showEntryDropdown.value = false;
  }
};

// 选择词条
const toggleEntry = (entry) => {
  const index = characterForm.entries.findIndex(e => e.id === entry.id);
  if (index === -1) {
    characterForm.entries.push(entry);
  } else {
    characterForm.entries.splice(index, 1);
  }
};

// 检查词条是否被选中
const isEntrySelected = (entry) => {
  return characterForm.entries.some(e => e.id === entry.id);
};

// 加载词条数据
const loadEntries = () => {
  try {
    const savedEntries = localStorage.getItem('entry-card-entries');
    if (savedEntries) {
      allEntries.value = JSON.parse(savedEntries);
    }
  } catch (error) {
    console.error('加载词条数据出错:', error);
    showToast('加载词条数据出错', 'error');
  }
};

// 打开词条详情弹窗
const openEntryDetail = (entry) => {
  selectedEntry.value = entry;
  showEntryDetailModal.value = true;
};

// 关闭词条详情弹窗
const closeEntryDetailModal = () => {
  showEntryDetailModal.value = false;
  selectedEntry.value = null;
};

// 编辑选中的词条
const editSelectedEntry = () => {
  if (selectedEntry.value) {
    showEntryModal('edit', selectedEntry.value);
    closeEntryDetailModal();
  }
};

// 显示词条编辑弹窗
const showEntryModal = (mode, entry = null) => {
  // 发出事件通知父组件打开词条编辑弹窗
  emit('editEntry', entry);
  closeEntryDetailModal();
};

// 在mounted中加载数据
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadData(); // 加载保存的数据
  loadEntries(); // 加载词条数据
});

// 在beforeUnmount中移除处理器
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 定义 emit 事件
const emit = defineEmits(['close', 'editEntry']);
</script>

<style scoped>
.character-card-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.character-card-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

/* 添加标签页样式 */
.panel-tabs {
  display: flex;
  position: relative;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: color 0.3s;
  position: relative;
  z-index: 1;
}

.tab.active {
  color: #4caf50;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 3px;
  width: 50%;
  background-color: #4caf50;
  transition: transform 0.3s;
}

.panel-section {
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  background-color: #fff;
}

.section-header {
  font-weight: bold;
  margin-bottom: 12px;
  font-size: 1.1em;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-bottom: 12px;
}

.scene-list, .character-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
}

.refresh-btn {
  background-color: #f0f0f0;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
}

.scene-item {
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scene-item:hover {
  background-color: #f5f5f5;
}

.scene-item.active {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.scene-name {
  font-weight: bold;
}

.scene-actions {
  display: flex;
  align-items: center;
}

.scene-info {
  font-size: 0.85em;
  color: #666;
  margin-right: 12px;
}

.add-btn {
  padding: 6px 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.character-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.character-card {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.character-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.character-header {
  padding: 10px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.character-header h4 {
  margin: 0;
}

.character-scene-tag {
  font-size: 0.8em;
  background-color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 4px;
  color: #555;
}

.character-actions {
  display: flex;
  gap: 4px;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.delete-btn {
  color: #f44336;
}

.character-avatar {
  height: 100px;
  background-color: #f0f0f0;
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4caf50;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: bold;
}

.avatar-placeholder.large {
  width: 60px;
  height: 60px;
  font-size: 28px;
}

.character-info {
  padding: 10px;
}

.info-row {
  margin-bottom: 6px;
  font-size: 0.9em;
}

.info-label {
  font-weight: bold;
  color: #555;
}

.character-detail {
  background-color: #f9f9f9;
  border-radius: 4px;
  overflow: hidden;
}

.detail-header {
  padding: 16px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
}

.detail-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #e0e0e0;
  margin-right: 16px;
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-title h3 {
  margin: 0 0 4px 0;
}

.detail-subtitle {
  color: #666;
}

.detail-content {
  padding: 16px;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-label {
  font-weight: bold;
  margin-bottom: 4px;
  color: #444;
}

.detail-text {
  line-height: 1.5;
}

.close-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.primary-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #388e3c;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-row {
  margin-bottom: 16px;
}

.form-row label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
}

.required {
  color: #f44336;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
}

.cancel-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}


.delete-btn.danger {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #d32f2f;
  background-color: #f44336;
  color: white;
  cursor: pointer;
}

.character-full-height {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: calc(100vh - 200px);
}

.full-height {
  flex: 1;
  overflow-y: auto;
  max-height: none;
}

.character-full-height .character-items {
  padding-bottom: 20px;
}

.scene-select-container {
  position: relative;
}

.scene-search {
  width: 100%;
}

.scene-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-empty {
  padding: 8px 12px;
  color: #999;
  font-style: italic;
  text-align: center;
}

.selected-scene {
  margin-top: 8px;
}

.scene-tag {
  display: inline-block;
  background-color: #e8f5e9;
  color: #4caf50;
  border: 1px solid #4caf50;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.9em;
}

.entry-select-container {
  position: relative;
}

.entry-search {
  width: 100%;
}

.selected-entries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.entry-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #e8f5e9;
  border: 1px solid #4caf50;
  border-radius: 4px;
  font-size: 0.9em;
}

.remove-entry-btn {
  background: none;
  border: none;
  color: #4caf50;
  cursor: pointer;
  padding: 0;
  font-size: 0.8em;
}

.entry-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.entry-dropdown .dropdown-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
}

.entry-dropdown .dropdown-item:hover {
  background-color: #f5f5f5;
}

.entry-info {
  flex: 1;
}

.entry-title {
  font-weight: 500;
  margin-bottom: 2px;
}

.entry-description {
  font-size: 0.85em;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-entries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.entry-tag {
  background-color: #e8f5e9;
  color: #4caf50;
  border: 1px solid #4caf50;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.9em;
}

.entry-tag.clickable {
  cursor: pointer;
}

.entry-tag.clickable:hover {
  background-color: #c8e6c9;
}

.entry-detail {
  background-color: #f9f9f9;
  border-radius: 4px;
  overflow: hidden;
}

.detail-header {
  padding: 16px;
  background-color: #f0f0f0;
}

.detail-title h3 {
  margin: 0 0 4px 0;
}

.detail-content {
  padding: 16px;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-label {
  font-weight: bold;
  margin-bottom: 4px;
  color: #444;
}

.detail-text {
  line-height: 1.5;
}

.detail-text.markdown {
  white-space: pre-wrap;
}
</style> 