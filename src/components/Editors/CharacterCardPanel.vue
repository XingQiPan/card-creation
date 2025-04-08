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
          <div class="section-actions">
            <button class="sync-btn" title="同步所有角色卡片" @click="syncAllCharacterCards">
              <i class="fas fa-sync"></i>
            </button>
            <button class="add-btn" @click="openAddSceneModal">
              <i class="fas fa-plus"></i>
            </button>
          </div>
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
                  <button class="move-btn" title="移动到其他场景" @click.stop="moveCharacter(character)">
                    <i class="fas fa-exchange-alt"></i>
                  </button>
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
                  <button class="move-btn" title="移动到其他场景" @click.stop="moveCharacter(character)">
                    <i class="fas fa-exchange-alt"></i>
                  </button>
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

    <!-- 移动角色的模态框 -->
    <div v-if="showMoveCharacterModal" class="modal-overlay" @click.self="closeMoveCharacterModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>移动角色 "{{ characterToMove?.name }}" 到其他场景</h3>
          <button class="close-modal-btn" @click="closeMoveCharacterModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="scene-list-for-move">
            <div v-if="filteredScenesForMove.length === 0" class="empty-state">
              <p>没有其他可用场景</p>
            </div>
            <div v-else class="scene-move-items">
              <div 
                v-for="scene in filteredScenesForMove" 
                :key="scene.id"
                class="scene-move-item"
                @click="moveCharacterToScene(scene)"
              >
                <div class="scene-name">{{ scene.name }}</div>
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeMoveCharacterModal">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch } from 'vue';
import { showToast } from '../../utils/common';
import { v4 as uuidv4 } from 'uuid';
import { dataService } from '../../utils/services/dataService'; // 导入dataService
import { debugLog } from '../../utils/debug';

// 添加props定义，接收App.vue传来的场景数据
const props = defineProps({
  // 主应用场景数据
  appScenes: {
    type: Array,
    default: () => []
  },
  // 当前激活的场景
  currentAppScene: {
    type: Object,
    default: null
  }
});

// 定义向父组件发出的事件
const emit = defineEmits(['close', 'editEntry', 'updateCharacter', 'character-scene-changed']);

// 场景和角色数据 - 初始化为空数组，之后从localStorage加载
// scenes将从App.vue获取，不再独立存储
const scenes = ref([]);
const characters = ref([]);

// 数据存储键 - 角色仍然需要本地存储
const STORAGE_KEY_CHARACTERS = 'character-card-characters';

// 在script setup部分的开头添加默认样式常量
const DEFAULT_CHARACTER_CARD_STYLE = {
  backgroundColor: '#ffffff',
  color: '#000000',
  fontSize: '14px',
  fontFamily: 'Arial',
  borderRadius: '4px',
  padding: '8px',
  width: '220px',
  height: 'auto',
  minHeight: '160px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  lineHeight: '1.5',
  whiteSpace: 'pre-line'
};

// 加载数据 - 修改为使用Props中的场景数据
const loadData = async () => {
  try {
    // 优先使用App场景数据
    if (props.appScenes && props.appScenes.length > 0) {
      scenes.value = props.appScenes.map(scene => ({
        id: scene.id,
        name: scene.name,
        characterCount: 0 // 将在加载角色时更新
      }));
    } else {
      // 如果没有App场景数据，尝试从localStorage加载
      const savedScenes = localStorage.getItem('character-card-scenes');
      if (savedScenes) {
        scenes.value = JSON.parse(savedScenes);
      }
    }
    
    // 先尝试从后端加载角色数据
    try {
      const allData = await dataService.loadAllData();
      if (allData && allData.characters && Array.isArray(allData.characters)) {
        characters.value = allData.characters;
        debugLog('从后端加载角色数据成功，共加载', characters.value.length, '个角色');
      } else {
        // 如果后端没有角色数据，尝试从localStorage加载
        const savedCharacters = localStorage.getItem(STORAGE_KEY_CHARACTERS);
        if (savedCharacters) {
          characters.value = JSON.parse(savedCharacters);
          debugLog('从本地存储加载角色数据成功，共加载', characters.value.length, '个角色');
          
          // 将本地角色数据同步到后端
          if (allData) {
            allData.characters = characters.value;
            await dataService.saveAllData(allData);
            debugLog('已将本地角色数据同步到后端');
          }
        }
      }
    } catch (error) {
      console.error('从后端加载角色数据失败:', error);
      
      // 从localStorage加载作为备份
      const savedCharacters = localStorage.getItem(STORAGE_KEY_CHARACTERS);
      if (savedCharacters) {
        characters.value = JSON.parse(savedCharacters);
        debugLog('从本地存储加载角色数据成功（作为备份）');
      }
    }
    
    // 更新场景中的角色计数
    updateSceneCharacterCounts();
    
    // 如果当前有激活的App场景，自动选中它
    if (props.currentAppScene) {
      const matchedScene = scenes.value.find(s => s.id === props.currentAppScene.id);
      if (matchedScene) {
        selectScene(matchedScene);
      }
    }
    
    // 确保每个角色在其场景中都有对应的卡片
    await ensureCharacterCardsExist();
    
  } catch (error) {
    console.error('加载数据出错:', error);
    showToast('加载数据出错', 'error');
  }
};

// 确保每个角色在对应场景中都有卡片
const ensureCharacterCardsExist = async () => {
  try {
    // 加载场景数据
    const allData = await dataService.loadAllData();
    if (!allData || !allData.scenes || !Array.isArray(allData.scenes)) {
      return;
    }
    
    let hasChanges = false;
    
    // 遍历所有角色
    for (const character of characters.value) {
      if (!character.sceneId) continue;
      
      // 查找角色所属场景
      const sceneIndex = allData.scenes.findIndex(s => s.id === character.sceneId);
      if (sceneIndex === -1) continue;
      
      const scene = allData.scenes[sceneIndex];
      
      // 确保场景有cards数组
      if (!scene.cards) {
        scene.cards = [];
      }
      
      // 检查场景中是否已存在该角色的卡片
      const cardExists = scene.cards.some(card => 
        card.type === 'character' && card.characterId === character.id
      );
      
      // 如果不存在，创建一个新卡片
      if (!cardExists) {
        debugLog(`为角色 ${character.name} 在场景 ${scene.name} 中创建卡片`);
        
        // 创建角色卡片
        const card = {
          id: 'card-' + Date.now(),
          type: 'character',
          characterId: character.id,
          title: character.name,
          content: formatCharacterCardContent(character),
          position: { x: 100, y: 100 },
          tags: character.tags || [],
          style: DEFAULT_CHARACTER_CARD_STYLE
        };
        
        // 添加到场景的cards数组
        scene.cards.push(card);
        hasChanges = true;
      }
    }
    
    // 如果有更改，保存更新后的场景数据
    if (hasChanges) {
      await dataService.saveAllData(allData);
      debugLog('已同步角色卡片数据到场景');
    }
  } catch (error) {
    console.error('确保角色卡片存在时出错:', error);
  }
};

// 更新场景中的角色计数
const updateSceneCharacterCounts = () => {
  // 重置所有场景的角色计数
  scenes.value.forEach(scene => {
    scene.characterCount = characters.value.filter(char => char.sceneId === scene.id).length;
  });
};

// 保存数据 - 只保存角色数据，场景数据由App.vue管理
const saveData = () => {
  try {
    localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters.value));
    
    // 更新场景中的角色计数
    updateSceneCharacterCounts();
  } catch (error) {
    console.error('保存数据出错:', error);
    showToast('保存数据出错', 'error');
  }
};

// 监听App场景变化
watch(() => props.appScenes, (newScenes) => {
  if (newScenes && newScenes.length > 0) {
    scenes.value = newScenes.map(scene => ({
      id: scene.id,
      name: scene.name,
      characterCount: 0 // 将在更新角色计数时填充
    }));
    
    // 更新场景中的角色计数
    updateSceneCharacterCounts();
  }
}, { deep: true });

// 监听当前App场景变化
watch(() => props.currentAppScene, (newScene) => {
  if (newScene) {
    const matchedScene = scenes.value.find(s => s.id === newScene.id);
    if (matchedScene) {
      selectScene(matchedScene);
    }
  }
});

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
  entries: [],
  tags: []
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

// 打开新增场景模态框 - 不再支持从这里创建场景，现在场景数据从App.vue获取
const openAddSceneModal = () => {
  showToast('场景管理功能已移至主界面', 'info');
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
    characterCount: 0
  };
  
  scenes.value.push(newScene);
  saveData(); // 保存数据
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
  
  // 删除场景
  scenes.value = scenes.value.filter(scene => scene.id !== sceneId);
  
  // 如果当前显示的是被删除的场景，重置选中的场景
  if (selectedScene.value && selectedScene.value.id === sceneId) {
    selectedScene.value = null;
  }
  
  saveData(); // 保存数据
  showToast('场景及其角色已删除', 'success');
  closeDeleteSceneModal();
};

// 刷新场景数据 - 重新从App获取场景数据
const refreshSceneData = () => {
  loadData();
  showToast('场景数据已刷新', 'success');
};

// 选择场景
const selectScene = async (scene) => {
  selectedScene.value = scene;
  selectedCharacter.value = null; // 重置选中的角色
  characterSearchKeyword.value = ''; // 重置搜索关键词
  
  // 自动同步当前场景的角色卡片
  try {
    const sceneCharacters = characters.value.filter(char => char.sceneId === scene.id);
    if (sceneCharacters.length > 0) {
      let needsSync = false;
      
      // 获取场景数据，检查是否需要同步
      const allData = await dataService.loadAllData();
      const sceneData = allData.scenes?.find(s => s.id === scene.id);
      
      if (sceneData) {
        // 检查场景中是否有所有角色的卡片
        for (const character of sceneCharacters) {
          const cardExists = sceneData.cards?.some(card => 
            card.type === 'character' && card.characterId === character.id
          );
          
          if (!cardExists) {
            needsSync = true;
            break;
          }
        }
        
        // 如果需要同步，只同步缺失的卡片
        if (needsSync) {
          debugLog(`场景 ${scene.name} 中缺少角色卡片，正在自动同步...`);
          
          // 更新场景UI时自动同步角色卡片
          const missingCardCharacters = sceneCharacters.filter(character => {
            return !sceneData.cards?.some(card => 
              card.type === 'character' && card.characterId === character.id
            );
          });
          
          if (missingCardCharacters.length > 0) {
            for (const character of missingCardCharacters) {
              await generateCharacterCard(character);
            }
            showToast(`已为${missingCardCharacters.length}个角色自动同步卡片`, 'success');
          }
        }
      }
    }
  } catch (error) {
    console.error('自动同步角色卡片失败:', error);
    // 不显示错误提示，避免影响用户体验
  }
};

// 选择角色
const selectCharacter = (character) => {
  selectedCharacter.value = character;
};

// 检查角色标签是否存在
const checkCharacterTagExists = async () => {
  try {
    // 获取标签数据
    const allData = await dataService.loadAllData();
    if (!allData || !allData.tags || !Array.isArray(allData.tags)) {
      return false;
    }
    
    // 查找"角色"标签
    const characterTagExists = allData.tags.some(tag => tag.name === '角色');
    
    if (!characterTagExists) {
      showToast('请先在标签管理中创建"角色"标签，再创建角色卡片！', 'error');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('检查角色标签出错:', error);
    showToast('无法验证角色标签，请确保已创建"角色"标签', 'warning');
    return false;
  }
};

// 打开新增角色模态框
const openAddCharacterModal = async () => {
  // 检查是否存在角色标签
  const tagExists = await checkCharacterTagExists();
  if (!tagExists) {
    return;
  }
  
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
const editCharacter = async (character) => {
  // 检查是否存在角色标签
  const tagExists = await checkCharacterTagExists();
  if (!tagExists) {
    return;
  }
  
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
const saveCharacter = async () => {
  if (!characterForm.name) {
    alert('请输入角色名称');
    return;
  }
  
  // 确保角色有tags数组
  if (!characterForm.tags) {
    characterForm.tags = [];
  }

  try {
    // 获取所有标签数据
    const allData = await dataService.loadAllData();
    if (!allData) {
      throw new Error('无法加载数据');
    }

    // 检查是否存在角色标签
    const characterTagExists = allData.tags && allData.tags.some(tag => tag.name === '角色');
    if (!characterTagExists) {
      showToast('请先在标签管理中创建"角色"标签，再创建角色卡片！', 'error');
      return;
    }
    
    // 获取角色标签ID
    const characterTag = allData.tags.find(tag => tag.name === '角色');
    
    // 添加角色标签ID到角色的标签中
    if (characterTag && !characterForm.tags.includes(characterTag.id)) {
      characterForm.tags.push(characterTag.id);
    }

    // 添加"人设"标签（如果不存在）
    if (!characterForm.tags.includes('人设')) {
      characterForm.tags.push('人设');
    }

    // 如果是新角色
    if (!characterForm.id) {
      // 生成唯一ID
      characterForm.id = 'character-' + Date.now();
      
      // 添加到角色列表
      characters.value.push({...characterForm});
      
      // 如果选择了场景，将角色添加到场景
      if (characterForm.sceneId) {
        // 不再触发角色场景变化事件，直接在这里处理
        debugLog(`角色 ${characterForm.name} (${characterForm.id}) 添加到场景 ${characterForm.sceneId}`);
        
        // 创建角色卡片并添加到场景
        await createCharacterCardInScene(characterForm);
      }
    } else {
      // 更新现有角色
      const index = characters.value.findIndex(c => c.id === characterForm.id);
      if (index !== -1) {
        const oldSceneId = characters.value[index].sceneId;
        characters.value[index] = {...characterForm};
      
        // 更新场景中的角色卡片内容
        await updateCharacterCardContent(characterForm);
      
        // 如果场景发生变化，直接在这里处理
        if (oldSceneId !== characterForm.sceneId) {
          debugLog(`角色 ${characterForm.name} (${characterForm.id}) 从 ${oldSceneId} 移动到场景 ${characterForm.sceneId}`);
          
          // 如果角色被添加到新场景，生成角色卡片
          if (characterForm.sceneId) {
            await createCharacterCardInScene(characterForm);
          }
          
          // 如果从旧场景移除，需要更新旧场景数据
          if (oldSceneId) {
            await removeCharacterFromScene(characterForm.id, oldSceneId);
          }
        }
      }
    }
    
    // 更新后端数据
    if (!allData.characters) {
      allData.characters = [];
    }
    
    // 更新或添加角色数据到后端
    const characterIndex = allData.characters.findIndex(c => c.id === characterForm.id);
    if (characterIndex !== -1) {
      allData.characters[characterIndex] = characterForm;
    } else {
      allData.characters.push(characterForm);
    }
    
    // 保存更新后的数据
    await dataService.saveAllData(allData);
    
    // 保存角色数据到本地存储作为备份
    localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters.value));
    
    // 关闭表单模态框
    showCharacterFormModal.value = false;
    
    // 显示成功提示
    showToast('角色保存成功', 'success');
  } catch (error) {
    console.error('保存角色失败:', error);
    showToast('保存角色失败: ' + error.message, 'error');
  }
};

// 新增函数：从场景中移除角色
const removeCharacterFromScene = async (characterId, sceneId) => {
  try {
    // 获取场景数据
    const allData = await dataService.loadAllData();
    const scenes = allData.scenes || [];
    
    // 查找角色所属场景
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      console.error('找不到对应的场景:', sceneId);
      return;
    }
    
    const scene = scenes[sceneIndex];
    
    // 确保场景有cards数组
    if (!scene.cards) {
      scene.cards = [];
    }
    
    // 从场景中移除角色卡片
    const originalLength = scene.cards.length;
    scene.cards = scene.cards.filter(card => 
      !(card.type === 'character' && card.characterId === characterId)
    );
    
    // 如果卡片被移除，更新场景的角色计数
    if (scene.cards.length < originalLength) {
      scene.characterCount = Math.max(0, (scene.characterCount || 0) - 1);
      
      // 保存更新后的场景数据
      await dataService.saveAllData(allData);
      
      debugLog(`已从场景 ${scene.name} 中移除角色卡片`);
      
      // 触发场景更新事件，通知视图更新
      const event = new CustomEvent('scene-updated', { 
        detail: { sceneId: scene.id } 
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error('从场景中移除角色失败:', error);
  }
};

// 新增函数：在创建人物卡后自动在对应场景中生成角色卡片
const createCharacterCardInScene = async (character) => {
  try {
    // 如果角色没有指定场景，则不创建卡片
    if (!character.sceneId) {
      debugLog('角色未指定场景，不创建卡片');
      return;
    }
    
    // 获取场景数据
    const allData = await dataService.loadAllData();
    if (!allData) {
      throw new Error('无法加载场景数据');
    }

    // 检查是否存在角色标签
    const characterTagExists = allData.tags && allData.tags.some(tag => tag.name === '角色');
    if (!characterTagExists) {
      showToast('请先在标签管理中创建"角色"标签，再创建角色卡片！', 'error');
      return;
    }

    // 获取角色标签ID
    const characterTag = allData.tags.find(tag => tag.name === '角色');
    
    // 确保角色有标签数组
    if (!character.tags) {
      character.tags = [];
    }
    
    // 添加角色标签ID（如果不存在）
    if (characterTag && !character.tags.includes(characterTag.id)) {
      character.tags.push(characterTag.id);
    }
    
    const scenes = allData.scenes || [];
    
    // 查找角色所属场景
    const sceneIndex = scenes.findIndex(s => s.id === character.sceneId);
    if (sceneIndex === -1) {
      console.error('找不到对应的场景:', character.sceneId);
      return;
    }
    
    const scene = scenes[sceneIndex];
    
    // 确保场景有cards数组
    if (!scene.cards) {
      scene.cards = [];
    }
    
    // 检查场景中是否已有该角色的卡片
    const existingCardIndex = scene.cards.findIndex(card => 
      card.type === 'character' && card.characterId === character.id
    );
    
    debugLog('场景卡片:', scene.cards);
    
    if (existingCardIndex === -1) {
      // 创建角色卡片
      const card = {
        id: `character-${character.id}-${Date.now()}`,
        type: 'character',
        characterId: character.id,
        title: character.name,
        content: formatCharacterCardContent(character),
        position: { x: 100, y: 100 },
        tags: character.tags || [],
        style: DEFAULT_CHARACTER_CARD_STYLE
      };
      
      // 添加到场景的cards数组
      scene.cards.push(card);
      debugLog('添加卡片到场景:', card);
      
      // 更新场景的角色计数
      scene.characterCount = (scene.characterCount || 0) + 1;
      
      // 确保角色数据存在于后端
      if (!allData.characters) {
        allData.characters = [];
      }
      
      // 更新或添加角色数据
      const characterIndex = allData.characters.findIndex(c => c.id === character.id);
      if (characterIndex !== -1) {
        allData.characters[characterIndex] = character;
      } else {
        allData.characters.push(character);
      }
      
      // 保存更新后的场景数据
      await dataService.saveAllData(allData);
      
      debugLog(`已为角色 ${character.name} 在场景 ${scene.name} 中创建卡片`);
      
      // 触发场景更新事件，通知视图更新
      const event = new CustomEvent('scene-updated', { 
        detail: { sceneId: scene.id } 
      });
      window.dispatchEvent(event);
    } else {
      debugLog(`角色 ${character.name} 在场景 ${scene.name} 中已有卡片`);
    }
  } catch (error) {
    console.error('创建角色卡片失败:', error);
    showToast('创建角色卡片失败: ' + error.message, 'error');
  }
};

// 格式化角色卡片内容 - 以指定的格式显示
const formatCharacterCardContent = (character) => {
  const entries = character.entries && character.entries.length > 0 
    ? character.entries.map(entry => entry.title).join('，') 
    : '无';

  return `【角色身份：】${character.role || '未知'}
【角色描述：】${character.description || '暂无描述'}
【性格特点：】${character.personality || '暂无性格描述'}
【角色目标：】${character.goals || '暂无目标描述'}
【角色关系：】${character.relationships || '暂无角色关系'}
【词条：】${entries}`;
};

// 重置表单数据
const resetForm = () => {
  // 重置所有表单字段
  characterForm.id = '';
  characterForm.sceneId = '';
  characterForm.name = '';
  characterForm.role = '';
  characterForm.avatar = '';
  characterForm.description = '';
  characterForm.personality = '';
  characterForm.goals = '';
  characterForm.relationships = '';
  characterForm.entries = [];
  characterForm.tags = [];
  
  // 重置场景选择
  selectedSceneForCharacter.value = null;
  sceneFilterKeyword.value = '';
  
  // 关闭模态框
  showCharacterFormModal.value = false;
};

// 生成角色卡片并添加到场景
const generateCharacterCard = async (character) => {
  try {
    // 获取当前场景
    const scene = scenes.value.find(s => s.id === character.sceneId);
    if (!scene) {
      console.error('找不到对应的场景:', character.sceneId);
      return;
    }
    
    // 检查角色是否有"角色"标签
    const allData = await dataService.loadAllData();
    const characterTagExists = allData.tags && allData.tags.some(tag => tag.name === '角色');
    
    if (!characterTagExists) {
      showToast('请先在标签管理中创建"角色"标签，再创建角色卡片！', 'error');
      return;
    }
    
    // 获取"角色"标签ID
    const characterTag = allData.tags.find(tag => tag.name === '角色');
    
    // 确保角色有标签数组
    if (!character.tags) {
      character.tags = [];
    }
    
    // 添加角色标签ID（如果不存在）
    if (characterTag && !character.tags.includes(characterTag.id)) {
      character.tags.push(characterTag.id);
    }
    
    // 检查场景是否有cards数组
    if (!scene.cards) {
      scene.cards = [];
    }
    
    // 检查场景中是否已有该角色的卡片
    const existingCard = scene.cards.find(card => 
      card.type === 'character' && card.characterId === character.id
    );
    
    if (existingCard) {
      // 更新现有卡片
      existingCard.title = character.name;
      existingCard.content = formatCharacterCardContent(character);
      existingCard.tags = character.tags;
      showToast('已更新角色卡片', 'success');
    } else {
      // 创建新的角色卡片
      const newCard = {
        id: 'card-' + Date.now(),
        type: 'character',
        characterId: character.id,
        title: character.name,
        content: formatCharacterCardContent(character),
        position: { x: 100, y: 100 },
        tags: character.tags,
        style: DEFAULT_CHARACTER_CARD_STYLE
      };
      
      // 添加卡片到场景
      scene.cards.push(newCard);
      showToast('已生成角色卡片', 'success');
    }
    
    // 更新场景数据
    const sceneIndex = allData.scenes.findIndex(s => s.id === scene.id);
    if (sceneIndex !== -1) {
      allData.scenes[sceneIndex] = scene;
      
      // 保存更新后的数据
      await dataService.saveAllData(allData);
      debugLog('已保存角色卡片:', character.name);
      
      // 添加：触发场景更新事件，通知视图更新
      const event = new CustomEvent('scene-updated', { 
        detail: { sceneId: scene.id } 
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error('生成角色卡片失败:', error);
    showToast('生成角色卡片失败: ' + error.message, 'error');
  }
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
const deleteCharacter = async () => {
  if (!characterToDelete.value) return;
  
  const index = characters.value.findIndex(char => char.id === characterToDelete.value.id);
  if (index !== -1) {
    const deletedChar = characters.value[index];
    characters.value.splice(index, 1);
    
    // 通知父组件角色已从场景删除
    debugLog(`角色场景变化事件触发: 角色 ${deletedChar.name} (${deletedChar.id}) 从场景 ${deletedChar.sceneId} 删除`);
    emit('character-scene-changed', deletedChar, deletedChar.sceneId, null);
    
    // 如果当前正在查看此角色，重置选中的角色
    if (selectedCharacter.value && selectedCharacter.value.id === deletedChar.id) {
      selectedCharacter.value = null;
    }
    
    // 从场景中删除对应的卡片
    await removeCharacterCardFromScene(deletedChar);
  }
  
  saveData(); // 保存数据
  showToast('角色已删除', 'success');
  closeDeleteConfirmModal();
};

// 从场景中删除角色卡片
const removeCharacterCardFromScene = async (character) => {
  try {
    // 如果角色有场景ID
    if (character.sceneId) {
      // 获取场景数据
      const sceneData = await dataService.loadAllData();
      const currentScenes = sceneData.scenes || [];
      
      // 找到对应的场景
      const sceneIndex = currentScenes.findIndex(s => s.id === character.sceneId);
      
      if (sceneIndex !== -1) {
        const scene = currentScenes[sceneIndex];
        
        // 确保场景有cards数组并且有卡片
        if (scene.cards && scene.cards.length > 0) {
          // 移除角色相关的卡片
          const originalCount = scene.cards.length;
          scene.cards = scene.cards.filter(card => card.characterId !== character.id);
          
          // 如果有卡片被移除，保存更新后的场景数据
          if (originalCount > scene.cards.length) {
            // 更新场景的角色计数
            if (scene.characterCount && scene.characterCount > 0) {
              scene.characterCount -= 1;
            }
            
            // 保存更新后的场景数据
            await dataService.saveAllData(sceneData);
            debugLog('从场景移除角色卡片成功:', character.name);
          } else {
            debugLog('场景中未找到角色卡片:', character.name);
          }
        }
      }
      
      // 从角色数组中移除该角色
      const characterIndex = characters.value.findIndex(c => c.id === character.id);
      if (characterIndex !== -1) {
        characters.value.splice(characterIndex, 1);
        
        // 更新本地存储
        localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters.value));
        
        // 更新character列表
        if (sceneData.characters) {
          sceneData.characters = sceneData.characters.filter(c => c.id !== character.id);
          await dataService.saveAllData(sceneData);
        }
      }
    }
  } catch (error) {
    console.error('从场景移除角色卡片失败:', error);
  }
};

// 为当前章节选择角色
const selectCharactersForCurrentChapter = async () => {
  if (!selectedScene.value) {
    showToast('请先选择一个场景', 'error');
    return;
  }
  
  try {
    const scene = selectedScene.value;
    const sceneCharacters = characters.value.filter(char => char.sceneId === scene.id);
    
    if (sceneCharacters.length === 0) {
      showToast('当前场景下没有角色可选择', 'warning');
      return;
    }
    
    // 为场景下的所有角色生成卡片
    let successCount = 0;
    for (const character of sceneCharacters) {
      try {
        await generateCharacterCard(character);
        successCount++;
      } catch (error) {
        console.error(`为角色 ${character.name} 生成卡片失败:`, error);
      }
    }
    
    if (successCount > 0) {
      showToast(`已为${successCount}个角色生成/更新卡片`, 'success');
    } else {
      showToast('没有生成任何卡片', 'warning');
    }
    
    // 触发场景更新事件
    const event = new CustomEvent('scene-updated', { 
      detail: { sceneId: scene.id } 
    });
    window.dispatchEvent(event);
    
  } catch (error) {
    console.error('生成角色卡片失败:', error);
    showToast('操作失败: ' + error.message, 'error');
  }
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
const loadEntries = async () => {
  try {
    // 先尝试从后端加载词条数据
    try {
      const allData = await dataService.loadAllData();
      if (allData && allData.entries && Array.isArray(allData.entries) && allData.entries.length > 0) {
        allEntries.value = allData.entries;
        debugLog('从后端加载词条数据成功，共加载', allEntries.value.length, '个词条');
        return;
      }
    } catch (error) {
      console.error('从后端加载词条数据失败:', error);
    }
    
    // 如果后端没有词条数据或加载失败，尝试从localStorage加载
    const savedEntries = localStorage.getItem('entry-card-entries');
    if (savedEntries) {
      allEntries.value = JSON.parse(savedEntries);
      debugLog('从本地存储加载词条数据成功');
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
onMounted(async () => {
  document.addEventListener('click', handleClickOutside);
  await loadData(); // 异步加载保存的数据
  await loadEntries(); // 异步加载词条数据
});

// 在beforeUnmount中移除处理器
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 添加更新角色卡片内容的方法
const updateCharacterCardContent = async (character) => {
  try {
    // 获取场景数据
    const sceneData = await dataService.loadAllData();
    const currentScenes = sceneData.scenes || [];
    
    // 如果角色有所属场景，更新该场景中的卡片
    if (character.sceneId) {
      const sceneIndex = currentScenes.findIndex(s => s.id === character.sceneId);
      
      if (sceneIndex !== -1) {
        const scene = currentScenes[sceneIndex];
        
        // 确保场景有cards数组
        if (!scene.cards) {
          scene.cards = [];
        }
        
        // 查找该角色的卡片
        const cardIndex = scene.cards.findIndex(c => c.characterId === character.id);
        
        if (cardIndex !== -1) {
          // 更新卡片内容
          scene.cards[cardIndex].title = character.name;
          scene.cards[cardIndex].content = formatCharacterCardContent(character);
          scene.cards[cardIndex].tags = character.tags || [];
          
          // 保存更新后的场景数据
          await dataService.saveAllData(sceneData);
          debugLog('更新角色卡片内容成功:', character.name);
        } else {
          // 如果找不到该角色的卡片，创建一个新卡片
          const newCard = {
            id: 'card-' + Date.now(),
            type: 'character',
            characterId: character.id,
            title: character.name,
            content: formatCharacterCardContent(character),
            position: { x: 100, y: 100 },
            tags: character.tags || [],
            style: DEFAULT_CHARACTER_CARD_STYLE
          };
          
          // 添加到场景的cards数组
          scene.cards.push(newCard);
          
          // 保存更新后的场景数据
          await dataService.saveAllData(sceneData);
          debugLog('在场景中创建角色卡片成功:', character.name);
        }
      }
    }
  } catch (error) {
    console.error('更新角色卡片内容失败:', error);
  }
};

// 在script部分添加移动角色相关的状态和方法
const showMoveCharacterModal = ref(false);
const characterToMove = ref(null);

// 打开移动角色模态框
const moveCharacter = (character) => {
  characterToMove.value = character;
  showMoveCharacterModal.value = true;
};

// 关闭移动角色模态框
const closeMoveCharacterModal = () => {
  showMoveCharacterModal.value = false;
  characterToMove.value = null;
};

// 计算可移动到的场景列表（排除当前场景）
const filteredScenesForMove = computed(() => {
  if (!characterToMove.value) return [];
  
  return scenes.value.filter(scene => scene.id !== characterToMove.value.sceneId);
});

// 移动角色到选中的场景
const moveCharacterToScene = async (targetScene) => {
  if (!characterToMove.value) return;
  
  try {
    const character = {...characterToMove.value};
    const oldSceneId = character.sceneId;
    
    // 更新角色的场景ID
    character.sceneId = targetScene.id;
    
    // 触发角色场景变化事件
    debugLog(`角色场景变化事件触发: 角色 ${character.name} (${character.id}) 从 ${oldSceneId} 移动到场景 ${targetScene.id}`);
    emit('character-scene-changed', character, oldSceneId, targetScene.id);
    
    // 更新本地角色数据
    const index = characters.value.findIndex(c => c.id === character.id);
    if (index !== -1) {
      characters.value[index] = character;
    }
    
    // 获取场景数据
    const sceneData = await dataService.loadAllData();
    const currentScenes = sceneData.scenes || [];
    
    // 在新场景添加角色卡片
    const targetSceneIndex = currentScenes.findIndex(s => s.id === targetScene.id);
    if (targetSceneIndex !== -1) {
      const scene = currentScenes[targetSceneIndex];
      
      // 确保场景有cards数组
      if (!scene.cards) {
        scene.cards = [];
      }
      
      // 检查是否已存在该角色卡片
      const existingCardIndex = scene.cards.findIndex(c => c.characterId === character.id);
      
      if (existingCardIndex === -1) {
        // 创建新的角色卡片
        const card = {
          id: 'card-' + Date.now(),
          type: 'character',
          characterId: character.id,
          title: character.name,
          content: formatCharacterCardContent(character),
          position: { x: 100, y: 100 },
          tags: character.tags || [],
          style: DEFAULT_CHARACTER_CARD_STYLE
        };
        
        // 添加到新场景
        scene.cards.push(card);
      }
    }
    
    // 从旧场景移除角色卡片
    if (oldSceneId) {
      const oldSceneIndex = currentScenes.findIndex(s => s.id === oldSceneId);
      if (oldSceneIndex !== -1) {
        const oldScene = currentScenes[oldSceneIndex];
        if (oldScene.cards) {
          oldScene.cards = oldScene.cards.filter(c => c.characterId !== character.id);
        }
      }
    }
    
    // 更新角色数据
    if (!sceneData.characters) {
      sceneData.characters = [];
    }
    
    const characterIndex = sceneData.characters.findIndex(c => c.id === character.id);
    if (characterIndex !== -1) {
      sceneData.characters[characterIndex] = character;
    } else {
      sceneData.characters.push(character);
    }
    
    // 保存更新后的数据
    await dataService.saveAllData(sceneData);
    
    // 保存到localStorage作为备份
    localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters.value));
    
    // 更新场景中的角色计数
    updateSceneCharacterCounts();
    
    showToast(`已将角色 "${character.name}" 移动到场景 "${targetScene.name}"`, 'success');
    closeMoveCharacterModal();
    
    // 如果当前显示的是源场景，可能需要刷新角色列表
    if (selectedScene.value && selectedScene.value.id === oldSceneId) {
      // 选中移动后的场景
      selectScene(targetScene);
    }
  } catch (error) {
    console.error('移动角色失败:', error);
    showToast('移动角色失败: ' + error.message, 'error');
  }
};

// 同步所有角色卡片
const syncAllCharacterCards = async () => {
  try {
    const charactersWithScene = characters.value.filter(c => c.sceneId);
    if (charactersWithScene.length === 0) {
      showToast('没有找到关联场景的角色', 'warning');
      return;
    }
    
    showToast('开始同步角色卡片...', 'info');
    
    let successCount = 0;
    for (const character of charactersWithScene) {
      try {
        await generateCharacterCard(character);
        successCount++;
      } catch (error) {
        console.error(`同步角色 ${character.name} 的卡片失败:`, error);
      }
    }
    
    if (successCount > 0) {
      showToast(`成功同步 ${successCount} 个角色卡片`, 'success');
      
      // 如果当前选中了场景，触发场景更新事件
      if (selectedScene.value) {
        const event = new CustomEvent('scene-updated', { 
          detail: { sceneId: selectedScene.value.id } 
        });
        window.dispatchEvent(event);
      }
    } else {
      showToast('没有角色卡片需要同步', 'info');
    }
  } catch (error) {
    console.error('同步角色卡片失败:', error);
    showToast('同步失败: ' + error.message, 'error');
  }
};

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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 4px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
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

.save-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #388e3c;
  background-color: #4caf50;
  color: white;
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

.scene-list-for-move {
  max-height: 200px;
  overflow-y: auto;
}

.scene-move-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scene-move-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.scene-move-item:hover {
  background-color: #f5f5f5;
}

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sync-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.sync-btn:hover {
  background-color: #f0f0f0;
  color: #4caf50;
}

.move-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #2196f3;
}
</style> 