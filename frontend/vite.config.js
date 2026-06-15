import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on LAN so phones on the same WiFi can connect
    proxy: { "/api": "https://smartmoneymanagar.onrender.com" },
  },
});
