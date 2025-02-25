<template>
  <div class="agent-list">
    <div class="list-header">
      <h3>智能代理列表</h3>
      <button @click="$emit('create')" class="primary-btn">
        <i class="fas fa-plus"></i> 新建代理
      </button>
    </div>
    
    <div class="search-box">
      <i class="fas fa-search"></i>
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索代理..."
        @input="filterAgents"
      />
    </div>
    
    <div class="agents-container">
      <div v-if="filteredAgents.length === 0" class="empty-state">
        <p v-if="searchQuery">没有找到匹配的代理</p>
        <p v-else>还没有创建任何代理</p>
      </div>
      
      <div v-else class="agents-list">
        <div 
          v-for="agent in filteredAgents" 
          :key="agent.id"
          :class="['agent-item', { active: selectedAgentId === agent.id }]"
          @click="selectAgent(agent)"
        >
          <div class="agent-avatar">
            <img :src="agent.avatar || defaultAvatar" alt="Agent Avatar">
          </div>
          <div class="agent-info">
            <div class="agent-name">{{ agent.name }}</div>
            <div class="agent-description">{{ agent.description || '无描述' }}</div>
          </div>
          <div class="agent-actions">
            <button @click.stop="$emit('editFlow', agent)" class="icon-btn edit">
              <i class="fas fa-project-diagram"></i>
            </button>
            <button @click.stop="$emit('editAgent', agent)" class="icon-btn edit">
              <i class="fas fa-edit"></i>
            </button>
            <button @click.stop="$emit('delete', agent.id)" class="icon-btn delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  agents: {
    type: Array,
    default: () => []
  },
  selectedId: String
})

const emit = defineEmits(['select', 'create', 'editAgent', 'editFlow', 'delete'])

// 默认头像
const defaultAvatar = 'https://ui-avatars.com/api/?background=random&name=AI'

// 搜索和过滤
const searchQuery = ref('')
const filteredAgents = ref([])

// 选中的代理ID
const selectedAgentId = ref(props.selectedId)

// 监听选中ID变化
watch(() => props.selectedId, (newId) => {
  selectedAgentId.value = newId
})

// 过滤代理
const filterAgents = () => {
  if (!searchQuery.value) {
    filteredAgents.value = props.agents
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  filteredAgents.value = props.agents.filter(agent => 
    agent.name.toLowerCase().includes(query) || 
    (agent.description && agent.description.toLowerCase().includes(query))
  )
}

// 初始化过滤列表
watch(() => props.agents, (newAgents) => {
  filterAgents()
}, { immediate: true })

// 选择代理
const selectAgent = (agent) => {
  selectedAgentId.value = agent.id
  emit('select', agent)
}
</script>

<style scoped>
.agent-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e5e7eb;
  background-color: #f9fafb;
  width: 280px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-btn:hover {
  background-color: #4f46e5;
}

.search-box {
  padding: 12px 16px;
  position: relative;
}

.search-box i {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-box input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.search-box input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.agents-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}

.agents-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  position: relative;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.agent-item:hover {
  background-color: #f3f4f6;
}

.agent-item.active {
  background-color: #eff6ff;
  border-color: #93c5fd;
}

.agent-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.agent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-description {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.agent-item:hover .agent-actions {
  opacity: 1;
}

.icon-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background-color: #f3f4f6;
}

.icon-btn.delete:hover {
  background-color: #fee2e2;
  color: #ef4444;
}
</style>
