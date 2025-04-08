<template>
  <div class="entry-card-panel">
    <div class="entry-card-content">
      <!-- 添加tab切换 -->
      <div class="panel-tabs">
        <div class="tab" :class="{ 'active': currentTab === 'category' }" @click="switchTab('category')">词条分类</div>
        <div class="tab" :class="{ 'active': currentTab === 'all' }" @click="switchTab('all')">全部词条</div>
        <div class="tab-indicator" :style="{ transform: currentTab === 'all' ? 'translateX(100%)' : 'translateX(0)' }"></div>
      </div>

      <!-- 词条分类视图 -->
      <div v-if="currentTab === 'category'" class="panel-section">
        <div class="section-header-row">
          <div class="section-header">词条分类</div>
          <button class="add-btn" @click="showGroupModal('add')">
            <i class="fas fa-plus"></i> 添加分类
          </button>
        </div>
        
        <div v-if="entryGroups.length === 0" class="empty-state">
          暂无词条分类，点击上方按钮添加
        </div>
        
        <div v-else class="entry-groups">
          <div 
            v-for="group in entryGroups" 
            :key="group.id"
            :class="['entry-group', { active: selectedGroup && selectedGroup.id === group.id }]"
            @click="selectGroup(group)"
          >
            <div class="group-name">{{ group.name }}</div>
            <div class="group-info">{{ group.entryCount || 0 }} 个词条</div>
          </div>
        </div>

        <!-- 选中分类下的词条列表 -->
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
    
    <!-- 添加/编辑词条分类的模态框 -->
    <div v-if="groupModal.show" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ groupModal.isEdit ? '编辑词条分类' : '添加词条分类' }}</h3>
          <button class="close-modal-btn" @click="closeGroupModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-row">
            <label>分类名称 <span class="required">*</span></label>
            <input type="text" class="form-input" v-model="groupModal.name" placeholder="请输入分类名称" />
          </div>
          
          <div class="form-row">
            <label>分类描述</label>
            <textarea class="form-textarea" v-model="groupModal.description" placeholder="请输入分类描述"></textarea>
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
            <label>所属分类</label>
            <select class="form-input" v-model="entryModal.groupId">
              <option value="">无分类</option>
              <option v-for="group in entryGroups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select>
          </div>
          
          <div class="form-row">
            <label>图标</label>
            <div class="icon-upload">
              <div class="icon-preview" :class="{ 'placeholder': !entryModal.icon }">
                <img v-if="entryModal.icon" :src="entryModal.icon" alt="预览" />
                <i v-else class="fas fa-file-alt"></i>
              </div>
              <button class="upload-btn">上传图标</button>
            </div>
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
            <span class="warning">警告：</span> 确定要删除分类 "{{ groupToDelete.name }}" 吗？
            <br><br>
            该分类下的词条将被设为无分类，但不会被删除。此操作不可撤销。
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
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '../../utils/common';

// 数据存储键
const STORAGE_KEY_ENTRY_GROUPS = 'entry-card-groups';
const STORAGE_KEY_ENTRIES = 'entry-card-entries';

// 词条分类数据
const entryGroups = ref([]);

// 词条数据
const entries = ref([]);

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

// 状态变量
const currentTab = ref('category');
const selectedGroup = ref(null);
const selectedEntry = ref(null);
const searchQuery = ref('');
const sortMethod = ref('nameAsc');
const showDetailModal = ref(false);

// 分类模态框状态
const groupModal = reactive({
  show: false,
  isEdit: false,
  group: null,
  id: '',
  name: '',
  description: ''
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

// 计算属性
const filteredEntries = computed(() => {
  if (!selectedGroup.value) return [];
  
  let result = entries.value.filter(entry => entry.groupId === selectedGroup.value.id);
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(entry => 
      entry.title.toLowerCase().includes(query) || 
      entry.description.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query)
    );
  }
  
  return result;
});

const filteredAllEntries = computed(() => {
  let result = entries.value;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(entry => 
      entry.title.toLowerCase().includes(query) || 
      entry.description.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query)
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
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
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

const switchTab = (tab) => {
  currentTab.value = tab;
  if (tab === 'all') {
    selectedGroup.value = null;
  }
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

// 分类操作
const showGroupModal = (mode, group = null) => {
  groupModal.isEdit = mode === 'edit';
  groupModal.group = group;
  
  if (mode === 'edit' && group) {
    groupModal.id = group.id;
    groupModal.name = group.name;
    groupModal.description = group.description || '';
  } else {
    groupModal.id = '';
    groupModal.name = '';
    groupModal.description = '';
  }
  
  groupModal.show = true;
};

const closeGroupModal = () => {
  groupModal.show = false;
};

const saveGroup = () => {
  if (!groupModal.name.trim()) {
    showToast('请输入分类名称', 'error');
    return;
  }
  
  if (groupModal.isEdit && groupModal.group) {
    // 编辑现有分类
    const index = entryGroups.value.findIndex(g => g.id === groupModal.group.id);
    if (index !== -1) {
      entryGroups.value[index] = {
        ...entryGroups.value[index],
        name: groupModal.name,
        description: groupModal.description
      };
      
      // 如果正在查看此分类，更新选中的分类
      if (selectedGroup.value && selectedGroup.value.id === groupModal.group.id) {
        selectedGroup.value = entryGroups.value[index];
      }
      
      showToast('分类已更新', 'success');
    }
  } else {
    // 添加新分类
    const newGroup = {
      id: uuidv4(),
      name: groupModal.name,
      description: groupModal.description,
      entryCount: 0
    };
    
    entryGroups.value.push(newGroup);
    showToast('分类已添加', 'success');
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
  
  if (entryModal.isEdit && entryModal.entry) {
    // 编辑现有词条
    const index = entries.value.findIndex(e => e.id === entryModal.entry.id);
    if (index !== -1) {
      // 如果修改了分组，需要更新计数
      if (entryModal.entry.groupId !== entryModal.groupId) {
        // 减少原分组的计数
        if (entryModal.entry.groupId) {
          const oldGroupIndex = entryGroups.value.findIndex(g => g.id === entryModal.entry.groupId);
          if (oldGroupIndex !== -1 && entryGroups.value[oldGroupIndex].entryCount > 0) {
            entryGroups.value[oldGroupIndex].entryCount--;
          }
        }
        
        // 增加新分组的计数
        if (entryModal.groupId) {
          const newGroupIndex = entryGroups.value.findIndex(g => g.id === entryModal.groupId);
          if (newGroupIndex !== -1) {
            entryGroups.value[newGroupIndex].entryCount++;
          }
        }
      }
      
      entries.value[index] = {
        ...entries.value[index],
        title: entryModal.title,
        groupId: entryModal.groupId,
        icon: entryModal.icon,
        description: entryModal.description,
        content: entryModal.content,
        relatedEntries: entryModal.relatedEntries,
        updatedAt: now
      };
      
      // 如果正在查看此词条，更新选中的词条
      if (selectedEntry.value && selectedEntry.value.id === entryModal.entry.id) {
        selectedEntry.value = entries.value[index];
      }
      
      showToast('词条已更新', 'success');
    }
  } else {
    // 添加新词条
    const newEntry = {
      id: uuidv4(),
      title: entryModal.title,
      groupId: entryModal.groupId,
      icon: entryModal.icon,
      description: entryModal.description,
      content: entryModal.content,
      relatedEntries: entryModal.relatedEntries,
      createdAt: now,
      updatedAt: now
    };
    
    entries.value.push(newEntry);
    
    // 增加分组的计数
    if (entryModal.groupId) {
      const groupIndex = entryGroups.value.findIndex(g => g.id === entryModal.groupId);
      if (groupIndex !== -1) {
        entryGroups.value[groupIndex].entryCount = (entryGroups.value[groupIndex].entryCount || 0) + 1;
      }
    }
    
    showToast('词条已添加', 'success');
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
    // 分类
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
      
      // 更新分组的词条计数
      if (deletedEntry.groupId) {
        const groupIndex = entryGroups.value.findIndex(g => g.id === deletedEntry.groupId);
        if (groupIndex !== -1 && entryGroups.value[groupIndex].entryCount > 0) {
          entryGroups.value[groupIndex].entryCount--;
        }
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
    // 删除分类
    const index = entryGroups.value.findIndex(g => g.id === groupToDelete.value.id);
    if (index !== -1) {
      const deletedGroup = entryGroups.value[index];
      entryGroups.value.splice(index, 1);
      
      // 更新该分类下的词条，将它们设为无分类
      entries.value.forEach(entry => {
        if (entry.groupId === deletedGroup.id) {
          entry.groupId = '';
        }
      });
      
      // 如果当前选中的是该分类，重置选中的分类
      if (selectedGroup.value && selectedGroup.value.id === deletedGroup.id) {
        selectedGroup.value = null;
      }
      
      showToast('分类已删除', 'success');
    }
  }
  
  saveData(); // 保存数据
  closeDeleteConfirmModal();
};

// 为当前章节选择词条
const selectEntriesForCurrentChapter = () => {
  showToast('为当前章节关联词条功能待实现', 'info');
};

// 在 mounted 中加载数据
onMounted(() => {
  loadData();
});

// 定义 emit 事件
defineEmits(['close']);

// 将方法暴露给父组件
defineExpose({
  showEntryModal
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

.icon-upload {
  display: flex;
  align-items: center;
  gap: 12px;
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

.warning {
  color: #f44336;
  font-weight: bold;
}
</style>
