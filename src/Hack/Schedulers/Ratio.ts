import type { NS } from "@ns";
import { FreeRam } from "/utils/ServerStat";
import {
    GrowMiner, HackMiner, MinerPaths, WeakenMiner

} from "../Miners/Miners";
import { ScanAllServers } from "../HackHelpers";
import type { IMinerArgs } from "../Miners/IMiner";

/**
 *
 * @param ns NS api
 * @param threads hack, weaken1, grow, weaken2
 */
function allocateOnServer(ns: NS, threads: [number, number, number, number],
    server: string) {
    // suppose total
    // h*total*ram1 + w1*total* < totalRam
    const ram = FreeRam.bind(ns)(server)
    const ramUsage = [
        ns.getScriptRam(MinerPaths.HackMiner.scriptPath),
        ns.getScriptRam(MinerPaths.WeakenMiner.scriptPath),
        ns.getScriptRam(MinerPaths.GrowMiner.scriptPath),
        ns.getScriptRam(MinerPaths.WeakenMiner.scriptPath)
    ]
    const total = ram / ramUsage.map((v, i) => v * threads[i]).reduce((a, b) =>
        a + b, 0)
    return threads.map(percent => Math.floor(total * percent))
}

export function Ratio(ns: NS, threads: [number, number, number, number],
    targetName: string) {
    const total = threads.reduce((a,b) => a+b)
    threads = threads.map(a=>a/total) as typeof threads
    for (const hostName of ScanAllServers(ns).sorted) {
        if (ns.hasRootAccess(hostName)) {
            const allocation = allocateOnServer(ns, threads, hostName)
            let allArgPositive = true
            const argsList: IMinerArgs[] = allocation.map(alloc => {
                if (!alloc) {
                    allArgPositive = false
                }
                return { hostName, targetName, threadOption: alloc }
            })
            if (allArgPositive) {
                new HackMiner(ns, argsList[0], 0).run()
                new WeakenMiner(ns, argsList[1], 0).run()
                new GrowMiner(ns, argsList[2], 0).run()
                new WeakenMiner(ns, argsList[3], 0).run()
            }
        }
    }
}
