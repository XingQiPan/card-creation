import { createRouter, createWebHistory } from 'vue-router'
import AgentsView from '../views/AgentsView.vue'
import AgentDetailView from '../views/AgentDetailView.vue'
import AgentFlowEditor from '../components/AgentFlow/AgentFlowEditor.vue'
import AgentTesting from '../components/AgentManager/AgentTesting.vue'
import AgentEditor from '../components/AgentManager/AgentEditor.vue'

// 检查组件是否正确导入
console.log('Router components:', {
  AgentsView,
  AgentDetailView,
  AgentFlowEditor,
  AgentTesting,
  AgentEditor
});

// 简化路由配置，删除重复路由
const routes = [
  {
    path: '/',
    redirect: '/agents'
  },
  {
    path: '/agents',
    name: 'agents',
    component: AgentsView
  },
  {
    path: '/agents/new',
    name: 'AgentNew',
    component: AgentEditor
  },
  {
    path: '/agents/:id',
    name: 'agent-detail',
    component: AgentDetailView,
    props: true
  },
  {
    path: '/agents/:id/edit',
    name: 'AgentEdit',
    component: AgentEditor
  },
  {
    path: '/agents/:id/test',
    name: 'agent-test',
    component: AgentTesting,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 添加导航日志
router.beforeEach((to, from, next) => {
  console.log(`Navigation: ${from.path} -> ${to.path}`);
  next();
});

export default router