import type { CodingContractName, CodingContractObject, NS } from "@ns"
import { ScanAllServers } from "/Hack/HackHelpers"
import { ContractSolves, solveSync } from "./Solver"
import type { MessageData, ResultData } from "./Communication"
import { ProgressBar, type PendingTask } from "../UI/Pallates/ProgressBar"
import React from "react"

type WorkerDetail = { worker: Worker, url: string, avai: boolean }
type Messenger = ((ev: MessageEvent) => void)
type TaskType = { messenger: Messenger, message: MessageData }

class WorkerPool {
    private workers: WorkerDetail[] = []
    private taskList: TaskType[] = []
    public setPoolSize(size: number, script: string) {
        if (this.workers.length) {
            this.disposeAll()
        }
        this.workers = Array.from({ length: size }).map(() => {
            const url = URL.createObjectURL(new Blob([script], {
                type: "text/javascript"
            }))
            const worker = new Worker(url)
            worker.onmessageerror = (err) => {
                console.log(`ERROR: message Error: ${JSON.stringify(err)}`)
            }
            worker.onerror = (err) => {
                console.log(`ERROR: Webworker Error: ${JSON.stringify(err)}`)
            }
            return {
                worker,
                url,
                avai: true
            }
        })
    }

    private disposeAll() {
        for (const { worker, url } of this.workers) {
            worker.terminate()
            URL.revokeObjectURL(url)
        }
        this.workers = []
        this.taskList = []
    }

    private consumeTask(w: WorkerDetail) {
        if (this.taskList.length) {
            this.arrangeTask(w, this.taskList.shift()!)
        } else {
            w.avai = true
        }
    }

    private arrangeTask(w: WorkerDetail, task: TaskType) {
        w.worker.onmessage = (ev) => {
            task.messenger(ev)
            this.consumeTask(w)
        }
        w.avai = false
        w.worker.postMessage(task.message)
    }

    public run(task: TaskType) {
        let arranged = false
        for (const detail of this.workers) {
            if (detail.avai) {
                this.arrangeTask(detail, task)
                arranged = true
                break
            }
        }
        if (!arranged) {
            this.taskList.push(task)
        }
    }

    [Symbol.dispose]() {
        this.disposeAll()
    }
}

async function solveAsync(contract: CodingContractObject, pool: WorkerPool) {
    return new Promise<ReturnType<typeof solveSync>>((resolve) => {
        const isBigInt = typeof contract.data === "bigint"
        const message: MessageData = [{
            contract: contract.type,
            data: isBigInt ? contract.data.toString() : contract.data,
            isBigInt
        }]
        pool.run({
            messenger: (msg) => {
                const data = msg.data as ResultData
                const isBigInt = data.isBigInt
                resolve(isBigInt ? BigInt(data.result as string) : data.result)
            },
            message
        })
    })
}

export async function main(ns: NS) {
    // Gloabl using seems not able to be auto disposed if executed in game
    const contractApi = ns.codingcontract
    const messageBuilder = (
        file: string,
        host: string,
        reason: string,
        result: ReturnType<typeof solveSync> | undefined
    ) => {
        const contract = contractApi.getContract(file, host)
        return [
            `Contract ${contract.type}(${file}) failed `,
            `on server ${host}:`,
            `Reason: ${reason}`,
            `Data: ${contract.data}`,
            `My guess: ${result}`
        ].join("\n")
    }
    using workerPool = new WorkerPool()
    const measureTime = async (fun: () => Promise<void>) => {
        const now = Date.now()
        await fun()
        ns.tprint("Total cost: ", ns.format.time(Date.now() - now, true))
    }
    const choices = ["Solve", "Test", "Tinkle"] as const
    const solveMode = await ns.prompt("Select a scanner mode",
        { type: "select", choices: [...choices] }) as (typeof choices)[number]
    const getContractName = async () => {
        return await ns.prompt("Select a contract", {
            type: "select",
            choices: ["ALL", ...Object.keys(ContractSolves)]
        }) as string
    }
    if (solveMode === "Solve") {
        const launchedTasks: PendingTask[] = []
        workerPool.setPoolSize(6, ns.read("Contract/Worker.js"))
        for (const host of ["home", ...ScanAllServers(ns).sorted]) {
            for (const file of ns.ls(host, ".cct")) {
                const contract = contractApi.getContract(file, host)
                launchedTasks.push({
                    waitMessage: `Attempting ${file} on server ${host}`,
                    task: solveAsync(contract, workerPool).then((result) => {
                        try {
                            if (!contractApi.attempt(result, file,
                                host).length) {
                                return {
                                    id: `${file}: ${host}`,
                                    reason: messageBuilder(
                                        file,
                                        host,
                                        `Failed with result ${result}`,
                                        result
                                    )
                                }
                            }
                        } catch (reason) {
                            return {
                                id: `${file}: ${host}`,
                                reason: messageBuilder(
                                    file,
                                    host,
                                    `Attempt exception: ${reason}`,
                                    result
                                )
                            }
                        }
                    }).catch((reason) => {
                        return {
                            id: `${file}:${host} `,
                            reason: messageBuilder(
                                file,
                                host,
                                `Webworker Exception: ${reason} `,
                                null
                            )
                        }
                    })
                })
            }
        }
        await new Promise<void>((resolve) => {
            ns.tprintRaw(<ProgressBar tasks={launchedTasks}
                resolve={resolve} />)
        })
    } else if (solveMode === "Test") {
        const total = await (ns.prompt("Round for each contract", {
            type: "text"
        }) as Promise<string>).then(it => parseInt(it))
        const contractName = await getContractName()
        if (!contractName.length) {
            ns.tprint("Canceled contract selection")
            return
        }
        const runInWebworker = await ns.prompt("Opt to run in webworker" +
			" (skip failFast if true)", { type: "boolean" }) as boolean
        let pool: WorkerPool | undefined = undefined, failFast = true
        if (runInWebworker) {
            pool = workerPool
            workerPool.setPoolSize(6, ns.read("Contract/Worker.js"))
        } else {
            failFast = await ns.prompt("Terminate on the first failure?", {
                type: "boolean"
            }) as boolean
        }
        await measureTime(async () => {
            if (contractName === "ALL") {
                const taskList = Object.keys(ContractSolves).map(name => {
                    return {
                        name,
                        task: runTests(
                            ns,
                            name as CodingContractName,
                            total,
                            failFast,
                            pool
                        )
                    }
                })
                for (const { name, task } of taskList) {
                    ns.tprint(`${name}: ${await task}/${total}`)
                }
            } else if (contractName in ContractSolves) {
                ns.tprint(`${contractName}: ${await runTests(
                    ns,
                    contractName as CodingContractName,
                    total,
                    failFast,
                    pool)}/${total}`)
            }
        })
    } else if (solveMode === "Tinkle") {
        const contractName = await getContractName()
        const filename = contractApi
            .createDummyContract(contractName as CodingContractName)
        if (filename) {
            await ns.prompt(filename + "\n" +
				contractApi.getContract(filename).description)
            ns.rm(filename)
        } else {
            ns.tprint("Failed to create coding contract.")
        }
    } else {
        ns.tprint("Unrecognized options")
    }
}

async function runTests(
    ns: NS,
    contractName: CodingContractName,
    round: number,
    failFast: boolean,
    pool?: WorkerPool
) {
    let count = 0
    const contractApi = ns.codingcontract
    const tasks: Promise<void>[] = []
    const addupCount = (result: ReturnType<typeof solveSync>,
        filename: string,
        contract: CodingContractObject) => {
        if (result === null || contractApi.attempt(result,
            filename).length === 0) {
            ns.tprint("Failed on: ", contract.data)
            ns.tprint("My guess: ", result)
        } else {
            count++
        }
    }
    const cleanup = (filename: string) => {
        // cleanup contracts
        if (ns.fileExists(filename)) {
            ns.rm(filename)
        }
    }
    for (let i = 0; i < round; i++) {
        const filename = contractApi.createDummyContract(contractName)
        if (!filename) {
            break
        }
        try {
            const contract = contractApi.getContract(filename)
            if (pool) {
                tasks.push(solveAsync(contract, pool).then(result => {
                    addupCount(result, filename, contract)
                    cleanup(filename)
                }))
            } else {
                addupCount(solveSync(contract), filename, contract)
            }
        } catch (e) {
            ns.tprint(`ERROR: runtime error in runtTests: ${e}`)
            if (failFast) {
                break
            }
            cleanup(filename)
        }
    }
    if (pool) {
        for (const t of tasks) {
            await t
        }
    }
    return count
}
