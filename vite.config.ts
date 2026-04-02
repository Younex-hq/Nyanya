import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    base: "./", // For GitHub Pages and relative path resolution
    plugins: [
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.svg",
                "apple-touch-icon.png",
                "masked-icon.svg",
            ],
            manifest: {
                name: "Nyanya (Pomodoro)",
                short_name: "Nyanya",
                description:
                    "A Pomodoro timer with statistics and offline support.",
                theme_color: "#bde2ff",
                start_url: "./index.html",
                scope: "./",
                display: "standalone",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "masked-icon.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                navigateFallback: undefined,
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
});
