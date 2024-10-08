import type { Plugin } from "vite"
import { normalizePath } from "vite"
import fg from "fast-glob"
import fs from "fs"
import path from "path"
import * as cheerio from "cheerio"

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

const REGISTER_ID = "virtual:svg-sprite"
const NAMES_ID = "virtual:svg-sprite/names"

// vite plugin doc: https://vitejs.dev/guide/api-plugin.html
export default (opt: PluginOption): Plugin => {
  let isBuild = false

  return {
    name: "vite-plugin-svg-sprite",

    configResolved(config) {
      isBuild = config.isProduction || config.command === "build"
    },

    resolveId(id) {
      if (id === REGISTER_ID || id === NAMES_ID) {
        return "\0" + id
      }

      return null
    },

    load(id) {
      id = id.slice(1)

      if (![REGISTER_ID, NAMES_ID].includes(id)) return

      if(!isBuild) return ""

      const { registerCode, namesCode } = genModuleCode(opt.groups)

      if (id === REGISTER_ID) {
        return registerCode
      }

      if (id === NAMES_ID) {
        return namesCode
      }
    },

    // for dev
    configureServer({ middlewares }) {
      middlewares.use(async (req, res, next) => {
        const url = normalizePath((req as any).url)

        const targetURLs = {
          register: `/@id/__x00__${REGISTER_ID}`,
          names: `/@id/__x00__${NAMES_ID}`,
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

  // NOTE(cj): can't set SVG element to `display:none`
  // This will make `defs` inside SVG not work
  const registerCode = `
    function loadSvg() {
      const body = document.body

      let svgDom = document.getElementById('${SVG_DOM_ID}')
      if(svgDom == null) {
        svgDom = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svgDom.style.position = "absolute"
        svgDom.style.width = "0"
        svgDom.style.height = "0"
        svgDom.id = '${SVG_DOM_ID}'
      }

      svgDom.innerHTML = ${JSON.stringify(symbols.join("\n"))}
      body.insertBefore(svgDom, body.firstChild)
    }

    loadSvg()
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
// function fatal(text: string) {
//   throw new Error("vite-plugin-svg-sprite -> \x1b[90m" + text + "\x1b[0m")
// }

function compileGroups(groups: SVGGroup[]): CompileResult {
  const symbols = []
  const ids: Record<string, string> = {}

  for (const group of groups) {
    for (const dir of group.dirs) {
      const svgs = fg.sync("**/*.svg", { cwd: dir })

      for (const svg of svgs) {
        const absPath = path.join(dir, svg)
        const content = fs.readFileSync(absPath, "utf8")

        const id = genSymboldId(dir, svg, group.symbolId, group.dirSeparator)
        if (ids[id] != null) {
          warning(
            `symbold id '${id}' duplicated, check ${ids[id]} and ${absPath}`
          )
          continue
        }

        const { symbol, err } = svg2symbol(content, id)
        if (err !== "") {
          warning(`${absPath} is not a valid SVG element: ${err}`)
        }

        // invalid svg
        if (symbol === "") continue

        ids[id] = absPath
        symbols.push(symbol)
      }
    }
  }

  return { symbols, ids: Object.keys(ids) }
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

// need to transform ids inside content
function svg2symbol(
  content: string,
  id: string
): { symbol: string; err: string } {
  const $ = cheerio.load(content)
  const $root = $("svg")

  // replace svg id
  $root.attr("id", id)

  // modify internal defined ids
  const idMap: Record<string, string> = {}

  $root.find("[id]").each((_i, elem) => {
    const oldId = $(elem).attr("id")
    const newId = `${id}_${oldId}`
    idMap[oldId!] = newId
    $(elem).attr("id", newId)
  })

  // modify internal `fill` which used ids
  for (const elem of $root.find("[fill]")) {
    const fill = $(elem).attr("fill")!.trim()
    const regex = /^url\s*\(#(.+)\)$/
    const res = regex.exec(fill)

    if (res != null) {
      const id = res[1]

      // NOTE(cj): `id` should exist in idMap
      if (idMap[id] == null) {
        return { symbol: "", err: `fill attr ${fill} uses external id` }
      }

      $(elem).attr("fill", `url(#${idMap[id]})`)
    }
  }

  $root.get(0)!.tagName = "symbol"

  return { symbol: $root.toString()!, err: "" }
}
