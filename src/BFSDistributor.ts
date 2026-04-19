import type { NS } from '@ns'
import * as HackHelpers from '/Hack/HackHelpers'
import { isFunctionProvider, type MinerProvider } from './Hack/Miners/Providers'
export async function BFSDistributor(ns: NS, targetName: string, provider: MinerProvider) {
    const hosts = HackHelpers.ScanAllServers(ns)
    if (!hosts.valueset.has(targetName)) {
        ns.tprint(`ERROR: unkown target: ${targetName}`)
        return false
    }
    if (!ns.hasRootAccess(targetName)) {
        ns.tprint(`ERROR: no root access to target: ${targetName}`)
        return false
    }
    hosts.sorted.filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0).map((hostName) => {
        ns.killall(hostName)
        const miner = isFunctionProvider(provider.next) ? provider.next({ hostName, targetName }) : provider.next
        if (miner) {
            miner.run()
        }
        HackHelpers.ShareOn(ns, hostName)
    })
    return true
}
