import { createApp } from 'vue'

import './style.css'
import App from './App.vue'
import { bootstrapAuth } from './lib/auth'
import { router } from './router'

bootstrapAuth()

createApp(App).use(router).mount('#app')
