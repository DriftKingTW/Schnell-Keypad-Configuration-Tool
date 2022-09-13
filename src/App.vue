<script setup lang="ts">
import {
  readonly,
  shallowReadonly,
  ref,
  reactive,
  computed,
  nextTick,
} from "vue";
import { JsonViewer } from "vue3-json-viewer";
import { useI18n } from "vue-i18n";
import "esp-web-tools/dist/web/install-button";

import "vue3-json-viewer/dist/index.css";
import CheckIcon from "icons/Check.vue";
import CloseIcon from "icons/Close.vue";
import TrayArrowDownIcon from "icons/TrayArrowDown.vue";
import ExportIcon from "icons/Export.vue";
import CodeJsonIcon from "icons/CodeJson.vue";
import MacrosEditor from "./components/MacrosEditor.vue";

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
  { row: 1, col: 6, size: "h-2u" },
  { row: 3, col: 6, size: "h-2u" },
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
let floatingEditor = reactive({
  x: 0,
  y: 0,
  row: 0,
  col: 0,
});
let editInfoText = ref("");
let isEditingKeyInfo = ref(false);

// Refs declaration
const floatingEditorInput = ref<HTMLInputElement | null>(null);

// Load saved data in localStorage
const savedData = localStorage.getItem("keyconfig");
if (savedData) {
  configJsonArray = [...JSON.parse(savedData)];
}

// Computed

const outputJsonObject = computed(() => JSON.parse(outputJsonString.value));

const darkMode = computed(() => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const manifestLatest = computed(() => {
  return import.meta.env.BASE_URL + "/firmware/manifest.json";
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
 * Show key info input field on where user right clicked
 *
 */
const updateKeyInfo = async (e: any, row: number, col: number) => {
  e.preventDefault();
  isEditingKeyInfo.value = true;
  floatingEditor.x = e.pageX;
  floatingEditor.y = e.pageY;
  floatingEditor.row = row;
  floatingEditor.col = col;
  editInfoText.value = layout[row][col].keyInfo;
  await nextTick();
  floatingEditorInput.value?.focus();
};

/**
 * Save user input's key info
 *
 */
const saveKeyInfo = () => {
  if (editInfoText.value.length > 0) {
    layout[floatingEditor.row][floatingEditor.col].keyInfo = editInfoText.value;
  }
  isEditingKeyInfo.value = false;
  updateOutputData();
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
  const filteredConfigJsonArray = configJsonArray.filter(
    (layout: ConfigJSONObject) => !isLayoutEmpty(layout)
  );

  outputJsonString.value = JSON.stringify(filteredConfigJsonArray);
  localStorage.setItem("keyconfig", outputJsonString.value);
};

/**
 * Check if layout is empty
 *
 */
const isLayoutEmpty = (layout: ConfigJSONObject) => {
  if (layout.title !== "") {
    return false;
  }
  for (const keyRow of layout.keymap) {
    for (const key of keyRow) {
      if (key !== 0) return false;
    }
  }
  for (const keyRow of layout.keyInfo) {
    for (const key of keyRow) {
      if (key !== " ") return false;
    }
  }
  return true;
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
    class="w-screen h-screen dark:[color-scheme:dark]"
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
    <p class="text-neutral-400 mt-4 text-center">
      <span class="label">{{ $t("hint") }}</span>
      {{ $t("hintUpload") }}
    </p>
    <div class="grid grid-cols-12 gap-4">
      <MacrosEditor
        class="col-start-3 col-span-8 justify-self-center lg:col-start-3 lg:col-span-4 lg:justify-self-end w-full mt-4"
      />
      <!-- Key Configurator -->
      <div
        class="col-start-2 col-span-10 justify-self-center lg:col-span-6 lg:justify-self-start"
        style="min-width: 600px"
      >
        <div id="toolbar" class="flex justify-center mt-4">
          <div>
            <div class="flex">
              <div>
                <label for="title">
                  {{ $t("layoutTitle") }}
                </label>
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
              </div>
            </div>
            <div class="my-2"></div>
          </div>
        </div>
        <div class="flex justify-center mt-4">
          <div class="flex">
            <button
              name="reset"
              class="btn btn-reset grow flex"
              @click="initializeLayout(true)"
            >
              <close-icon :size="18" class="self-center mr-2" />
              {{ $t("resetLayout") }}
            </button>
            <button
              name="reset_key"
              class="btn btn-reset grow flex"
              :class="resetKeyMode ? 'key-btn-active' : ''"
              @click="resetKey"
            >
              <close-icon :size="18" class="self-center mr-2" />
              {{ $t("resetKey") }}
            </button>
            <esp-web-install-button :manifest="manifestLatest">
              <button
                slot="activate"
                type="button"
                class="btn btn-install flex"
              >
                <tray-arrow-down-icon :size="18" class="self-center mr-2" />
                {{ $t("firmwareInstall") }}
              </button>
              <span slot="unsupported">
                Ah snap, your browser doesn't have Web Serial support!
              </span>
              <span slot="not-allowed">
                Ah snap, you are not allowed to use this on HTTP!
              </span>
            </esp-web-install-button>
            <button
              name="export"
              class="btn btn-export flex"
              @click="exportJsonConfig"
            >
              <export-icon :size="18" class="self-center mr-2" />
              {{ $t("export") }}
            </button>
          </div>
        </div>
        <div
          id="keymap"
          class="flex justify-center mt-4 outline-0"
          tabindex="0"
          @keydown.prevent="updateKey($event)"
        >
          <div>
            <template v-for="(_, row) in layout">
              <template v-for="(key, col) in layout[row]">
                <span
                  v-if="!key.dummy"
                  class="inline-block key-btn"
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
                  @contextmenu="updateKeyInfo($event, row, col)"
                >
                  <div class="truncate mx-2">
                    {{ key.keyInfo === " " ? "∅" : key.keyInfo }}
                  </div>
                </span>
              </template>
              <br />
            </template>
          </div>
        </div>
        <transition
          enter-active-class="duration-300 ease-out"
          enter-from-class="transform opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="transform opacity-0"
        >
          <div
            v-show="isEditingKeyInfo"
            class="floating-editor"
            :style="`left: ${floatingEditor.x}px; top: ${floatingEditor.y}px;`"
          >
            <input
              type="text"
              ref="floatingEditorInput"
              name="floatingEditorInput"
              v-model="editInfoText"
              id="floating-editor"
              @keyup.enter="saveKeyInfo"
              @keydown.esc="isEditingKeyInfo = false"
            />
            <button
              type="button"
              class="btn btn-export flex"
              @click="saveKeyInfo"
            >
              <check-icon :size="18" class="self-center" />
            </button>
            <button
              type="button"
              class="btn btn-reset flex"
              @click="isEditingKeyInfo = false"
            >
              <close-icon :size="18" class="self-center" />
            </button>
          </div>
        </transition>
        <div id="output" class="flex justify-center my-4">
          <div>
            <label for="" class="flex">
              <code-json-icon :size="18" class="self-center mr-2" />
              {{ $t("outputJsonConfig") }}
            </label>
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
  </div>
</template>

<style scoped lang="scss">
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
  transform: translateY(-4.5rem);
  &:before {
    content: " ";
    position: absolute;
    transform: translateY(0.5rem);
    z-index: -1;
    background: inherit;
    color: inherit;
    @apply rounded w-16 h-32;
  }
  &:hover:before {
    background: inherit;
  }
}
</style>