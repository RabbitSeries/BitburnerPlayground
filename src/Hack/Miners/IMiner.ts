import type { NS } from "@ns"
export interface IMinerArgs {
    hostName: string
    targetName: string
    threadOption: number
}

export interface IMiner {
    ns: NS
    args: IMinerArgs
    scriptPath: string
    run: () => number
}
