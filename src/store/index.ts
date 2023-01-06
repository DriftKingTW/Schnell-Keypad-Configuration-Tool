import { InjectionKey } from "vue";
import { createStore, Store } from "vuex";

// define your typings for the store state
export interface State {
  showToast: Boolean;
  toastMessage: String;
  toastType: "success" | "danger" | "warning" | undefined;
}

export const store = createStore<State>({
  state: {
    showToast: false,
    toastMessage: "",
    toastType: undefined,
  },

  mutations: {
    showToast(state, { type, message, timeout = 3000 }) {
      state.showToast = true;
      state.toastMessage = message;
      state.toastType = type;
      setTimeout(() => {
        state.showToast = false;
      }, timeout);
    },
  },

  actions: {},

  modules: {},
});

// define injection key
export const key: InjectionKey<Store<State>> = Symbol();
