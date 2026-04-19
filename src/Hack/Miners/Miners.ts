
import type { NS, RunOptions } from "@ns"
import type { IMiner, IMinerArgs } from "./IMiner"
import * as HackHelpers from "/Hack/HackHelpers"
import { HackTask } from "../HackHelpers"
import { FreeRam } from "/utils/ServerStat"
const prefix = "Hack/Scripts/"
export const MinerPaths: MinerPathSignatures = {
    RegularMiner: {
        scriptPath: prefix + 'RegularMiner.js'
    },
    SingleTaskMiner: {
        scriptPath: prefix + 'SingleTaskMiner.js'
    },
    HackMiner: {
        scriptPath: prefix + 'HackMiner.js',
    },
    GrowMiner: {
        scriptPath: prefix + 'GrowMiner.js',
    },
    WeakenMiner: {
        scriptPath: prefix + 'WeakenMiner.js',
    },
    MemSharer: {
        scriptPath: prefix + "MemSharer.js"
    }
}
type MinerNames = "RegularMiner" | "SingleTaskMiner" | "HackMiner" | "GrowMiner" | "WeakenMiner" | "MemSharer"
export type MinerPathSignatures = {
    [T in MinerNames]: { scriptPath: string }
}

export class RegularMiner implements IMiner {
    ns: NS
    args: IMinerArgs
    scriptPath = MinerPaths.RegularMiner.scriptPath
    threadOptions: number | RunOptions
    constructor(ns: NS, Args: IMinerArgs) {
        this.args = Args
        this.ns = ns
        this.threadOptions = this.args.threadOptions ?? Math.floor(FreeRam.bind(ns)(this.args.hostName) / ns.getScriptRam(this.scriptPath))
    }
    run = () => HackHelpers.TryHacking(this.ns, this, this.args.targetName)
}

export interface SingleTaskMinerArgs extends IMinerArgs {
    task: HackTask
}

export class SingleTaskMiner implements IMiner {
    ns: NS
    args: IMinerArgs
    task: HackTask
    scriptPath = MinerPaths.SingleTaskMiner.scriptPath
    threadOptions: number | RunOptions
    constructor(ns: NS, Args: SingleTaskMinerArgs) {
        this.args = Args
        this.ns = ns
        this.task = Args.task
        this.threadOptions = this.args.threadOptions ?? Math.floor(FreeRam.bind(ns)(this.args.hostName) / ns.getScriptRam(this.scriptPath))
    }
    run = () => HackHelpers.TryHacking(this.ns, this, this.args.targetName, this.task)
}
export class HackMiner implements IMiner {
    args: IMinerArgs
    ns: NS
    scriptPath = MinerPaths.HackMiner.scriptPath
    threadOptions: number
    additionalMsec: number
    constructor(ns: NS, hostName: string, targetName: string, threadOptions: number, additionalMsec: number) {
        this.args = { hostName, targetName }
        this.ns = ns
        this.threadOptions = threadOptions
        this.additionalMsec = additionalMsec
    }
    run = () => HackHelpers.TryHacking(this.ns, this, this.args.targetName, this.additionalMsec)
}
export class WeakenMiner extends HackMiner {
    scriptPath = MinerPaths.WeakenMiner.scriptPath
}
export class GrowMiner extends HackMiner {
    scriptPath = MinerPaths.GrowMiner.scriptPath
}
export class MemSharer implements IMiner {
    scriptPath: string = MinerPaths.MemSharer.scriptPath
    constructor(ns: NS, hostName: string, threadOptions: number) {
        this.args = { hostName, targetName: hostName }
        this.ns = ns
        this.threadOptions = threadOptions
    }
    args: IMinerArgs
    ns: NS
    threadOptions: number | RunOptions
    run = () => HackHelpers.TryHacking(this.ns, this)
}
