<script setup lang="ts">
import { readonly, shallowReadonly, ref, reactive, computed } from "vue";
import { JsonViewer } from "vue3-json-viewer";
import { useI18n } from "vue-i18n";

import "vue3-json-viewer/dist/index.css";

// Set page title
const i18n = useI18n();
document.title = i18n.t("navTitle");

// Type declarations
type Coordinate = {
  row: number;
  col: number;
};

interface KeyboardLayout extends Coordinate {
  size: KeySize;
}

type KeySize =
  | "1u"
  | "w-1.25u"
  | "w-1.5u"
  | "w-2u"
  | "h-1.25u"
  | "h-1.5u"
  | "h-2u";

type Key = {
  keyStroke: number;
  keyInfo: string;
  keySize: KeySize;
  dummy: boolean;
  active: boolean;
};

type ConfigJSONObject = {
  title: string;
  keymap: number[][];
  keyInfo: string[][];
};

type ConfigJSONArray = ConfigJSONObject[];

// User defined keyboard parameters
const ROWS = 5;
const COLS = 7;
const DUMMY_KEYS: Coordinate[] = [
  { row: 2, col: 6 },
  { row: 0, col: 6 },
  { row: 4, col: 3 },
  { row: 4, col: 5 },
];
const KEYBOARD_LAYOUT: KeyboardLayout[] = [
  { row: 0, col: 0, size: "w-1.5u" },
  { row: 1, col: 0, size: "w-1.5u" },
  { row: 2, col: 0, size: "w-1.5u" },
  { row: 3, col: 0, size: "w-1.5u" },
  { row: 4, col: 0, size: "w-1.5u" },
  // { row: 1, col: 6, size: "h-2u" },
  // { row: 3, col: 6, size: "h-2u" },
  { row: 4, col: 4, size: "w-2u" },
  { row: 4, col: 1, size: "w-1.5u" },
  { row: 4, col: 2, size: "w-1.5u" },
  { row: 4, col: 6, size: "w-1.25u" },
];

// Default objects
const defaultKey: Key = readonly({
  keyStroke: 0,
  keyInfo: " ",
  keySize: "1u",
  dummy: false,
  active: false,
});

const defaultCoordinate: Coordinate = readonly({
  row: -1,
  col: -1,
});

const defaultConfigJsonObject: ConfigJSONObject = shallowReadonly({
  title: "",
  keymap: [],
  keyInfo: [],
});

// Reactive data
let layout: Key[][] = reactive([]);
let currentKeyLocation: Coordinate = reactive({ ...defaultCoordinate });
let currentLayoutIndex = ref(0);
let outputJsonString = ref("");
let configJsonObject: ConfigJSONObject = reactive({
  ...defaultConfigJsonObject,
});
let configJsonArray: ConfigJSONArray = reactive([]);
let resetKeyMode = ref(false);
let showOverlay = ref(false);

// Load saved data in localStorage
const savedData = localStorage.getItem("keyconfig");
if (savedData) {
  configJsonArray = [...JSON.parse(savedData)];
}

// Computed

const outputJsonObject = computed(() => {
  return [...configJsonArray];
});

const darkMode = computed(() => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

// Functions

/**
 * Initialize current layout's data
 *
 * @param {boolean} reset - Resets current layout, false for default
 */
const initializeLayout = (reset: boolean = false) => {
  layout.length = 0;

  // Initialize an empty keyboard matrix
  for (let r = 0; r < ROWS; r++) {
    layout.push([]);
    for (let c = 0; c < COLS; c++) {
      layout[r].push({ ...defaultKey });
    }
  }

  // Load data if exists
  if (configJsonArray[currentLayoutIndex.value] && !reset) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const loadData = { ...defaultKey };
        loadData.keyStroke =
          configJsonArray[currentLayoutIndex.value].keymap[r][c];
        loadData.keyInfo =
          configJsonArray[currentLayoutIndex.value].keyInfo[r][c];
        layout[r][c] = loadData;
      }
    }
  }

  // Initialize output data
  updateOutputData();

  // Configure dummy keys
  DUMMY_KEYS.forEach((key) => {
    layout[key.row][key.col].dummy = true;
  });

  // Configure dummy keys
  KEYBOARD_LAYOUT.forEach((key) => {
    layout[key.row][key.col].keySize = key.size;
  });
};

/**
 * Toggle key button's active state
 *
 */
const toggleActive = (row: number, col: number) => {
  if (resetKeyMode.value) {
    const newKey: Key = { ...defaultKey };
    newKey.keySize = layout[row][col].keySize;
    newKey.dummy = layout[row][col].dummy;
    layout[row][col] = newKey;
    resetKeyMode.value = false;
    updateOutputData();
    return;
  }
  const originalActive: boolean = layout[row][col].active;
  currentKeyLocation = { row: row, col: col };
  resetKeysState();
  // Update target key active state
  layout[row][col].active = !originalActive;
};

/**
 * Update key data for user input
 *
 */
const updateKey = (e: any) => {
  // Do nothing if there's no key activited
  if (!validateKeyLocation()) return;

  // Update key's ASCII code and key information
  layout[currentKeyLocation.row][currentKeyLocation.col].keyStroke =
    e.key.charCodeAt(0);
  layout[currentKeyLocation.row][currentKeyLocation.col].keyInfo = e.code;

  updateOutputData();

  // Reset key location and keys' state
  currentKeyLocation = { ...defaultCoordinate };
  resetKeysState();
};

/**
 * Reset key's active state to default
 *
 */
const resetKeysState = () => {
  // Reset all key active to false
  layout.map((row) => row.map((k) => (k.active = false)));
};

/**
 * Reset single key's data to default
 *
 */
const resetKey = () => {
  resetKeyMode.value = !resetKeyMode.value;
};

/**
 * Validate if there's any key active via key location data
 *
 */
const validateKeyLocation = () => {
  if (currentKeyLocation.row === -1 || currentKeyLocation.col === -1) {
    return false;
  }
  return true;
};

/**
 * Update JSON configuration data
 *
 */
const updateOutputData = () => {
  configJsonObject = {
    title: configJsonArray[currentLayoutIndex.value]
      ? configJsonArray[currentLayoutIndex.value].title
      : "",
    keymap: [],
    keyInfo: [],
  };

  const keymap = layout.map((col) => {
    return col.map((key) => key.keyStroke);
  });

  const keyInfo = layout.map((col) => {
    return col.map((key) => key.keyInfo);
  });

  configJsonObject.keymap = [...keymap];
  configJsonObject.keyInfo = [...keyInfo];

  configJsonArray[currentLayoutIndex.value] = { ...configJsonObject };
  outputJsonString.value = JSON.stringify(configJsonArray);

  localStorage.setItem("keyconfig", outputJsonString.value);
};

/**
 * Export and download JSON config file
 *
 */
const exportJsonConfig = () => {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," +
      encodeURIComponent(JSON.stringify(configJsonArray))
  );
  element.setAttribute("download", "keyconfig.json");

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

/**
 * Update page title after changing the language
 *
 */
const updatePageTitle = () => {
  document.title = i18n.t("navTitle");
};

/**
 * Log the uploaded file to the console
 * @param {event} Event The file upload event
 */
const uploadFile = (event: any) => {
  const file: File = event.dataTransfer.files[0];
  let reader = new FileReader();
  reader.onload = loadConfigFile;
  reader.readAsText(file);
  showOverlay.value = false;
};

/**
 * Log the uploaded file to the console
 * @param {event} Event The file loaded event
 */
const loadConfigFile = (event: any) => {
  let str: string = event.target.result;
  let json: ConfigJSONObject[] = JSON.parse(str);
  configJsonArray = [...json];
  initializeLayout();
};

/**
 * Show drag'n drop overlay
 *
 */
const dragover = () => {
  showOverlay.value = true;
};

/**
 * Remove drag'n drop overlay
 *
 */
const dragleave = () => {
  showOverlay.value = false;
};

initializeLayout();
</script>

<template>
  <div
    class="w-screen h-screen"
    @drop.prevent="uploadFile"
    @dragover.prevent="dragover"
  >
    <!-- Drag'n Drop Overlay -->
    <div v-if="showOverlay" @dragleave="dragleave">
      <div ref="dragOverlay" class="drag-overlay">
        <h2 class="text-center text-white text-5xl font-bold animate-bounce">
          Drop it!
        </h2>
      </div>
    </div>
    <!-- Navbar -->
    <div
      id="nav"
      class="bg-stone-700 w-full h-12 text-white dark:bg-stone-800"
      style="min-width: 600px"
    >
      <div class="container mx-auto h-full flex items-center justify-center">
        <div class="text-xl mx-4">{{ $t("navTitle") }}</div>
        <select
          v-model="$i18n.locale"
          class="btn language-selector"
          @change="updatePageTitle"
        >
          <option value="en-US">🇺🇸 English</option>
          <option value="zh-TW">🇹🇼 中文（繁體）</option>
          <option value="zh-CN">🇨🇳 中文（简体）</option>
        </select>
      </div>
    </div>
    <!-- Hint -->
    <p class="text-neutral-400 my-2 text-center">
      <span class="label">{{ $t("hint") }}</span>
      {{ $t("hintUpload") }}
    </p>
    <!-- Key Configurator -->
    <div class="container mx-auto" style="min-width: 600px">
      <div id="toolbar" class="flex justify-center mt-4">
        <div>
          <div class="flex">
            <div>
              <label for="title">{{ $t("layoutTitle") }}</label>
              <input
                v-if="configJsonArray[currentLayoutIndex]"
                type="text"
                name="title"
                :placeholder="$t('newLayout')"
                v-model="configJsonArray[currentLayoutIndex].title"
                class="text-input"
                @input="updateOutputData"
              />
              <select
                name="add_layout"
                v-model="currentLayoutIndex"
                @change="initializeLayout()"
                class="btn"
              >
                <option v-for="(_, i) in 10" :value="i">
                  {{ $t("layout") }} {{ i + 1 }}
                </option>
              </select>
              <input
                type="button"
                name="export"
                :value="$t('export')"
                class="btn btn-export"
                @click="exportJsonConfig"
              />
            </div>
          </div>
          <div class="my-2"></div>
          <div class="flex">
            <input
              type="button"
              name="reset"
              :value="$t('resetLayout')"
              class="btn btn-reset grow"
              @click="initializeLayout(true)"
            />
            <input
              type="button"
              name="reset_key"
              :value="$t('resetKey')"
              class="btn btn-reset grow"
              :class="resetKeyMode ? 'key-btn-active' : ''"
              @click="resetKey"
            />
          </div>
        </div>
      </div>
      <div
        id="keymap"
        class="flex justify-center mt-4"
        @keydown.prevent="updateKey($event)"
      >
        <div>
          <template v-for="(_, row) in layout">
            <template v-for="(key, col) in layout[row]">
              <input
                v-if="!key.dummy"
                type="button"
                :value="key.dummy ? 'DUMMY' : key.keyInfo"
                :disabled="key.dummy"
                class="key-btn"
                :class="{
                  'key-btn-active': key.active,
                  'key-btn-dummy': key.dummy,
                  'key-1u': key.keySize === '1u',
                  'key-w-1-25u': key.keySize === 'w-1.25u',
                  'key-w-1-5u': key.keySize === 'w-1.5u',
                  'key-w-2u': key.keySize === 'w-2u',
                  'key-h-1-25u': key.keySize === 'h-1.25u',
                  'key-h-1-5u': key.keySize === 'h-1.5u',
                  'key-h-2u': key.keySize === 'h-2u',
                }"
                @click="toggleActive(row, col)"
              />
            </template>
            <br />
          </template>
        </div>
      </div>
      <div id="output" class="flex justify-center mt-4">
        <div>
          <label for="">{{ $t("outputJsonConfig") }}</label>
          <!-- <hr  /> -->
          <JsonViewer
            :value="outputJsonObject"
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
  </div>
</template>

<style scoped lang="scss">
label {
  @apply mx-4 text-slate-600
  dark:text-stone-400;
}

input:focus {
  outline: none;
  box-shadow: none;
}

select:focus {
  outline: none;
  box-shadow: none;
}

select {
  @apply rounded border-solid border-2 ml-2 m-1 cursor-pointer text-slate-600
  focus:border-lime-600
  dark:bg-stone-800 dark:border-none dark:text-neutral-400;
}

#output > div {
  width: 50ch;
}

.label {
  @apply bg-stone-600 px-2 py-1 rounded text-neutral-200 mr-1;
}

.drag-overlay {
  @apply fixed top-0 left-0 right-0 bottom-0
  h-screen w-full z-50
  overflow-hidden
  bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500
  flex flex-col items-center justify-center
  opacity-75
  animate-pulse;
}

.language-selector {
  @apply bg-stone-700 text-white border-none;
}

.text-input {
  @apply rounded border-solid border-2 py-1 px-2 ml-2 m-1
  focus:border-lime-600
  dark:bg-stone-800 dark:border-none dark:text-neutral-400;
}

.btn {
  @apply rounded px-4 py-1 mx-1 cursor-pointer;
}

.btn-export {
  @apply bg-lime-600 text-white
  hover:bg-lime-700
  active:bg-lime-800
  dark:bg-lime-700 dark:hover:bg-lime-800 dark:active:bg-lime-900;
}

.btn-reset {
  @apply bg-gray-200 text-slate-400
  hover:bg-gray-300
  active:bg-gray-400
  dark:bg-neutral-700 dark:hover:bg-neutral-800 dark:active:bg-neutral-900 dark:text-neutral-400;
}

.key-btn:focus {
  outline: none;
  box-shadow: none;
}

.key-btn {
  @apply rounded bg-slate-300 hover:bg-slate-400 text-slate-600 w-16 h-16 m-1 cursor-pointer
  dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-slate-600;
}

.key-btn-active {
  @apply bg-amber-300 hover:bg-amber-400
  dark:bg-amber-400 dark:hover:bg-amber-500 dark:text-neutral-900;
}

.key-btn-dummy {
  @apply bg-slate-100 text-slate-300
  dark:bg-neutral-800 dark:text-neutral-600;
}

.key-1u {
  @apply w-16;
}

.key-w-1-25u {
  @apply w-20;
}

.key-w-1-5u {
  @apply w-24;
}

.key-w-2u {
  @apply w-32;
}

.key-h-1-25u {
  @apply h-20;
}

.key-h-1-5u {
  @apply h-24;
}

.key-h-2u {
  @apply h-32;
}
</style>
