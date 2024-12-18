<script setup>
import { ref } from "vue";

const serialInput = ref("");
const serialOutput = ref("");
const port = ref(null);
const baudRate = ref(115200); // Default baud rate

const openSerialRequest = async () => {
  try {
    port.value = await navigator.serial.requestPort();
    await port.value.open({ baudRate: baudRate.value });
    console.log("Serial connection opened with baud rate:", baudRate.value);
    readSerialData();
  } catch (error) {
    console.error("Error opening serial connection:", error);
  }
};

const readSerialData = async () => {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = port.value.readable.pipeTo(textDecoder.writable);
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

const sendSerialData = async () => {
  if (port.value && port.value.writable) {
    const textEncoder = new TextEncoder();
    const writer = port.value.writable.getWriter();
    try {
      await writer.write(textEncoder.encode(serialInput.value));
      console.log("Data sent:", serialInput.value);
      serialInput.value = ""; // Clear the input after sending
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
  <div>
    <label for="baudRate">Select Baud Rate:</label>
    <select id="baudRate" v-model="baudRate">
      <option value="9600">9600</option>
      <option value="19200">19200</option>
      <option value="38400">38400</option>
      <option value="57600">57600</option>
      <option value="115200">115200</option>
    </select>
    <button class="btn btn-export" @click="openSerialRequest">
      Open Serial Connection
    </button>
    <div v-if="serialOutput" class="text-white">
      <h3>Serial Output:</h3>
      <pre>{{ serialOutput }}</pre>
    </div>
  </div>
  <div>
    <input v-model="serialInput" placeholder="Enter data to send" />
    <button class="btn btn-export" @click="sendSerialData">Send Data</button>
  </div>
</template>
