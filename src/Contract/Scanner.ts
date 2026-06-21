import type { CodingContractName, CodingContractObject, NS } from "@ns"
import { ScanAllServers } from "/Hack/HackHelpers"
import { ContractSolves, solveSync } from "./Solver"
import type { MessageData, ResultData } from "./Communication"

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
			const url = URL.createObjectURL(new Blob([script], { type: "text/javascript" }))
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

function attemptResult(result: ReturnType<typeof solveSync>, ns: NS, host: string, filename: string) {
	const contract = ns.codingcontract.getContract(filename, host)
	if (result != null) {
		const msg = ns.codingcontract.attempt(result, filename, host)
		ns.tprint(`Contract ${contract.type} ran on server ${host}:  ${msg.length ? msg : `Failed with result ${result}`}`)
	} else {
		ns.tprint(`Result is null, this contract's solution is not achieved yet: ${contract.type}`)
	}
}

export async function main(ns: NS) {
	// Gloabl using seems not able to be auto disposed if executed in game
	using workerPool = new WorkerPool()
	const measureTime = async (fun: () => Promise<void>) => {
		const now = Date.now()
		await fun()
		ns.tprint("Total cost: ", ns.format.time(Date.now() - now, true))
	}
	const choices = ["Solve", "Test", "Tinkle"] as const
	const solveMode = await ns.prompt("Select a scanner mode", { type: "select", choices: [...choices] }) as (typeof choices)[number]
	const getContractName = async () => {
		return await ns.prompt("Select a contract", { type: "select", choices: ["ALL", ...Object.keys(ContractSolves)] }) as string
	}
	if (solveMode === "Solve") {
		workerPool.setPoolSize(6, ns.read("Contract/Worker.js"))
		await measureTime(async () => {
			for (const host of ["home", ...ScanAllServers(ns).sorted]) {
				for (const file of ns.ls(host, ".cct")) {
					ns.tprint("Attempting " + file + " on server " + host)
					const contract = ns.codingcontract.getContract(file, host)
					const result = await solveAsync(contract, workerPool)
					attemptResult(result, ns, host, file)
				}
			}
		})
	} else if (solveMode === "Test") {
		const total = await (ns.prompt("Round for each contract", { type: "text" }) as Promise<string>).then(it => parseInt(it))
		const contractName = await getContractName()
		if (!contractName.length) {
			ns.tprint("Canceled contract selection")
			return
		}
		const runInWebworker = await ns.prompt("Opt to run in webworker", { type: "boolean" }) as boolean
		let pool: WorkerPool | undefined = undefined
		if (runInWebworker) {
			pool = workerPool
			workerPool.setPoolSize(4, ns.read("Contract/Worker.js"))
		}
		await measureTime(async () => {
			if (contractName === "ALL") {
				for (const name of Object.keys(ContractSolves)) {
					ns.tprint(`${name}: ${await runTests(ns, name as CodingContractName, total, pool)}/${total}`)
				}
			} else if (contractName in ContractSolves) {
				ns.tprint(`${contractName}: ${await runTests(ns, contractName as CodingContractName, total, pool)}/${total}`)
			}
		})
	} else if (solveMode === "Tinkle") {
		const contractName = await getContractName()
		const filename = ns.codingcontract.createDummyContract(contractName as CodingContractName)
		if (filename) {
			await ns.prompt(filename + "\n" + ns.codingcontract.getContract(filename).description)
			const result = solveSync(ns.codingcontract.getContract(filename))
			attemptResult(result, ns, "home", filename)
			ns.rm(filename)
		} else {
			ns.tprint("Failed to create coding contract.")
		}

	} else {
		ns.tprint("Unrecognized options")
	}
}

async function runTests(ns: NS, contractName: CodingContractName, round: number, pool?: WorkerPool) {
	let count = 0
	const contractApi = ns.codingcontract
	for (let i = 0; i < round; i++) {
		const filename = contractApi.createDummyContract(contractName)
		if (!filename) {
			break
		}
		try {
			const contract = contractApi.getContract(filename, "home")
			const result = pool ? await solveAsync(contract, pool) : solveSync(contract)
			if (result === null || contractApi.attempt(result, filename, "home").length === 0) {
				ns.tprint("Failed on: ", contract.data)
				ns.tprint("My guess: ", result)
				break
			} else {
				count++
			}
		} catch (e) {
			ns.tprint(`ERROR: runtime error in runtTests: ${e}`)
		}
		// cleanup contracts
		if (ns.fileExists(filename)) {
			ns.rm(filename)
		}
	}
	return count
}
