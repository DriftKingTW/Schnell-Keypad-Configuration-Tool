import { createApp } from "vue";
import App from "./App.vue";
import { createI18n } from "vue-i18n";
import en from "./locales/en-us.json";
import zhTW from "./locales/zh-tw.json";
import zhCN from "./locales/zh-cn.json";
import "./index.css";

const i18n = createI18n({
  globalInjection: true,
  fallbackLocale: "en",
  messages: {
    "en-US": en,
    "zh-TW": zhTW,
    "zh-CN": zhCN,
  },
});

createApp(App).use(i18n).mount("#app");
