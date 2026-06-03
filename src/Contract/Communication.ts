import type { CodingContractName, CodingContractSignatures } from "@ns"

export type MessageData = {
    contract: CodingContractName,
    data: CodingContractSignatures[CodingContractName][0],
    isBigInt?: boolean
}[]

export type ResultData = {
    result: CodingContractSignatures[CodingContractName][1] | null
    isBigInt?: boolean
}
