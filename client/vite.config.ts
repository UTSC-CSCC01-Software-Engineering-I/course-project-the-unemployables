import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so the container port is reachable
    port: 5173,
    proxy: {
      "/api": {
        // In Docker, API_URL is set to http://server:5000 via docker-compose env
        target: process.env["API_URL"] ?? "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
