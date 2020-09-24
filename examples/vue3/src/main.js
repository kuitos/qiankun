import { createApp } from 'vue';
import App from './App.vue';
import routerObj from './router';
import store from './store';
import './public-path';

let router = null;
let instance = null;

function render() {
  router = routerObj;

  instance = createApp(App);
  instance.use(router);
  instance.use(store);
  instance.mount('#app8');
}

if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

export async function bootstrap() {
  console.log('%c%s', 'color: green;', 'vue3.0 app bootstraped');
}

export async function mount(props) {
  render();
  instance.config.globalProperties.$onGlobalStateChange = props.onGlobalStateChange;
  instance.config.globalProperties.$setGlobalState = props.setGlobalState;
}

export async function unmount() {
  instance.$destroy();
  instance = null;
  router = null;
}
