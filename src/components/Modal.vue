<template>
  <div v-if="isOpen" class="fixed z-10 inset-0 overflow-y-auto">
    <div
      class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
    >
      <div
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        aria-hidden="true"
        @click="closeModal"
      ></div>
      <div
        class="inline-block align-bottom bg-white dark:bg-stone-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        <div class="bg-white dark:bg-stone-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <slot name="header">
            <h3
              class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
              id="modal-headline"
            >
              {{ title }}
            </h3>
          </slot>
          <slot name="body"></slot>
        </div>
        <div
          class="bg-gray-50 dark:bg-stone-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
        >
          <slot name="footer">
            <button
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="onConfirm"
            >
              {{ confirmText }}
            </button>
            <button
              v-if="showCancel"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-stone-600 shadow-sm px-4 py-2 bg-white dark:bg-stone-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="onCancel"
            >
              {{ cancelText }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "Modal Title",
    },
    showCancel: {
      type: Boolean,
      default: true,
    },
    confirmText: {
      type: String,
      default: "OK",
    },
    cancelText: {
      type: String,
      default: "Cancel",
    },
  },
  emits: ["update:isOpen", "confirm", "cancel"],
  methods: {
    closeModal() {
      this.$emit("update:isOpen", false);
    },
    onConfirm() {
      this.$emit("confirm");
      this.closeModal();
    },
    onCancel() {
      this.$emit("cancel");
      this.closeModal();
    },
  },
};
</script>
