import {build} from "esbuild"
import {cpSync, mkdirSync, rmSync} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const demoDir = join(root, "demo")

// The `tokenfield` package ships an ESM entry (lib/tokenfield.js) that imports
// the Node built-in `events`, which is not available in browsers. Bundle the
// ESM source and polyfill `events` with the browser-compatible `events` package
// instead of relying on tokenfield's pre-bundled web build (whose UMD export
// does not interop cleanly with esbuild).
const tokenfieldBrowserPlugin = {
    name: "tokenfield-browser",
    setup(build) {
        build.onResolve({filter: /^tokenfield$/}, () => ({
            path: join(root, "node_modules", "tokenfield", "lib", "tokenfield.js")
        }))
        build.onResolve({filter: /^events$/}, () => ({
            path: join(root, "node_modules", "events", "events.js")
        }))
    }
}

async function bundleDemo() {
    // Main demo entry. The bibliography importer spawns a web worker via
    // `new Worker(new URL("./workers/bibliography_import_worker.js", import.meta.url))`.
    // esbuild leaves that URL intact, so we emit the bundled worker to the
    // matching path below.
    await build({
        entryPoints: [join(demoDir, "main.ts")],
        bundle: true,
        format: "esm",
        platform: "browser",
        target: ["es2022"],
        outfile: join(demoDir, "bundle.js"),
        sourcemap: true,
        logLevel: "info",
        plugins: [tokenfieldBrowserPlugin],
        loader: {".json": "json"}
    })

    // Bundle the import worker as a self-contained classic worker.
    await build({
        entryPoints: [
            {
                in: join(root, "src", "import", "workers", "bibliography_import_worker.ts"),
                out: "bibliography_import_worker"
            }
        ],
        bundle: true,
        format: "iife",
        platform: "browser",
        target: ["es2022"],
        outdir: join(demoDir, "workers"),
        sourcemap: true,
        logLevel: "info"
    })
}

function copyCSS() {
    const cssDir = join(demoDir, "css")
    rmSync(cssDir, {recursive: true, force: true})
    mkdirSync(cssDir, {recursive: true})

    cpSync(join(root, "css", "colors.css"), join(cssDir, "colors.css"))
    cpSync(join(root, "css", "forms.css"), join(cssDir, "forms.css"))
    cpSync(join(root, "css", "bibliography.css"), join(cssDir, "bibliography.css"))
    cpSync(
        join(root, "node_modules", "fwtoolkit", "css", "fwtoolkit.css"),
        join(cssDir, "fwtoolkit.css")
    )
    cpSync(
        join(root, "node_modules", "prosemirror-view", "style", "prosemirror.css"),
        join(cssDir, "prosemirror.css")
    )
    cpSync(join(root, "logo.svg"), join(demoDir, "logo.svg"))
}

await bundleDemo()
copyCSS()

console.log("Demo built to demo/bundle.js and demo/css/.")
