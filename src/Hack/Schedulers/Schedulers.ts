import type { NS, RunOptions } from "@ns"
import type { IMiner, IMinerArgs } from "../Miners/IMiner"
import { ScanAllServers, TryHacking } from "../HackHelpers"
import { type TaskQueue, ScheduleWeakenTask, ScheduleHackTask, ScheduleGrowTask, type Handler, HostHandlers, AwaitTasks } from "./ScheduleHelpers"
import { StopToken } from "/Ui/OS/Process"

const prefix = "Hack/Scripts/"
export const Schedulers = {
    FullScheduler: {
        scriptPath: prefix + "FullScheduler.js"
    }
}

export class FullScheduler implements IMiner {
    scriptPath = Schedulers.FullScheduler.scriptPath
    constructor(ns: NS, targetName: string, servers?: string[]) {
        this.args = { hostName: "home", targetName }
        this.ns = ns
        this.threadOptions = 1
        this.servers = servers
    }
    args: IMinerArgs
    ns: NS
    servers?: string[]
    threadOptions: number | RunOptions
    run = () => TryHacking(this.ns, this, this.args.targetName, ...(this.servers ?? []))
    /**
     * Attach this scheduler to current running script, so that no additional RAM is required.
     * @param servers selective servers to run HWG miners on, if not provided, this process will scan available servers at the beginning of each cycle.
     * @param preHandler handler to clean resources or logging at the begging of scheduling for each server.
     * @param postHandler handler to clean resources or logging at the end of shceduling for each server.
     * @returns async process. //TODO Make this possible to continuous arrange tasks, while(!q.empty()){const {host, freedPid} = q.shift(); arrange more on this host, append to queue }
     */
    static async attach(ns: NS, target: string, servers?: string[],
        preHandler: Handler = HostHandlers["KillAllExceptHome"],
        postHandler: Handler = HostHandlers["ShareExceptHome"],
        stop_token: StopToken = new StopToken()
    ) {
        const maxMoney = ns.getServerMaxMoney(target)
        if (maxMoney === 0) {
            ns.print("Zero maxmoney, exit")
            return
        }
        const scan = servers === undefined
        while (!stop_token.is_stop_requested()) {
            if (scan) servers = ScanAllServers(ns).sorted.filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0)
            // const hackCondition = true,
            const hackCondition = ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target) >= 0.95,
                weakenCondition = ns.getServerMinSecurityLevel(target) / ns.getServerSecurityLevel(target) <= 0.95
            const taskq: TaskQueue = []
            if (weakenCondition) {
                taskq.push(...ScheduleWeakenTask(ns, servers!, target, preHandler, postHandler))
            } else if (hackCondition) {
                taskq.push(...ScheduleHackTask(ns, servers!, target, preHandler, postHandler))
            } else {
                taskq.push(...ScheduleGrowTask(ns, servers!, target, preHandler, postHandler))
            }
            ns.print("Done distributing")
            await AwaitTasks(ns, taskq)
            // ns.clearLog()
            // TODO Add better logging
            // ns.printRaw(<CountDown timer={taskDuration}>Host: {host} Target: {target}</CountDown>)
            ns.print("Task queue is empty, continue to next round")
            if (hackCondition) {
                // My computer sucks, these cat't be logged in 100ms
                // ns.print(JSON.stringify(threadBoost), ` ${i} `, " ", host, " Waited ", ns.tFormat(Date.now() - begin), " Hypotential wait time ", ns.tFormat(waken2Finish))
                ns.print(`Server ${target} money: `, ns.formatPercent(ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)))
                ns.print(`Server ${target} sercuritylevel increased: `, ns.formatNumber(ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target), 2))
            }
            // break
        }
        ns.print("SUCCESS: Attached session cleaned")
    }
}
