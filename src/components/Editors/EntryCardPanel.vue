<template>
  <div class="entry-card-panel">
    <div class="entry-card-content">
      <!-- 添加tab切换 -->
      <div class="panel-tabs">
        <div class="tab" :class="{ 'active': currentTab === 'category' }" @click="switchTab('category')">场景绑定</div>
        <div class="tab" :class="{ 'active': currentTab === 'all' }" @click="switchTab('all')">全部词条</div>
        <div class="tab-indicator" :style="{ transform: currentTab === 'all' ? 'translateX(100%)' : 'translateX(0)' }"></div>
      </div>

      <!-- 场景绑定视图 -->
      <div v-if="currentTab === 'category'" class="panel-section">
        <div class="section-header-row">
          <div class="section-header">场景列表</div>
          <div class="action-buttons">
            <button class="debug-btn" @click="diagnoseScenes" title="诊断场景数据">
              <i class="fas fa-bug"></i>
            </button>
            <button class="refresh-btn" @click="refreshSceneData" title="刷新场景数据">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        
        <div class="entry-filter">
          <input 
            type="text" 
            class="search-input" 
            v-model="sceneSearchKeyword" 
            placeholder="搜索场景..." 
          />
        </div>
        
        <div v-if="filteredScenes.length === 0" class="empty-state">
          暂无场景可用，请先创建场景
          <button class="refresh-btn" @click="refreshSceneData">
            <i class="fas fa-sync-alt"></i> 刷新场景数据
          </button>
        </div>
        
        <div v-else class="scene-list">
          <div 
            v-for="scene in filteredScenes" 
            :key="scene.id"
            :class="['scene-item', { active: selectedScene && selectedScene.id === scene.id }]"
            @click="selectScene(scene)"
          >
            <div class="scene-name">{{ scene.name }}</div>
            <div class="scene-actions">
              <div class="scene-info">
                {{ getSceneGroups(scene).length }} 个卡组
              </div>
            </div>
          </div>
        </div>
        
        <!-- 选中场景下的卡组列表 -->
        <div v-if="selectedScene" class="panel-section">
          <div class="section-header-row">
            <div class="section-header">{{ selectedScene.name }} - 卡组列表</div>
            <button class="add-btn" @click="showGroupModal('add')">
              <i class="fas fa-plus"></i> 添加卡组
            </button>
          </div>
          
          <div v-if="getSceneGroups(selectedScene).length === 0" class="empty-state">
            暂无卡组，点击上方按钮添加
          </div>
          
          <div v-else class="entry-groups">
            <div 
              v-for="group in getSceneGroups(selectedScene)" 
              :key="group.id"
              :class="['entry-group', { active: selectedGroup && selectedGroup.id === group.id }]"
              @click="selectGroup(group)"
            >
              <div class="group-name">{{ group.name }}</div>
              <div class="group-info">{{ group.entryCount || 0 }} 个词条</div>
              <div class="group-actions">
                <button class="edit-btn" @click.stop="showGroupModal('edit', group)">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" @click.stop="showDeleteConfirmModal(group)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 选中卡组下的词条列表 -->
        <div v-if="selectedGroup" class="panel-section">
          <div class="section-header-row">
            <div class="section-header">{{ selectedGroup.name }} - 词条列表</div>
            <button class="add-btn" @click="showEntryModal('add')">
              <i class="fas fa-plus"></i> 添加词条
            </button>
          </div>
          
          <div class="entry-filter">
            <input 
              type="text" 
              class="search-input" 
              v-model="searchQuery" 
              placeholder="搜索词条..." 
            />
          </div>
          
          <div v-if="filteredEntries.length === 0" class="empty-state">
            {{ searchQuery ? '未找到匹配的词条' : '暂无词条，点击上方按钮添加' }}
          </div>
          
          <div v-else class="entry-items">
            <div 
              v-for="entry in filteredEntries" 
              :key="entry.id"
              class="entry-card"
              @click="openEntryDetail(entry)"
            >
              <div class="entry-header">
                <h4>{{ entry.title }}</h4>
                <div class="entry-actions">
                  <button class="edit-btn" @click.stop="showEntryModal('edit', entry)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="delete-btn" @click.stop="showDeleteConfirmModal(entry)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              <div class="entry-info">
                <div class="entry-description">
                  {{ truncateText(entry.description, 50) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 全部词条视图 -->
      <div v-if="currentTab === 'all'" class="panel-section">
        <div class="section-header-row">
          <div class="section-header">全部词条</div>
          <button class="add-btn" @click="showEntryModal('add')">
            <i class="fas fa-plus"></i> 添加词条
          </button>
        </div>
        
        <div class="entry-filter">
          <input 
            type="text" 
            class="search-input" 
            v-model="searchQuery" 
            placeholder="搜索词条..." 
          />
          <select class="sort-select" v-model="sortMethod">
            <option value="nameAsc">名称 (A-Z)</option>
            <option value="nameDesc">名称 (Z-A)</option>
            <option value="newest">最新添加</option>
            <option value="oldest">最早添加</option>
          </select>
        </div>
        
        <div v-if="filteredAllEntries.length === 0" class="empty-state">
          {{ searchQuery ? '未找到匹配的词条' : '暂无词条，点击上方按钮添加' }}
        </div>
        
        <div v-else class="entry-items">
          <div 
            v-for="entry in filteredAllEntries" 
            :key="entry.id"
            class="entry-card"
            @click="openEntryDetail(entry)"
          >
            <div class="entry-header">
              <h4>{{ entry.title }}</h4>
              <div class="entry-actions">
                <button class="edit-btn" @click.stop="showEntryModal('edit', entry)">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" @click.stop="showDeleteConfirmModal(entry)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <div class="entry-info">
              <div v-if="getGroupById(entry.groupId)" class="tag">
                {{ getGroupById(entry.groupId).name }}
              </div>
              <div class="entry-description">
                {{ truncateText(entry.description, 50) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 面板底部按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="primary-btn" @click="selectEntriesForCurrentChapter">为当前章节选择词条</button>
    </div>
    
    <!-- 词条详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>词条详情</h3>
          <button class="close-modal-btn" @click="closeDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="entry-detail">
            <div class="detail-header">
              <div class="detail-title">
                <h3>{{ selectedEntry ? selectedEntry.title : '' }}</h3>
                <div v-if="selectedEntry && getGroupById(selectedEntry.groupId)" class="detail-group">
                  {{ getGroupById(selectedEntry.groupId).name }}
                </div>
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
              
              <div v-if="selectedEntry && selectedEntry.relatedEntries && selectedEntry.relatedEntries.length > 0" class="detail-row">
                <div class="detail-label">相关词条</div>
                <div class="related-entries">
                  <div 
                    v-for="entryId in selectedEntry.relatedEntries" 
                    :key="entryId"
                    class="related-entry"
                    @click="selectEntryById(entryId)"
                  >
                    {{ getEntryById(entryId)?.title || '未知词条' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDetailModal">关闭</button>
          <button class="primary-btn" @click="editSelectedEntry">编辑</button>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑卡组的模态框 -->
    <div v-if="groupModal.show" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ groupModal.isEdit ? '编辑卡组' : '添加卡组' }}</h3>
          <button class="close-modal-btn" @click="closeGroupModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-row">
            <label>卡组名称 <span class="required">*</span></label>
            <input type="text" class="form-input" v-model="groupModal.name" placeholder="请输入卡组名称" />
          </div>
          
          <div class="form-row">
            <label>所属场景 <span class="required">*</span></label>
            <select class="form-input" v-model="groupModal.sceneId">
              <option value="">请选择场景</option>
              <option v-for="scene in appScenes" :key="scene.id" :value="scene.id">
                {{ scene.name }}
              </option>
            </select>
          </div>
          
          <div class="form-row">
            <label>卡组描述</label>
            <textarea class="form-textarea" v-model="groupModal.description" placeholder="请输入卡组描述"></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeGroupModal">取消</button>
          <button v-if="groupModal.isEdit" class="delete-btn danger" @click="showDeleteConfirmModal(groupModal.group)">删除</button>
          <button class="save-btn" @click="saveGroup">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑词条的模态框 -->
    <div v-if="entryModal.show" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ entryModal.isEdit ? '编辑词条' : '添加词条' }}</h3>
          <button class="close-modal-btn" @click="closeEntryModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-row">
            <label>词条名称 <span class="required">*</span></label>
            <input type="text" class="form-input" v-model="entryModal.title" placeholder="请输入词条名称" />
          </div>
          
          <div class="form-row">
            <label>所属卡组</label>
            <select class="form-input" v-model="entryModal.groupId">
              <option value="">无卡组</option>
              <option v-for="group in entryGroups" :key="group.id" :value="group.id">
                {{ group.name }} ({{ getSceneName(group.sceneId) }})
              </option>
            </select>
          </div>
          
          <div class="form-row">
            <label>简短描述</label>
            <textarea class="form-textarea" v-model="entryModal.description" placeholder="请输入简短描述"></textarea>
          </div>
          
          <div class="form-row">
            <label>详细内容 (支持Markdown)</label>
            <textarea class="form-textarea content-editor" v-model="entryModal.content" placeholder="请输入详细内容，支持Markdown格式"></textarea>
          </div>
          
          <div class="form-row">
            <label>相关词条</label>
            <div class="related-entries-selector">
              <div v-if="entries.length <= 1" class="empty-state">
                暂无其他词条可关联
              </div>
              <div v-else class="related-options">
                <div 
                  v-for="entry in entries.filter(e => e.id !== (entryModal.entry?.id || ''))" 
                  :key="entry.id"
                  class="related-option"
                >
                  <label>
                    <input 
                      type="checkbox" 
                      :value="entry.id" 
                      v-model="entryModal.relatedEntries"
                    />
                    {{ entry.title }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEntryModal">取消</button>
          <button v-if="entryModal.isEdit" class="delete-btn danger" @click="showDeleteConfirmModal(entryModal.entry)">删除</button>
          <button class="save-btn" @click="saveEntry">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 删除确认模态框 -->
    <div v-if="deleteConfirmModal.show" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认删除</h3>
          <button class="close-modal-btn" @click="closeDeleteConfirmModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p v-if="groupToDelete">
            <span class="warning">警告：</span> 确定要删除卡组 "{{ groupToDelete.name }}" 吗？
            <br><br>
            该卡组下的词条将被设为无卡组，但不会被删除。此操作不可撤销。
          </p>
          <p v-else-if="entryToDelete">
            <span class="warning">警告：</span> 确定要删除词条 "{{ entryToDelete.title }}" 吗？
            <br><br>
            该词条的所有关联将会被移除。此操作不可撤销。
          </p>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeDeleteConfirmModal">取消</button>
          <button class="delete-btn danger" @click="confirmDelete">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '../../utils/common';

// 从App.vue注入scenes数据和数据同步方法
const appScenes = inject('scenes', ref([]));
const appTags = inject('tags',ref([])); // 注入tags数据，提供默认值防止undefined

const syncAppData = inject('syncData', async () => {
  console.error('syncData method not provided by parent component');
  return false;
});
const characterTagId = ref(null);

// 确保存在"词条"标签
const ensureCharacterTag = () => {
  try {
    // 查找是否已有"词条"标签
    const characterTag = appTags.value?.find(tag => tag.name === '词条' && tag.isKeyword === true);
    
    if (characterTag) {
      // 如果已存在，保存其ID
      characterTagId.value = characterTag.id;
      console.log('找到已存在的角色标签:', characterTagId.value);
    } else {
      // 在创建新标签前，再次检查是否已存在同名标签（不考虑isKeyword属性）
      const existingTag = appTags.value?.find(tag => tag.name === '词条');
      
      if (existingTag) {
        // 如果存在同名标签，将其更新为关键词标签
        existingTag.isKeyword = true;
        characterTagId.value = existingTag.id;
        console.log('更新已有标签为关键词标签:', characterTagId.value);
      } else {
        // 创建新的"角色"标签
        const newTag = {
          id: uuidv4(), // 使用uuidv4而不是Date.now()避免重复
          name: '词条',
          isKeyword: true
        };
        
        // 确保appTags.value是数组
        if (!appTags.value) appTags.value = [];
        
        appTags.value.push(newTag);
        characterTagId.value = newTag.id;
      }
      
      // 立即同步数据，不使用setTimeout
      syncAppData();
    }
  } catch (error) {
    console.error('创建词条标签出错:', error);
    // 设置一个临时ID，确保后续操作不会失败
    characterTagId.value = 'character-tag';
  }
};
// 封装同步方法，添加更多调试信息
const syncSceneData = async () => {
  console.log('Synchronizing app data...');
  try {
    ensureCharacterTag();
    await syncAppData();
    console.log('App data synchronized successfully');
    return true;
  } catch (error) {
    console.error('Error synchronizing app data:', error);
    showToast('保存场景数据失败', 'error');
    return false;
  }
};

// 标签常量


// 数据存储键
const STORAGE_KEY_ENTRY_GROUPS = 'entry-card-groups';
const STORAGE_KEY_ENTRIES = 'entry-card-entries';

// 状态变量
const currentTab = ref('category');
const entryGroups = ref([]);
const entries = ref([]);
const selectedGroup = ref(null);
const selectedEntry = ref(null);
const searchQuery = ref('');
const sortMethod = ref('nameAsc');
const showDetailModal = ref(false);
const sceneSearchKeyword = ref('');
const selectedScene = ref(null);

// 卡组模态框状态
const groupModal = reactive({
  show: false,
  isEdit: false,
  group: null,
  id: '',
  name: '',
  description: '',
  sceneId: ''
});

// 词条模态框状态
const entryModal = reactive({
  show: false,
  isEdit: false,
  entry: null,
  id: '',
  title: '',
  groupId: '',
  icon: '',
  description: '',
  content: '',
  relatedEntries: []
});

// 删除确认模态框状态
const deleteConfirmModal = reactive({
  show: false
});

const entryToDelete = ref(null);
const groupToDelete = ref(null);

// 加载数据
const loadData = () => {
  try {
    const savedGroups = localStorage.getItem(STORAGE_KEY_ENTRY_GROUPS);
    if (savedGroups) {
      entryGroups.value = JSON.parse(savedGroups);
    }
    
    const savedEntries = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (savedEntries) {
      entries.value = JSON.parse(savedEntries);
    }
  } catch (error) {
    console.error('加载数据出错:', error);
    showToast('加载数据出错', 'error');
  }
};

// 保存数据
const saveData = () => {
  try {
    localStorage.setItem(STORAGE_KEY_ENTRY_GROUPS, JSON.stringify(entryGroups.value));
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries.value));
  } catch (error) {
    console.error('保存数据出错:', error);
    showToast('保存数据出错', 'error');
  }
};

// 加载场景中的词条卡片到本地词条数组
const loadDataFromScene = () => {
  try {
    console.log('Loading entry cards from scenes...');
    
    if (!appScenes.value || appScenes.value.length === 0) {
      console.log('No scenes available to load entries from');
      return;
    }
    
    // 临时存储找到的词条卡片和卡组
    const tempEntries = [];
    const tempGroups = [];
    
    // 遍历所有场景
    appScenes.value.forEach(scene => {
      if (!scene.cards) return;
      
      // 查找场景中的卡组
      const sceneGroups = scene.cards.filter(item => item.type === 'group');
      
      sceneGroups.forEach(group => {
        // 为每个卡组创建一个本地卡组对象
        const localGroup = {
          id: group.id,
          name: group.title,
          description: '',
          sceneId: scene.id,
          entryCount: group.cards ? group.cards.filter(card => 
            card.tags?.includes(characterTagId.value)
          ).length : 0
        };
        
        // 只有当卡组包含词条卡片时才添加到本地卡组中
        if (localGroup.entryCount > 0) {
          tempGroups.push(localGroup);
          
          // 从卡组中提取词条卡片
          const groupEntries = group.cards?.filter(card => 
            card.tags?.includes(characterTagId.value)
          ) || [];
          
          groupEntries.forEach(card => {
            // 为每个卡片创建一个本地词条对象
            const localEntry = {
              id: card.id,
              title: card.title,
              groupId: group.id,
              content: card.content || '',
              description: '',
              tags: card.tags || [],
              relatedEntries: [],
              height: card.height || "120px",
              titleColor: card.titleColor || "#333333",
              type: card.type || "normal",
              insertedContents: card.insertedContents || [],
              createdAt: card.createdAt || new Date().toISOString(),
              updatedAt: card.updatedAt || new Date().toISOString()
            };
            
            tempEntries.push(localEntry);
          });
        }
      });
      
      // 查找场景级别的词条卡片(不在卡组中的词条卡片)
      const sceneEntries = scene.cards.filter(card => 
        card.type === 'normal' && 
        card.tags?.includes(characterTagId.value) &&
        !sceneGroups.some(group => group.containedCardIds?.includes(card.id))
      );
      
      sceneEntries.forEach(card => {
        // 为每个场景级词条创建一个本地词条对象
        const localEntry = {
          id: card.id,
          title: card.title,
          groupId: '', // 无卡组
          content: card.content || '',
          description: '',
          tags: card.tags || [],
          relatedEntries: [],
          height: card.height || "120px",
          titleColor: card.titleColor || "#333333",
          type: card.type || "normal",
          insertedContents: card.insertedContents || [],
          createdAt: card.createdAt || new Date().toISOString(),
          updatedAt: card.updatedAt || new Date().toISOString()
        };
        
        tempEntries.push(localEntry);
      });
    });
    
    // 检查是否找到了新的词条和卡组
    if (tempEntries.length > 0 || tempGroups.length > 0) {
      console.log(`Found ${tempEntries.length} entries and ${tempGroups.length} groups from scenes`);
      
      // 合并词条数据，避免重复
      const mergedEntries = [...entries.value];
      tempEntries.forEach(entry => {
        if (!mergedEntries.some(e => e.id === entry.id)) {
          mergedEntries.push(entry);
        }
      });
      
      // 合并卡组数据，避免重复
      const mergedGroups = [...entryGroups.value];
      tempGroups.forEach(group => {
        if (!mergedGroups.some(g => g.id === group.id)) {
          mergedGroups.push(group);
        } else {
          // 更新现有卡组的计数
          const existingGroupIndex = mergedGroups.findIndex(g => g.id === group.id);
          if (existingGroupIndex !== -1) {
            mergedGroups[existingGroupIndex].entryCount = group.entryCount;
          }
        }
      });
      
      // 更新本地数据
      entries.value = mergedEntries;
      entryGroups.value = mergedGroups;
      
      // 保存到本地存储
      saveData();
      
      showToast(`已从场景中加载 ${tempEntries.length} 个词条和 ${tempGroups.length} 个卡组`, 'success');
    } else {
      console.log('No entries or groups found in scenes');
    }
  } catch (error) {
    console.error('从场景加载词条数据失败:', error);
    showToast('加载词条数据失败', 'error');
  }
};

// 刷新场景数据
const refreshSceneData = () => {
  // 从注入的appScenes中获取最新场景数据
  console.log('Refreshing scene data, current scenes:', appScenes.value.length);
  
  // 检查场景数据结构
  appScenes.value.forEach(scene => {
    console.log(`Scene: ${scene.name}, ID: ${scene.id}`);
    if (scene.cards) {
      console.log(`- Card groups: ${scene.cards.length}`);
      scene.cards.forEach(group => {
        console.log(`  - Group: ${group.title}, type: ${group.type || 'undefined'}, cards: ${group.cards?.length || 0}`);
      });
    } else {
      console.log('- No card groups');
    }
  });
  
  if (appScenes.value && appScenes.value.length > 0) {
    // 从场景中加载词条数据
    loadDataFromScene();
    
    showToast('场景数据已刷新', 'success');
  } else {
    showToast('未找到场景数据', 'warning');
  }
};

// 计算属性
const filteredScenes = computed(() => {
  if (!sceneSearchKeyword.value) return appScenes.value;
  
  const keyword = sceneSearchKeyword.value.toLowerCase();
  return appScenes.value.filter(scene => 
    scene.name.toLowerCase().includes(keyword)
  );
});

// 获取场景下的卡组
const getSceneGroups = (scene) => {
  if (!scene) return [];
  return entryGroups.value.filter(group => group.sceneId === scene.id);
};

// 更新场景中的卡组
const updateSceneGroups = (sceneId, group, isDelete = false) => {
  console.log('Updating scene groups:', { sceneId, group, isDelete });
  
  // 找到对应的场景
  const sceneIndex = appScenes.value.findIndex(s => s.id === sceneId);
  if (sceneIndex === -1) {
    console.error('Scene not found:', sceneId);
    return;
  }

  // 获取场景对象
  const scene = appScenes.value[sceneIndex];
  console.log('Found scene:', scene.name);
  
  // 确保场景有cards属性
  if (!scene.cards) {
    scene.cards = [];
    console.log('Created cards array for scene');
  }
  
  if (isDelete) {
    // 删除卡组
    console.log('Deleting card group from scene');
    if (!scene.cards.some(g => g.id === group.id)) {
      console.log('Card group not found in scene, nothing to delete');
      return;
    }
    scene.cards = scene.cards.filter(g => g.id !== group.id);
  } else {
    const existingGroupIndex = scene.cards.findIndex(g => g.id === group.id);
    
    if (existingGroupIndex !== -1) {
      // 更新现有卡组
      console.log('Updating existing card group in scene');
      
      // 保留原有卡片
      const existingCards = scene.cards[existingGroupIndex].cards || [];
      
      scene.cards[existingGroupIndex] = {
        ...scene.cards[existingGroupIndex],
        id: group.id, // 确保ID一致
        title: group.name, // 使用title而不是name
        type: 'group', // 修改为'group'类型
        cards: existingCards, // 保留原有卡片
        expanded: true, // 默认展开
        insertedContents: [], // 添加空的insertedContents数组
        containedCardIds: existingCards.map(card => card.id) // 更新containedCardIds
      };
    } else {
      // 添加新卡组
      console.log('Adding new card group to scene');
      scene.cards.push({
        id: group.id,
        title: group.name, // 使用title而不是name
        type: 'group', // 修改为'group'类型
        cards: [], // 初始化为空卡片数组
        expanded: true, // 默认展开
        insertedContents: [], // 添加空的insertedContents数组
        containedCardIds: [] // 添加空的containedCardIds数组
      });
    }
  }
  
  // 强制更新appScenes，以触发Vue的响应式更新
  if (Array.isArray(appScenes.value)) {
    // 创建新的场景对象，确保Vue能检测到变化
    const updatedScene = JSON.parse(JSON.stringify(scene));
    // 更新对应索引的场景
    appScenes.value.splice(sceneIndex, 1, updatedScene);
    console.log('Updated scene in app scenes array');
  }
  
  // 输出调试信息
  console.log('Updated scene has cards:', 
    appScenes.value[sceneIndex].cards ? 
    appScenes.value[sceneIndex].cards.length : 0);
  
  // 同步场景数据
  syncSceneData();
};

// 修改计算属性，只显示带有词条标签的卡片
const filteredEntries = computed(() => {
  if (!selectedGroup.value) return [];
  
  let result = entries.value.filter(entry => 
    entry.groupId === selectedGroup.value.id && 
    entry.tags?.includes(characterTagId.value)
  );
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(entry => 
      entry.title.toLowerCase().includes(query) || 
      (entry.description && entry.description.toLowerCase().includes(query)) ||
      (entry.content && entry.content.toLowerCase().includes(query))
    );
  }
  
  return result;
});

const filteredAllEntries = computed(() => {
  // 只获取带有词条标签的卡片
  let result = entries.value.filter(entry => 
    entry.tags?.includes(characterTagId.value)
  );
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(entry => 
      entry.title.toLowerCase().includes(query) || 
      (entry.description && entry.description.toLowerCase().includes(query)) ||
      (entry.content && entry.content.toLowerCase().includes(query))
    );
  }
  
  // 排序
  result = [...result].sort((a, b) => {
    switch (sortMethod.value) {
      case 'nameAsc':
        return a.title.localeCompare(b.title);
      case 'nameDesc':
        return b.title.localeCompare(a.title);
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      default:
        return 0;
    }
  });
  
  return result;
});

// 方法
const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

const getGroupById = (groupId) => {
  if (!groupId) return null;
  return entryGroups.value.find(group => group.id === groupId);
};

const getEntryById = (entryId) => {
  if (!entryId) return null;
  return entries.value.find(entry => entry.id === entryId);
};

const getSceneName = (sceneId) => {
  const scene = appScenes.value.find(s => s.id === sceneId);
  return scene ? scene.name : '未知场景';
};

const switchTab = (tab) => {
  currentTab.value = tab;
  if (tab === 'all') {
    selectedGroup.value = null;
    selectedScene.value = null;
  } else if (tab === 'category') {
    // 默认选择第一个场景
    if (appScenes.value.length > 0 && !selectedScene.value) {
      selectedScene.value = appScenes.value[0];
    }
  }
};

const selectScene = (scene) => {
  selectedScene.value = scene;
  selectedGroup.value = null;
  searchQuery.value = '';
};

const selectGroup = (group) => {
  selectedGroup.value = group;
  searchQuery.value = '';
};

const openEntryDetail = (entry) => {
  selectedEntry.value = entry;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
};

const editSelectedEntry = () => {
  if (selectedEntry.value) {
    showEntryModal('edit', selectedEntry.value);
    closeDetailModal();
  }
};

const selectEntryById = (entryId) => {
  const entry = getEntryById(entryId);
  if (entry) {
    openEntryDetail(entry);
  }
};

// 获取指定场景中含有词条标签的卡片
const getTaggedEntryCards = (scene) => {
  if (!scene || !scene.cards) return [];
  
  // 首先获取卡组中的词条卡片
  const groupEntries = scene.cards
    .filter(item => item.type === 'group')
    .flatMap(group => 
      group.cards?.filter(card => 
        card.tags?.includes(characterTagId.value)
      ) || []
    );
  
  // 然后获取场景级别的词条卡片
  const sceneEntries = scene.cards.filter(card => 
    card.type === 'normal' && 
    card.tags?.includes(characterTagId.value)
  );
  
  return [...groupEntries, ...sceneEntries];
};

// 更新场景中的卡片
const updateSceneCards = (groupId, entry, isDelete = false) => {
  console.log('Updating scene cards:', { groupId, entry: entry.title, entryId: entry.id, isDelete });
  
  // 先找到对应的卡组
  const group = entryGroups.value.find(g => g.id === groupId);
  if (!group) {
    console.error('Group not found:', groupId);
    return;
  }
  
  console.log('Found group:', group.name, 'in scene:', group.sceneId);
  
  // 找到场景
  const sceneIndex = appScenes.value.findIndex(s => s.id === group.sceneId);
  if (sceneIndex === -1) {
    console.error('Scene not found for group:', group.sceneId);
    return;
  }
  
  // 获取场景对象
  const scene = appScenes.value[sceneIndex];
  console.log('Found scene:', scene.name);
  
  // 确保场景有cards属性
  if (!scene.cards) {
    scene.cards = [];
    console.log('Created cards array for scene');
  }
  
  // 在场景中找到卡组
  let cardGroupIndex = scene.cards.findIndex(g => g.id === groupId);
  
  // 如果卡组不存在，则先创建卡组
  if (cardGroupIndex === -1) {
    console.log('Card group not found in scene, creating it:', group.name);
    
    // 创建新卡组对象
    const newCardGroup = {
      id: group.id,
      title: group.name, // 使用title而不是name
      type: 'group', // 修改为'group'类型
      cards: [], // 初始化空卡片数组
      expanded: true, // 默认展开
      insertedContents: [], // 添加空的insertedContents数组
      containedCardIds: [] // 添加空的containedCardIds数组
    };
    
    // 添加到场景
    scene.cards.push(newCardGroup);
    
    // 更新索引
    cardGroupIndex = scene.cards.length - 1;
    console.log('Created card group in scene at index:', cardGroupIndex);
  }
  
  // 获取卡组对象
  const cardGroup = scene.cards[cardGroupIndex];
  
  // 确保卡组有cards属性
  if (!cardGroup.cards) {
    cardGroup.cards = [];
    console.log('Created cards array for card group');
  }
  
  if (isDelete) {
    // 删除卡片
    console.log('Deleting card from card group');
    if (!cardGroup.cards.some(c => c.id === entry.id)) {
      console.log('Card not found in group, nothing to delete');
      return;
    }
    cardGroup.cards = cardGroup.cards.filter(c => c.id !== entry.id);
    
    // 更新containedCardIds
    if (cardGroup.containedCardIds) {
      cardGroup.containedCardIds = cardGroup.containedCardIds.filter(id => id !== entry.id);
    }
  } else {
    // 检查卡片是否已存在
    const existingCardIndex = cardGroup.cards.findIndex(c => c.id === entry.id);
    
    // 准备卡片数据，根据正确的卡片格式
    const cardData = {
      id: entry.id,
      title: entry.title,
      content: entry.content || '',
      height: entry.height || "120px", // 使用现有高度或默认高度
      tags: entry.tags || [],
      insertedContents: entry.insertedContents || [],
      titleColor: entry.titleColor || "#333333",
      type: entry.type || "normal"
    };
    
    // 确保有词条标签
    if (!cardData.tags.includes(characterTagId.value)) {
      cardData.tags.push(characterTagId.value);
    }
    
    if (existingCardIndex !== -1) {
      // 更新现有卡片
      console.log('Updating existing card in card group at index:', existingCardIndex);
      cardGroup.cards[existingCardIndex] = {
        ...cardGroup.cards[existingCardIndex],
        ...cardData
      };
    } else {
      // 添加新卡片
      console.log('Adding new card to card group');
      cardGroup.cards.push(cardData);
      
      // 更新containedCardIds
      if (!cardGroup.containedCardIds) {
        cardGroup.containedCardIds = [];
      }
      cardGroup.containedCardIds.push(entry.id);
    }
  }
  
  // 强制更新appScenes，以触发Vue的响应式更新
  if (Array.isArray(appScenes.value)) {
    // 创建新的场景对象，确保Vue能检测到变化
    const updatedScene = JSON.parse(JSON.stringify(scene));
    // 更新对应索引的场景
    appScenes.value.splice(sceneIndex, 1, updatedScene);
    console.log('Updated scene in app scenes array');
  }
  
  // 输出调试信息
  const updatedCardGroup = appScenes.value[sceneIndex].cards[cardGroupIndex];
  console.log('Updated card group now has cards:', 
    updatedCardGroup.cards ? updatedCardGroup.cards.length : 0);
  
  // 同步场景数据
  syncSceneData();
};

// 卡组操作
const showGroupModal = (mode, group = null) => {
  groupModal.isEdit = mode === 'edit';
  groupModal.group = group;
  
  if (mode === 'edit' && group) {
    groupModal.id = group.id;
    groupModal.name = group.name;
    groupModal.description = group.description || '';
    groupModal.sceneId = group.sceneId;
  } else {
    groupModal.id = '';
    groupModal.name = '';
    groupModal.description = '';
    // 如果当前选中了场景，使用该场景
    groupModal.sceneId = selectedScene.value ? selectedScene.value.id : '';
  }
  
  groupModal.show = true;
};

const closeGroupModal = () => {
  groupModal.show = false;
};

const saveGroup = () => {
  if (!groupModal.name.trim()) {
    showToast('请输入卡组名称', 'error');
    return;
  }
  
  if (!groupModal.sceneId) {
    showToast('请选择场景', 'error');
    return;
  }
  
  let savedGroup;
  
  if (groupModal.isEdit && groupModal.group) {
    // 编辑现有卡组
    const index = entryGroups.value.findIndex(g => g.id === groupModal.group.id);
    if (index !== -1) {
      entryGroups.value[index] = {
        ...entryGroups.value[index],
        name: groupModal.name,
        description: groupModal.description,
        sceneId: groupModal.sceneId
      };
      
      savedGroup = entryGroups.value[index];
      
      // 如果正在查看此卡组，更新选中的卡组
      if (selectedGroup.value && selectedGroup.value.id === groupModal.group.id) {
        selectedGroup.value = entryGroups.value[index];
      }
      
      showToast('卡组已更新', 'success');
    }
  } else {
    // 添加新卡组
    const newGroup = {
      id: uuidv4(),
      name: groupModal.name,
      description: groupModal.description,
      sceneId: groupModal.sceneId,
      entryCount: 0
    };
    
    entryGroups.value.push(newGroup);
    savedGroup = newGroup;
    showToast('卡组已添加', 'success');
  }
  
  // 更新场景中的卡组数据
  if (savedGroup) {
    updateSceneGroups(savedGroup.sceneId, savedGroup);
  }
  
  saveData(); // 保存数据
  closeGroupModal();
};

// 词条操作
const showEntryModal = (mode, entry = null) => {
  entryModal.isEdit = mode === 'edit';
  entryModal.entry = entry;
  
  if (mode === 'edit' && entry) {
    entryModal.id = entry.id;
    entryModal.title = entry.title;
    entryModal.groupId = entry.groupId || '';
    entryModal.icon = entry.icon || '';
    entryModal.description = entry.description || '';
    entryModal.content = entry.content || '';
    entryModal.relatedEntries = entry.relatedEntries ? [...entry.relatedEntries] : [];
  } else {
    entryModal.id = '';
    entryModal.title = '';
    entryModal.groupId = selectedGroup.value ? selectedGroup.value.id : '';
    entryModal.icon = '';
    entryModal.description = '';
    entryModal.content = '';
    entryModal.relatedEntries = [];
  }
  
  entryModal.show = true;
};

const closeEntryModal = () => {
  entryModal.show = false;
};

const saveEntry = () => {
  if (!entryModal.title.trim()) {
    showToast('请输入词条名称', 'error');
    return;
  }
  
  const now = new Date().toISOString();
  let savedEntry;
  
  if (entryModal.isEdit && entryModal.entry) {
    // 编辑现有词条
    const index = entries.value.findIndex(e => e.id === entryModal.entry.id);
    if (index !== -1) {
      // 保存原始卡组ID，用于场景卡片更新
      const originalGroupId = entries.value[index].groupId;
      
      // 如果修改了卡组，需要更新计数
      if (entryModal.entry.groupId !== entryModal.groupId) {
        // 减少原卡组的计数
        if (entryModal.entry.groupId) {
          const oldGroupIndex = entryGroups.value.findIndex(g => g.id === entryModal.entry.groupId);
          if (oldGroupIndex !== -1 && entryGroups.value[oldGroupIndex].entryCount > 0) {
            entryGroups.value[oldGroupIndex].entryCount--;
          }
          
          // 从原卡组的场景中删除卡片
          updateSceneCards(originalGroupId, entryModal.entry, true);
        }
        
        // 增加新卡组的计数
        if (entryModal.groupId) {
          const newGroupIndex = entryGroups.value.findIndex(g => g.id === entryModal.groupId);
          if (newGroupIndex !== -1) {
            entryGroups.value[newGroupIndex].entryCount = (entryGroups.value[newGroupIndex].entryCount || 0) + 1;
          }
        }
      }
      
      // 确保有tags属性，并添加词条标签
      let tags = entries.value[index].tags || [];
      if (!tags.includes(characterTagId.value)) {
        tags = [...tags, characterTagId.value];
      }
      
      entries.value[index] = {
        ...entries.value[index],
        title: entryModal.title,
        groupId: entryModal.groupId,
        icon: entryModal.icon,
        description: entryModal.description,
        content: entryModal.content,
        relatedEntries: entryModal.relatedEntries,
        tags: tags,
        updatedAt: now,
        height: "120px", // 确保有卡片高度
        titleColor: "#333333", // 确保有标题颜色
        type: "normal", // 确保有卡片类型
        insertedContents: entries.value[index].insertedContents || [] // 确保有insertedContents属性
      };
      
      savedEntry = entries.value[index];
      
      // 如果正在查看此词条，更新选中的词条
      if (selectedEntry.value && selectedEntry.value.id === entryModal.entry.id) {
        selectedEntry.value = entries.value[index];
      }
      
      showToast('词条已更新', 'success');
    }
  } else {
    // 添加新词条
    // 确保有词条标签
    const tags = [characterTagId.value];
    
    const newEntry = {
      id: uuidv4(),
      title: entryModal.title,
      groupId: entryModal.groupId,
      icon: entryModal.icon,
      description: entryModal.description,
      content: entryModal.content,
      relatedEntries: entryModal.relatedEntries,
      tags: tags,
      createdAt: now,
      updatedAt: now,
      height: "120px", // 添加卡片高度
      titleColor: "#333333", // 添加标题颜色
      type: "normal", // 添加卡片类型
      insertedContents: [] // 添加空的insertedContents数组
    };
    
    entries.value.push(newEntry);
    savedEntry = newEntry;
    
    // 增加卡组的计数
    if (entryModal.groupId) {
      const groupIndex = entryGroups.value.findIndex(g => g.id === entryModal.groupId);
      if (groupIndex !== -1) {
        entryGroups.value[groupIndex].entryCount = (entryGroups.value[groupIndex].entryCount || 0) + 1;
      }
    }
    
    showToast('词条已添加', 'success');
  }
  
  // 如果词条有卡组，更新场景中的卡片
  if (savedEntry && savedEntry.groupId) {
    updateSceneCards(savedEntry.groupId, savedEntry);
  }
  
  saveData(); // 保存数据
  closeEntryModal();
};

// 删除操作
const showDeleteConfirmModal = (item) => {
  if (item && (groupModal.show || entryModal.show)) {
    closeGroupModal();
    closeEntryModal();
  }
  
  if (item && 'name' in item) {
    // 卡组
    groupToDelete.value = item;
    entryToDelete.value = null;
  } else if (item && 'title' in item) {
    // 词条
    entryToDelete.value = item;
    groupToDelete.value = null;
  }
  
  deleteConfirmModal.show = true;
};

const closeDeleteConfirmModal = () => {
  deleteConfirmModal.show = false;
  entryToDelete.value = null;
  groupToDelete.value = null;
};

// 确认删除
const confirmDelete = () => {
  if (entryToDelete.value) {
    // 删除词条
    const index = entries.value.findIndex(e => e.id === entryToDelete.value.id);
    if (index !== -1) {
      const deletedEntry = entries.value[index];
      entries.value.splice(index, 1);
      
      // 更新卡组的词条计数
      if (deletedEntry.groupId) {
        const groupIndex = entryGroups.value.findIndex(g => g.id === deletedEntry.groupId);
        if (groupIndex !== -1 && entryGroups.value[groupIndex].entryCount > 0) {
          entryGroups.value[groupIndex].entryCount--;
        }
        
        // 从场景卡组中删除卡片
        updateSceneCards(deletedEntry.groupId, deletedEntry, true);
      }
      
      // 清除所有词条中对该词条的引用
      entries.value.forEach(entry => {
        if (entry.relatedEntries && entry.relatedEntries.includes(deletedEntry.id)) {
          entry.relatedEntries = entry.relatedEntries.filter(id => id !== deletedEntry.id);
        }
      });
      
      // 如果当前正在查看此词条，重置选中的词条
      if (selectedEntry.value && selectedEntry.value.id === deletedEntry.id) {
        selectedEntry.value = null;
      }
      
      showToast('词条已删除', 'success');
    }
  } else if (groupToDelete.value) {
    // 删除卡组
    const index = entryGroups.value.findIndex(g => g.id === groupToDelete.value.id);
    if (index !== -1) {
      const deletedGroup = entryGroups.value[index];
      entryGroups.value.splice(index, 1);
      
      // 从场景中删除卡组
      updateSceneGroups(deletedGroup.sceneId, deletedGroup, true);
      
      // 更新该卡组下的词条，将它们设为无卡组
      entries.value.forEach(entry => {
        if (entry.groupId === deletedGroup.id) {
          entry.groupId = '';
        }
      });
      
      // 如果当前选中的是该卡组，重置选中的卡组
      if (selectedGroup.value && selectedGroup.value.id === deletedGroup.id) {
        selectedGroup.value = null;
      }
      
      showToast('卡组已删除', 'success');
    }
  }
  
  saveData(); // 保存数据
  closeDeleteConfirmModal();
};

// 为当前章节选择词条
const selectEntriesForCurrentChapter = () => {
  showToast('为当前章节关联词条功能待实现', 'info');
};

// 诊断场景数据
const diagnoseScenes = () => {
  console.log('==== 场景数据诊断 ====');
  console.log(`总场景数: ${appScenes.value.length}`);
  console.log(`总卡组数: ${entryGroups.value.length}`);
  console.log(`总词条数: ${entries.value.length}`);
  
  // 检查场景是否有cards属性
  appScenes.value.forEach((scene, index) => {
    console.log(`\n场景 ${index+1}: ${scene.name} (ID: ${scene.id})`);
    
    if (!scene.cards) {
      console.log('  警告: 场景没有cards属性');
    } else {
      console.log(`  卡组数: ${scene.cards.length}`);
      
      scene.cards.forEach(group => {
        console.log(`  - 卡组: ${group.title} (ID: ${group.id}, 类型: ${group.type || '未定义'})`);
        
        if (!group.cards) {
          console.log('    警告: 卡组没有cards属性');
        } else {
          console.log(`    卡片数: ${group.cards.length}`);
          group.cards.forEach(card => {
            console.log(`    - 卡片: ${card.title} (ID: ${card.id}, 标签: ${card.tags?.join(', ') || '无'})`);
          });
        }
      });
    }
  });
  
  console.log('\n==== 卡组与场景的关联 ====');
  entryGroups.value.forEach(group => {
    const scene = appScenes.value.find(s => s.id === group.sceneId);
    console.log(`卡组: ${group.name} (ID: ${group.id})`);
    
    if (!scene) {
      console.log('  警告: 卡组关联的场景不存在');
    } else {
      console.log(`  关联场景: ${scene.name}`);
      
      const sceneGroup = scene.cards?.find(g => g.id === group.id);
      if (!sceneGroup) {
        console.log('  警告: 关联场景中未找到此卡组');
      } else {
        console.log(`  场景中卡组: ${sceneGroup.title}, 卡片数: ${sceneGroup.cards?.length || 0}`);
      }
    }
  });
  
  console.log('==== 诊断完成 ====');
  return { 
    scenes: appScenes.value.length,
    groups: entryGroups.value.length,
    entries: entries.value.length
  };
};

// 暴露方法给父组件
defineExpose({
  showEntryModal,
  diagnoseScenes
});

// 在mounted阶段加载数据
onMounted(() => {
  loadData();
  
  // 确保有词条标签
  ensureCharacterTag();
  
  // 加载场景中的词条数据
  loadDataFromScene();
  
  // 如果有场景，默认选择第一个
  if (appScenes.value.length > 0) {
    selectScene(appScenes.value[0]);
  }
});
</script>

<style scoped>
.entry-card-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.entry-card-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

/* 标签页样式 */
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
  height: 2px;
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

.sort-select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-bottom: 12px;
}

.entry-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.entry-group {
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.entry-group:hover {
  background-color: #f5f5f5;
}

.entry-group.active {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.group-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.group-info {
  font-size: 0.85em;
  color: #666;
}

.group-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 8px;
}

.entry-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.entry-card {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.entry-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.entry-header {
  padding: 12px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.entry-header h4 {
  margin: 0;
}

.entry-actions {
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

.entry-info {
  padding: 12px;
}

.tag {
  display: inline-block;
  background-color: #e8f5e9;
  color: #4caf50;
  border: 1px solid #4caf50;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.85em;
  margin-bottom: 8px;
}

.entry-description {
  font-size: 0.9em;
  color: #666;
  line-height: 1.4;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #666;
}

.close-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.panel-actions {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
}

.primary-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
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
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
  border: none;
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

.add-btn {
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 4px;
}

.entry-filter {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.warning {
  color: #f44336;
  font-weight: bold;
}

.entries-selector {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
}

.entries-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entry-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #4caf50;
  font-size: 0.9em;
  border-radius: 4px;
}

.refresh-btn:hover {
  background-color: #f0f0f0;
}

.scene-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.scene-item {
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
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
  margin-right: 4px;
}

/* 词条详情样式 */
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

.detail-group {
  color: #666;
  font-size: 0.9em;
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

.related-entries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related-entry {
  background-color: #e8f5e9;
  color: #4caf50;
  border: 1px solid #4caf50;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.9em;
}

.related-entry:hover {
  background-color: #c8e6c9;
}

.icon-preview {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.icon-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.icon-preview.placeholder {
  color: #999;
  font-size: 24px;
}

.upload-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  cursor: pointer;
}

.related-entries-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
}

.related-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.debug-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #007bff;
  font-size: 0.9em;
  border-radius: 4px;
}

.debug-btn:hover {
  background-color: #f0f0f0;
}
</style>