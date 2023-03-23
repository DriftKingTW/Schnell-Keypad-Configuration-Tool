<script setup lang="ts">
import { computed } from "vue";

const props = defineProps(["modelValue", "label"]);
const emit = defineEmits(["update:modelValue"]);

const value: any = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});
</script>

<template>
  <div class="flex items-center">
    <label for="toggle" class="flex items-center cursor-pointer">
      <div class="relative">
        <input type="checkbox" id="toggle" class="sr-only" v-model="value" />
        <div
          class="toggle__line w-12 h-6 rounded-full shadow-inner"
          :class="{ 'bg-lime-600': value, 'bg-stone-600': !value }"
        ></div>
        <div
          class="toggle__dot absolute w-6 h-6 bg-white rounded-full shadow inset-y-0 left-0"
          :class="{ 'translate-x-full': value }"
        ></div>
      </div>
      <div class="ml-3 text font-medium">{{ label }}</div>
    </label>
  </div>
</template>
