import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import viteSvgSprite from "../dist/index"
import path from "path"

export default defineConfig({
  plugins: [
    vue(),
    viteSvgSprite({
      groups: [
        {
          dirs: [path.join(__dirname, "src", "icons1")],
          symbolId: "icons1-[dir]-[name]",
          dirSeparator: ".",
        },
        {
          dirs: [path.join(__dirname, "src", "icons2")],
          symbolId: "icons2-[dir]-[name]",
        },
        {
          dirs: [path.join(__dirname, "src", "icons3")],
          symbolId: (p) => "icons3-" + path.basename(p, ".svg"),
        },
        // will silently ignore non-exist directories
        {
          dirs: [path.join(__dirname, "src", "not-exist")],
          symbolId: "[name]",
        },
      ],
    }),
  ],
})
