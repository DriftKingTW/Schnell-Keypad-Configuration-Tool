<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { JsonViewer } from "vue3-json-viewer";
import draggable from "vuedraggable";

import "vue3-json-viewer/dist/index.css";

import ExportIcon from "icons/Export.vue";
import CodeJsonIcon from "icons/CodeJson.vue";
import PlusIcon from "icons/Plus.vue";
import MenuRightIcon from "icons/MenuRight.vue";
import MenuLeftIcon from "icons/MenuLeft.vue";
import DragHorizontalVariantIcon from "icons/DragHorizontalVariant.vue";

import { getSpecialKeyCode, checkSpecialKey } from "../utils/specialKeyHandler";

interface Props {
  macros: Macro[];
  modelValue: Number;
  isSelectingMacro: boolean;
}

const props = defineProps<Props>();

type Macro = {
  type: number;
  name: string;
  keyStrokes: number[];
  stringContent: string;
};

const activeMacroIndex = ref(-1);
const outputJsonString = ref("");
let keyStrokes: number[] = reactive([]);
const typeList: string[] = ["Key Strokes", "String", "String w/ Enter"];
const macros: Macro[] = reactive([]);
const isDragging = ref(false);

const darkMode = computed(() => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const configJsonArray = computed(() => JSON.parse(outputJsonString.value));

/**
 * Initialize current layout's data
 *
 */
const initializeLayout = () => {
  // Load saved data in localStorage
  const loadData = localStorage.getItem("macros");

  if (props.macros.length > 0) {
    // If prop data is available
    macros.push(...props.macros);
  } else if (loadData) {
    // If localStorage data is available
    const loadDataArray = JSON.parse(loadData);
    macros.push(...loadDataArray);
  }

  updateOuputData();

  // If no data is available, create a new macro
  if (macros.length === 0) {
    addMacro();
  }
};

/**
 * Add a new macro
 *
 */
const addMacro = () => {
  macros.push({
    type: 0,
    name: `Macro ${macros.length}`,
    keyStrokes: [],
    stringContent: "",
  });
};

/**
 * Remove empty macro config from the macros array
 *
 */
const removeEmptyMacros = () => {
  macros.forEach((macro: Macro, index: number) => {
    if (macro.name === "") {
      macros.splice(index, 1);
    } else if (macro.type === 0 && macro.keyStrokes.length === 0) {
      macros.splice(index, 1);
    } else if (
      (macro.type === 1 || macro.type === 2) &&
      macro.stringContent === ""
    ) {
      macros.splice(index, 1);
    }
  });
};

/**
 * Update JSON output data
 *
 */
const updateOuputData = () => {
  outputJsonString.value = JSON.stringify(macros);

  //save to localStorage
  localStorage.setItem("macros", outputJsonString.value);
};

/**
 * Export macros as JSON config file
 *
 */
const exportMacros = () => {
  removeEmptyMacros();
  updateOuputData();
  const data = JSON.stringify(macros);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = "macros.json";
  link.href = url;
  link.click();
};

/**
 * Toggle current active macro (for key strokes input)
 *
 */
const toggleActive = (macroIndex: number) => {
  if (props.isSelectingMacro) {
    return;
  }
  if (activeMacroIndex.value === macroIndex) {
    resetActiveMacro();
  } else {
    activeMacroIndex.value = macroIndex;
  }
};

/**
 * Resets active macro
 *
 */
const resetActiveMacro = () => {
  activeMacroIndex.value = -1;
  resetKeyStrokes();
};

/**
 * Update key strokes for macro
 *
 */
const updateKeyStorkes = (e: any) => {
  // Max 6 key press allowed
  if (keyStrokes.length === 6) {
    return;
  }
  const specialKeyCode = getSpecialKeyCode(e.code);
  keyStrokes = [
    ...keyStrokes,
    specialKeyCode === 0 ? e.key.charCodeAt(0) : specialKeyCode,
  ];
  macros[activeMacroIndex.value].keyStrokes = [...keyStrokes];
  updateOuputData();
  console.log(keyStrokes);
};

/**
 * Reset key strokes
 *
 */
const resetKeyStrokes = () => {
  keyStrokes = [];
};

const updateMacroType = (i: number, e: any) => {
  const element = e.currentTarget as HTMLInputElement;
  const value = element.value;
  macros[i].type = Number(value);
  updateOuputData();
};

initializeLayout();
</script>

<template>
  <div>
    <div class="flex">
      <button class="btn btn-install flex" @click="addMacro">
        <plus-icon :size="18" class="self-center mr-2" />
        {{ $t("addMacro") }}
      </button>

      <button class="btn btn-export flex" @click="exportMacros">
        <export-icon :size="18" class="self-center mr-2" />
        {{ $t("export") }}
      </button>
    </div>

    <div class="overflow-y-auto overflow-x-hidden" style="max-height: 26rem">
      <draggable
        :list="macros"
        @start="isDragging = true"
        @end="isDragging = false; updateOuputData()"
        handle=".handle"
        item-key="name"
      >
        <template #item="{ element: macro, index }">
          <div
            class="grid grid-cols-12 w-full"
            style="width: calc(100% - 12px)"
          >
            <span
              :class="`col-span-12 text ml-2 flex ${
                isSelectingMacro ? 'hover:text-amber-400 cursor-pointer' : ''
              }`"
              @click="$emit('update:modelValue', index)"
            >
              <drag-horizontal-variant-icon
                :size="24"
                class="mr-2 handle cursor-grab active:cursor-grabbing"
              />
              <menu-right-icon
                v-if="isSelectingMacro"
                :size="24"
                class="arrow self-center mr-2"
              />
              {{ `Macro ${index}` }}
              <menu-left-icon
                v-if="isSelectingMacro"
                :size="24"
                class="arrow self-center ml-2"
              />
            </span>
            <select
              class="col-span-5 btn"
              :value="macro.type"
              @change="updateMacroType(index, $event)"
            >
              <option
                v-for="(type, j) in typeList"
                :key="type + index + j"
                :value="j"
              >
                {{ type }}
              </option>
            </select>
            <input
              type="text"
              placeholder=""
              class="col-span-7 w-full text-input"
              v-model="macro.name"
              @input="updateOuputData"
            />
            <input
              v-if="macro.type === 1 || macro.type === 2"
              type="text"
              placeholder=""
              class="col-span-12 w-full text-input"
              v-model="macro.stringContent"
              @input="updateOuputData"
            />
            <div
              v-else
              class="col-span-12 w-full text-input outline-0 cursor-pointer"
              :class="activeMacroIndex === index ? 'macro-active' : ''"
              @click="toggleActive(index)"
              tabindex="0"
              @keydown.prevent="updateKeyStorkes($event)"
            >
              <span v-for="key in macro.keyStrokes" class="label">
                {{
                  checkSpecialKey(key) === ""
                    ? String.fromCharCode(key) === " "
                      ? "Space"
                      : String.fromCharCode(key)
                    : checkSpecialKey(key)
                }}
              </span>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <div id="output" class="flex justify-center my-4">
      <div>
        <label for="" class="flex">
          <code-json-icon :size="18" class="self-center mr-2" />
          {{ $t("outputJsonConfig") }}
        </label>
        <!-- <hr  /> -->
        <JsonViewer
          :value="configJsonArray"
          class="mt-4"
          copyable
          boxed
          sort
          :expanded="false"
          :expand-depth="0"
          :theme="darkMode ? 'dark' : 'light'"
        >
          <template v-slot:copy>{{ $t("copy") }}</template>
        </JsonViewer>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.macro-active {
  @apply bg-amber-300 hover:bg-amber-400
  dark:bg-amber-400 dark:hover:bg-amber-500 dark:text-neutral-900;
}
.arrow {
  animation: flashing 1s infinite;
}

@keyframes flashing {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
