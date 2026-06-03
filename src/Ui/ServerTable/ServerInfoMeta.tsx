import type { Server, NS } from "@ns"

export interface ExtendedServer extends Server {
    hackTime: number,
    weakenTime: number,
    growTime: number
}

// Actually this is not used anywhere.
// export const InfoDisplay = {
//     hostname: "Host Name",
//     ip: "IP",
//     sshPortOpen: "SSH Port",
//     ftpPortOpen: "FTP Port",
//     smtpPortOpen: "SMTP Port",
//     httpPortOpen: "HTTP Port",
//     sqlPortOpen: "SQL Port",
//     hasAdminRights: "Admin",
//     cpuCores: "CPU",
//     isConnectedTo: "Connected",
//     ramUsed: "RAM Used",
//     maxRam: "MAX RAM",
//     organizationName: "Organization",
//     purchasedByPlayer: "Purchased",
//     backdoorInstalled: "Backdoor",
//     baseDifficulty: "Base Difficulty",
//     hackDifficulty: "Hack Difficulty",
//     minDifficulty: "Min Difficulty",
//     moneyAvailable: "Available Money",
//     moneyMax: "Money MAX",
//     numOpenPortsRequired: "Ports Required",
//     openPortCount: "Opened Ports",
//     requiredHackingSkill: "Required Hacking Skill",
//     serverGrowth: "Growth",
//     hackTime: "Hack Time",
//     weakenTime: "Weaken Time",
//     growTime: "Grow Time"
// } as const satisfies Record<keyof Required<ExtendedServer>, string>

// export function displayLabel<T extends keyof ExtendedServer>(property: T): (typeof InfoDisplay)[T] {
//     return InfoDisplay[property]
// }

export function serverInfo(ns: NS, hostname: string): ExtendedServer {
    const server = ns.getServer(hostname)
    return { ...server, hackTime: ns.getHackTime(hostname), weakenTime: ns.getWeakenTime(hostname), growTime: ns.getGrowTime(hostname) }
}
