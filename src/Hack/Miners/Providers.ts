import type { NS } from "@ns"
import { SingleTaskMiner, RegularMiner } from "./Miners"
import type { HackTask } from "../HackHelpers"
import type { IMiner, IMinerArgs } from "./IMiner"
export interface MinerProvider {
    next: ((args: IMinerArgs) => IMiner | null) | IMiner | null
}
export function isFunctionProvider(provider: ((args: IMinerArgs) => IMiner | null) | IMiner | null): provider is (args: IMinerArgs) => IMiner | null {
    return typeof provider === 'function'
}
export class CycleProvider implements MinerProvider {
    distributed = 0
    taskList: HackTask[]
    constructor(ns: NS, tasks: HackTask[]) {
        this.taskList = tasks
        this.next = (args) => new SingleTaskMiner(ns, {
            hostName: args.hostName,
            targetName: args.targetName,
            task: this.taskList[(this.distributed++) % tasks.length]
        })
    }
    next: ((args: IMinerArgs) => IMiner | null) | IMiner | null
}
export class SProvider implements MinerProvider {
    constructor(ns: NS, task: HackTask) {
        this.next = (args) => new SingleTaskMiner(ns, {
            hostName: args.hostName,
            targetName: args.targetName,
            task
        })
    }
    next: ((args: IMinerArgs) => IMiner | null) | IMiner | null
}
export class RProvider implements MinerProvider {
    constructor(ns: NS) {
        this.next = (args) => new RegularMiner(ns, args)
    }
    next: ((args: IMinerArgs) => IMiner | null) | IMiner | null
}