import { ref } from "vue";
import { supabase } from "@/lib/supabase";

// One saved keypad configuration, as stored in the `keypad_configs` table.
// `config` holds the full combinedConfig object (keyConfig, macros,
// rotaryExtension, onBoardRotaryEncoder).
export interface CloudConfig {
  id: string;
  name: string;
  config: any;
  updated_at: string;
}

const TABLE = "keypad_configs";

export function useCloudConfigs() {
  const configs = ref<CloudConfig[]>([]);
  const loading = ref(false);

  /** Fetch the signed-in user's saved configs, newest first. */
  const listConfigs = async () => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id, name, config, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      configs.value = data ?? [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Insert or overwrite a config by name. Relies on the unique(user_id, name)
   * constraint; `user_id` defaults to auth.uid() on the DB side.
   */
  const saveConfig = async (name: string, config: any) => {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        { name, config, updated_at: new Date().toISOString() },
        { onConflict: "user_id,name" }
      )
      .select("id, name, config, updated_at")
      .single();
    if (error) throw error;
    return data as CloudConfig;
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    configs.value = configs.value.filter((c) => c.id !== id);
  };

  return { configs, loading, listConfigs, saveConfig, deleteConfig };
}
