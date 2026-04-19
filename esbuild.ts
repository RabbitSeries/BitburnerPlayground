// https://nodejs.org/docs/latest/api/packages.html#package-entry-points
// The file does not have a .cjs extension, and the nearest parent package.json file contains a top-level "type" field with a value of "module".
// https://nodejs.org/docs/latest/api/packages.html#module-resolution-and-loading
// Actually this file is so simple that it can be executed by node directly in node 24+
// node esbuild.ts --input-type=module
import { type Plugin, context } from "esbuild"
import glob from "fast-glob"
// import { startServer } from "./ws/WebSocket.js"
import { readFile } from "fs/promises"
import path from "path"
import { startWebsocketServer } from "./ws/WebSocket.js"
// Copied from https://github.com/shyguy1412/esbuild-bitburner-plugin
// Fool esbuild that there is a react dependencies provide the default 
const reactPlugin: Plugin = {
    name: "ReactPlugin",
    setup(build) {
        build.onResolve({ filter: /^react(-dom)?$/ }, (args) => {
            return {
                namespace: 'react',
                path: args.path,
            }
        })
        build.onLoad({ filter: /^react(-dom)?$/, namespace: 'react' }, (args) => {
            if (args.path == 'react') {
                return {
                    contents: 'module.exports = React',
                }
            } else {
                return {
                    contents: 'module.exports = ReactDOM',
                }
            }
        },
        )
    }
}

const fixTypeOnlyImportsPlugin: Plugin = {
    name: 'fix-type-only-imports',
    setup(build) {
        build.onLoad({ filter: /\.ts[x]?$/ }, async (args) => {
            const contents = await readFile(args.path, 'utf8');
            const fixed = contents.replace(
                /import\s*\{(?:\s*type\s+[\w\s,]+)+\s*\}\s*from\s*['"](?:.+?)['"]/g,
                '// $&'
            );
            return { contents: fixed, loader: path.extname(args.path).endsWith("x") ? "tsx" : "ts" };
        });
    }
}

const ctx = await context({
    target: "esnext",
    entryPoints: glob.globSync(
        ["./src/**/*"],
        {
            ignore: ["**/node_modules", "**/*.md"]
        }
    ),
    tsconfig: "./tsconfig.game.json", // https://esbuild.github.io/content-types/#tsconfig-json
    platform: "browser",
    format: "esm",
    plugins: [reactPlugin, fixTypeOnlyImportsPlugin],
    bundle: true,
    outbase: "./src",
    outdir: "dist/out",
    logLevel: "info",
    sourcemap: "inline",
    // treeShaking: true // true if bundle or format is iife
})
await ctx.watch()
await ctx.rebuild()
console.log("First build finished.")

/* ----------------------- RemoteAPI Interoperation -------------------- */
await startWebsocketServer()
console.log("Server started.")
