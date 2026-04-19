import type { NS, RunOptions } from "@ns"
export interface IMinerArgs {
    hostName: string,
    targetName: string,
    threadOptions?: number | RunOptions
}

export interface IMiner {
    args: IMinerArgs
    ns: NS
    scriptPath: string
    threadOptions: number | RunOptions
    run: () => number
}
