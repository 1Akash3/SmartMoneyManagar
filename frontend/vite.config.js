import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // installed users get new deploys automatically
      includeAssets: ["apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "SpendSmart — Personal Finance",
        short_name: "SpendSmart",
        description: "Track expenses, budgets, and goals with AI-powered insights.",
        theme_color: "#4f46e5",
        background_color: "#0b0d13",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/], // never hijack API calls
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true, // listen on LAN so phones on the same WiFi can connect
    proxy: { "/api": "https://smartmoneymanagar.onrender.com" },
  },
});
