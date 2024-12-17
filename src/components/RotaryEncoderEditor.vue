<script setup lang="ts">
import { Modal } from "flowbite-vue";
import { ref, reactive, toRefs, readonly, nextTick } from "vue";

import KnobIcon from "icons/Knob.vue";
import RotateRightIcon from "icons/RotateRight.vue";
import RotateLeftIcon from "icons/RotateLeft.vue";
import GestureTapIcon from "icons/GestureTap.vue";
import { getSpecialKeyCode } from "./../utils/specialKeyHandler";

import AlphaMBoxIcon from "icons/AlphaMBox.vue";
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
  macroIndex.value = -1;
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
  editInfoText.value = reLayout[row][col].keyInfo;
  if (e.view.screen.width - e.pageX < 300) {
    floatingEditor.floatLeft = true;
    floatingEditor.x = e.view.screen.width - e.pageX;
  } else {
    floatingEditor.x = e.pageX;
    floatingEditor.floatLeft = false;
  }
  await nextTick();
  macroFloatingEditorInput.value?.focus();
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

initializeLayout();
</script>

<template>
  <div
    @click="showrotaryEncoderModal"
    class="inline-block relative h-8 key-knob"
  >
    <knob-icon :size="92" />
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
          </div>
          <div class="flex justify-center">
            <rotate-left-icon
              :size="24"
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
          </div>
          <div class="flex justify-center">
            <gesture-tap-icon
              :size="24"
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
          </div>
          <div class="flex justify-center">
            <rotate-right-icon
              :size="24"
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
          Finish
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
        <select
          v-show="isSelectingMacro"
          v-model="macroIndex"
          class="h-9"
          @change="assignMacro"
        >
          <option
            v-for="(macro, index) in props.macros"
            :key="index"
            :value="index"
          >
            M{{ index }} - {{ macro.name }}
          </option>
        </select>
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
</template>

<style scoped lang="scss">
.key-btn:focus {
  outline: none;
  box-shadow: none;
}

.key-btn {
  @apply rounded bg-neutral-300 hover:bg-neutral-400 text-neutral-600 w-16 h-16 m-1 cursor-pointer 
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

.key-knob {
  @apply text-neutral-100 hover:text-neutral-300 drop-shadow-md dark:text-neutral-700 dark:hover:text-neutral-600 cursor-pointer;
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

.knob {
  // knob figure with a dot on it
  @apply w-24 h-24 m-1 cursor-pointer rounded-full bg-white
  dark:bg-neutral-700;
  &:hover {
    @apply bg-neutral-100 dark:bg-neutral-600;
  }
  &:before {
    content: " ";
    position: absolute;
    right: calc(50% - 0.5rem);
    margin-top: 0.5rem;
    z-index: 1;
    background: inherit;
    color: inherit;
    @apply rounded-full w-4 h-4 bg-neutral-600;
  }
}

.knob-active {
  @apply bg-amber-300
  dark:bg-amber-400 dark:hover:bg-amber-500 dark:text-neutral-900;
}
</style>
