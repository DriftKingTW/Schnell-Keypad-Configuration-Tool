<script setup lang="ts">
import { ref, reactive, toRefs, readonly, nextTick, computed } from "vue";

import KnobIcon from "icons/Knob.vue";
import RotateRightIcon from "icons/RotateRight.vue";
import RotateLeftIcon from "icons/RotateLeft.vue";
import GestureTapIcon from "icons/GestureTap.vue";
import {
  getSpecialKeyCode,
  checkSpecialKey,
  asciiToEventCode,
} from "./../utils/specialKeyHandler";

import AlphaMBoxIcon from "icons/AlphaMBox.vue";
import ChevronDownIcon from "icons/ChevronDown.vue";
import CheckIcon from "icons/Check.vue";
import CloseIcon from "icons/Close.vue";

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
  // keymap: number[];
  // keyInfo: string[];
  rotaryMap: number[];
  rotaryInfo: string[];
};

type ConfigJSONArray = ConfigJSONObject[];

// Default objects
const defaultKey: Key = readonly({
  keyStroke: 0,
  keyInfo: " ",
  keySize: "w-1.5u",
  dummy: false,
  active: false,
});

let layout: Key[] = reactive([]);
let reLayout: Key[][] = reactive([]);

let configJsonArray: ConfigJSONArray = reactive([]);
let currentKeyLocation = ref(-1);
let currentREIndex = ref(-1);

let isExpandRotaryEncoder = ref(false);

let isEditingKeyInfo = ref(false);
let floatingEditor = reactive({
  floatLeft: false,
  x: 0,
  y: 0,
  row: 0,
  col: 0,
});
let editInfoText = ref("");
let isSelectingMacro = ref(false);
let macroIndex = ref(-1);

const props = defineProps([
  "configTitles",
  "rotaryEncoder",
  "currentLayoutIndex",
  "macros",
]);
const emit = defineEmits(["updateRotaryEncoder"]);
const currentLayoutIndex = ref(0);
const outputJsonString = ref("");

const { configTitles: configTitles } = toRefs(props);

const isShowrotaryEncoderModal = ref(false);
const showrotaryEncoderModal = () => {
  isShowrotaryEncoderModal.value = true;
};
const closerotaryEncoderModal = () => {
  isShowrotaryEncoderModal.value = false;
};

// Refs declaration
const macroFloatingEditorInput = ref<HTMLInputElement | null>(null);

/**
 * Initialize current layout's data
 *
 * @param {boolean} reset - Resets current layout, false for default
 */
const initializeLayout = (reset: boolean = false) => {
  // Load saved data in localStorage
  const loadData = localStorage.getItem("rotaryEncoder");

  currentLayoutIndex.value = props.currentLayoutIndex;

  layout.length = 0;
  reLayout.length = 0;
  configJsonArray.length = 0;

  // Initialize layout
  // for (let i = 0; i < 3; i++) {
  //   layout.push({ ...defaultKey });
  // }

  reLayout.push([{ ...defaultKey }, { ...defaultKey }, { ...defaultKey }]);

  if (props.rotaryEncoder.length > 0) {
    // If prop data is available
    configJsonArray.push(...props.rotaryEncoder);
  } else if (loadData) {
    // If localStorage data is available
    const loadDataArray = JSON.parse(loadData);
    configJsonArray.push(...loadDataArray);
  }

  // Load data if exists
  if (configJsonArray[currentLayoutIndex.value] && !reset) {
    for (let i = 0; i < 3; i++) {
      const loadData = { ...defaultKey };
      loadData.keyStroke =
        configJsonArray[currentLayoutIndex.value].rotaryMap[i];
      loadData.keyInfo =
        configJsonArray[currentLayoutIndex.value].rotaryInfo[i];
      reLayout[0][i] = loadData;
    }
  }

  updateOutputData();
};

/**
 * Toggle key button's active state
 *
 */
const toggleActive = (index: number, reIndex: number = -1) => {
  // Update target key active state
  if (reIndex >= 0) {
    const originalActive: boolean = reLayout[reIndex][index].active;
    currentKeyLocation.value = index;
    currentREIndex.value = reIndex;
    resetKeysState();
    reLayout[reIndex][index].active = !originalActive;
    if (originalActive) {
      currentREIndex.value = -1;
    }
  } else {
    const originalActive: boolean = layout[index].active;
    currentKeyLocation.value = index;
    resetKeysState();
    layout[index].active = !originalActive;
    currentREIndex.value = -1;
  }
};

/**
 * Update key data for user input
 *
 */
const updateKey = (e: any) => {
  // Do nothing if there's no key activited
  if (!validateKeyLocation()) return;

  const specialKeyCode = getSpecialKeyCode(e.code);

  if (currentREIndex.value > -1) {
    reLayout[currentREIndex.value][currentKeyLocation.value].keyStroke =
      specialKeyCode === 0 ? e.key.charCodeAt(0) : specialKeyCode;
    reLayout[currentREIndex.value][currentKeyLocation.value].keyInfo = e.code;
  }

  updateOutputData();

  // Reset key location and keys' state
  currentKeyLocation.value = -1;
  currentREIndex.value = -1;
  resetKeysState();
};

/**
 * Update JSON configuration data
 *
 */
const updateOutputData = () => {
  configJsonArray[currentLayoutIndex.value] = {
    // keymap: layout.map((k) => k.keyStroke),
    // keyInfo: layout.map((k) => k.keyInfo),
    rotaryMap: reLayout[0].map((k) => k.keyStroke),
    rotaryInfo: reLayout[0].map((k) => k.keyInfo),
  };

  // if configJsonArray has null value in between, add configJsonArray[0]'s value
  for (let i = 0; i < configJsonArray.length; i++) {
    if (configJsonArray[i] === null) {
      configJsonArray[i] = JSON.parse(JSON.stringify(configJsonArray[0]));
    }
  }

  //save to localStorage
  outputJsonString.value = JSON.stringify(configJsonArray);
  localStorage.setItem("rotaryEncoder", outputJsonString.value);
  emit("updateRotaryEncoder", configJsonArray);
};

/**
 * Validate if there's any key active via key location data
 *
 */
const validateKeyLocation = () => {
  if (currentKeyLocation.value === -1) {
    return false;
  }
  return true;
};

/**
 * Reset key's active state to default
 *
 */
const resetKeysState = () => {
  // Reset all key active to false
  layout.map((k) => (k.active = false));
  reLayout.map((re) => {
    re.map((k) => (k.active = false));
  });
};

/**
 * Save user input's key info
 *
 */
const saveKeyInfo = () => {
  if (editInfoText.value.length > 0) {
    reLayout[floatingEditor.row][floatingEditor.col].keyInfo =
      editInfoText.value;
  }
  isEditingKeyInfo.value = false;
  updateOutputData();
};

/**
 * Close floating editor and reset editing status
 *
 */
const resetKeyEditing = () => {
  isEditingKeyInfo.value = false;
  isSelectingMacro.value = false;
  showMacroMenu.value = false;
  macroIndex.value = -1;
};

/**
 * Show key info input field on where user right clicked
 *
 */
const updateKeyInfo = async (e: any, row: number, col: number) => {
  e.preventDefault();
  isEditingKeyInfo.value = true;
  floatingEditor.row = row;
  floatingEditor.col = col;
  editInfoText.value = reLayout[row][col].keyInfo;

  // The editor is position:fixed, so use viewport (client) coordinates and
  // keep it fully on-screen for keys near the edges.
  const margin = 8;
  const editorWidth = 340;
  const editorHeight = 56;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw - e.clientX < editorWidth) {
    floatingEditor.floatLeft = true;
    floatingEditor.x = Math.max(margin, vw - e.clientX);
  } else {
    floatingEditor.floatLeft = false;
    floatingEditor.x = e.clientX;
  }
  floatingEditor.y = Math.min(e.clientY, vh - editorHeight - margin);

  await nextTick();
  macroFloatingEditorInput.value?.focus();
};

// Macro picker dropdown, matching the main key editor.
const showMacroMenu = ref(false);
const currentMacroIndex = computed(() => {
  const t = editInfoText.value || "";
  return t.startsWith("MACRO_") ? Number(t.slice(6)) : -1;
});
const macroPreview = (m: any) => {
  if (!m) return "";
  if (m.type === 0) {
    return (m.keyStrokes || [])
      .map((k: number) => {
        const special = checkSpecialKey(k);
        if (special !== "") return special;
        const evt = asciiToEventCode(k);
        if (evt !== "") return evt;
        return String.fromCharCode(k);
      })
      .join(" + ");
  }
  return m.stringContent || "";
};
const assignMacroToKey = (idx: number) => {
  if (idx < 0) return;
  editInfoText.value = `MACRO_${idx}`;
  saveKeyInfo();
};

initializeLayout();
</script>

<template>
  <div
    @click="showrotaryEncoderModal"
    class="inline-block relative h-8"
  >
    <div class="knob"></div>
    <!-- {{ $t("rotaryEncoderEditorTitle") }} -->
  </div>
  <!-- create a modal -->
  <div
    size="xl"
    v-if="isShowrotaryEncoderModal"
    class="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-50"
  >
    <div class="bg-white rounded-lg shadow-lg p-6 dark:bg-stone-800 min-w-xl">
      <!-- header -->
      <div class="flex justify-center text-neutral-700 dark:text-white mb-2">
        <knob-icon :size="18" class="self-center mr-2" />
        <h2 class="text-lg font-semibold">
          {{ $t("rotaryEncoderEditorTitle") }}
        </h2>
      </div>

      <div class="flex justify-center">
        <span class="text-neutral-700 dark:text-neutral-400">
          {{ $t("layout") }} {{ currentLayoutIndex }} -
          {{ configTitles[currentLayoutIndex] }}
        </span>
      </div>

      <div
        class="flex justify-center items-center my-4 outline-0 transition-all"
        tabindex="0"
        @keydown.prevent="updateKey($event)"
      >
        <span
          class="inline-block key-btn key-w-1-5u"
          :class="{
            'key-btn-active': reLayout[0][1].active,
          }"
          @click="toggleActive(1, 0)"
          @contextmenu="updateKeyInfo($event, 0, 1)"
        >
          <div class="truncate mx-2">
            {{ reLayout[0][1].keyInfo === " " ? "∅" : reLayout[0][1].keyInfo }}
            <div
              class="text-sky-400 text-xs opacity-80 dark:opacity-60"
              v-if="reLayout[0][1].keyInfo.startsWith('MACRO_')"
            >
              {{ props.macros[Number(reLayout[0][1].keyInfo.slice(6))].name }}
            </div>
            <div v-else class="text-xs opacity-80 dark:opacity-60">
              {{
                reLayout[0][1].keyStroke === 0 ? "∅" : reLayout[0][1].keyStroke
              }}
            </div>
          </div>

          <div class="flex justify-end">
            <rotate-left-icon
              :size="18"
              class="self-center justify-center mx-2 text-neutral-500"
            />
          </div>
        </span>

        <span
          class="inline-block key-btn key-w-1-5u"
          :class="{
            'key-btn-active': reLayout[0][0].active,
          }"
          @click="toggleActive(0, 0)"
          @contextmenu="updateKeyInfo($event, 0, 0)"
        >
          <div class="truncate mx-2">
            {{ reLayout[0][0].keyInfo === " " ? "∅" : reLayout[0][0].keyInfo }}
            <div
              class="text-sky-400 text-xs opacity-80 dark:opacity-60"
              v-if="reLayout[0][0].keyInfo.startsWith('MACRO_')"
            >
              {{ props.macros[Number(reLayout[0][0].keyInfo.slice(6))].name }}
            </div>
            <div v-else class="text-xs opacity-80 dark:opacity-60">
              {{
                reLayout[0][0].keyStroke === 0 ? "∅" : reLayout[0][0].keyStroke
              }}
            </div>
          </div>
          <div class="flex justify-end">
            <gesture-tap-icon
              :size="18"
              class="self-center justify-center mx-2 text-neutral-500"
            />
          </div>
        </span>

        <span
          class="inline-block key-btn key-w-1-5u"
          :class="{
            'key-btn-active': reLayout[0][2].active,
          }"
          @click="toggleActive(2, 0)"
          @contextmenu="updateKeyInfo($event, 0, 2)"
        >
          <div class="truncate mx-2">
            {{ reLayout[0][2].keyInfo === " " ? "∅" : reLayout[0][2].keyInfo }}
            <div
              class="text-sky-400 text-xs opacity-80 dark:opacity-60"
              v-if="reLayout[0][2].keyInfo.startsWith('MACRO_')"
            >
              {{ props.macros[Number(reLayout[0][2].keyInfo.slice(6))].name }}
            </div>
            <div v-else class="text-xs opacity-80 dark:opacity-60">
              {{
                reLayout[0][2].keyStroke === 0 ? "∅" : reLayout[0][2].keyStroke
              }}
            </div>
          </div>
          <div class="flex justify-end">
            <rotate-right-icon
              :size="18"
              class="self-center justify-center mx-2 text-neutral-500"
            />
          </div>
        </span>
      </div>

      <div class="flex justify-center">
        <button
          @click="closerotaryEncoderModal"
          type="button"
          class="btn btn-export"
        >
          {{ $t("finish") }}
        </button>
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
          ref="macroFloatingEditorInput"
          name="macroFloatingEditorInput"
          v-model="editInfoText"
          id="floating-editor"
          @keyup.enter="saveKeyInfo"
          @keydown.esc="resetKeyEditing"
        />
        <button type="button" class="btn btn-export flex" @click="saveKeyInfo">
          <check-icon :size="18" class="self-center" />
        </button>
        <div class="relative flex">
          <button
            type="button"
            class="btn btn-export flex items-center"
            @click="showMacroMenu = !showMacroMenu"
          >
            <alpha-m-box-icon :size="18" class="self-center" />
            <chevron-down-icon :size="16" class="self-center" />
          </button>

          <template v-if="showMacroMenu">
            <div
              class="fixed inset-0 z-10"
              @click="showMacroMenu = false"
            ></div>
            <div
              class="absolute right-0 top-full mt-1 z-20 w-64 max-h-72 overflow-auto rounded-md bg-white dark:bg-stone-800 shadow-lg ring-1 ring-black ring-opacity-5 py-1 text-left text-gray-800 dark:text-gray-100"
            >
              <button
                v-for="(m, i) in props.macros"
                :key="i"
                type="button"
                class="w-full text-left px-4 py-3"
                :class="
                  i === currentMacroIndex
                    ? 'bg-cyan-600'
                    : 'hover:bg-gray-100 dark:hover:bg-stone-700'
                "
                @click="
                  assignMacroToKey(i);
                  showMacroMenu = false;
                "
              >
                <div
                  class="text-sm font-medium"
                  :class="
                    i === currentMacroIndex
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  "
                >
                  {{ (m as any).name || `Macro ${i}` }}
                </div>
                <div
                  class="text-xs truncate"
                  :class="
                    i === currentMacroIndex
                      ? 'text-cyan-100'
                      : 'text-amber-600 dark:text-amber-400'
                  "
                >
                  {{ macroPreview(m) || "—" }}
                </div>
              </button>
              <div
                v-if="props.macros.length === 0"
                class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
              >
                —
              </div>
            </div>
          </template>
        </div>
        <button
          type="button"
          class="btn btn-cancel flex"
          @click="resetKeyEditing"
        >
          <close-icon :size="18" class="self-center" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
// Rotary-encoder specific styles. The shared keycap classes (.key-btn,
// .key-w-1-5u, etc.) live in assets/scss/index.scss.
.knob {
  // Knob figure (white keycap-style circle with a dot indicator), matching
  // the outlined keycaps.
  @apply w-20 h-20 m-1 cursor-pointer rounded-full bg-white border border-stone-300 shadow-sm
  dark:bg-neutral-700 dark:border-neutral-600;
  &:hover {
    @apply bg-stone-100 border-stone-400 dark:bg-neutral-600 dark:border-neutral-500;
  }
  &:before {
    content: " ";
    position: absolute;
    right: calc(50% - 0.5rem);
    margin-top: 0.5rem;
    z-index: 1;
    background: inherit;
    color: inherit;
    @apply rounded-full w-4 h-4 bg-neutral-300 dark:bg-neutral-600;
  }
}

.knob-active {
  @apply bg-amber-300
  dark:bg-amber-400 dark:hover:bg-amber-500 dark:text-neutral-900;
}
</style>
