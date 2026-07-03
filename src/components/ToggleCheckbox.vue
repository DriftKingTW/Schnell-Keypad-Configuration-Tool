<script setup lang="ts">
import { computed } from "vue";

const props = defineProps(["modelValue", "label", "small"]);
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
    <label class="flex items-center cursor-pointer">
      <div class="relative">
        <input type="checkbox" class="sr-only" v-model="value" />
        <div
          class="toggle__line rounded-full shadow-inner"
          :class="[
            small ? 'w-10 h-5' : 'w-12 h-6',
            {
              'bg-lime-600': value,
              'bg-stone-200': !value,
              'dark:bg-stone-600': !value,
            },
          ]"
        ></div>
        <div
          class="toggle__dot absolute bg-white rounded-full shadow inset-y-0 left-0"
          :class="[
            small ? 'w-5 h-5' : 'w-6 h-6',
            { 'translate-x-full': value },
          ]"
        ></div>
      </div>
      <div
        class="font-medium whitespace-nowrap"
        :class="small ? 'ml-2 text-sm' : 'ml-3 text'"
      >
        {{ label }}
      </div>
    </label>
  </div>
</template>
