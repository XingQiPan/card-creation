<template>
  <div class="works-container">
    <!-- 顶部导航标签 -->
    <div class="nav-tabs">
      <div 
        v-for="(tab, index) in tabs" 
        :key="index"
        :class="['tab', activeTabIndex === index ? 'active' : '']"
        @click="switchTab(index)"
      >
        {{ tab }}
      </div>
    </div>

    <!-- 作品卡片网格 -->
    <div class="works-grid">
      <!-- 新建作品卡片 -->
      <div class="work-card new-work" @click="showCreateModal = true">
        <div class="add-icon">
          <i class="fas fa-plus"></i>
        </div>
        <div class="new-work-text">新建作品</div>
      </div>

      <!-- 作品卡片列表 -->
      <div 
        v-for="chapter in filteredChapters" 
        :key="chapter.id"
        class="work-card"
        :class="{'active-card': activeManagementMenu === chapter.id}"
        @click="navigateToChapter(chapter.id)"
      >
        <div class="card-cover" :style="{ backgroundColor: getRandomColor(chapter.id) }">
          <div class="card-title">{{ chapter.title || '新建作品' }}</div>
        </div>
        <div class="card-info">
          <div class="card-title">{{ chapter.title || '新建作品' }}</div>
          <div class="card-preview">{{ chapter.preview }}</div>
          <div class="card-tags">
            <span class="card-tag">{{ chapter.type }}</span>
            <span class="card-tag word-count">{{ chapter.wordTag }}</span>
          </div>
        </div>
        <div class="card-actions">
          <div class="action-btn" @click.stop="navigateToChapter(chapter.id)">
            <span class="action-icon">⊕</span>
            <span>新建章节</span>
          </div>
          <div class="action-btn management-btn" @click.stop="toggleManagementMenu(chapter.id)">
            <span class="action-icon">⚙</span>
            <span>作品管理</span>
          </div>
        </div>
        
        <!-- 作品管理下拉菜单 -->
        <div v-if="activeManagementMenu === chapter.id" class="management-menu">
          <div class="menu-item">作品信息</div>
          <div class="menu-item" @click.stop="deleteChapter(chapter.id)">删除作品</div>
          <div class="menu-item">拆书</div>
          <div class="menu-item">置顶作品</div>
          <div class="menu-item">作品导出</div>
        </div>
      </div>
    </div>

    <!-- 创建作品弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建作品后可使用AI功能</h3>
          <span class="close-btn" @click="showCreateModal = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>作品名称 <span class="required">*</span></label>
            <div class="input-wrapper">
              <input 
                v-model="newWork.title" 
                type="text" 
                placeholder="新建作品"
                maxlength="30"
              >
              <span class="char-count">{{ newWork.title.length }} / 30</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>作品简介 (选填，不影响AI生成内容)</label>
            <div class="input-wrapper">
              <textarea 
                v-model="newWork.preview" 
                placeholder="请输入作品简介"
                maxlength="500"
                rows="6"
              ></textarea>
              <span class="char-count">{{ newWork.preview.length }} / 500</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="submit-btn" @click="createNewChapter">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useCommon } from '../utils/composables/useCommon'

const router = useRouter()
const { saveToStorage, loadFromStorage } = useCommon()

// 基础状态
const chapters = ref([])
const tabs = ['作品',  '回收站']
const activeTabIndex = ref(0)
const showCreateModal = ref(false)
const activeManagementMenu = ref(null)

// 新建作品表单
const newWork = ref({
  title: '新建作品',
  preview: '',
  type: '小说',
})

// 根据活动标签过滤章节
const filteredChapters = computed(() => {
  if (activeTabIndex.value === 0) {
    return chapters.value.filter(c => !c.archived && !c.deleted)
  } else if (activeTabIndex.value === 1) {
    return chapters.value.filter(c => c.archived && !c.deleted)
  } else {
    return chapters.value.filter(c => c.deleted)
  }
})

// 切换标签
const switchTab = (index) => {
  activeTabIndex.value = index
  activeManagementMenu.value = null
}

// 切换管理菜单
const toggleManagementMenu = (chapterId) => {
  // 阻止事件冒泡
  event.stopPropagation()
  
  if (activeManagementMenu.value === chapterId) {
    activeManagementMenu.value = null
  } else {
    activeManagementMenu.value = chapterId
  }
  
  // 确保在下一个事件循环中执行，以避免立即被关闭
  setTimeout(() => {
    console.log('Menu toggled for chapter:', chapterId, 'Active menu:', activeManagementMenu.value)
  }, 0)
}

// 加载和保存章节数据
const saveChapters = () => {
  saveToStorage('chapters', chapters.value)
}

// 从存储加载章节数据
const loadChapters = () => {
  const savedChapters = loadFromStorage('chapters', [])
  if (savedChapters && savedChapters.length > 0) {
    chapters.value = savedChapters
  }
}

// 创建新作品
const createNewChapter = () => {
  const newChapter = {
    id: Date.now(),
    title: newWork.value.title || '新建作品',
    preview: newWork.value.preview || '',
    wordCount: 0,
    type: '小说',
    wordTag: '0字',
    archived: false,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: []
  }
  chapters.value.unshift(newChapter)
  saveChapters()
  showCreateModal.value = false
  // 重置表单
  newWork.value = {
    title: '新建作品',
    preview: '',
    type: '小说',
  }
  navigateToChapter(newChapter.id)
}

// 导航到章节内容
const navigateToChapter = (chapterId) => {
  console.log('导航到章节:', chapterId)
  const chapter = chapters.value.find(c => c.id === chapterId)
  if (!chapter) {
    console.error('找不到章节:', chapterId)
    return
  }
  
  console.log('找到章节:', chapter)
  
  // 如果章节有内容，导航到第一个章节
  if (chapter.sections && chapter.sections.length > 0) {
    const targetPath = `/editor/${chapter.id}/section/${chapter.sections[0].id}`
    console.log('导航到已有章节:', targetPath)
    router.push(targetPath)
  } else {
    // 创建一个新的章节
    const newSection = {
      id: Date.now(),
      title: '第一章',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 如果章节没有sections数组，创建一个
    if (!chapter.sections) {
      chapter.sections = []
    }
    
    // 添加新章节
    chapter.sections.push(newSection)
    saveChapters()
    
    // 导航到编辑器页面
    const targetPath = `/editor/${chapter.id}/section/${newSection.id}`
    console.log('导航到新章节:', targetPath)
    router.push(targetPath)
  }
}

// 为卡片生成随机背景色
const getRandomColor = (id) => {
  const colors = [
    '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', 
    '#1dd1a1', '#54a0ff', '#5f27cd', '#c8d6e5'
  ]
  return colors[id % colors.length]
}

// 点击页面其他位置关闭管理菜单
const closeManagementMenu = (event) => {
  if (activeManagementMenu.value !== null && !event.target.closest('.management-btn') && !event.target.closest('.management-menu')) {
    activeManagementMenu.value = null
  }
}

// 删除作品
const deleteChapter = (chapterId) => {
  // 阻止事件冒泡
  event.stopPropagation()
  
  // 确认删除
  if (confirm('确定要删除这个作品吗？此操作不可恢复。')) {
    // 找到要删除的章节索引
    const chapterIndex = chapters.value.findIndex(c => c.id === chapterId)
    
    if (chapterIndex !== -1) {
      // 将章节标记为已删除，而不是直接从数组中移除
      chapters.value[chapterIndex].deleted = true
      
      // 保存更改
      saveChapters()
      
      // 关闭管理菜单
      activeManagementMenu.value = null
    }
  }
}

// 组件初始化和清理
onMounted(() => {
  loadChapters()
  document.addEventListener('click', closeManagementMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeManagementMenu)
})
</script>

<style scoped>
.works-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.nav-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
}

.tab {
  padding: 12px 20px;
  cursor: pointer;
  color: #666;
  position: relative;
}

.tab.active {
  color: #646cff;
  font-weight: 500;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #646cff;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.work-card {
  border-radius: 12px;
  overflow: visible; /* 改为 visible 以允许下拉菜单溢出 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1; /* 默认 z-index */
}

.active-card {
  z-index: 50; /* 激活卡片的 z-index 更高 */
}

.work-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.card-cover {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 500;
}

.card-info {
  padding: 16px;
  flex: 1;
}

.card-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.card-preview {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 8px;
}

.card-tag {
  padding: 2px 8px;
  background: #e8f4ff;
  color: #646cff;
  border-radius: 4px;
  font-size: 12px;
}

.word-count {
  background: #f0f7ff;
}

.card-actions {
  display: flex;
  border-top: 1px solid #f0f0f0;
  position: relative;
  z-index: 5;
}

.action-btn {
  flex: 1;
  padding: 10px;
  text-align: center;
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.action-btn:first-child {
  border-right: 1px solid #f0f0f0;
}

.action-icon {
  font-size: 16px;
}

.management-btn {
  color: #22c55e;
}

.management-menu {
  position: absolute;
  top: calc(100% + 5px); /* 添加一点间距 */
  right: 0;
  width: 120px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000; /* 提高 z-index */
  overflow: visible;
}

.menu-item {
  padding: 10px 15px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.menu-item:hover {
  background: #f5f5f5;
}

.new-work {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border: 1px dashed #ddd;
  height: 100%;
  min-height: 250px;
}

.add-icon {
  width: 60px;
  height: 60px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #666;
  margin-bottom: 12px;
}

.new-work-text {
  color: #666;
}

.new-work:hover .add-icon {
  background: #e0e0e0;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
}

.required {
  color: #e74c3c;
}

.input-wrapper {
  position: relative;
}

input, textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.char-count {
  position: absolute;
  right: 10px;
  bottom: 10px;
  font-size: 12px;
  color: #999;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  text-align: right;
}

.submit-btn {
  background: #22c55e;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.submit-btn:hover {
  background: #16a34a;
}
</style>