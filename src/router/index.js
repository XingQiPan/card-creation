import { createRouter, createWebHistory } from 'vue-router'
import NotePad from '../components/NotePad.vue'
import Editor from '../components/Editor.vue'
import ChatView from '../components/ChatView.vue'
import AgentsView from '../components/AgentsView.vue'
import KnowledgeView from '../components/KnowledgeBase.vue'
import BookView from '../components/BookSplitter.vue'
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
    component: BookView
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatView
  },
  {
    path: '/note',
    name: 'Note',
    component: NotePad
  },
  {
    path: '/agents',
    name: 'Agents',
    component: AgentsView
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: KnowledgeView
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