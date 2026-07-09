import type { NS } from "@ns"
import type { IMiner, IMinerArgs } from "./IMiner"
import * as HackHelpers from "/Hack/HackHelpers"

type ScriptNames = ["HackMiner", "GrowMiner", "WeakenMiner", "MemSharer"]

export type ScriptPathSignatures = {
    [T in (ScriptNames)[number]]: { scriptPath: string }
}

function pathTo(scriptName: string) {
    return `Hack/Scripts/${scriptName}`
}

export const MinerPaths: ScriptPathSignatures = {
    HackMiner: {
        scriptPath: pathTo("HackMiner.js")
    },
    GrowMiner: {
        scriptPath: pathTo("GrowMiner.js")
    },
    WeakenMiner: {
        scriptPath: pathTo("WeakenMiner.js")
    },
    MemSharer: {
        scriptPath: pathTo("MemSharer.js")
    }
}

export class HackMiner implements IMiner {
    scriptPath = MinerPaths.HackMiner.scriptPath
    constructor(
        public ns: NS,
        public args: IMinerArgs,
        private additionalMsec: number
    ) { }
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
    constructor(public ns: NS, hostName: string, threadOption: number) {
        this.args = { hostName, targetName: hostName, threadOption }
    }
    args: IMinerArgs
    run = () => HackHelpers.TryHacking(this.ns, this)
}
