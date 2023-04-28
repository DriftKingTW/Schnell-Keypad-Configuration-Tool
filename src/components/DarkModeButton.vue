<template>
  <div :class="{ dark: isDarkMode }">
    <button class="btn flex" @click="toggleDarkMode">
      <theme-light-dark-icon class="hover:text-stone-400" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ThemeLightDarkIcon from "icons/ThemeLightDark.vue";

const isDarkMode = ref(false);

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  updateDarkModeClass();
};

const updateDarkModeClass = () => {
  if (isDarkMode.value) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

onMounted(() => {
  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  isDarkMode.value = darkModeMediaQuery.matches;
  updateDarkModeClass();

  darkModeMediaQuery.addEventListener("change", (e) => {
    isDarkMode.value = e.matches;
    updateDarkModeClass();
  });
});
</script>
