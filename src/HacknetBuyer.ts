import type { NS } from "@ns"

export function upgradeLevelBy(ns: NS, nodeId: number, delta: number) {
    ns.print(`Upgrading ${nodeId} by ${delta}`)
    return ns.hacknet.upgradeLevel(nodeId, delta)
}

export function upgradeLevelTo(ns: NS, nodeId: number, level: number) {
    ns.print(`Upgrading ${nodeId} to ${level}`)
    const delta = Math.max(level - ns.hacknet.getNodeStats(nodeId).level, 0)
    return ns.hacknet.upgradeLevel(nodeId, delta)
}

export async function main(ns: NS) {
    const hacknet = ns.hacknet
    ns.print(`Currently having ${hacknet.numNodes()}/${hacknet.maxNumNodes()} nodes`)
    while (hacknet.numNodes() < 30) {
        const cost = hacknet.getPurchaseNodeCost()
        const wallet = ns.getServerMoneyAvailable("home")
        ns.print(`Next node with costs ${ns.formatNumber(cost)}/${ns.formatNumber(wallet)}`)
        while (wallet < cost) {
            ns.print(`Nodes: ${ns.hacknet.numNodes()}`)
            const maxLevel = [...Array(ns.hacknet.numNodes())].map(function (this: NS, _, i) {
                return this.hacknet.getNodeStats(i).level
            }, ns).reduce((init, v) => Math.max(init, v), 0)
            for (const id of [...Array<number>(hacknet.numNodes())].map((_, i) => i)) {
                upgradeLevelTo(ns, id, maxLevel + 1)
            }
            await ns.sleep(10000)
        }
        ns.print(`Buying ${hacknet.numNodes()}_th/${hacknet.maxNumNodes()} node`)
        ns.hacknet.purchaseNode()
        await ns.sleep(1000)
    }
    ns.print("Maximum nodes reached")
    return
}