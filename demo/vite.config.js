import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import viteSvgSprite from "../dist/index.esm"

export default defineConfig({
  plugins: [vue(), viteSvgSprite()],
})
