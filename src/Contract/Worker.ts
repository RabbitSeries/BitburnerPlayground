import type { CodingContractObject } from "@ns"
import type { MessageData, ResultData } from "./Communication"
import { ContractSolves, solveSync } from "./Solver"

if (globalThis.self) {
    self.onmessage = (msg) => {
        try {
            console.log(`Webworker received data: ${JSON.stringify(msg.data)}`)
            for (const target of msg.data as MessageData) {
                if (target.contract in ContractSolves) {
                    const result = solveSync({
                        type: target.contract,
                        data: target.isBigInt ? BigInt(target.data as string) : target.data
                    } as CodingContractObject)
                    const isBigInt = typeof result === "bigint"
                    self.postMessage({
                        result: isBigInt ? result.toString() : result,
                        isBigInt
                    } satisfies ResultData)
                }
                console.log(`Finished contract: ${target.contract}.`)
            }
        } catch (e) {
            console.log(e)
        }
    }
}
