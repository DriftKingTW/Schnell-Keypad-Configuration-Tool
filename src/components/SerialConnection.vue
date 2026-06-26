<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import UsbIcon from "icons/Usb.vue";
import MathLogIcon from "icons/MathLog.vue";
import ConnectionIcon from "icons/Connection.vue";
import TrayArrowDownIcon from "icons/TrayArrowDown.vue";
import WifiSettingsIcon from "icons/WifiSettings.vue";
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

// WiFi credentials sent to the device over serial (persisted to its
// config.json and used the next time it boots into WiFi mode).
const showWifiModal = ref(false);
const wifiSsid = ref("");
const wifiPassword = ref("");
// Networks scanned by the device, offered as SSID suggestions.
const wifiNetworks = ref<{ ssid: string; rssi: number }[]>([]);
const scanningWifi = ref(false);
// True while any WiFi serial exchange (read or scan) is in flight, so the
// dialog's controls stay disabled and can't race a second command.
const wifiBusy = ref(false);

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

// Write a single string to the serial port. Returns true on success.
const writeSerial = async (data: string): Promise<boolean> => {
  if (!port.value || !port.value.writable) {
    console.error("Serial port is not open");
    return false;
  }
  const writer = port.value.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode(data));
    return true;
  } catch (error) {
    console.error("Error sending serial data:", error);
    return false;
  } finally {
    writer.releaseLock();
  }
};

// Send a command, then wait for a JSON object delimited by the given markers
// in the serial output. Returns the parsed object, or null on timeout / no
// JSON / parse error.
const requestJsonViaSerial = async (
  command: string,
  begin: string,
  end: string,
  timeoutMs: number
): Promise<any | null> => {
  const searchStart = serialOutput.value.length;
  if (!(await writeSerial(command))) return null;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const buf = serialOutput.value;
    const b = buf.indexOf(begin, searchStart);
    const e = b !== -1 ? buf.indexOf(end, b + begin.length) : -1;
    if (b !== -1 && e !== -1) {
      const between = buf.slice(b + begin.length, e);
      const open = between.indexOf("{");
      const close = between.lastIndexOf("}");
      if (open === -1 || close <= open) return null;
      try {
        return JSON.parse(between.slice(open, close + 1));
      } catch {
        console.error("Failed to parse device response:", command);
        return null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.error("Timed out waiting for device response:", command);
  return null;
};

// Ask the device to scan for nearby networks and populate the SSID
// suggestions (strongest signal first, de-duplicated across APs/bands).
const scanWifiViaSerial = async () => {
  if (scanningWifi.value) return;
  scanningWifi.value = true;
  try {
    const res = await requestJsonViaSerial(
      "SCAN_WIFI",
      "<<<WIFISCAN_BEGIN>>>",
      "<<<WIFISCAN_END>>>",
      10000
    );
    if (!res) return;
    const seen = new Set<string>();
    wifiNetworks.value = (res.networks ?? [])
      .sort((a: any, b: any) => b.rssi - a.rssi)
      .filter((n: any) => {
        if (!n.ssid || seen.has(n.ssid)) return false;
        seen.add(n.ssid);
        return true;
      });
  } finally {
    scanningWifi.value = false;
  }
};

// Open the WiFi dialog, pre-fill the SSID currently stored on the device
// (the password is never returned), then scan for nearby networks.
const openWifiModal = async () => {
  wifiPassword.value = "";
  showWifiModal.value = true;

  wifiBusy.value = true;
  try {
    const res = await requestJsonViaSerial(
      "READ_WIFI",
      "<<<WIFI_BEGIN>>>",
      "<<<WIFI_END>>>",
      5000
    );
    if (res) wifiSsid.value = res.ssid ?? "";

    // Sequential, not concurrent: the device reads one serial command at a time.
    await scanWifiViaSerial();
  } finally {
    wifiBusy.value = false;
  }
};

// Persist the entered WiFi credentials to the device. The "WRITE_WIFI" prefix
// tells the firmware to save the trailing JSON to its config.json.
const updateWifiViaSerial = async () => {
  if (!wifiSsid.value) return;
  const payload = JSON.stringify({
    ssid: wifiSsid.value,
    password: wifiPassword.value,
  });
  if (await writeSerial("WRITE_WIFI" + payload)) {
    showWifiModal.value = false;
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
      <button
        class="btn btn-export grow flex"
        @click="openWifiModal"
        :disabled="!isConnected"
      >
        <wifi-settings-icon :size="24" class="self-center mr-2" />
        {{ $t("configureWifi") }}
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

    <Modal v-model:isOpen="showWifiModal" :title="$t('configureWifi')">
      <template #body>
        <div class="mt-4 flex flex-col space-y-3 text-left">
          <label class="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            <span class="mb-1 flex items-center justify-between">
              {{ $t("wifiScannedNetworks") }}
              <button
                type="button"
                class="text-xs text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50 disabled:no-underline"
                :disabled="wifiBusy || scanningWifi"
                @click="scanWifiViaSerial"
              >
                {{ scanningWifi ? $t("wifiScanning") : $t("wifiRescan") }}
              </button>
            </span>
            <select
              class="input-filled w-full cursor-pointer"
              :value="wifiSsid"
              :disabled="scanningWifi || wifiNetworks.length === 0"
              @change="wifiSsid = ($event.target as HTMLSelectElement).value"
            >
              <option value="" disabled>{{ $t("wifiSelectNetwork") }}</option>
              <option
                v-for="net in wifiNetworks"
                :key="net.ssid"
                :value="net.ssid"
              >
                {{ net.ssid }}
              </option>
            </select>
          </label>
          <label class="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            <span class="mb-1">{{ $t("wifiSsid") }}</span>
            <input
              v-model="wifiSsid"
              type="text"
              class="input-filled w-full"
              autocomplete="off"
            />
          </label>
          <label class="flex flex-col text-sm text-gray-600 dark:text-gray-300">
            <span class="mb-1">{{ $t("wifiPassword") }}</span>
            <input
              v-model="wifiPassword"
              type="password"
              class="input-filled w-full"
              autocomplete="off"
            />
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t("wifiConfigHint") }}
          </p>
        </div>
      </template>
      <!-- Custom footer so the dialog only closes on a successful save, and
           Confirm is blocked while busy or when no SSID is set. -->
      <template #footer>
        <button
          type="button"
          class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:hover:bg-green-600 sm:ml-3 sm:w-auto sm:text-sm"
          :disabled="wifiBusy || scanningWifi || !wifiSsid"
          @click="updateWifiViaSerial"
        >
          {{ $t("confirm") }}
        </button>
        <button
          type="button"
          class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-stone-600 shadow-sm px-4 py-2 bg-white dark:bg-stone-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          @click="showWifiModal = false"
        >
          {{ $t("cancel") }}
        </button>
      </template>
    </Modal>
  </div>
</template>
