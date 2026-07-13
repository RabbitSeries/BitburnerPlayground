import { type Plugin, context } from "esbuild"
import glob from "fast-glob"
import { startWebsocketServer } from "./ws/WebSocket.js"
// Copied from https://github.com/shyguy1412/esbuild-bitburner-plugin
const reactPlugin: Plugin = {
    name: "ReactPlugin",
    setup(build) {
        build.onResolve({ filter: /^react(-dom)?$/ }, (args) => {
            return {
                namespace: "react",
                path: args.path
            }
        })
        build.onLoad({ filter: /^react(-dom)?$/, namespace: "react" },
            (args) => {
                if (args.path == "react") {
                    return {
                        contents: "module.exports = React"
                    }
                } else {
                    return {
                        contents: "module.exports = ReactDOM"
                    }
                }
            })
    }
}

const ctx = await context({
    target: "esnext",
    entryPoints: glob.globSync(["./src/**/*"], {
        ignore: ["**/node_modules", "**/*.md", "**/*.svg"]
    }),
    // https://esbuild.github.io/content-types/#tsconfig-json
    tsconfig: "./tsconfig.game.json",
    platform: "browser",
    format: "esm",
    plugins: [reactPlugin],
    bundle: true,
    outbase: "./src",
    outdir: "dist/out",
    logLevel: "info",
    sourcemap: "inline",
    loader:{
        ".module.css": "local-css",
        ".css": "css"
    }
    // treeShaking: true // true if bundle or format is iife
})
await ctx.watch()
await ctx.rebuild()

/* ----------------------- RemoteAPI Interoperation -------------------- */
startWebsocketServer()
console.log("[server] Server started.")
