import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import router from './router';
createApp(App).use(Antd).use(router).mount('#app');
// Create a Vue app from App.vue.
// Enable Ant Design Vue components.
// Enable the router.
// Put the app into the HTML element with id="app"
