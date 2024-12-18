<script setup lang="ts">
import { ref } from "vue";
import UsbIcon from "icons/Usb.vue";
import MathLogIcon from "icons/MathLog.vue";
import ConnectionIcon from "icons/Connection.vue";

const serialInput = ref("");
const serialOutput = ref("");
const port = ref<any | null>(null);
const baudRate = ref(115200);
const showSerialMonitor = ref(false);
const isConnected = ref(false); // New variable to check if serial device is connected
const props = defineProps(["configString"]);

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
        @click="updateConfigViaSerial"
        :disabled="!isConnected"
      >
        <usb-icon :size="24" class="self-center mr-2" />
        {{ $t("uploadKeyConfigToDevice") }} (beta only)
      </button>
    </div>

    <div
      v-show="showSerialMonitor"
      class="overflow-auto bg-stone-900 border-lime-500 text-lime-500 mt-4 whitespace-pre-wrap p-4"
      style="height: 200px; width: 60rem; border-radius: 10px"
    >
      {{ serialOutput }}
    </div>
  </div>
</template>
