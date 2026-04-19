import type { NS } from "@ns"
import { cyanStr } from "/Console/ConsoleColor"
import { HackTask } from "../HackHelpers"
export async function main(ns: NS) {
    const target = ns.args[0].toString(), task = ns.args[1]
    if (!ns.hasRootAccess(target)) {
        ns.print(`ERROR: No root access to target ${target}`)
        return
    }
    ns.print(`SUCCESS: Running targeting ${cyanStr(target)} with task ${task} `)
    while (true) {
        const curMoneyAvailable = ns.getServerMoneyAvailable(target)
        if (curMoneyAvailable === 0) {
            ns.print(`WARN: Target(${target}) is drained`)
        }
        ns.print(`INFO Targeting: ${target} `)
        if (task === HackTask.Hack) {
            ns.print("INFO Hacking")
            await ns.hack(target)
            ns.print("SUCCESS Hacked")
            ns.print(`SUCCESS Hacked targeting ${target} `)
        } else if (task === HackTask.Weaken) {
            ns.print("INFO Weakening")
            await ns.weaken(target)
            ns.print("SUCCESS Weakened")
            ns.print(`SUCCESS Weakened targeting ${target} `)
        } else if (task === HackTask.Grow) {
            ns.print("INFO Growing")
            await ns.grow(target)
            ns.print("SUCCESS Grew")
            ns.print(`SUCCESS Grew targeting ${target} `)
        } else {
            ns.print(`ERROR: Runtime error SglMiner is not able to fectch a task, passed task is ${task} `)
        }
    }
}
