<script setup lang="ts">
import { ref, watch } from "vue";
import { Splide, SplideSlide } from "@splidejs/vue-splide";
import ChevronRightIcon from "icons/ChevronRight.vue";
import ChevronLeftIcon from "icons/ChevronLeft.vue";
import FastForwardIcon from "icons/FastForward.vue";
import CheckIcon from "icons/Check.vue";
import "@splidejs/vue-splide/css";

const props = defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);

const slides = [
  { src: "/tutorial_images/dark/step.jpg", alt: "Step 1" },
  { src: "/tutorial_images/dark/step.jpg", alt: "Step 2" },
  { src: "/tutorial_images/dark/step.jpg", alt: "Step 3" },
  { src: "/tutorial_images/dark/step.jpg", alt: "Step 4" },
  { src: "/tutorial_images/dark/step.jpg", alt: "Step 5" },
];
const progressWidth = ref(0);
const splide: any = ref(null);
const isLastSlide = ref(false);
const isFirstSlide = ref(true);
const showOnStart = ref(false);

// check if user has seen tutorial before
if (localStorage.getItem("showOnStart") === "false") {
  showOnStart.value = false;
  emit("update:modelValue", false);
} else {
  showOnStart.value = true;
  emit("update:modelValue", true);
}

// reset progress bar when tutorial is opened
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      splide.value.splide.go(0);
      updateProgress(0);
    }
  }
);

const updateProgress = (newIndex: number) => {
  const totalSlides = slides.length;
  progressWidth.value = (newIndex / (totalSlides - 1)) * 100;

  if (splide.value.splide.index === totalSlides - 1) {
    isLastSlide.value = true;
  } else if (splide.value.splide.index === 0) {
    isFirstSlide.value = true;
  } else {
    isLastSlide.value = false;
    isFirstSlide.value = false;
  }
};

const closeCarousel = () => {
  emit("update:modelValue", false);
  localStorage.setItem("showOnStart", showOnStart.value.toString());
};

const goToPrevSlide = () => {
  if (splide.value) {
    splide.value.splide.go("<");
  }
};

const goToNextSlide = () => {
  if (splide.value) {
    splide.value.splide.go(">");
  }
};
</script>

<template>
  <div class="slider-container">
    <div class="overlay"></div>
    <div class="splide-wrapper">
      <Splide
        ref="splide"
        :options="{
          autoHeight: true,
          width: '800px',
          speed: 500,
          snap: true,
          wheel: true,
          releaseWheel: true,
          waitForTransition: true,
          pagination: false,
          arrows: false,
        }"
        @splide:move="updateProgress($event.index)"
        aria-label="Tutorial"
      >
        <SplideSlide v-for="(slide, index) in slides" :key="index">
          <img :src="slide.src" :alt="slide.alt" class="rounded-lg" />
        </SplideSlide>
      </Splide>
      <div class="slider-progress rounded-b-lg">
        <div
          class="slider-progress-bar"
          :style="{ width: progressWidth + '%' }"
        ></div>
        <div class="flex mt-1">
          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              class="hidden peer"
              v-model="showOnStart"
              id="showOnStart"
            />
            <span
              class="w-5 h-5 inline-block mr-2 border-2 border-stone-400 rounded-sm peer-checked:bg-lime-600 peer-checked:border-lime-600 cursor-pointer peer-checked:text-white"
              @click="showOnStart = !showOnStart"
            >
              <check-icon :size="16" />
            </span>
            <label for="showOnStart" class="text-stone-400 cursor-pointer">
              {{ $t("tutorial.showOnStart") }}
            </label>
          </div>
          <div class="grow"></div>
          <button
            :disable="!isFirstSlide"
            @click="goToPrevSlide"
            class="w-24 btn border-2 border-stone-400 text-stone-400 flex justify-center items-center"
            :class="isFirstSlide ? 'opacity-50' : ''"
          >
            <chevron-left-icon :size="24" />
          </button>
          <button
            :disable="!isLastSlide"
            @click="goToNextSlide"
            class="w-24 btn border-2 border-stone-400 text-stone-400 flex justify-center items-center"
            :class="isLastSlide ? 'opacity-50' : ''"
          >
            <chevron-right-icon :size="24" />
          </button>
          <button
            @click="closeCarousel"
            class="btn w-48 btn-export flex justify-center items-center"
          >
            <fast-forward-icon v-show="!isLastSlide" :size="24" class="mr-2" />
            <check-icon v-show="isLastSlide" :size="24" class="mr-2" />
            {{ isLastSlide ? $t("tutorial.finish") : $t("tutorial.skip") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.slider-container {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  z-index: 10;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  content: "";
  background-color: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
}

.splide-wrapper {
  position: relative;
  z-index: 10;
  padding-bottom: 0rem; // Add padding to the bottom
  min-width: 640px;
  min-height: 480px;
}

.slider-progress {
  @apply bg-stone-600 absolute;
  height: 0.2rem;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.slider-progress-bar {
  @apply bg-lime-500;
  height: 100%;
  transition: width 400ms ease;
  width: 0%; // Set initial width to 0%
}
</style>
