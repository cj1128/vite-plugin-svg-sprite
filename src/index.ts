import type { Plugin } from "vite"
import { normalizePath } from "vite"
import fg from "fast-glob"
import fs from "fs"
import path from "path"

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

// TODO: generate types in dist
export interface PluginOption {
  groups: SVGGroup[]
}

const REGISTER_ID = "virtual:svg-sprite"
const NAMES_ID = "virtual:svg-sprite/names"

let hasInited = false

// vite plugin doc: https://vitejs.dev/guide/api-plugin.html
export default (opt: PluginOption): Plugin => {
  let isBuild = false

  // prevent multiple installation of plugin
  if (hasInited) {
    fatal("should not instantiate this plugin multiple times")
  } else {
    hasInited = true
  }

  return {
    name: "vite-plugin-svg-sprite",

    configResolved(config) {
      isBuild = config.isProduction || config.command === "build"
    },

    resolveId(id) {
      if (id === REGISTER_ID || id === NAMES_ID) {
        return id
      }

      return null
    },

    // TODO: for build
    load(id, ssr) {
      return null
    },

    // for dev
    configureServer({ middlewares }) {
      middlewares.use(async (req, res, next) => {
        const url = normalizePath((req as any).url)

        const targetURLs = {
          register: `/@id/${REGISTER_ID}`,
          names: `/@id/${NAMES_ID}`,
        }

        if (Object.values(targetURLs).includes(url)) {
          res.setHeader("Content-Type", "application/javascript")
          res.setHeader("Cache-Control", "no-cache")

          const { registerCode, namesCode } = genModuleCode(opt.groups)

          let content = ""

          if (url === targetURLs.register) {
            content = registerCode
          } else if (url == targetURLs.names) {
            content = namesCode
          }

          res.statusCode = 200
          res.end(content)
        } else {
          next()
        }
      })
    },
  }
}

interface ModuleCode {
  registerCode: string
  namesCode: string
}

const SVG_DOM_ID = "__vite_plugin_svg_sprite__"

function genModuleCode(groups: SVGGroup[]): ModuleCode {
  const { symbols, ids } = compileGroups(groups)

  const registerCode = `
    function loadSvg() {
      const body = document.body

      let svgDom = document.getElementById('${SVG_DOM_ID}')
      if(svgDom == null) {
        svgDom = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svgDom.style.display = 'none'
        svgDom.id = '${SVG_DOM_ID}'
      }

      svgDom.innerHTML = ${JSON.stringify(symbols.join("\n"))}
      body.insertBefore(svgDom, body.firstChild)
    }

    if(document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadSvg)
    } else {
      loadSvg()
    }
  `
  const namesCode = `export default ${JSON.stringify(ids)}`

  return { registerCode, namesCode }
}

interface CompileResult {
  symbols: string[]
  ids: string[]
}

function warning(text: string) {
  console.log(
    "\x1b[33mvite-plugin-svg-sprite\x1b[0m -> \x1b[90m" + text + "\x1b[0m"
  )
}
function fatal(text: string) {
  throw new Error("vite-plugin-svg-sprite -> \x1b[90m" + text + "\x1b[0m")
}

function compileGroups(groups: SVGGroup[]): CompileResult {
  const symbols = []
  const ids: Record<string, string> = {}

  for (const group of groups) {
    for (const dir of group.dirs) {
      const svgs = fg.sync("**/*.svg", { cwd: dir })

      for (const svg of svgs) {
        const absPath = path.join(dir, svg)
        const trimedContent = fs.readFileSync(absPath, "utf8").trim()

        if (!checkSvgContent(trimedContent)) {
          warning(`${absPath} is not a valid SVG element`)
          continue
        }

        const id = genSymboldId(dir, svg, group.symbolId, group.dirSeparator)
        if (ids[id] != null) {
          warning(
            `symbold id '${id}' duplicated, check ${ids[id]} and ${absPath}`
          )
          continue
        }

        const symbol = svg2symbol(trimedContent, id)

        ids[id] = absPath
        symbols.push(symbol)
      }
    }
  }

  return { symbols, ids: Object.keys(ids) }
}

// svg should be a single svg element
// begin with `<svg`
// end with `</svg>`
function checkSvgContent(trimedContent: string): boolean {
  return trimedContent.startsWith("<svg ") && trimedContent.endsWith("</svg>")
}

// `rp` is path relative to root, e.g. a/b/c.svg
function genSymboldId(
  root: string,
  rp: string,
  config: SymbolIdConfig,
  dirSeparator?: string
): string {
  if (typeof config === "string") {
    const name = path.basename(rp, ".svg")
    const dir = rp
      .split("/")
      .slice(0, -1)
      .join(dirSeparator || "-")

    return config.replaceAll("[name]", name).replaceAll("[dir]", dir)
  }

  const absolutePath = path.join(root, rp)
  return config(absolutePath)
}

function svg2symbol(content: string, id: string): string {
  const prefixLength = "<svg ".length
  const suffixLength = "</svg>".length

  return (
    `<symbol id="${id}" ` +
    content.slice(prefixLength, -suffixLength) +
    "</symbol>"
  )
}
