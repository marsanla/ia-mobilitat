import Vue from "vue";
import App from "./App.vue";

import Antd from "ant-design-vue";
import Moment from "vue-moment";
import "ant-design-vue/dist/antd.css";

import moment from "moment";

require('moment/locale/es')

Vue.use(Moment, {
  moment
})

Vue.use(Antd);
Vue.use(Moment);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount(`#app`);
