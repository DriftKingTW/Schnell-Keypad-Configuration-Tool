<!-- src/components/HoverTooltip.vue -->
<template>
  <div
    class="relative"
    :class="class"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
  >
    <slot></slot>
    <div
      v-show="isVisible"
      class="absolute text-white text-sm rounded p-2 z-10 transition-o pacity duration-200 tooltip"
      style="transform: translate(-50%, -100%); top: -10px; left: 50%"
    >
      {{ tooltipText }}
      <span class="tooltip-arrow"></span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  props: {
    tooltipText: {
      type: String,
      required: true,
    },
    class: {
      type: String,
      default: "",
    },
  },
  setup() {
    const isVisible = ref(false);

    function showTooltip() {
      isVisible.value = true;
    }

    function hideTooltip() {
      isVisible.value = false;
    }

    return { isVisible, showTooltip, hideTooltip };
  },
});
</script>

<style scoped>
.tooltip {
  background-color: rgba(41, 37, 36, 0.5);
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tooltip::before {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  border-style: solid;
  border-width: 4px 4px 0;
  border-color: rgba(41, 37, 36, 0.5) transparent transparent;
  transform: translate(-50%, 0);
}

.tooltip::after {
  content: "";
  position: absolute;
  top: calc(100% - 1px);
  left: 50%;
  border-style: solid;
  border-width: 3px 3px 0;
  border-color: rgba(41, 37, 36, 0.5) transparent transparent;
  transform: translate(-50%, 0);
}

.tooltip-arrow {
  display: none;
}
</style>
