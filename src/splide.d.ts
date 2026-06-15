// @splidejs/vue-splide ships its "types" pointing at raw .ts source that fails
// strict type-checking under vue-tsc, and its "exports" map has no types
// condition. This shim is wired up via tsconfig "paths" so type-checking
// resolves here instead of the broken source. Vite resolves the real package
// at build time (it ignores tsconfig paths).
import type { Plugin, Component } from "vue";

declare const VueSplide: Plugin;
export default VueSplide;

export const Splide: Component;
export const SplideSlide: Component;
export const SplideTrack: Component;
