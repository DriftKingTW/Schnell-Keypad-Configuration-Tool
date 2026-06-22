import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueI18n from "@intlify/unplugin-vue-i18n/vite";

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
    // Pre-compile locale messages at build time. Without this, vue-i18n falls
    // back to compiling messages in the browser, which throws a SyntaxError on
    // production builds and leaves the app blank.
    vueI18n({
      include: [fileURLToPath(new URL("./src/locales/**", import.meta.url))],
    }),
  ],
  base: "/Schnell-Keypad-Configuration-Tool/",
  // Vite 8's (rolldown) dependency optimizer emits a broken pre-bundle for
  // vue-i18n ("init_runtime_dom_esm_bundler is not defined"), blanking the dev
  // app. Serve it as native ESM instead of pre-bundling it. Dev-only; the
  // production build is unaffected.
  optimizeDeps: {
    exclude: ["vue-i18n"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      icons: fileURLToPath(
        new URL("./node_modules/vue-material-design-icons", import.meta.url)
      ),
    },
  },
});
