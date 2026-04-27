import type { NS } from "@ns"
import { StopToken } from "../../UI/OS/Process"
import {
	AwaitTasks,
	FindMaxHGWThreads,
	HackAligns,
	HostHandlers,
	OffsetAligns,
	ScheduleGrowTask,
	ScheduleWeakenTask,
	type HackThreadBoost
} from "./ScheduleHelpers"
import { ScanAllServers } from "../HackHelpers"
import { FreeRam } from "/utils/ServerStat"
import { GrowMiner, HackMiner, WeakenMiner } from "../Miners/Miners"
export function HackCondition(ns: NS, target: string) {
	return ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target) >= 0.95
}
export function WeakenCondition(ns: NS, target: string) {
	return ns.getServerMinSecurityLevel(target) / ns.getServerSecurityLevel(target) <= 0.95
}
export function NewServerCondition(ns: NS, ram: number) {
	return ns.getServerMoneyAvailable("home") >= ns.getPurchasedServerCost(ram)
}
type PipelineHost = { host: string; threadBoost: HackThreadBoost; count: number; launched: number }
type PipelineTask = { pid: number; pipeLineId: number; logicBegin: number; aligned: number }
export async function Pipeline(
	ns: NS,
	target: string,
	preHandler = HostHandlers["KillAllExceptHome"],
	stop_token = new StopToken()
) {
	ns.print("Begin Pipeline Scheduler")
	while (!stop_token.is_stop_requested()) {
		const servers = ScanAllServers(ns).sorted.filter((host) => ns.hasRootAccess(host))
		const hackCondition = HackCondition(ns, target),
			weakenCondition = WeakenCondition(ns, target)
		if (weakenCondition) {
			ns.print("Pipeline Scheduler: Weakening")
			await AwaitTasks(
				ns,
				ScheduleWeakenTask(ns, servers, target, preHandler, () => {})
			)
			continue
		} else if (!hackCondition) {
			ns.print("Pipeline Scheduler: Growing")
			await AwaitTasks(
				ns,
				ScheduleGrowTask(ns, servers, target, preHandler, () => {})
			)
			continue
		}
		/* =========================BEGIN STATIC HACK PIPELINE=============================== */
		// DONE hack level will increase, hack time will decrease, so pipeline segment time should be adjusted dynamically.
		// TODO, hack level will increase, hack percent will increase, the original 99% hack will go 100% and drain the target.
		// TODO, so I should immediately flush the pipeline, and re-run the thread allocation.
		const pHosts: PipelineHost[] = []
		let pHeight = 0 // Height of the pipeline
		for (const host of servers) {
			preHandler(ns, host)
			const remainRam = FreeRam.bind(ns)(host)
			const threadBoost = FindMaxHGWThreads(ns, host, target, remainRam)
			if (threadBoost === null) continue
			const count = Math.floor(remainRam / threadBoost.ram)
			pHosts.push({ host, threadBoost, count, launched: 0 })
			pHeight += count
		}
		const flex = 50 // Add some ms flexible time
		const delay = 420 // Add delay between HWGW
		const { aligned } = HackAligns(ns, target, (flex + delay) * pHeight)
		const pSegTime = Math.ceil(aligned / pHeight)
		const taskQ: PipelineTask[] = []
		let arranged = 0
		const clock = Date.now()
		while (!stop_token.is_stop_requested()) {
			const now = Date.now()
			let offset = (now - clock) % pSegTime //Launch at last task's finish time
			if (offset > flex) {
				offset = pSegTime - offset
			} else {
				offset = -offset
			}
			const nextWait = pSegTime + offset

			let pipeLineId = 0,
				newTask = false
			if (taskQ.length < pHeight) {
				newTask = true
				if (pHosts[arranged].count <= pHosts[arranged].launched) {
					arranged++
				}
				pipeLineId = arranged
			} else {
				const { pid, logicBegin, aligned: fixedAligned } = taskQ[0]
				pipeLineId = taskQ[0].pipeLineId
				const { host } = pHosts[pipeLineId]
				const running = ns.getRunningScript(pid, host)
				if (now - taskQ[0].logicBegin >= aligned && running === null) {
					taskQ.shift()
					pHosts[pipeLineId].launched--
					newTask = true
					ns.print(`Done pipeline segment on host ${host}, pid ${pid}`)
					ns.print(
						`\tThis task was aligned to ${ns.tFormat(fixedAligned - delay, true)}}, ${ns.tFormat(fixedAligned, true)}]`
					)
					ns.print(
						`\tTarget Money: ${ns.formatPercent(ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target), 1)}`
					)
					ns.print(
						`\tTarget Security: ${ns.formatPercent(ns.getServerMinSecurityLevel(target) / ns.getServerSecurityLevel(target), 1)}`
					)
				} else {
					ns.print(
						`Task is runnning on host ${host}, pid ${pid}, remaining: ${ns.tFormat(now - logicBegin, true)}`
					)
				}
			}

			if (newTask) {
				const { host, threadBoost } = pHosts[pipeLineId]
				pHosts[pipeLineId].launched++
				const { hThread, wThread1, gThread, wThread2 } = threadBoost
				const { aligned: fixedAligned, aligns: fixedAligns } = OffsetAligns(
					ns,
					target,
					aligned,
					offset
				)
				const hPid = new HackMiner(
					ns,
					host,
					target,
					hThread,
					fixedAligns.HackTime - delay
				).run()
				const wPid1 = new WeakenMiner(
					ns,
					host,
					target,
					wThread1,
					fixedAligns.weaken1Time - (2 * delay) / 3
				).run()
				const gPid = new GrowMiner(
					ns,
					host,
					target,
					gThread,
					fixedAligns.growTime - delay / 3
				).run()
				const wPid2 = new WeakenMiner(
					ns,
					host,
					target,
					wThread2,
					fixedAligns.weaken2Time
				).run()
				if (!hPid || !wPid1 || !gPid || !wPid2) {
					ns.print(
						`Failed to launch on ${host}: ${pHosts[pipeLineId].launched} / ${pHosts[pipeLineId].count}`
					)
					break
				}
				taskQ.push({
					pid: wPid2,
					pipeLineId,
					logicBegin: now + offset,
					aligned: fixedAligned
				})
				ns.print(
					`\tNext segment running on ${wPid2}, pipeline height: ${taskQ.length}/${pHeight}`
				)
			}
			ns.print(
				`\twait: ${ns.tFormat(nextWait, true)}, per segment: ${ns.tFormat(pSegTime, true)}`
			)
			ns.print(`\toffset: ${ns.tFormat(offset, true)}`)
			await new Promise((r) => setTimeout(r, pSegTime + offset))
		}
		for (const { pipeLineId } of taskQ) {
			ns.killall(pHosts[pipeLineId].host)
		}
		ns.print(`Stop token: ${stop_token.is_stop_requested()} `)
	}
	ns.print("Exit Pipeline Scheduler")
}
