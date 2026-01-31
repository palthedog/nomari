import { createApp } from 'vue'
import { createPinia } from 'pinia'
import log from 'loglevel'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './styles/theme.css'

// Configure log level based on environment
if (import.meta.env.DEV) {
    log.setLevel('debug');
} else {
    log.setLevel('warn');
}

log.debug('Application starting in', import.meta.env.DEV ? 'development' : 'production', 'mode');

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(vuetify)
app.mount('#app')
