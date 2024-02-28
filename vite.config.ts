import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueI18n from "@intlify/vite-plugin-vue-i18n";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => ["esp-web-install-button"].includes(tag),
        },
      },
    }),
    vueI18n({
      include: path.resolve(__dirname, "./src/locales/**"),
    }),
  ],
  base: "/Schnell-Keypad-Configuration-Tool/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      icons: path.resolve(__dirname, "node_modules/vue-material-design-icons"),
    },
  },
});
