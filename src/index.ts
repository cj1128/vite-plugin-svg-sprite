import type { Plugin } from "vite"
interface PluginOptions {}

// vite plugin doc: https://vitejs.dev/guide/api-plugin.html
export default (opts: PluginOptions): Plugin => {
  return {
    name: "vite-plugin-svg-sprite",
  }
}
