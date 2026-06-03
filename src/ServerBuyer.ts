import type { NS } from "@ns"
export function PuchaseServer(ns: NS, ram: number) {
	const cloud = ns.cloud
	const i = ns.hacknet.numNodes()
	const cost = ns.hacknet.getRamUpgradeCost(ram)
	const wallet = ns.getServerMoneyAvailable("home")
	if (i < cloud.getServerLimit()) {
		if (wallet >= cost) {
			return `Bought ${cloud.purchaseServer("pserv-" + i, ram)}`
		} else {
			return `Too Expensive ${ns.format.number(wallet)}/${ns.format.number(cost)}`
		}
	} else {
		return `Limit Exceeded Holding ${i} Servers`
	}
}
export async function main(ns: NS) {
	const cloud = ns.cloud
	const ram = 2 ** +ns.args[0]
	if (ram) {
		let i = cloud.getServerNames().length
		ns.tprint(`Currently having ${i}/${cloud.getServerLimit()} servers`)
		while (i < cloud.getServerLimit()) {
			const cost = cloud.getServerCost(ram)
			const wallet = ns.getServerMoneyAvailable("home")
			ns.tprint(
				`Next server with ${ns.format.ram(ram)} costs ${ns.format.number(cost)}/${wallet}`
			)
			while (ns.getServerMoneyAvailable("home") < cost) {
				await ns.sleep(10000)
			}
			ns.tprint(`Buying ${i}_th/${cloud.getServerLimit()} server`)
			ns.print(PuchaseServer(ns, ram))
			++i
		}
		ns.tprint("Maximum servers reached")
	}
}
