import type { NS } from "@ns";

export async function main(ns: NS) {
    const w = new Worker("Contract/Scanner.js", { type: "module" })
    w.onerror = err => ns.tprint(err.message)
}
