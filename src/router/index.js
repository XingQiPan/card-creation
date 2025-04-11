import { createRouter, createWebHistory } from 'vue-router'
import Editor from '../components/Editor.vue'
import MainView from '../App.vue'

const routes = [
  {
    path: '/',
    name: 'Main',
    component: MainView
  },
  {
    path: '/book',
    name: 'Book',
    component: MainView
  },
  {
    path: '/chat',
    name: 'Chat',
    component: MainView
  },
  {
    path: '/note',
    name: 'Note',
    component: MainView
  },
  {
    path: '/agents',
    name: 'Agents',
    component: MainView
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: MainView
  },
  {
    path: '/knowledgeGraph',
    name: 'KnowledgeGraph',
    component: MainView
  },
  {
    path: '/cloudSync',
    name: 'CloudSync',
    component: MainView
  },
  {
    path: '/editor/:bookId/section/:sectionId',
    name: 'EditorSection',
    component: Editor,
    props: true
  },
  {
    path: '/editor/:bookId',
    name: 'Editor',
    component: Editor,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.name === 'Editor' && !to.params.bookId) {
    next('/')
  } else {
    next()
  }
})

export default router