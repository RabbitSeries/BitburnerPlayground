import type { NS } from "@ns"
import { HackTask, ScanAllServers } from "/Hack/HackHelpers"
import React, { useCallback, useEffect, useRef } from "react"
enum TaskState {
	IDLE,
	STOPPING,
	STARTING,
	RUNNING
}
// import { FullScheduler, Schedulers } from "../../Hack/Schedulers/Schedulers"
import {
	AwaitTasks,
	ScheduleGrowTask,
	ScheduleHackTask,
	ScheduleWeakenTask
} from "/Hack/Schedulers/ScheduleHelpers"
import { StopToken, type JThread } from "../OS/Process"
// import { FreeRam } from "/utils/ServerStat"
import { Pipeline } from "/Hack/Schedulers/Pipeline"
export function Actions({ ns, host }: { ns: NS; host: string }) {
	const options = [
		{ task: HackTask.Hack, scheduler: ScheduleHackTask },
		{ task: HackTask.Weaken, scheduler: ScheduleGrowTask },
		{ task: HackTask.Grow, scheduler: ScheduleWeakenTask }
	]
	const state = useRef(TaskState.IDLE)
	const attached_task = useRef<JThread>(null)
	// Better add this to parent, each actions should not own its own state
	const arrange_task = useCallback(
		async (
			name: string,
			arrangement: (token: StopToken) => Promise<void>,
			onResolve: () => void,
			onReject: () => void
		) => {
			if (state.current === TaskState.STARTING || state.current === TaskState.STOPPING) {
				return onReject()
			}
			if (state.current === TaskState.RUNNING) {
				state.current = TaskState.STOPPING
				if (attached_task.current) {
					const { stop_token, task } = attached_task.current
					stop_token.reqeust_stop()
					await task
					attached_task.current = null
				}
				state.current = TaskState.IDLE
			}
			if (attached_task.current === null && state.current === TaskState.IDLE) {
				state.current = TaskState.STARTING
				const stop_token = new StopToken()
				attached_task.current = {
					name,
					stop_token,
					task: arrangement(stop_token)
				}
				state.current = TaskState.RUNNING
				return onResolve()
			}
			return onReject()
		},
		[]
	)
	useEffect(() => {
		return () => {
			if (attached_task.current !== null && state.current === TaskState.RUNNING) {
				const { stop_token, task } = attached_task.current
				stop_token.reqeust_stop()
				const awaiter = async () => {
					await task
				}
				awaiter()
			}
		}
	}, [])
	return (
		<tbody>
			{options.map(({ task, scheduler }) => (
				<td
					key={`${host}${task}`}
					onMouseDown={async ({ currentTarget }) => {
						arrange_task(
							task,
							async (stop_token) => {
								// ns.print("WARN: This attached session may cause leak problem!")
								while (!stop_token.is_stop_requested()) {
									await AwaitTasks(
										ns,
										scheduler(
											ns,
											ScanAllServers(ns).sorted.filter(
												(s) =>
													ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0
											),
											host
										)
									)
								}
								ns.print("SUCCESS: Attached session cleaned")
							},
							() => (currentTarget.textContent = `Attaching[🔄]`),
							() => {}
						)
					}}
				>{`${task}[✖]`}</td>
			))}
			<td
				key={`${host}FullScheduler`}
				onMouseDown={({ currentTarget }) => {
					// if (ns.getScriptRam(Schedulers.FullScheduler.scriptPath) > FreeRam.bind(ns)("home")) {
					arrange_task(
						"FullScheduler",
						(token) => {
							// ns.print("WARN: This attached session may cause leak problem!")
							// return FullScheduler.attach(ns, host, undefined, undefined, undefined, token)
							return Pipeline(ns, host, undefined, token)
						},
						() => (currentTarget.textContent = "Attaching[🔄]"),
						() => {}
					)
					// } else {
					//     const pid = new FullScheduler(ns, host).run()
					//     if (pid !== 0) {
					//         currentTarget.textContent = "Running[🔄]"
					//     }
					// }
				}}
			>{`FullScheduler[✖]`}</td>
		</tbody>
	)
}
