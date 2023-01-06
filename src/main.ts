import { createApp } from "vue";
import App from "./App.vue";
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import zhTW from "./locales/zh-tw.json";
import zhCN from "./locales/zh-cn.json";
import "./index.scss";
import { store, key } from "./store";

const i18n = createI18n({
  globalInjection: true,
  fallbackLocale: "en",
  messages: {
    en,
    "en-US": en,
    "en-GB": en,
    "zh-TW": zhTW,
    "zh-CN": zhCN,
  },
});

createApp(App).use(store, key).use(i18n).mount("#app");
