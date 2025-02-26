<template>
  <svg 
    class="flow-connection"
    :class="{ selected, 'connection-temp': connectionType === 'temp' }"
    @click.stop="$emit('select', connectionId)"
  >
    <path
      :d="getPath()"
      :stroke="getStrokeColor()"
      :stroke-width="getStrokeWidth()"
      :stroke-dasharray="getStrokeDashArray()"
      fill="none"
    />
    
    <!-- 删除按钮 -->
    <g 
      v-if="selected && connectionType !== 'temp'"
      class="delete-btn"
      @click.stop="$emit('delete', connectionId)"
      :transform="`translate(${getMidPoint().x}, ${getMidPoint().y})`"
    >
      <circle cx="0" cy="0" r="8" fill="white" stroke="#ef4444" stroke-width="1" />
      <line x1="-4" y1="0" x2="4" y2="0" stroke="#ef4444" stroke-width="2" />
      <line x1="0" y1="-4" x2="0" y2="4" stroke="#ef4444" stroke-width="2" transform="rotate(45)" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  connectionId: {
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
  connectionType: {
    type: String,
    default: 'default'
  },
  selected: {
    type: Boolean,
    default: false
  },
  scale: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits(['select', 'delete']);

// 获取连接线路径
const getPath = () => {
  const { x: x1, y: y1 } = props.startPoint;
  const { x: x2, y: y2 } = props.endPoint;
  
  // 计算控制点
  const dx = Math.abs(x2 - x1);
  const offsetX = Math.min(dx * 0.5, 50);
  
  let cp1x, cp2x;
  
  if (x1 < x2) {
    cp1x = x1 + offsetX;
    cp2x = x2 - offsetX;
  } else {
    cp1x = x1 - offsetX;
    cp2x = x2 + offsetX;
  }
  
  return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
};

// 获取连接线中点
const getMidPoint = () => {
  const { x: x1, y: y1 } = props.startPoint;
  const { x: x2, y: y2 } = props.endPoint;
  
  // 计算贝塞尔曲线的中点（近似）
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2 - Math.min(Math.abs(y2 - y1) * 0.2, 20) * (y1 < y2 ? 1 : -1)
  };
};

// 获取连接线颜色
const getStrokeColor = () => {
  switch (props.connectionType) {
    case 'temp': return '#3b82f6';
    case 'condition-true': return '#10b981';
    case 'condition-false': return '#ef4444';
    default: return props.selected ? '#3b82f6' : '#9ca3af';
  }
};

// 获取连接线宽度
const getStrokeWidth = () => {
  // 根据缩放比例调整线宽
  const baseWidth = props.selected ? 2 : 1.5;
  return baseWidth / props.scale;
};

// 获取连接线虚线样式
const getStrokeDashArray = () => {
  if (props.connectionType !== 'temp') return 'none';
  
  // 根据缩放比例调整虚线样式
  const dashSize = 5 / props.scale;
  return `${dashSize},${dashSize}`;
};
</script>

<style scoped>
.flow-connection {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.flow-connection path {
  pointer-events: stroke;
  cursor: pointer;
}

.flow-connection.selected path {
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
}

.delete-btn {
  cursor: pointer;
  pointer-events: all;
}

.delete-btn:hover circle {
  fill: #fee2e2;
}

.connection-temp {
  z-index: 1000;
}
</style>
