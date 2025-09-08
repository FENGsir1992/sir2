import {defineConfig} from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
// import vitePluginInjectDataLocator from "./plugins/vite-plugin-inject-data-locator"; // <-- 我把它注释掉了！

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    // vitePluginInjectDataLocator(), // <-- 我也把它从插件列表里注释掉了！
    tailwindcss()
  ],
  server: {
    allowedHosts: true,
  },
});
