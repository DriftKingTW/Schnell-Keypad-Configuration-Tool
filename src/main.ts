import { createApp } from "vue";
import App from "./App.vue";
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import zhTW from "./locales/zh-TW.json";
import zhCN from "./locales/zh-CN.json";
import "./index.css";

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

createApp(App).use(i18n).mount("#app");
