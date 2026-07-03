<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { key } from "@/store";
import axios from "axios";
import UsbIcon from "icons/Usb.vue";
import MathLogIcon from "icons/MathLog.vue";
import ConnectionIcon from "icons/Connection.vue";
import TrayArrowDownIcon from "icons/TrayArrowDown.vue";
import CloudUploadIcon from "icons/CloudUpload.vue";
import WifiSettingsIcon from "icons/WifiSettings.vue";
import CloseIcon from "icons/Close.vue";
import LanConnectIcon from "icons/LanConnect.vue";
import LanDisconnectIcon from "icons/LanDisconnect.vue";
import IpNetworkIcon from "icons/IpNetwork.vue";
import WifiStrength1Icon from "icons/WifiStrength1.vue";
import WifiStrength2Icon from "icons/WifiStrength2.vue";
import WifiStrength3Icon from "icons/WifiStrength3.vue";
import WifiStrength4Icon from "icons/WifiStrength4.vue";
import WifiStrengthAlertOutlineIcon from "icons/WifiStrengthAlertOutline.vue";
import Modal from "@/components/Modal.vue";

const { t } = useI18n();
const store = useStore(key);
const props = defineProps(["configString"]);
const emit = defineEmits(["config-read"]);

const toast = (message: string, type: "success" | "danger") =>
  store.commit("showToast", { message, type });

// Which transport the device panel is currently showing.
const transport = ref<"usb" | "network">("usb");

// ---------------------------------------------------------------------------
// USB / Web Serial
// ---------------------------------------------------------------------------
const serialOutput = ref("");
const port = ref<any | null>(null);
const baudRate = ref(115200);
const isSerialConnected = ref(false);
// Kept so disconnect can tear down the read pipeline before closing the port
// (closing while the reader still holds the lock fails and wedges the port).
let serialReader: any = null;
let readableStreamClosed: Promise<any> | null = null;

const showSerialMonitor = ref(false);
const serialLog = ref<HTMLElement | null>(null);
watch(serialOutput, () => {
  nextTick(() => {
    const el = serialLog.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
});
const clearSerialOutput = () => {
  serialOutput.value = "";
};

const openSerialRequest = async () => {
  try {
    port.value = await navigator.serial.requestPort();
    await port.value.open({ baudRate: baudRate.value });
    isSerialConnected.value = true;
    readSerialData();
  } catch (error) {
    console.error("Error opening serial connection:", error);
    isSerialConnected.value = false;
  }
};

const disconnectSerial = async () => {
  showSerialMonitor.value = false;
  try {
    // Cancel the reader and let the pipe settle so the port's readable is
    // unlocked before we close it, otherwise close() throws and the port
    // stays half-open (breaking the next connection).
    await serialReader?.cancel();
    await readableStreamClosed;
    await port.value?.close();
  } catch (error) {
    console.error("Error closing serial port:", error);
  }
  serialReader = null;
  readableStreamClosed = null;
  port.value = null;
  isSerialConnected.value = false;
};

const readSerialData = async () => {
  const textDecoder = new TextDecoderStream();
  if (port.value && (port.value as any).readable) {
    readableStreamClosed = port.value.readable
      .pipeTo(textDecoder.writable)
      .catch(() => {});
  }
  const reader = textDecoder.readable.getReader();
  serialReader = reader;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      serialOutput.value += value;
    }
  } catch (error) {
    // The reader was cancelled during disconnect; nothing to handle.
  } finally {
    reader.releaseLock();
  }
};

const updateConfigViaSerial = async () => {
  if (port.value && port.value.writable) {
    const writer = port.value.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(props.configString));
      toast(t("deviceUploadSuccess"), "success");
    } catch (error: any) {
      toast(`${t("deviceUploadError")}: ${error.message}`, "danger");
    } finally {
      writer.releaseLock();
    }
  }
};

// Ask the device to dump its keyconfig.json and emit the JSON between the
// <<<CONFIG_BEGIN>>> / <<<CONFIG_END>>> markers.
const readConfigViaSerial = async () => {
  if (!port.value || !port.value.writable) return;
  const begin = "<<<CONFIG_BEGIN>>>";
  const end = "<<<CONFIG_END>>>";
  const searchStart = serialOutput.value.length;

  const writer = port.value.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode("READ_CONFIG"));
  } catch (error: any) {
    writer.releaseLock();
    toast(`${t("deviceReadError")}: ${error.message}`, "danger");
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
      const open = between.indexOf("{");
      const close = between.lastIndexOf("}");
      if (open !== -1 && close > open) {
        emit("config-read", between.slice(open, close + 1));
        toast(t("deviceReadSuccess"), "success");
      } else {
        toast(t("deviceReadError"), "danger");
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  toast(t("deviceReadError"), "danger");
};

const writeSerial = async (data: string): Promise<boolean> => {
  if (!port.value || !port.value.writable) return false;
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
        return null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
};

// ---------------------------------------------------------------------------
// WiFi configuration (USB only)
// ---------------------------------------------------------------------------
const showWifiModal = ref(false);
const wifiSsid = ref("");
const wifiPassword = ref("");
const wifiNetworks = ref<{ ssid: string; rssi: number }[]>([]);
const scanningWifi = ref(false);
const wifiBusy = ref(false);

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
    await scanWifiViaSerial();
  } finally {
    wifiBusy.value = false;
  }
};

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

// ---------------------------------------------------------------------------
// Network / HTTP
// ---------------------------------------------------------------------------
const keyboardUrl = ref("http://schnell.local");
const isNetworkConnected = ref(false);
const networkInfo = reactive({
  apIP: "",
  gatewayIP: "",
  ip: "",
  mac: "",
  password: "",
  rssi: -100,
  ssid: "",
  subnetMask: "",
});

// Ping the device for its network status. `silent` skips the error toast so the
// mount-time auto-detect stays quiet when no device is reachable.
const checkNetwork = async (silent = false) => {
  try {
    isNetworkConnected.value = false;
    const response = await fetch(`${keyboardUrl.value}/api/network`);
    const data = await response.json();
    if (response.status === 200) isNetworkConnected.value = true;
    networkInfo.ip = data.wifi.ip;
    networkInfo.ssid = data.wifi.ssid;
    networkInfo.password = data.wifi.password;
    networkInfo.mac = data.wifi.mac;
    networkInfo.rssi = data.wifi.rssi;
    networkInfo.gatewayIP = data.wifi.gatewayIP;
    networkInfo.subnetMask = data.wifi.subnetMask;
    networkInfo.apIP = data.wifi.apIp;
    if (isNetworkConnected.value) transport.value = "network";
  } catch (error: any) {
    if (!silent) toast(`${t("deviceConnectError")}: ${error.message}`, "danger");
  }
};

const disconnectNetwork = () => {
  isNetworkConnected.value = false;
  networkInfo.ip = "";
  networkInfo.rssi = -100;
};

const readConfigViaHttp = async () => {
  try {
    const response = await axios.get(
      `${keyboardUrl.value}/api/config?type=keyconfig`
    );
    emit("config-read", JSON.stringify(response.data.config));
    toast(t("deviceReadSuccess"), "success");
  } catch (error: any) {
    toast(`${t("deviceReadError")}: ${error.message}`, "danger");
  }
};

const uploadConfigViaHttp = async () => {
  try {
    await axios.put(
      `${keyboardUrl.value}/api/config?type=keyconfig`,
      JSON.parse(props.configString)
    );
    toast(t("deviceUploadSuccess"), "success");
  } catch (error: any) {
    toast(`${t("deviceUploadError")}: ${error.message}`, "danger");
  }
};

// ---------------------------------------------------------------------------
// Unified connection + actions (dispatch by active transport)
// ---------------------------------------------------------------------------
const connected = computed(() =>
  transport.value === "usb" ? isSerialConnected.value : isNetworkConnected.value
);

const connect = () => {
  if (transport.value === "usb") openSerialRequest();
  else checkNetwork();
};

const disconnect = () => {
  if (transport.value === "usb") disconnectSerial();
  else disconnectNetwork();
};

// Shared confirmation dialog for read / upload.
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

const readConfig = () => {
  askConfirm(t("confirmReadFromDevice"), () =>
    transport.value === "usb" ? readConfigViaSerial() : readConfigViaHttp()
  );
};
const uploadConfig = () => {
  askConfirm(t("confirmUploadToDevice"), () =>
    transport.value === "usb" ? updateConfigViaSerial() : uploadConfigViaHttp()
  );
};

// Auto-detect a device on the network at load, without nagging if none is found.
onMounted(() => checkNetwork(true));
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Transport switch -->
    <div
      class="inline-flex rounded-md overflow-hidden border border-stone-300 dark:border-stone-600 text-sm"
    >
      <button
        type="button"
        class="flex items-center justify-center min-w-[7rem] px-6 py-1.5"
        :class="
          transport === 'usb'
            ? 'bg-cyan-600 text-white'
            : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300'
        "
        @click="transport = 'usb'"
      >
        <usb-icon :size="18" class="mr-1.5" />
        {{ $t("transportUsb") }}
      </button>
      <button
        type="button"
        class="flex items-center justify-center min-w-[7rem] px-6 py-1.5"
        :class="
          transport === 'network'
            ? 'bg-cyan-600 text-white'
            : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300'
        "
        @click="transport = 'network'"
      >
        <lan-connect-icon :size="18" class="mr-1.5" />
        {{ $t("transportNetwork") }}
      </button>
    </div>

    <!-- Connection controls (before connect) -->
    <div
      v-if="!connected"
      class="flex items-center flex-wrap justify-center gap-3"
    >
      <template v-if="transport === 'usb'">
        <label for="baudRate" class="text-sm">{{ $t("baudRate") }}</label>
        <select id="baudRate" class="btn" v-model="baudRate">
          <option value="9600">9600</option>
          <option value="19200">19200</option>
          <option value="38400">38400</option>
          <option value="57600">57600</option>
          <option value="115200">115200</option>
        </select>
      </template>
      <template v-else>
        <input
          type="text"
          class="text-input"
          v-model="keyboardUrl"
          :placeholder="`Ex: http://schnell.local`"
        />
      </template>
      <button class="btn btn-install flex items-center" @click="connect">
        <connection-icon :size="20" class="self-center mr-2" />
        {{ $t("connect") }}
      </button>
    </div>

    <!-- Actions (after connect) -->
    <div v-else class="flex items-center flex-wrap justify-center gap-3">
      <!-- Status -->
      <span
        class="flex items-center text-sm text-stone-600 dark:text-stone-300"
      >
        <lan-connect-icon
          v-if="transport === 'network'"
          :size="20"
          class="text-lime-500 mr-2"
        />
        <usb-icon v-else :size="20" class="text-lime-500 mr-2" />
        {{ $t("connected") }}
        <template v-if="transport === 'network'">
          <ip-network-icon :size="18" class="mx-1.5" />
          {{ networkInfo.ip || "—" }}
          <wifi-strength4-icon
            v-if="networkInfo.rssi > -55"
            :size="18"
            class="ml-1.5"
          />
          <wifi-strength3-icon
            v-else-if="networkInfo.rssi > -70"
            :size="18"
            class="ml-1.5"
          />
          <wifi-strength2-icon
            v-else-if="networkInfo.rssi > -80"
            :size="18"
            class="ml-1.5"
          />
          <wifi-strength1-icon
            v-else-if="networkInfo.rssi > -90"
            :size="18"
            class="ml-1.5"
          />
          <wifi-strength-alert-outline-icon v-else :size="18" class="ml-1.5" />
        </template>
      </span>

      <button class="btn btn-export flex items-center" @click="readConfig">
        <tray-arrow-down-icon :size="20" class="self-center mr-2" />
        {{ $t("readKeyConfigFromDevice") }}
      </button>
      <button class="btn btn-export flex items-center" @click="uploadConfig">
        <cloud-upload-icon :size="20" class="self-center mr-2" />
        {{ $t("uploadKeyConfigToDevice") }}
      </button>
      <button
        v-if="transport === 'usb'"
        class="btn btn-export flex items-center"
        @click="openWifiModal"
      >
        <wifi-settings-icon :size="20" class="self-center mr-2" />
        {{ $t("configureWifi") }}
      </button>
      <button
        v-if="transport === 'usb'"
        class="btn btn-install flex items-center"
        @click="showSerialMonitor = !showSerialMonitor"
      >
        <math-log-icon :size="20" class="self-center mr-2" />
        {{ $t("toggleSerialMonitor") }}
      </button>
      <button class="btn btn-cancel flex items-center" @click="disconnect">
        <close-icon :size="20" class="self-center mr-2" />
        {{ $t("disconnect") }}
      </button>
    </div>

    <!-- Serial monitor: console docked to the bottom of the viewport -->
    <Teleport to="body">
      <div
        v-show="showSerialMonitor"
        class="fixed bottom-0 inset-x-0 z-40 flex flex-col shadow-[0_-4px_12px_rgba(0,0,0,0.25)]"
      >
        <div
          class="flex items-center justify-between px-4 py-2 bg-stone-800 text-stone-200 border-t border-stone-700"
        >
          <span class="text-sm font-medium flex items-center">
            <math-log-icon :size="18" class="mr-2" />
            {{ $t("serialMonitor") }}
          </span>
          <div class="flex items-center gap-3">
            <button
              class="text-xs text-stone-300 hover:text-white"
              @click="clearSerialOutput"
            >
              {{ $t("clearLog") }}
            </button>
            <button
              class="text-stone-300 hover:text-white"
              :title="$t('cancel')"
              @click="showSerialMonitor = false"
            >
              <close-icon :size="18" />
            </button>
          </div>
        </div>
        <div
          ref="serialLog"
          class="overflow-auto bg-stone-900 text-lime-500 whitespace-pre-wrap p-4 font-mono text-sm h-56"
        >
          {{ serialOutput }}
        </div>
      </div>
    </Teleport>

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
