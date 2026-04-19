import type { NS } from "@ns"
import { FullScheduler } from "../Schedulers/Schedulers"
export async function main(ns: NS) {
    ns.disableLog("ALL")
    const target = ns.args[0].toString()
    const servers = [...ns.args.slice(1)].map(s => s.toString())
    await FullScheduler.attach(ns, target, ns.args.length > 1 ? servers : undefined)
}
