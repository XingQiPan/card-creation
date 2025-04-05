<template>
  <div class="ai-open-panel">
    <h3>AI开篇</h3>
    <div class="novel-info-form">
      <div class="form-row">
        <label>小说名称:</label>
        <input type="text" v-model="novelInfo.title" class="info-input" />
      </div>
      <div class="form-row">
        <label>小说类型:</label>
        <input type="text" v-model="novelInfo.genre" class="info-input" />
      </div>
      <div class="form-row">
        <label>小说简介:</label>
        <textarea v-model="novelInfo.summary" class="info-textarea"></textarea>
      </div>
      <div class="form-row">
        <label>小说标签:</label>
        <textarea v-model="novelInfo.tags" class="info-textarea"></textarea>
      </div>
    </div>
    <div class="panel-actions">
      <button @click="generateOpening">灵感开篇 生成</button>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue';

export default {
  name: 'AIOpen',
  setup() {
    const novelInfo = reactive({
      title: '',
      genre: '都市修真',
      summary: '',
      tags: '',
    });

    const generateOpening = () => {
      // 生成开篇的逻辑
      console.log('生成开篇:', novelInfo);
    };

    return {
      novelInfo,
      generateOpening,
    };
  },
};
</script>