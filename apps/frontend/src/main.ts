import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VNetworkGraph from 'v-network-graph'
import 'v-network-graph/lib/style.css'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import './styles/theme.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(vuetify)
app.use(VNetworkGraph)
app.mount('#app')
