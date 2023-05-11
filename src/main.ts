import { createApp } from "vue";
import App from "./App.vue";
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import zhTW from "./locales/zh-tw.json";
import zhCN from "./locales/zh-cn.json";
import "./index.scss";
import { store, key } from "./store";
import VueSplide from "@splidejs/vue-splide";

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}/service-worker.js`)
      .then((registration) => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope
        );
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}

createApp(App).use(store, key).use(i18n).use(VueSplide).mount("#app");
