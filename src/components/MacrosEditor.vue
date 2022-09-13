<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { JsonViewer } from "vue3-json-viewer";

import "vue3-json-viewer/dist/index.css";

import ExportIcon from "icons/Export.vue";
import CodeJsonIcon from "icons/CodeJson.vue";
import PlusIcon from "icons/Plus.vue";

import { getSpecialKeyCode, checkSpecialKey } from "./../utils/SpecialKeyHandler";

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

const darkMode = computed(() => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const configJsonArray = computed(() => JSON.parse(outputJsonString.value));

/**
 * Initialize current layout's data
 *
 * @param {boolean} reset - Resets current layout, false for default
 */
const initializeLayout = () => {
  // Load saved data in localStorage
  const savedData = localStorage.getItem("macros");
  if (savedData) {
    const savedDataArray = JSON.parse(savedData);
    savedDataArray.forEach((macro: Macro) => {
      macros.push(macro);
    });
  }
  updateOuputData();
  if (macros.length === 0) {
    addMacro();
  }
};

const addMacro = () => {
  macros.push({
    type: 0,
    name: "New Macro",
    keyStrokes: [],
    stringContent: "",
  });
};

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

const updateOuputData = () => {
  removeEmptyMacros();
  outputJsonString.value = JSON.stringify(macros);

  //save to localStorage
  localStorage.setItem("macros", outputJsonString.value);
};

const exportMacros = () => {
  updateOuputData();
  const data = JSON.stringify(macros);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = "macros.json";
  link.href = url;
  link.click();
};

const toggleActive = (macroIndex: number) => {
  if (activeMacroIndex.value === macroIndex) {
    resetActiveMacro();
  } else {
    activeMacroIndex.value = macroIndex;
  }
};

const resetActiveMacro = () => {
  activeMacroIndex.value = -1;
  resetKeyStrokes();
};

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

const resetKeyStrokes = () => {
  keyStrokes = [];
};

initializeLayout();
</script>

<template>
  <div>
    <div class="flex">
      <button class="btn btn-install flex" @click="addMacro">
        <plus-icon :size="18" class="self-center mr-2" />
        Add Macro
      </button>

      <button class="btn btn-export flex" @click="exportMacros">
        <export-icon :size="18" class="self-center mr-2" />
        {{ $t("export") }}
      </button>
    </div>

    <div class="overflow-y-auto overflow-x-hidden" style="max-height: 26rem">
      <div
        class="grid grid-cols-12 w-full"
        style="width: calc(100% - 12px)"
        v-for="(macro, i) in macros"
        :key="`macro_${i}`"
      >
        <span class="col-span-12 text ml-2">{{ `Macro ${i}` }}</span>
        <select class="col-span-5 btn" v-model="typeList[macro.type]">
          <option v-for="(type, j) in typeList" :key="type + i + j">
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
          class="col-span-12 w-full text-input outline-0 h-8 cursor-pointer"
          :class="activeMacroIndex === i ? 'macro-active' : ''"
          @click="toggleActive(i)"
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
</style>