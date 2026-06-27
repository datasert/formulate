import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    port: 5863,
    open: "/tests/dev/testui.html",
  },
});
