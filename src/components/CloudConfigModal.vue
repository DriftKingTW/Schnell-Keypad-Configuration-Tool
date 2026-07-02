<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { key } from "@/store";
import { useAuth } from "@/composables/useAuth";
import { useCloudConfigs, type CloudConfig } from "@/composables/useCloudConfigs";
import CloseIcon from "icons/Close.vue";
import CloudUploadIcon from "icons/CloudUpload.vue";
import TrayArrowDownIcon from "icons/TrayArrowDown.vue";
import DeleteIcon from "icons/Delete.vue";

const props = defineProps<{
  isOpen: boolean;
  // Full combinedConfig object to save to the cloud.
  currentConfig: any;
  // Suggested name for a new save (e.g. current layout title).
  suggestedName?: string;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "load", config: any): void;
}>();

const i18n = useI18n();
const store = useStore(key);
const { user, signInWithGoogle, signOut } = useAuth();
const { configs, loading, listConfigs, saveConfig, deleteConfig } =
  useCloudConfigs();

const newName = ref("");
const saving = ref(false);

const toast = (message: string, type: "success" | "danger") =>
  store.commit("showToast", { message, type });

// Refresh the list and reset the name field whenever the modal opens while
// signed in.
watch(
  () => props.isOpen,
  (open) => {
    if (open && user.value) {
      newName.value = props.suggestedName ?? "";
      refresh();
    }
  }
);

// Also load once the user signs in while the modal is already open.
watch(user, (u) => {
  if (u && props.isOpen) {
    newName.value = props.suggestedName ?? "";
    refresh();
  }
});

const refresh = async () => {
  try {
    await listConfigs();
  } catch (e: any) {
    toast(`${i18n.t("cloud.loadListError")}: ${e.message}`, "danger");
  }
};

const close = () => emit("update:isOpen", false);

const onSignIn = async () => {
  try {
    await signInWithGoogle();
  } catch (e: any) {
    toast(`${i18n.t("cloud.signInError")}: ${e.message}`, "danger");
  }
};

const onSignOut = async () => {
  try {
    await signOut();
    configs.value = [];
  } catch (e: any) {
    toast(e.message, "danger");
  }
};

// In-modal confirmation dialog (replaces native window.confirm).
const confirm = reactive({ open: false, message: "" });
let confirmAction: (() => void) | null = null;

const askConfirm = (message: string, action: () => void) => {
  confirm.message = message;
  confirmAction = action;
  confirm.open = true;
};

const onConfirmYes = () => {
  const action = confirmAction;
  confirm.open = false;
  confirmAction = null;
  if (action) action();
};

const onConfirmNo = () => {
  confirm.open = false;
  confirmAction = null;
};

const doSave = async (name: string) => {
  saving.value = true;
  try {
    await saveConfig(name, props.currentConfig);
    await refresh();
    toast(i18n.t("cloud.saveSuccess"), "success");
  } catch (e: any) {
    toast(`${i18n.t("cloud.saveError")}: ${e.message}`, "danger");
  } finally {
    saving.value = false;
  }
};

const onSave = () => {
  const name = newName.value.trim();
  if (!name) {
    toast(i18n.t("cloud.nameRequired"), "danger");
    return;
  }
  const exists = configs.value.some((c) => c.name === name);
  if (exists) {
    askConfirm(i18n.t("cloud.overwriteConfirm", { name }), () => doSave(name));
  } else {
    doSave(name);
  }
};

const onLoad = (cfg: CloudConfig) => {
  askConfirm(i18n.t("cloud.loadConfirm", { name: cfg.name }), () => {
    emit("load", cfg.config);
    toast(i18n.t("cloud.loadSuccess"), "success");
    close();
  });
};

const onDelete = (cfg: CloudConfig) => {
  askConfirm(i18n.t("cloud.deleteConfirm", { name: cfg.name }), async () => {
    try {
      await deleteConfig(cfg.id);
      toast(i18n.t("cloud.deleteSuccess"), "success");
    } catch (e: any) {
      toast(`${i18n.t("cloud.deleteError")}: ${e.message}`, "danger");
    }
  });
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();
</script>

<template>
  <div v-if="isOpen" class="fixed z-20 inset-0 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <div
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        aria-hidden="true"
        @click="close"
      ></div>
      <div
        class="relative inline-block bg-white dark:bg-stone-800 rounded-lg text-left shadow-xl transform transition-all w-full sm:max-w-lg"
        role="dialog"
        aria-modal="true"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-stone-700"
        >
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ $t("cloud.title") }}
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            @click="close"
          >
            <close-icon :size="20" />
          </button>
        </div>

        <div class="px-6 py-4">
          <!-- Signed out -->
          <div v-if="!user" class="text-center py-6">
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              {{ $t("cloud.signInHint") }}
            </p>
            <button
              class="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-stone-600"
              @click="onSignIn"
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt=""
                class="w-4 h-4"
              />
              {{ $t("cloud.signInGoogle") }}
            </button>
          </div>

          <!-- Signed in -->
          <div v-else>
            <div
              class="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-300"
            >
              <span class="truncate">{{ user.email }}</span>
              <button
                class="text-red-500 hover:text-red-600 whitespace-nowrap ml-2"
                @click="onSignOut"
              >
                {{ $t("cloud.signOut") }}
              </button>
            </div>

            <!-- Save current config -->
            <div class="flex gap-2 mb-4">
              <input
                v-model="newName"
                type="text"
                :placeholder="$t('cloud.namePlaceholder')"
                class="flex-1 rounded-md border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                @keyup.enter="onSave"
              />
              <button
                class="inline-flex items-center gap-1 rounded-md bg-green-600 hover:bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                :disabled="saving"
                @click="onSave"
              >
                <cloud-upload-icon :size="16" />
                {{ $t("cloud.save") }}
              </button>
            </div>

            <!-- Saved configs list -->
            <div
              class="border-t border-gray-200 dark:border-stone-700 pt-3 max-h-72 overflow-y-auto"
            >
              <p
                v-if="loading"
                class="text-center text-sm text-gray-500 py-4"
              >
                {{ $t("cloud.loading") }}
              </p>
              <p
                v-else-if="configs.length === 0"
                class="text-center text-sm text-gray-500 py-4"
              >
                {{ $t("cloud.empty") }}
              </p>
              <ul v-else class="divide-y divide-gray-100 dark:divide-stone-700">
                <li
                  v-for="cfg in configs"
                  :key="cfg.id"
                  class="flex items-center justify-between py-2"
                >
                  <div class="min-w-0 mr-2">
                    <div
                      class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                    >
                      {{ cfg.name }}
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ formatDate(cfg.updated_at) }}
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      class="p-1.5 rounded text-stone-600 dark:text-stone-300 hover:bg-gray-100 dark:hover:bg-stone-700"
                      :title="$t('cloud.load')"
                      @click="onLoad(cfg)"
                    >
                      <tray-arrow-down-icon :size="18" />
                    </button>
                    <button
                      class="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-stone-700"
                      :title="$t('cloud.delete')"
                      @click="onDelete(cfg)"
                    >
                      <delete-icon :size="18" />
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmation dialog (in-app, replaces native window.confirm) -->
  <div v-if="confirm.open" class="fixed z-30 inset-0 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <div
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        aria-hidden="true"
        @click="onConfirmNo"
      ></div>
      <div
        class="relative inline-block bg-white dark:bg-stone-800 rounded-lg text-left shadow-xl w-full sm:max-w-sm"
        role="dialog"
        aria-modal="true"
      >
        <div class="px-6 pt-5 pb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ $t("confirmTitle") }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {{ confirm.message }}
          </p>
        </div>
        <div
          class="bg-gray-50 dark:bg-stone-900 px-6 py-3 flex flex-row-reverse gap-3"
        >
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-sm font-medium text-white hover:bg-green-700"
            @click="onConfirmYes"
          >
            {{ $t("confirm") }}
          </button>
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-gray-300 dark:border-stone-600 shadow-sm px-4 py-2 bg-white dark:bg-stone-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-500 dark:hover:text-white"
            @click="onConfirmNo"
          >
            {{ $t("cancel") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
