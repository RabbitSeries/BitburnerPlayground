import type { NS } from "@ns"
import { cyanStr } from "/Console/ConsoleColor"
export async function main(ns: NS) {
    const target = ns.args[0].toString()
    const initialMoney = ns.getServerMaxMoney(target) * 0.8
    const securityThresh = ns.getServerMinSecurityLevel(target) * 1.2
    if (!ns.hasRootAccess(target)) {
        ns.print("ERROR: No root access to target")
        return
    }
    ns.print(`SUCCESS: Running targeting ${cyanStr(target)}:`)
    while (true) {
        const curSecurityLevel = ns.getServerSecurityLevel(target), curMoneyAvailable = ns.getServerMoneyAvailable(target)
        if (curMoneyAvailable === 0) {
            ns.print(`WARN: Target(${target}) is drained`)
        }
        ns.print(`INFO Targeting: ${target}`)
        ns.print(`INFO Current security level at: ${cyanStr(`${curSecurityLevel}/${securityThresh}`)}`)
        if (curSecurityLevel > securityThresh) {
            ns.print("INFO Weakening")
            await ns.weaken(target)
            ns.print("SUCCESS Weakened")
            ns.print(`SUCCESS Weakened targeting ${target}`)
        } else if (curMoneyAvailable < initialMoney) {
            ns.print("INFO Growing")
            await ns.grow(target)
            ns.print("SUCCESS Grew")
            ns.print(`SUCCESS Grew targeting ${target}`)
        } else {
            ns.print("INFO Hacking")
            await ns.hack(target)
            ns.print("SUCCESS Hacked")
            ns.print(`SUCCESS Hacked targeting ${target}`)
        }
    }
}
