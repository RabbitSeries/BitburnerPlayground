import type { NS } from "@ns"
export function PuchaseServer(ns: NS, ram: number) {
    const i = ns.getPurchasedServers().length
    const cost = ns.getPurchasedServerCost(ram)
    const wallet = ns.getServerMoneyAvailable("home")
    if (i < ns.getPurchasedServerLimit()) {
        if (wallet >= cost) {
            return `Bought ${ns.purchaseServer("pserv-" + i, ram)}`
        } else {
            return `Too Expensive ${ns.formatNumber(wallet)}/${ns.formatNumber(cost)}`
        }
    } else {
        return `Limit Exceeded Holding ${i} Servers`
    }
}
export async function main(ns: NS) {
    const ram = 2 ** (+ns.args[0])
    if (ram) {
        let i = ns.getPurchasedServers().length
        ns.tprint(`Currently having ${i}/${ns.getPurchasedServerLimit()} servers`)
        while (i < ns.getPurchasedServerLimit()) {
            const cost = ns.getPurchasedServerCost(ram)
            const wallet = ns.getServerMoneyAvailable("home")
            ns.tprint(`Next server with ${ns.formatRam(ram)} costs ${ns.formatNumber(cost)}/${wallet}`)
            while (ns.getServerMoneyAvailable("home") < cost) {
                await ns.sleep(10000)
            }
            ns.tprint(`Buying ${i}_th/${ns.getPurchasedServerLimit()} server`)
            ns.print(PuchaseServer(ns, ram))
            ++i
        }
        ns.tprint("Maximum servers reached")
    }
    return
}