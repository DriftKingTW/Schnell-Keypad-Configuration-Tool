<script setup lang="ts">
import {
  readonly,
  ref,
  reactive,
  computed,
  nextTick,
  watch,
  isReactive,
} from "vue";
import { useI18n } from "vue-i18n";
import "esp-web-tools/dist/web/install-button";

import "vue3-json-viewer/dist/index.css";
import CheckIcon from "icons/Check.vue";
import CloseIcon from "icons/Close.vue";
import TrayArrowDownIcon from "icons/TrayArrowDown.vue";
import AlphaMBoxIcon from "icons/AlphaMBox.vue";
import ExportIcon from "icons/Export.vue";
import FunctionIcon from "icons/Function.vue";
import CloudUploadIcon from "icons/CloudUpload.vue";
import ContentCopyIcon from "icons/ContentCopy.vue";
import HeartIcon from "icons/Heart.vue";
import GithubIcon from "icons/Github.vue";
import EmailIcon from "icons/Email.vue";
import BookOpenVariantIcon from "icons/BookOpenVariant.vue";
import MacrosEditor from "@/components/MacrosEditor.vue";
import RotaryExtensionEditor from "@/components/RotaryExtensionEditor.vue";
import Tooltip from "@/components/Tooltip.vue";
import MainTutorial from "@/components/MainTutorial.vue";

import {
  getSpecialKeyCode,
  checkSpecialKey,
  asciiToEventCode,
} from "./utils/specialKeyHandler";
import { useStore } from "vuex";
import { key } from "./store";
import { Toast } from "flowbite-vue";
import ToggleCheckbox from "@/components/ToggleCheckbox.vue";

const store = useStore(key);

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
  { row: 4, col: 6 },
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
  { row: 4, col: 5, size: "w-1.25u" },
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

// Reactive data
let layout: Key[][] = reactive([]);
let currentKeyLocation: Coordinate = reactive({ ...defaultCoordinate });
let currentLayoutIndex = ref(0);
let outputJsonString = ref("");
let configJsonArray: ConfigJSONArray = reactive([]);
let resetKeyMode = ref(false);
let isDragging = ref(false);
let floatingEditor = reactive({
  floatLeft: false,
  x: 0,
  y: 0,
  row: 0,
  col: 0,
});
let editInfoText = ref("");
let isEditingKeyInfo = ref(false);
let isSelectingMacro = ref(false);
let showTutorial = ref(false);
let macroIndex = ref(-1);
let ttLayoutIndex = ref(1);
let isGlobalTTKey = ref(false);
let firmwareVersion = ref("Latest");
let firmwareVersions = ref<string[]>(["Latest", "Beta"]);

const macros: any = reactive([]);
const macroComponentKey = ref(0);

const rotaryExtension: any = reactive([]);
const rotaryExtensionComponentKey = ref(0);

const combinedConfig = reactive({
  keyConfig: [],
  macros: [],
  rotaryExtension: [],
});

// Refs declaration
const floatingEditorInput = ref<HTMLInputElement | null>(null);

// Load saved data in localStorage
const savedData = localStorage.getItem("keyconfig");
if (savedData) {
  configJsonArray.push(...JSON.parse(savedData));
}

showTutorial.value = localStorage.getItem("showOnStart") !== "false";

// Computed

const darkMode = computed(() => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const manifestJSON = computed(() => {
  return (
    import.meta.env.BASE_URL +
    `/firmware/${firmwareVersion.value.toLowerCase()}/manifest.json`
  );
});

const showToast = computed(() => {
  return store.state.showToast;
});

const toastMessage = computed(() => {
  return store.state.toastMessage;
});

const toastType = computed(() => {
  return store.state.toastType;
});

const keyMapTitles = computed(() => {
  return configJsonArray.map((config) => config.title);
});

// Watcher
watch(macroIndex, async () => {
  if (isSelectingMacro.value) {
    assignMacro();
  }
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
  // Do nothing if there's no key activated
  if (
    !validateKeyLocation() ||
    !layout[currentKeyLocation.row][currentKeyLocation.col].active
  )
    return;

  const specialKeyCode = getSpecialKeyCode(e.code);

  // Update key's ASCII code and key information
  layout[currentKeyLocation.row][currentKeyLocation.col].keyStroke =
    specialKeyCode === 0 ? e.key.charCodeAt(0) : specialKeyCode;
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
  floatingEditor.y = e.pageY;
  floatingEditor.row = row;
  floatingEditor.col = col;
  editInfoText.value = layout[row][col].keyInfo;
  if (e.view.screen.width - e.pageX < 300) {
    floatingEditor.floatLeft = true;
    floatingEditor.x = e.view.screen.width - e.pageX;
  } else {
    floatingEditor.x = e.pageX;
    floatingEditor.floatLeft = false;
  }
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
 * Assign macro to a key
 *
 */
const assignMacro = () => {
  if (!isSelectingMacro.value) {
    isSelectingMacro.value = true;
  } else {
    if (macroIndex.value > -1 && isEditingKeyInfo.value) {
      editInfoText.value = `MACRO_${macroIndex.value}`;
      saveKeyInfo();
      macroIndex.value = -1;
    }
    isSelectingMacro.value = false;
    isEditingKeyInfo.value = false;
  }
};

/**
 * Assign FN key label to active key
 *
 */
const assignFnKey = () => {
  if (!validateKeyLocation()) return;
  layout[currentKeyLocation.row][currentKeyLocation.col].keyInfo = "FN";
  updateOutputData();
  currentKeyLocation = { ...defaultCoordinate };
  resetKeysState();
};

/**
 * Assign FN key label to active key
 *
 */
const assignTTKey = () => {
  if (!validateKeyLocation()) return;
  layout[currentKeyLocation.row][
    currentKeyLocation.col
  ].keyInfo = `TT_${ttLayoutIndex.value}`;

  if (isGlobalTTKey.value) {
    configJsonArray.map((layer) => {
      layer.keyInfo[currentKeyLocation.row][
        currentKeyLocation.col
      ] = `TT_${ttLayoutIndex.value}`;
    });
  } else {
    configJsonArray[ttLayoutIndex.value].keyInfo[currentKeyLocation.row][
      currentKeyLocation.col
    ] = `TT_${ttLayoutIndex.value}`;
  }

  updateOutputData();
  currentKeyLocation = { ...defaultCoordinate };
  resetKeysState();
};

/**
 * Close floating editor and reset editing status
 *
 */
const resetKeyEditing = () => {
  isEditingKeyInfo.value = false;
  isSelectingMacro.value = false;
  macroIndex.value = -1;
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
  const targetLayerConfig: ConfigJSONObject = {
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

  targetLayerConfig.keymap = [...keymap];
  targetLayerConfig.keyInfo = [...keyInfo];

  configJsonArray[currentLayoutIndex.value] = JSON.parse(
    JSON.stringify(targetLayerConfig)
  );

  const filteredConfigJsonArray = configJsonArray.filter(
    (layout: ConfigJSONObject) => !isLayoutEmpty(layout)
  );

  outputJsonString.value = JSON.stringify(filteredConfigJsonArray);
  localStorage.setItem("keyconfig", outputJsonString.value);

  combinedConfig.keyConfig = JSON.parse(
    JSON.stringify(filteredConfigJsonArray)
  );
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
const exportCombinedConfig = () => {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," +
      encodeURIComponent(JSON.stringify(combinedConfig))
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
  isDragging.value = false;

  const file: File = event.dataTransfer.files[0];
  let reader = new FileReader();
  const filename = event.dataTransfer.files[0].name;

  if (filename === "keyconfig.json" || filename === "macros.json") {
    if (filename === "keyconfig.json") {
      reader.onload = loadKeyConfigFile;
    } else if (filename === "macros.json") {
      reader.onload = loadMacrosConfigFile;
    }
    try {
      reader.readAsText(file);
      // Show toast message
      store.commit("showToast", {
        message: `${i18n.t("toast.uploadSuccess")}: ${filename}`,
        type: "success",
      });
    } catch (error) {
      store.commit("showToast", {
        message: `${i18n.t("toast.uploadError")}: ${filename}`,
        type: "danger",
      });
    }
  } else {
    store.commit("showToast", {
      message: `${i18n.t("toast.uploadErrorFilename")}`,
      type: "danger",
    });
  }
};

/**
 * Log the uploaded file to the console
 * @param {event} Event The file loaded event
 */
const loadKeyConfigFile = (event: any) => {
  let str: string = event.target.result;
  let json = JSON.parse(str);
  configJsonArray = [...json.keyConfig];

  macros.length = 0;
  macros.push(...json.macros);
  macroComponentKey.value++;

  rotaryExtension.length = 0;
  rotaryExtension.push(...json.rotaryExtension);
  rotaryExtensionComponentKey.value++;

  initializeLayout();
};

/**
 * Log the uploaded file to the console
 * @param {event} Event The file loaded event
 */
const loadMacrosConfigFile = (event: any) => {
  let str: string = event.target.result;
  let json: any[] = JSON.parse(str);
  macros.length = 0;
  macros.push(...json);
  macroComponentKey.value++;
};

/**
 * Show drag'n drop overlay
 *
 */
const dragover = () => {
  isDragging.value = true;
};

/**
 * Remove drag'n drop overlay
 *
 */
const dragleave = () => {
  isDragging.value = false;
};

const updateMacro = (macros: any) => {
  combinedConfig.macros = JSON.parse(JSON.stringify(macros));
};

const updateRotaryExtension = (rotaryExtension: any) => {
  combinedConfig.rotaryExtension = JSON.parse(JSON.stringify(rotaryExtension));
};

const copyCombinedConfig = () => {
  navigator.clipboard.writeText(JSON.stringify(combinedConfig));

  store.commit("showToast", {
    message: `${i18n.t("toast.copySuccess")}`,
    type: "success",
  });
};

const checkSpecialFunctionKey = (keyInfo: string) => {
  const result = {
    isSpecialKey: false,
    color: "",
    specialKeyText: "",
  };
  if (keyInfo === "FN") {
    result.isSpecialKey = true;
    result.color = "text-lime-500";
    result.specialKeyText = "FN";
    return result;
  }
  if (keyInfo.startsWith("MACRO_")) {
    const macroIndex: number = Number(keyInfo.slice(6));
    const { name } = combinedConfig.macros[macroIndex];
    result.isSpecialKey = true;
    result.color = "text-sky-400";
    result.specialKeyText = `${name}`;
    return result;
  }
  if (keyInfo.startsWith("TT_")) {
    result.isSpecialKey = true;
    result.color = "text-orange-400";
    result.specialKeyText = `TT ⇆ L${keyInfo.slice(3)}`;
    return result;
  }
  return result;
};

initializeLayout();
</script>

<template>
  <div class="w-screen h-screen dark:[color-scheme:dark] flex flex-col">
    <!-- Navbar -->
    <div
      id="nav"
      class="bg-stone-600 w-full h-12 text-white dark:bg-stone-800"
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

        <!-- Firmware version selector -->
        <div class="flex items-center">
          <select v-model="firmwareVersion" class="btn language-selector">
            <option v-for="version in firmwareVersions" :value="version">
              {{ $t("version") }} : {{ version }}
            </option>
          </select>
        </div>

        <esp-web-install-button :manifest="manifestJSON">
          <button slot="activate" type="button" class="btn btn-install flex">
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

        <!-- button to show tutorial -->
        <button
          class="btn btn-export flex"
          @click="showTutorial = !showTutorial"
        >
          <book-open-variant-icon :size="18" class="self-center mr-2" />
          {{ $t("tutorial.buttonShow") }}
        </button>
      </div>
    </div>
    <!-- File Upload Bar -->
    <div
      :class="`drag-drop-bar ${isDragging ? 'active' : ''}`"
      @drop.prevent="uploadFile"
      @dragover.prevent="dragover"
      @dragleave="dragleave"
    >
      <div class="drag-drop-bar__text flex">
        <cloud-upload-icon :size="24" class="mr-2" />
        {{ $t("dragDrop") }}
      </div>
    </div>

    <!-- Tutorial -->
    <transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="transform opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="transform opacity-0"
    >
      <main-tutorial v-show="showTutorial" v-model="showTutorial" />
    </transition>

    <!-- Hint -->
    <p class="text-neutral-400 mt-4 text-center">
      <span class="label">{{ $t("hint") }}</span>
      {{ $t("hintUpload") }}
    </p>
    <div class="flex justify-center mt-4">
      <div class="flex">
        <RotaryExtensionEditor
          :configTitles="keyMapTitles"
          :rotaryExtension="rotaryExtension"
          :key="rotaryExtensionComponentKey"
          @update-rotary-extension="updateRotaryExtension"
        />
        <button
          name="copy"
          class="btn btn-export grow flex"
          @click="copyCombinedConfig"
        >
          <content-copy-icon :size="18" class="self-center mr-2" />
          {{ $t("copyCombinedJSONConfig") }}
        </button>
        <button
          name="export"
          class="btn btn-export grow flex"
          @click="exportCombinedConfig"
        >
          <export-icon :size="18" class="self-center mr-2" />
          {{ $t("exportCombinedJSONConfig") }}
        </button>
      </div>
    </div>
    <div class="grid grid-cols-12 gap-4 grow">
      <MacrosEditor
        v-model="macroIndex"
        :macros="macros"
        :key="macroComponentKey"
        :isSelectingMacro="isSelectingMacro"
        @update-macro="updateMacro"
        class="col-start-1 col-span-12 justify-self-center lg:col-start-1 lg:col-span-5 xl:justify-self-end xl:col-start-2 w-full mt-4"
        style="max-width: 600px"
      />
      <!-- Key Configurator -->
      <div
        class="col-start-2 col-span-10 justify-self-center lg:col-start-6 lg:col-span-7 xl:col-start-7 xl:justify-self-start"
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
                    {{ $t("layout") }} {{ i }}
                  </option>
                </select>
              </div>
            </div>
            <div class="my-2"></div>
          </div>
        </div>

        <div class="flex justify-center mt-2">
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
            <button
              name="assign_fn_key"
              class="btn btn-install grow flex"
              @click="assignFnKey"
            >
              <function-icon :size="18" class="self-center mr-2" />
              {{ $t("assignFnKey") }}
            </button>
            <button
              name="assign_tt_key"
              class="btn btn-install grow flex"
              @click="assignTTKey"
            >
              <function-icon :size="18" class="self-center mr-2" />
              {{ $t("assignTTKey") }}
            </button>
          </div>
        </div>

        <div class="flex justify-center mt-2">
          <div>
            <label for="set_tt_layout">{{ $t("ttLayout") }}:</label>
            <select name="set_tt_layout" v-model="ttLayoutIndex" class="btn">
              <option v-for="(_, i) in 10" :value="i">
                {{ $t("layout") }} {{ i }} :
                {{
                  configJsonArray[i] ? configJsonArray[i].title : "No Layout"
                }}
              </option>
            </select>
          </div>
          <!-- a switch for isGlobalTTKey -->
          <div class="flex items-center">
            <ToggleCheckbox
              :label="$t('isGlobalTTKey')"
              v-model="isGlobalTTKey"
              @change="updateOutputData"
            />
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
                  <Tooltip
                    :tooltip-text="`${
                      checkSpecialKey(key.keyStroke) ||
                      asciiToEventCode(key.keyStroke) ||
                      '∅'
                    }`"
                    class="h-full"
                  >
                    <div
                      class="truncate mx-2 flex flex-col h-full justify-between"
                    >
                      <div class="truncate">
                        {{ key.keyInfo === " " ? "∅" : key.keyInfo }}
                      </div>
                      <div
                        class="text-xs mb-1 opacity-80 dark:opacity-60"
                        :class="checkSpecialFunctionKey(key.keyInfo).color"
                      >
                        {{
                          checkSpecialFunctionKey(key.keyInfo).isSpecialKey !==
                          false
                            ? checkSpecialFunctionKey(key.keyInfo)
                                .specialKeyText
                            : key.keyStroke
                        }}
                      </div>
                    </div>
                  </Tooltip>
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
            :style="`${
              floatingEditor.floatLeft
                ? `right: ${floatingEditor.x}px;`
                : `left: ${floatingEditor.x}px;`
            } top: ${floatingEditor.y}px;`"
          >
            <input
              type="text"
              ref="floatingEditorInput"
              name="floatingEditorInput"
              v-model="editInfoText"
              id="floating-editor"
              @keyup.enter="saveKeyInfo"
              @keydown.esc="resetKeyEditing"
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
              :class="`btn btn-export flex ${
                isSelectingMacro ? 'key-btn-active' : ''
              }`"
              @click="assignMacro"
              @keydown.esc="resetKeyEditing"
            >
              <alpha-m-box-icon :size="18" class="self-center" />
            </button>
            <button
              type="button"
              class="btn btn-reset flex"
              @click="resetKeyEditing"
            >
              <close-icon :size="18" class="self-center" />
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-stone-600 dark:bg-stone-800 mt-4 py-4">
      <div class="container mx-auto px-4">
        <div class="text-center text-white flex justify-center divide-x">
          <p class="flex justify-center mx-4">
            Made with
            <heart-icon
              size="1rem"
              class="inline-block text-red-600 self-center mx-2"
            />
            by
            <a href="https://driftking.tw" class="mx-2 font-semibold">
              DriftKingTW
            </a>
            <small class="font-bold">(´ ‿｀)</small>
          </p>
          <div class="flex justify-center px-4">
            <a
              class="flex"
              href="http://github.com/driftkingtw"
              target="_blank"
            >
              <github-icon size="1.5rem" class="mr-4" />
            </a>
            <a class="flex" href="mailto:driftkingtw@gmail.com">
              <email-icon size="1.5rem" class="mr-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <transition
    enter-active-class="duration-300 ease-out"
    enter-from-class="transform opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="transform opacity-0"
  >
    <Toast
      v-show="showToast"
      :type="toastType"
      closable
      class="fixed bottom-6 right-1/2 translate-x-1/2"
    >
      {{ toastMessage }}
    </Toast>
  </transition>
</template>

<style scoped lang="scss">
.key-btn:focus {
  outline: none;
  box-shadow: none;
}

.key-btn {
  @apply rounded bg-neutral-100 hover:bg-neutral-300 text-neutral-600 shadow-md w-16 h-16 m-1 cursor-pointer 
  dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600;
}

.key-btn-active {
  @apply bg-amber-300 hover:bg-amber-400
  dark:bg-amber-400 dark:hover:bg-amber-500 dark:text-neutral-900;
}

.key-btn-dummy {
  @apply bg-neutral-100 text-neutral-300
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
    @apply rounded w-16 h-32 shadow-md;
  }
  &:hover:before {
    background: inherit;
  }
}
</style>
