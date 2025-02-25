<template>
  <svg class="flow-connection" :style="svgStyle">
    <defs>
      <marker
        :id="`arrowhead-${id}`"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" :fill="connectionColor" />
      </marker>
    </defs>
    <path
      :d="pathData"
      :stroke="connectionColor"
      stroke-width="2"
      fill="none"
      :marker-end="`url(#arrowhead-${id})`"
    />
    <text 
      v-if="label" 
      :x="labelX" 
      :y="labelY" 
      :fill="connectionColor" 
      text-anchor="middle"
      alignment-baseline="middle"
      font-size="12"
      font-weight="500"
    >
      {{ label }}
    </text>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  startPoint: {
    type: Object,
    required: true
  },
  endPoint: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    default: 'default'
  }
});

// 计算SVG样式
const svgStyle = computed(() => {
  const left = Math.min(props.startPoint.x, props.endPoint.x) - 20;
  const top = Math.min(props.startPoint.y, props.endPoint.y) - 20;
  const width = Math.abs(props.endPoint.x - props.startPoint.x) + 40;
  const height = Math.abs(props.endPoint.y - props.startPoint.y) + 40;
  
  return {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: 1
  };
});

// 计算路径数据
const pathData = computed(() => {
  const startX = props.startPoint.x - parseInt(svgStyle.value.left);
  const startY = props.startPoint.y - parseInt(svgStyle.value.top);
  const endX = props.endPoint.x - parseInt(svgStyle.value.left);
  const endY = props.endPoint.y - parseInt(svgStyle.value.top);
  
  // 计算控制点
  const dx = Math.abs(endX - startX);
  const controlOffset = Math.min(dx * 0.5, 150);
  
  // 使用贝塞尔曲线创建平滑路径
  return `M ${startX} ${startY} 
          C ${startX + (startX < endX ? controlOffset : -controlOffset)} ${startY}
            ${endX - (startX < endX ? controlOffset : -controlOffset)} ${endY}
            ${endX} ${endY}`;
});

// 连接线颜色
const connectionColor = computed(() => {
  switch (props.type) {
    case 'true':
      return '#10b981'; // 绿色
    case 'false':
      return '#ef4444'; // 红色
    default:
      return '#3b82f6'; // 蓝色
  }
});

// 标签位置
const labelX = computed(() => {
  const startX = props.startPoint.x - parseInt(svgStyle.value.left);
  const endX = props.endPoint.x - parseInt(svgStyle.value.left);
  return (startX + endX) / 2;
});

const labelY = computed(() => {
  const startY = props.startPoint.y - parseInt(svgStyle.value.top);
  const endY = props.endPoint.y - parseInt(svgStyle.value.top);
  return (startY + endY) / 2 - 10;
});

// 连接线标签
const label = computed(() => {
  switch (props.type) {
    case 'true':
      return '是';
    case 'false':
      return '否';
    default:
      return '';
  }
});
</script>

<style scoped>
.flow-connection {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

/* 确保文本在连接线上方 */
text {
  filter: drop-shadow(0 0 2px white);
  font-size: 12px;
  font-weight: 500;
}

/* 添加连接线动画效果 */
path {
  transition: stroke 0.3s ease;
}

/* 连接线悬停效果 */
.connection-label {
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.connection-label:hover {
  opacity: 1;
}
</style>
