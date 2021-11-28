# Vite Plugin SVG Sprite

A Vite plugin for creating SVG sprites.

- Simple and intuitive [code](https://github.com/cj1128/vite-plugin-svg-sprite/blob/master/src/index.ts), do one thing and do it well. No SVG optimization and transformation involved, no bloated dependencies.
- Support multiple groups, each group can have their own directories and symbolId naming scheme.
- Lightweight, 2.5K and only depends on `fast-glob`.

NOTE: Each SVG file **must be a single SVG element**, which means after trimed it should begin with `<svg ` and end with `</svg>`.

## Install & Usage

```shell
$ npm install @cjting/vite-plugin-svg-sprite
```

Options:

```typescript
// path: svg file absoltue path
type SymbolIdFunction = (path: string) => string
type SymbolIdConfig = string | SymbolIdFunction

interface SVGGroup {
  // svg root directories
  // should be absolute path
  dirs: string[]

  // config symbol id of each svg, could be a template string
  // or a custom function
  // template string supports these interpolates
  //  - [name]: basename of svg file (no .svg extension)
  //  - [dir]: directories between root and file
  //    e.g. root is /a
  //    /a/b.svg: [dir] is an empty string
  //    /a/b/c.svg: [dir] is "b"
  //    /a/b/c/d.svg: [dir] is "b-c", you can config the separator with `dirSeparator` option
  symbolId: SymbolIdConfig

  // default to '-'
  dirSeparator: string
}

export interface PluginOption {
  groups: SVGGroup[]
}
```

Example:

```typescript
// vite.config.js
import { defineConfig } from "vite"
import viteSvgSprite from "@cjting/vite-plugin-svg-sprite"
import path from "path"

export default defineConfig({
  plugins: [
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
      ],
    }),
  ],
})
```
