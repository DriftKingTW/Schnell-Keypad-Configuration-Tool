<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import UsbIcon from "icons/Usb.vue";
import MathLogIcon from "icons/MathLog.vue";
import ConnectionIcon from "icons/Connection.vue";
import TrayArrowDownIcon from "icons/TrayArrowDown.vue";
import Modal from "@/components/Modal.vue";

const { t } = useI18n();
const serialInput = ref("");
const serialOutput = ref("");
const port = ref<any | null>(null);
const baudRate = ref(115200);
const showSerialMonitor = ref(false);
const isConnected = ref(false); // New variable to check if serial device is connected
const props = defineProps(["configString"]);
const emit = defineEmits(["config-read"]);

// Confirmation modal shared by the serial read / upload actions.
const confirmOpen = ref(false);
const confirmMessage = ref("");
let confirmAction: (() => void) | null = null;

const askConfirm = (message: string, action: () => void) => {
  confirmMessage.value = message;
  confirmAction = action;
  confirmOpen.value = true;
};

const onConfirm = () => {
  const action = confirmAction;
  confirmAction = null;
  if (action) action();
};

const confirmReadConfig = () => {
  askConfirm(t("confirmReadFromDevice"), readConfigViaSerial);
};

const confirmUpdateConfig = () => {
  askConfirm(t("confirmUploadToDevice"), updateConfigViaSerial);
};

const openSerialRequest = async () => {
  try {
    port.value = await navigator.serial.requestPort();
    await port.value.open({ baudRate: baudRate.value });
    isConnected.value = true; // Set isConnected to true when the connection is successful
    console.log("Serial connection opened with baud rate:", baudRate.value);
    readSerialData();
  } catch (error) {
    console.error("Error opening serial connection:", error);
    isConnected.value = false; // Set isConnected to false if there is an error
  }
};

const readSerialData = async () => {
  const textDecoder = new TextDecoderStream();
  if (port.value && (port.value as any).readable) {
    const readableStreamClosed = port.value.readable.pipeTo(
      textDecoder.writable
    );
  }
  const reader = textDecoder.readable.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      serialOutput.value += value;
    }
  } catch (error) {
    console.error("Error reading serial data:", error);
  } finally {
    reader.releaseLock();
  }
};

const updateConfigViaSerial = async () => {
  if (port.value && port.value.writable) {
    const textEncoder = new TextEncoder();
    const writer = port.value.writable.getWriter();
    try {
      await writer.write(textEncoder.encode(props.configString));
      console.log("Data sent:", props.configString);
    } catch (error) {
      console.error("Error sending serial data:", error);
    } finally {
      writer.releaseLock();
    }
  } else {
    console.error("Serial port is not open");
  }
};

// Ask the device to dump its current keyconfig.json and emit the JSON found
// between the <<<CONFIG_BEGIN>>> / <<<CONFIG_END>>> markers. Relies on
// readSerialData() (started on connect) to populate serialOutput.
const readConfigViaSerial = async () => {
  if (!port.value || !port.value.writable) {
    console.error("Serial port is not open");
    return;
  }

  const begin = "<<<CONFIG_BEGIN>>>";
  const end = "<<<CONFIG_END>>>";
  const searchStart = serialOutput.value.length;

  const writer = port.value.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode("READ_CONFIG"));
  } catch (error) {
    console.error("Error sending serial data:", error);
    writer.releaseLock();
    return;
  }
  writer.releaseLock();

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const buf = serialOutput.value;
    const b = buf.indexOf(begin, searchStart);
    const e = b !== -1 ? buf.indexOf(end, b + begin.length) : -1;
    if (b !== -1 && e !== -1) {
      const between = buf.slice(b + begin.length, e);
      // Take the JSON object span, ignoring any log lines printed by other
      // tasks that may land between the markers.
      const open = between.indexOf("{");
      const close = between.lastIndexOf("}");
      if (open !== -1 && close > open) {
        emit("config-read", between.slice(open, close + 1));
      } else {
        console.error("No JSON found in device config response");
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.error("Timed out waiting for config from device");
};
</script>

<template>
  <div class="flex justify-center items-center flex-col">
    <div class="flex items-center space-x-4">
      <label for="baudRate">{{ $t("baudRate") }}</label>
      <select id="baudRate" class="btn" v-model="baudRate">
        <option value="9600">9600</option>
        <option value="19200">19200</option>
        <option value="38400">38400</option>
        <option value="57600">57600</option>
        <option value="115200">115200</option>
      </select>
      <button class="btn btn-install grow flex" @click="openSerialRequest">
        <connection-icon :size="24" class="self-center mr-2" />
        {{ $t("openSerialConnection") }}
      </button>
      <button
        class="btn btn-install grow flex"
        @click="showSerialMonitor = !showSerialMonitor"
        :disabled="!isConnected"
      >
        <math-log-icon :size="24" class="self-center mr-2" />
        {{ $t("toggleSerialMonitor") }}
      </button>
      <button
        class="btn btn-export grow flex"
        @click="confirmReadConfig"
        :disabled="!isConnected"
      >
        <tray-arrow-down-icon :size="24" class="self-center mr-2" />
        {{ $t("readKeyConfigFromDevice") }}
      </button>
      <button
        class="btn btn-export grow flex"
        @click="confirmUpdateConfig"
        :disabled="!isConnected"
      >
        <usb-icon :size="24" class="self-center mr-2" />
        {{ $t("uploadKeyConfigToDevice") }}
      </button>
    </div>

    <div
      v-show="showSerialMonitor"
      class="overflow-auto bg-stone-900 border-lime-500 text-lime-500 mt-4 whitespace-pre-wrap p-4"
      style="height: 200px; width: 60rem; border-radius: 10px"
    >
      {{ serialOutput }}
    </div>

    <Modal
      v-model:isOpen="confirmOpen"
      :title="$t('confirmTitle')"
      :confirmText="$t('confirm')"
      :cancelText="$t('cancel')"
      @confirm="onConfirm"
    >
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
          {{ confirmMessage }}
        </p>
      </template>
    </Modal>
  </div>
</template>
