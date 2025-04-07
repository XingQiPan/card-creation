<template>
  <div class="entry-card-panel">
    <div class="entry-card-content">
      <!-- 分类管理部分 -->
      <div class="panel-section">
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
          
          <div 
            :class="['entry-group', { active: showingAllEntries }]"
            @click="showAllEntries"
          >
            <div class="group-name">全部词条</div>
            <div class="group-info">{{ entries.length }} 个词条</div>
          </div>
        </div>
      </div>
      
      <!-- 词条列表部分 -->
      <div class="panel-section">
        <div class="section-header-row">
          <div class="section-header">
            {{ selectedGroup ? selectedGroup.name + ' 词条列表' : '全部词条' }}
          </div>
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
        
        <div v-if="filteredEntries.length === 0" class="empty-state">
          {{ searchQuery ? '未找到匹配的词条' : '暂无词条，点击上方按钮添加' }}
        </div>
        
        <div v-else class="entry-items">
          <div 
            v-for="entry in filteredEntries" 
            :key="entry.id"
            class="entry-card"
            @click="selectEntry(entry)"
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
            
            <div class="entry-icon" :class="{ 'placeholder': !entry.icon }">
              <img v-if="entry.icon" :src="entry.icon" :alt="entry.title" />
              <i v-else class="fas fa-file-alt"></i>
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
      
      <!-- 词条详情部分 -->
      <div v-if="selectedEntry" class="panel-section">
        <div class="entry-detail">
          <div class="detail-header">
            <div class="detail-icon" :class="{ 'placeholder': !selectedEntry.icon }">
              <img v-if="selectedEntry.icon" :src="selectedEntry.icon" :alt="selectedEntry.title" />
              <i v-else class="fas fa-file-alt"></i>
            </div>
            <div class="detail-title">
              <h3>{{ selectedEntry.title }}</h3>
              <div v-if="getGroupById(selectedEntry.groupId)" class="detail-group">
                {{ getGroupById(selectedEntry.groupId).name }}
              </div>
            </div>
          </div>
          
          <div class="detail-content">
            <div class="detail-row">
              <div class="detail-label">描述</div>
              <div class="detail-text">{{ selectedEntry.description || '无描述' }}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">详细内容</div>
              <div class="detail-text markdown">{{ selectedEntry.content || '无内容' }}</div>
            </div>
            
            <div v-if="selectedEntry.relatedEntries && selectedEntry.relatedEntries.length > 0" class="detail-row">
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
    </div>
    
    <!-- 面板底部按钮 -->
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="primary-btn" @click="selectEntriesForCurrentChapter">为当前章节选择词条</button>
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
import { ref, reactive, computed, onMounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { showToast } from '../../utils/common';

// 词条分类数据
const entryGroups = ref([
  { id: 'g1', name: '人物', description: '小说中的人物词条', entryCount: 3 },
  { id: 'g2', name: '地点', description: '小说中的地点词条', entryCount: 2 },
  { id: 'g3', name: '事件', description: '小说中的事件词条', entryCount: 1 },
  { id: 'g4', name: '物品', description: '小说中的物品词条', entryCount: 1 }
]);

// 词条数据
const entries = ref([
  { 
    id: 'e1', 
    title: '主角', 
    groupId: 'g1', 
    description: '小说的主要人物', 
    content: '# 主角\n\n小说的主要人物，具有以下特点：\n* 勇敢\n* 正义\n* 坚韧',
    relatedEntries: ['e2', 'e7'],
    createdAt: new Date('2023-01-01').toISOString()
  },
  { 
    id: 'e2', 
    title: '反派', 
    groupId: 'g1', 
    description: '小说的反面角色', 
    content: '# 反派\n\n小说的反面角色，与主角对立。',
    relatedEntries: ['e1'],
    createdAt: new Date('2023-01-02').toISOString()
  },
  { 
    id: 'e3', 
    title: '王国', 
    groupId: 'g2', 
    description: '故事发生的王国', 
    content: '# 王国\n\n故事发生的主要地点，一个古老的王国。',
    relatedEntries: ['e4'],
    createdAt: new Date('2023-01-03').toISOString()
  },
  { 
    id: 'e4', 
    title: '古堡', 
    groupId: 'g2', 
    description: '王国中的古堡', 
    content: '# 古堡\n\n王国中的一座古老城堡，是故事中的重要场景。',
    relatedEntries: ['e3'],
    createdAt: new Date('2023-01-04').toISOString()
  },
  { 
    id: 'e5', 
    title: '战役', 
    groupId: 'g3', 
    description: '决定性的战役', 
    content: '# 战役\n\n故事中的决定性战役，主角与反派的最终对决。',
    relatedEntries: ['e1', 'e2'],
    createdAt: new Date('2023-01-05').toISOString()
  },
  { 
    id: 'e6', 
    title: '宝剑', 
    groupId: 'g4', 
    description: '主角的宝剑', 
    content: '# 宝剑\n\n主角使用的神奇宝剑，具有特殊能力。',
    relatedEntries: ['e1'],
    createdAt: new Date('2023-01-06').toISOString()
  },
  { 
    id: 'e7', 
    title: '配角', 
    groupId: 'g1', 
    description: '主角的朋友', 
    content: '# 配角\n\n主角的朋友，忠实的伙伴。',
    relatedEntries: ['e1'],
    createdAt: new Date('2023-01-07').toISOString()
  },
]);

// 状态变量
const selectedGroup = ref(null);
const showingAllEntries = ref(true);
const selectedEntry = ref(null);
const searchQuery = ref('');
const sortMethod = ref('nameAsc');

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
  let result = entries.value;
  
  // 按分类筛选
  if (selectedGroup.value && !showingAllEntries.value) {
    result = result.filter(entry => entry.groupId === selectedGroup.value.id);
  }
  
  // 按搜索词筛选
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

const selectGroup = (group) => {
  selectedGroup.value = group;
  showingAllEntries.value = false;
  searchQuery.value = '';
};

const showAllEntries = () => {
  showingAllEntries.value = true;
  selectedGroup.value = null;
  searchQuery.value = '';
};

const selectEntry = (entry) => {
  selectedEntry.value = entry;
};

const selectEntryById = (id) => {
  const entry = getEntryById(id);
  if (entry) {
    selectEntry(entry);
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
        showingAllEntries.value = true;
      }
      
      showToast('分类已删除', 'success');
    }
  }
  
  closeDeleteConfirmModal();
};

// 为当前章节选择词条
const selectEntriesForCurrentChapter = () => {
  showToast('为当前章节关联词条功能待实现', 'info');
};
</script>
