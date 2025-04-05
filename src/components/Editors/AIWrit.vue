<template>
  <div class="ai-writ-panel">
    <h3>AI写作</h3>
    <div class="panel-section">
      <div class="section-header">AI 模型</div>
      <select v-model="aiSettings.model" class="model-selector">
        <option v-for="model in availableModels" :key="model.id" :value="model.id">
          {{ model.name }}
        </option>
      </select>
    </div>
    
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
    
    <div class="panel-section">
      <div class="section-header">要求</div>
      <div class="prompt-selection">
        <div class="selected-prompt" v-if="aiSettings.selectedPrompt">
          <div class="prompt-title">{{ aiSettings.selectedPrompt }}</div>
          <button class="change-prompt-btn" @click="showPromptSelection">更换</button>
        </div>
        <button v-else class="prompt-select-btn" @click="showPromptSelection">点击选择要求</button>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="section-header">写作剧情点 <span class="highlight-text">*一次5~10个剧情点效果最佳，不要太多也不要太少，否则AI容易自由发挥！</span></div>
      <textarea class="idea-input" placeholder="请简要描述本章的主要剧情发展..." v-model="aiSettings.plotPoints"></textarea>
    </div>
    
    <div class="panel-section">
      <div class="section-header">关联章节</div>
      <div class="link-buttons">
        <button class="link-btn" :class="{ 'active': aiSettings.linkedChapters?.length > 0 }" @click="showChapterSelector(aiSettings)">
          {{ aiSettings.linkedChapters?.length > 0 ? `已选择 ${aiSettings.linkedChapters.length} 章` : '选择章节' }}
        </button>
      </div>
      
      <div class="section-header">相关角色</div>
      <div class="link-buttons">
        <button class="link-btn" :class="{ 'active': aiSettings.linkedCharacters?.length > 0 }" @click="showSceneSelector(aiSettings)">
          <span v-if="aiSettings.linkedCharacters?.length > 0">
            已选择 {{ aiSettings.linkedCharacters.length }} 个角色
            <span v-if="aiSettings.selectedCardsInfo" class="selected-cards-preview">
              ({{ aiSettings.selectedCardsInfo }})
            </span>
          </span>
          <span v-else>选择角色</span>
        </button>
      </div>
      
      <div class="section-header">关联词条</div>
      <div class="link-note">选择词条后，按写作顺序输出词条内容，一次不要选择太多，否则AI容易混乱！</div>
      <div class="link-buttons">
        <button class="link-btn" :class="{ 'active': aiSettings.linkedEntries?.length > 0 }" @click="showEntrySelector(aiSettings)">
          {{ aiSettings.linkedEntries?.length > 0 ? `已选择 ${aiSettings.linkedEntries.length} 个词条` : '选择词条' }}
        </button>
      </div>
    </div>
    
    <div class="panel-actions">
      <button class="close-btn" @click="$emit('close')">关闭</button>
      <button class="generate-btn" @click="generateIdea">开始生成</button>
    </div>
  </div>
</template>

<script>
import { reactive, computed } from 'vue';

export default {
  name: 'AIWrit',
  props: {
    availableModels: {
      type: Array,
      required: true
    },
    aiSettings: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const aiSettings = reactive(props.aiSettings);

    // 章节选择相关变量
    const showChapterSelectModal = ref(false);
    const chapterSearchKeyword = ref('');
    const selectedChapterIds = ref([]);
    const currentSectionForChapters = ref(null);

    // 场景和角色选择相关变量
    const showSceneSelectModal = ref(false);
    const showCharacterSelectModal = ref(false);
    const sceneSearchKeyword = ref('');
    const cardSearchKeyword = ref('');
    const selectedCardIds = ref([]);
    const currentScene = ref(null);
    const currentSectionForCharacters = ref(null);
    const scenes = ref([]); // 初始化场景数据

    // 词条选择相关变量
    const showEntrySelectModal = ref(false);
    const entrySearchKeyword = ref('');
    const selectedEntryIds = ref([]);
    const entrySelectTab = ref('cards');
    const currentSectionForEntries = ref(null);

    // 章节选择相关计算属性和方法
    const filteredChapters = computed(() => {
      if (!chapterSearchKeyword.value) return aiSettings.linkedChapters;
      const keyword = chapterSearchKeyword.value.toLowerCase();
      return aiSettings.linkedChapters.filter(chapter => 
        chapter.title?.toLowerCase().includes(keyword)
      );
    });

    const isAllChaptersSelected = computed(() => {
      return filteredChapters.value.length > 0 && 
             selectedChapterIds.value.length === filteredChapters.value.length;
    });

    const toggleSelectAllChapters = () => {
      if (isAllChaptersSelected.value) {
        selectedChapterIds.value = [];
      } else {
        selectedChapterIds.value = filteredChapters.value.map(chapter => chapter.id);
      }
    };

    const showChapterSelector = (section) => {
      currentSectionForChapters.value = section;
      // 预设当前选中的章节
      selectedChapterIds.value = section.linkedChapters || [];
      showChapterSelectModal.value = true;
    };

    const closeChapterSelectModal = () => {
      showChapterSelectModal.value = false;
      currentSectionForChapters.value = null;
    };

    const confirmChaptersSelection = () => {
      if (currentSectionForChapters.value) {
        // 更新当前section的linkedChapters属性
        currentSectionForChapters.value.linkedChapters = [...selectedChapterIds.value];
        // 可以在这里添加保存逻辑
        // saveCurrentChapter(); // 需要在父组件中处理保存逻辑
        showToast(`已关联 ${selectedChapterIds.value.length} 个章节`, 'success');
      }
      closeChapterSelectModal();
    };

    // 场景和角色选择相关计算属性和方法
    const filteredScenes = computed(() => {
      if (!scenes.value || scenes.value.length === 0) return [];
      if (!sceneSearchKeyword.value) return scenes.value;
      const keyword = sceneSearchKeyword.value.toLowerCase();
      return scenes.value.filter(scene => 
        scene.name?.toLowerCase().includes(keyword)
      );
    });

    const filteredSceneCards = computed(() => {
      if (!currentScene.value) return [];
      // 确保场景有卡片数据
      if (!currentScene.value.cards || !Array.isArray(currentScene.value.cards)) {
        console.warn('当前场景没有卡片数据或格式不正确:', currentScene.value);
        return [];
      }
      // 先过滤掉无效卡片
      const validCards = currentScene.value.cards.filter(card => 
        card && typeof card === 'object'
      );
      // 应用搜索过滤
      if (!cardSearchKeyword.value) {
        // 返回所有非组卡片
        return validCards.filter(card => card.type !== 'group');
      }
      const keyword = cardSearchKeyword.value.toLowerCase();
      return validCards.filter(card => 
        card.type !== 'group' && (card.title || '').toLowerCase().includes(keyword)
      );
    });

    const isAllCardsSelected = computed(() => {
      return filteredSceneCards.value.length > 0 && 
             selectedCardIds.value.length === filteredSceneCards.value.length;
    });

    const toggleSelectAllCards = () => {
      if (isAllCardsSelected.value) {
        selectedCardIds.value = [];
      } else {
        selectedCardIds.value = filteredSceneCards.value.map(card => card.id);
      }
    };

    const showSceneSelector = (section) => {
      // 首先刷新最新的场景数据
      loadScenes();
      if (scenes.value.length === 0) {
        showToast('未找到场景数据，请先在Data页面创建场景', 'warning');
        return;
      }
      currentSectionForCharacters.value = section;
      // 预设已选中的角色
      selectedCardIds.value = section.linkedCharacters || [];
      showSceneSelectModal.value = true;
    };

    const closeSceneSelectModal = () => {
      showSceneSelectModal.value = false;
      sceneSearchKeyword.value = '';
    };

    const confirmCardsSelection = () => {
      if (currentSectionForCharacters.value) {
        // 更新当前section的linkedCharacters属性
        currentSectionForCharacters.value.linkedCharacters = [...selectedCardIds.value];
        // 更新selectedSceneName和selectedCardsInfo以便显示
        if (currentScene.value) {
          currentSectionForCharacters.value.selectedSceneName = currentScene.value.name;
          // 获取所有选中的卡片对象
          const selectedCards = [];
          // 先记录所有可用卡片的ID到标题的映射
          const cardMap = {};
          currentScene.value.cards.forEach(card => {
            if (card && card.id) {
              cardMap[card.id] = card;
            }
          });
          // 遍历所有选中的ID，获取对应的卡片对象
          selectedCardIds.value.forEach(id => {
            const card = cardMap[id];
            if (card) {
              selectedCards.push(card);
            }
          });
          // 设置selectedCardsInfo属性显示卡片名称
          if (selectedCards.length > 0) {
            currentSectionForCharacters.value.selectedCardsInfo = selectedCards
              .map(card => card.title || '未命名卡片')
              .join(', ');
          } else {
            currentSectionForCharacters.value.selectedCardsInfo = '未选择任何卡片';
          }
        }
        // 保存当前章节
        // saveCurrentChapter(); // 需要在父组件中处理保存逻辑
        showToast(`已选择 ${selectedCardIds.value.length} 个角色`, 'success');
      }
      closeCharacterSelectModal();
      closeSceneSelectModal();
    };

    return {
      aiSettings,
      showChapterSelectModal,
      chapterSearchKeyword,
      selectedChapterIds,
      currentSectionForChapters,
      showSceneSelectModal,
      showCharacterSelectModal,
      sceneSearchKeyword,
      cardSearchKeyword,
      selectedCardIds,
      currentScene,
      currentSectionForCharacters,
      scenes,
      showEntrySelectModal,
      entrySearchKeyword,
      selectedEntryIds,
      entrySelectTab,
      currentSectionForEntries,
      filteredChapters,
      isAllChaptersSelected,
      toggleSelectAllChapters,
      showChapterSelector,
      closeChapterSelectModal,
      confirmChaptersSelection,
      filteredScenes,
      filteredSceneCards,
      isAllCardsSelected,
      toggleSelectAllCards,
      showSceneSelector,
      closeSceneSelectModal,
      confirmCardsSelection,
    };
  }
};
</script>

<style scoped>
/* 添加样式 */
</style>
