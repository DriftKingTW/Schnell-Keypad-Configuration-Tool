<script setup lang="ts">
import { readonly, shallowReadonly, ref, reactive } from "vue";

// User defined keyboard parameters
const ROWS = 5;
const COLS = 7;
const DUMMY_KEYS = [
  { row: 2, col: 6 },
  { row: 0, col: 6 },
  { row: 4, col: 3 },
  { row: 4, col: 5 },
];

// Type declarations
type Key = {
  keyStroke: number;
  keyInfo: string;
  keySize: "1u" | "w-1.25u" | "w-1.5u" | "w-2u" | "h-1.25u" | "h-1.5u" | "h-2u";
  dummy: boolean;
  active: boolean;
};

type Coordinate = {
  row: number;
  col: number;
};

type ConfigJSONObject = {
  title: string;
  keymap: number[][];
  keyInfo: string[][];
};

type ConfigJSONArray = ConfigJSONObject[];

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
const title = ref("");
let layout: Key[][] = reactive([]);
let currentKeyLocation: Coordinate = reactive({ ...defaultCoordinate });
let currentLayoutIndex: number = 0;
let outputJsonString = ref("");

// Non-reactive data
let configJsonObject: ConfigJSONObject = { ...defaultConfigJsonObject };
let configJsonArray: ConfigJSONArray = [];

// Functions

/**
 * Initialize current layout's data
 *
 */
const initializeLayout = () => {
  layout.length = 0;
  configJsonArray.length = 0;

  // Initialize an empty keyboard matrix
  for (let r = 0; r < ROWS; r++) {
    layout.push([]);
    for (let c = 0; c < COLS; c++) {
      layout[r].push({ ...defaultKey });
    }
  }

  // Configure dummy keys
  DUMMY_KEYS.forEach((dmyKey) => {
    layout[dmyKey.row][dmyKey.col].dummy = true;
  });

  // Configure key size
  layout[0][0].keySize = "w-1.5u";
  layout[1][0].keySize = "w-1.5u";
  layout[2][0].keySize = "w-1.5u";
  layout[3][0].keySize = "w-1.5u";
  layout[4][0].keySize = "w-1.5u";
  // layout[1][6].keySize = "h-2u";
  // layout[3][6].keySize = "h-2u";
  layout[4][4].keySize = "w-2u";
  layout[4][1].keySize = "w-1.5u";
  layout[4][2].keySize = "w-1.5u";
};

/**
 * Toggle key button's active state
 *
 */
const toggleActive = (row: number, col: number) => {
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

  // Update current config to output variable
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
    title: title.value,
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

  configJsonArray[currentLayoutIndex] = { ...configJsonObject };
  outputJsonString.value = JSON.stringify(configJsonArray);
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

initializeLayout();
</script>

<template>
  <div class="container mx-auto">
    <div id="toolbar" class="flex justify-center mt-4">
      <div>
        <label for="title">Layout Title</label>
        <input
          type="text"
          name="title"
          v-model="title"
          class="input"
          @keyup="updateOutputData"
        />
        <input
          type="button"
          name="export"
          value="Export"
          class="btn btn-export"
          @click="exportJsonConfig"
        />
        <input
          type="button"
          name="reset"
          value="Reset"
          class="btn btn-reset"
          @click="initializeLayout"
        />
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
        <label for="">Output JSON Config</label>
        <hr class="my-2" />
        {{ outputJsonString }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
label {
  @apply mx-4 text-slate-600;
}

#output > div {
  width: 50ch;
}

.input {
  @apply border-solid border-2 py-1 px-2 ml-2 m-1;
}

.btn {
  @apply rounded px-4 py-1 mx-1 cursor-pointer;
}

.btn-export {
  @apply bg-lime-600 text-white
  hover:bg-lime-700
  active:bg-lime-800;
}

.btn-reset {
  @apply bg-gray-200 text-slate-600
  hover:bg-gray-300
  active:bg-gray-400;
}

.key-btn:focus {
  outline: none;
  box-shadow: none;
}

.key-btn {
  @apply rounded bg-slate-300 hover:bg-slate-400 w-16 h-16 m-1 cursor-pointer;
}

.key-btn-active {
  @apply bg-amber-300 hover:bg-amber-400;
}

.key-btn-dummy {
  @apply bg-slate-100 text-slate-300;
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
