import type { NS } from "@ns"
export async function main(ns: NS) {
    const target = ns.args[0].toString()
    await ns.weaken(target, { additionalMsec: +ns.args[1] })
}
