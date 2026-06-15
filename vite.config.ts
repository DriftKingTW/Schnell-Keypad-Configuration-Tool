import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

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
  ],
  base: "/Schnell-Keypad-Configuration-Tool/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      icons: fileURLToPath(
        new URL("./node_modules/vue-material-design-icons", import.meta.url)
      ),
    },
  },
});
