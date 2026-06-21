import type { NS } from "@ns"
import React from "react"
import { CurrMoneyFlow, PotentialMoneyFlow } from "/utils/ServerStat"
import { Actions } from "./Actions"
import { serverInfo } from "./ServerInfoMeta"
import type { TableHeaderMeta } from "./TableHeaderMeta"

export function ServerInfoObject(ns: NS, rowId: number, host: string): Record<TableHeaderMeta, React.JSX.Element> {
	const formatNumber = ns.format.number
	const server = serverInfo(ns, host)
	const MoneyRate = CurrMoneyFlow.bind(ns)(host), pMoney = PotentialMoneyFlow.bind(ns)(host)
	return {
		"Rank": <td>{rowId} </td>,
		"Server": <td>{server.hostname} </td>,
		"Root": <td>{server.hasAdminRights ? "✔" : "✖"} </td>,
		"Hack Level": (
			<td>
				{ns.getHackingLevel()} / {server.requiredHackingSkill}
			</td>
		),
		"Ports": <td>{server.numOpenPortsRequired} </td>,
		"Money": (
			<td>
				{formatNumber(server.moneyAvailable ?? 0, 1)} / {formatNumber(server.moneyMax ?? 0, 1)}
				{`(${server.moneyMax ? ns.format.percent((server.moneyAvailable ?? 0) / server.moneyMax, 1) : "N/A"})`}
			</td>
		),
		"Security": (
			<td>
				{formatNumber(server.minDifficulty ?? 0, 0)} / {formatNumber(server.hackDifficulty ?? 0, 1)}
			</td>
		),
		"HWG Time/mins": (
			<tbody>
				<td>{formatNumber(server.hackTime / 1000 / 60, 1)} </td>
				< td > {formatNumber(server.weakenTime / 1000 / 60, 1)} </td>
				< td > {formatNumber(server.growTime / 1000 / 60, 1)} </td>
			</tbody>
		),
		"Growth": <td>{server.serverGrowth} </td>,
		"Current$/s": <td>{isNaN(MoneyRate) ? "NAN" : formatNumber(MoneyRate, 1)} </td>,
		"Potential$/s": <td>{isNaN(pMoney) ? "NAN" : formatNumber(pMoney, 1)} </td>,
		"RAM": (
			<td>{`${formatNumber(server.maxRam - server.ramUsed, 2)}/${formatNumber(server.maxRam, 2)}`} </td>
		),
		"Contracts": <td style={{ textAlign: "center" }}> {ns.ls(host, ".cct").length} </td>,
		"Cores": <td>{ns.getServer(host).cpuCores} </td>,
		// Add a key to this, so the diff algorithm won't recreate new content for it, when reorders the table.
		"Actions": <Actions key={host} host={host} ns={ns} />
	}
}

export function ServerInfo({ ns, host, rowId }: { ns: NS, host: string, rowId: number }) {
	const content = ServerInfoObject(ns, rowId, host)
	return (
		<tr
			className={ns.hasRootAccess(host) ? "has-access" : "no-access"}
			style={{ color: ns.hasRootAccess(host) ? "cyan" : "auto" }}
		>
			{Object.values(content)}
		</tr>
	)
}
