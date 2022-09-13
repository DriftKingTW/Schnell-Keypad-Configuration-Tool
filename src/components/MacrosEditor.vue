<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { JsonViewer } from "vue3-json-viewer";

import "vue3-json-viewer/dist/index.css";

import ExportIcon from "icons/Export.vue";
import CodeJsonIcon from "icons/CodeJson.vue";
import PlusIcon from "icons/Plus.vue";

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
  keyStrokes = [...keyStrokes, e.key.charCodeAt(0)];
  macros[activeMacroIndex.value].keyStrokes = [...keyStrokes];
  updateOuputData();
  console.log(keyStrokes);
};

const resetKeyStrokes = () => {
  keyStrokes = [];
};

const checkSpecialKey = (key: number) => {
  let result: string = "";

  switch (key) {
    case 128:
      result = "LCtrl";
      break;
    case 129:
      result = "LShift";
      break;
    case 130:
      result = "LAlt";
      break;
    case 131:
      result = "LMeta";
      break;
    case 132:
      result = "RCtrl";
      break;
    case 133:
      result = "RShift";
      break;
    case 134:
      result = "RAlt";
      break;
    case 135:
      result = "RMeta";
      break;
    case 176:
      result = "Return";
      break;
    case 179:
      result = "Tab";
      break;
    case 178:
      result = "Backspace";
      break;
    case 193:
      result = "CapsLock";
      break;
    case 237:
      result = "Menu";
      break;
    case 209:
      result = "Insert";
      break;
    case 210:
      result = "Home";
      break;
    case 211:
      result = "PageUp";
      break;
    case 212:
      result = "Delete";
      break;
    case 213:
      result = "End";
      break;
    case 214:
      result = "PageDown";
      break;
    case 215:
      result = "RightArrow";
      break;
    case 216:
      result = "LeftArrow";
      break;
    case 217:
      result = "DownArrow";
      break;
    case 218:
      result = "UpArrow";
      break;
    case 219:
      result = "NumLock";
      break;
    case 220:
      result = "Keypad /";
      break;
    case 221:
      result = "Keypad *";
      break;
    case 222:
      result = "Keypad -";
      break;
    case 223:
      result = "Keypad +";
      break;
    case 224:
      result = "Keypad Enter";
      break;
    case 225:
      result = "Keypad 1";
      break;
    case 226:
      result = "Keypad 2";
      break;
    case 227:
      result = "Keypad 3";
      break;
    case 228:
      result = "Keypad 4";
      break;
    case 229:
      result = "Keypad 5";
      break;
    case 230:
      result = "Keypad 6";
      break;
    case 231:
      result = "Keypad 7";
      break;
    case 232:
      result = "Keypad 8";
      break;
    case 233:
      result = "Keypad 9";
      break;
    case 234:
      result = "Keypad 0";
      break;
    case 235:
      result = "Keypad .";
      break;
    case 177:
      result = "Escape";
      break;
    case 194:
      result = "F1";
      break;
    case 195:
      result = "F2";
      break;
    case 196:
      result = "F3";
      break;
    case 197:
      result = "F4";
      break;
    case 198:
      result = "F5";
      break;
    case 199:
      result = "F6";
      break;
    case 200:
      result = "F7";
      break;
    case 201:
      result = "F8";
      break;
    case 202:
      result = "F9";
      break;
    case 203:
      result = "F10";
      break;
    case 204:
      result = "F11";
      break;
    case 205:
      result = "F12";
      break;
    case 240:
      result = "F13";
      break;
    case 241:
      result = "F14";
      break;
    case 242:
      result = "F15";
      break;
    case 243:
      result = "F16";
      break;
    case 244:
      result = "F17";
      break;
    case 245:
      result = "F18";
      break;
    case 246:
      result = "F19";
      break;
    case 247:
      result = "F20";
      break;
    case 248:
      result = "F21";
      break;
    case 249:
      result = "F22";
      break;
    case 250:
      result = "F23";
      break;
    case 251:
      result = "F24";
      break;
    case 206:
      result = "PrintScreen";
      break;
    case 207:
      result = "ScrollLock";
      break;
    case 208:
      result = "Pause";
      break;
  }

  return result;
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
