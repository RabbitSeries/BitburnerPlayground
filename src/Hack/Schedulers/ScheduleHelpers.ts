import type { NS } from "@ns"
import { ShareOn } from "../HackHelpers"
import { GrowMiner, HackMiner, MinerPaths, WeakenMiner } from "../Miners/Miners"
import { FreeRam } from "/utils/ServerStat"
export type Handler = (ns: NS, host: string) => void
export const HostHandlers: Record<"KillAllExceptHome" | "ShareExceptHome", Handler> = {
    KillAllExceptHome: (ns, host) => { if (host !== "home") ns.killall(host) },
    ShareExceptHome: (ns, host) => { if (host !== "home") ShareOn(ns, host) }
}
export type PidTask = { pid: number, host: string, awaiter: Promise<void> }
export type TaskQueue = PidTask[]
export async function watchDog(ns: NS, pid: number, guardTime: number) {
    const running = ns.getRunningScript(pid)
    if (running) {
        ns.print(`WARN: Woof!!! Script has ran ${ns.tFormat(running.onlineRunningTime * 1000, true)}`)
        ns.print(`Logs: ${running.logs}`)
        await new Promise((r) => setTimeout(r, guardTime))
        await watchDog(ns, pid, guardTime)
    }
}
export const AwaitTasks = async (ns: NS, taskq: TaskQueue) => {
    if (taskq.length === 0) {
        ns.tprint("Invalid target with current condition")
        await new Promise(r => setTimeout(r, 1000))
        return
    }
    while (taskq.length > 0) {
        const task = taskq.shift()!
        await task.awaiter
        await watchDog(ns, task.pid, 1000)
    }
}
export type TimeAligns = {
    aligned: number;
    aligns: {
        HackTime: number;
        weaken1Time: number;
        growTime: number;
        weaken2Time: number;
    };
}
export function HackAligns(ns: NS, target: string, additionalMillis: number) {
    const hackTime = ns.getHackTime(target), growTime = ns.getGrowTime(target), weakenTime = ns.getWeakenTime(target)
    const Max = Math.max(hackTime, growTime, weakenTime) + additionalMillis
    const aligns = {
        HackTime: Max - hackTime,
        weaken1Time: Max - weakenTime,
        growTime: Max - growTime,
        weaken2Time: Max - weakenTime
    }
    return {
        aligned: Max,
        aligns
    }
}
export function OffsetAligns(ns: NS, target: string, aligned: number, offset: number) {
    const { aligned: hackAligned, aligns } = HackAligns(ns, target, 0)
    const fixedAligned = aligned + offset
    offset += aligned - hackAligned
    return {
        aligned: fixedAligned,
        aligns: {
            HackTime: aligns.HackTime + offset,
            weaken1Time: aligns.weaken1Time + offset,
            growTime: aligns.growTime + offset,
            weaken2Time: aligns.weaken2Time + offset
        }
    }
}
export function ScheduleWeakenTask(ns: NS, servers: string[], target: string,
    preHandler: Handler = HostHandlers["KillAllExceptHome"],
    postHandler: Handler = HostHandlers["ShareExceptHome"]
): TaskQueue {
    let totalWeakened = 0
    const weakenUsage = ns.getScriptRam(MinerPaths.WeakenMiner.scriptPath), weakenTime = ns.getWeakenTime(target)
    const maxSecurity = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)
    const taskq: TaskQueue = []
    for (const host of servers) {
        preHandler(ns, host)
        if (totalWeakened >= maxSecurity) {
            postHandler(ns, host)
            continue
        }
        const cores = ns.getServer(host).cpuCores
        const threadBoost = Math.ceil(
            Math.min(Math.floor(FreeRam.bind(ns)(host) / weakenUsage),
                Math.max(maxSecurity - totalWeakened, 0) / ns.weakenAnalyze(1, cores)))
        if (threadBoost === 0) {
            continue
        }
        // |=weaken 1======================================|
        const pid = new WeakenMiner(ns, host, target, threadBoost, 0).run()
        totalWeakened += ns.weakenAnalyze(threadBoost, cores)
        postHandler(ns, host)
        if (pid !== 0) {
            taskq.push({ pid, host, awaiter: new Promise(r => setTimeout(r, weakenTime + 50)) })
        }
    }
    return taskq
}
export function ScheduleHackTask(ns: NS, servers: string[], target: string,
    preHandler: Handler = HostHandlers["KillAllExceptHome"],
    postHandler: Handler = HostHandlers["ShareExceptHome"]
): TaskQueue {
    let scheduled = 0
    const hackTime = ns.getHackTime(target), growTime = ns.getGrowTime(target), weakenTime = ns.getWeakenTime(target)
    const taskq: TaskQueue = []
    for (const host of servers) {
        preHandler(ns, host)
        let remainRam = FreeRam.bind(ns)(host), lastTaskPid = 0
        while (remainRam >= 0) {
            const threadBoost = FindMaxHGWThreads(ns, host, target, remainRam)
            if (threadBoost === null) break
            const { hThread, wThread1, gThread, wThread2, ram } = threadBoost
            remainRam -= ram
            //! Don't change the constants!!!!!!!!!!!
            //! Not worth it!!!!
            const lagBase = (scheduled++) * 200
            //                    |= hack ====================|
            // |=weaken 1======================================|
            //                |= grow ==========================|
            //   |=weaken 2======================================|
            const aligns = {
                HackTime: lagBase + weakenTime - 100 - hackTime,
                weaken1Time: lagBase,
                growTime: lagBase + weakenTime + 100 - growTime,
                weaken2Time: lagBase + 200
            }
            new HackMiner(ns, host, target, hThread, aligns.HackTime).run()
            new WeakenMiner(ns, host, target, wThread1, aligns.weaken1Time).run()
            new GrowMiner(ns, host, target, gThread, aligns.growTime).run()
            lastTaskPid = new WeakenMiner(ns, host, target, wThread2, aligns.weaken2Time).run()
        }
        postHandler(ns, host)
        if (lastTaskPid !== 0) {
            taskq.push({ pid: lastTaskPid, host, awaiter: new Promise(r => setTimeout(r, weakenTime + 50 + scheduled * 200)) })
        }
    }
    return taskq
}
export function ScheduleGrowTask(ns: NS, servers: string[], target: string,
    preHandler: Handler = HostHandlers["KillAllExceptHome"],
    postHandler: Handler = HostHandlers["ShareExceptHome"]
): TaskQueue {
    let scheduled = 0, totalGrowed = 1
    const growTime = ns.getGrowTime(target), weakenTime = ns.getWeakenTime(target), availableMoney = ns.getServerMoneyAvailable(target)
    const taskq: TaskQueue = []
    for (const host of servers) {
        preHandler(ns, host)
        let lastTaskPid = 0
        const threadBoost = FindWGThreads(ns, host, target, FreeRam.bind(ns)(host)),
            maxMoney = ns.getServerMaxMoney(target),
            cores = ns.getServer(host).cpuCores
        if (threadBoost === null || totalGrowed >= (maxMoney / availableMoney)) {
            postHandler(ns, host)
            continue
        }
        const { gThread, wThread } = threadBoost
        const lagBase = (scheduled++) * 100
        const aligns = {
            weakenTime: lagBase,
            growTime: lagBase + weakenTime - 100 - growTime,
        }
        new GrowMiner(ns, host, target, gThread, aligns.growTime).run()
        lastTaskPid = new WeakenMiner(ns, host, target, wThread, aligns.weakenTime).run()
        try {
            totalGrowed *= ns.formulas.hacking.growPercent(ns.getServer(target), gThread, ns.getPlayer())
        }
        catch {
            totalGrowed *= 1 + GrowthPercent(ns, gThread, cores, target)
        }
        postHandler(ns, host)
        if (lastTaskPid !== 0) {
            taskq.push({ pid: lastTaskPid, host, awaiter: new Promise((resolve) => setTimeout(resolve, weakenTime + scheduled * 100)) })
        }
    }
    return taskq
}
export function GrowthPercent(ns: NS, growThread: number, cores: number, target: string) {
    const avai = ns.getServerMoneyAvailable(target)
    if (avai === 0) {
        return 0
    }
    let l = 0, r = ns.getServerMaxMoney(target) / avai - 1
    let percent: number | undefined = undefined
    while (l <= r) {
        const mid = (l + r) / 2
        if (ns.growthAnalyze(target, 1 + mid, cores) <= growThread) {
            percent = mid
            l = mid + 0.00005
        } else {
            r = mid - 0.00005
        }
    }
    return percent ?? 0
}
export function Weaken1Thread(ns: NS, hackThread: number, cores: number) {
    return Math.ceil(ns.hackAnalyzeSecurity(hackThread) / ns.weakenAnalyze(1, cores))
}
export function Weaken2Thread(ns: NS, growThread: number, cores: number) {
    // cores are devided
    // and u should not provide target parameter to growthAnalyze if the hypotential status doesn't match,
    // the secutiry increased is always 0 at maxMoney
    // return Math.ceil(ns.growthAnalyzeSecurity(growThread, target, cores) / ns.weakenAnalyze(1, cores))
    return Math.ceil(ns.growthAnalyzeSecurity(growThread, undefined, cores) / ns.weakenAnalyze(1, cores))
}
export function GrowThread(ns: NS, hackThread: number, target: string, cores: number) {
    const hackPercent = ns.hackAnalyze(target) * hackThread
    return Math.ceil(ns.growthAnalyze(target, 1 / (1 - hackPercent), cores))
}
export type HackThreadBoost = { hThread: number, wThread1: number, gThread: number, wThread2: number, ram: number }
export function FindMaxHGWThreads(ns: NS, host: string, target: string, freeRam: number) {// Hack Weaken Grow Weaken
    const hackUsage = ns.getScriptRam(MinerPaths.HackMiner.scriptPath),
        weakenUsage = ns.getScriptRam(MinerPaths.WeakenMiner.scriptPath),
        growUsage = ns.getScriptRam(MinerPaths.GrowMiner.scriptPath),
        cores = ns.getServer(host).cpuCores
    let l = 1, r = Math.floor(Math.min(freeRam / hackUsage, 0.9999 / ns.hackAnalyze(target)))
    let optimal: HackThreadBoost | undefined = undefined
    // Binary search
    while (l <= r) {
        const hThread = Math.floor((l + r) / 2)
        const gThread = GrowThread(ns, hThread, target, cores), wThread1 = Weaken1Thread(ns, hThread, cores), wThread2 = Weaken2Thread(ns, gThread, cores)
        const ram = (wThread1 + wThread2) * weakenUsage + hackUsage * hThread + growUsage * gThread
        if (ram <= freeRam) {
            optimal = { hThread, wThread1, gThread, wThread2, ram }
            l = hThread + 1
        } else {
            r = hThread - 1
        }
    }
    return optimal ?? null
}
export function FindWGThreads(ns: NS, host: string, target: string, freeRam: number) { // Weaken Grow
    const weakenUsage = ns.getScriptRam(MinerPaths.WeakenMiner.scriptPath),
        growUsage = ns.getScriptRam(MinerPaths.GrowMiner.scriptPath),
        cores = ns.getServer(host).cpuCores
    const avai = ns.getServerMoneyAvailable(target), max = ns.getServerMaxMoney(target)
    if (max === 0) return null
    let l = 1, r = Math.min(Math.floor(freeRam / growUsage), Math.ceil(ns.growthAnalyze(target, max / (avai === 0 ? max : avai), cores)))
    let optimal: { gThread: number, wThread: number, ram: number } | undefined = undefined
    // Binary search
    while (l <= r) {
        const mid = Math.floor((l + r) / 2)
        const wThread = Weaken2Thread(ns, mid, cores)
        const ram = Weaken2Thread(ns, mid, cores) * weakenUsage + growUsage * mid
        if (ram <= freeRam) {
            optimal = { gThread: mid, wThread, ram }
            l = mid + 1
        } else {
            r = mid - 1
        }
    }
    return optimal ?? null
}
