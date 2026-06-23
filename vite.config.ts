import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite"; // Add this import

export default defineConfig({
  tanstackStart: {
    deploymentPreset: "vercel" 
  },
  vite: {
    plugins: [nitro()], // Include nitro plugin here
    nitro: {
      preset: "vercel"
    }
  } as any
});