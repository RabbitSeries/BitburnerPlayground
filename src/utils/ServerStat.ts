import type { NS } from "@ns"
export function CurrMoneyRate(this: NS, host: string) {
    return this.getServerMoneyAvailable(host) * HackPercent.bind(this)(host) / (this.getWeakenTime(host) / 1000)
}
export function PotentialMoneyRate(this: NS, host: string) {
    const minSecurity = this.getServerMinSecurityLevel(host), currSecurity = this.getServerSecurityLevel(host)
    const hackPercentAdjust = (1 - minSecurity / 100) / (1 - currSecurity / 100)
    const requiredSkill = this.getServerRequiredHackingLevel(host)
    const baseDiff = 500;
    const diffFactor = 2.5;
    const weakenTimeAdjust = (diffFactor * requiredSkill * minSecurity + baseDiff) / (diffFactor * requiredSkill * currSecurity + baseDiff)
    return this.getServerMaxMoney(host) * HackPercent.bind(this)(host) * hackPercentAdjust / (this.getWeakenTime(host) / 1000 * weakenTimeAdjust)
}
export function HackPercent(this: NS, host: string) {
    const hostHackingLevel = this.getServerRequiredHackingLevel(host), currHackLevel = this.getHackingLevel()
    if (hostHackingLevel > currHackLevel) {
        return 0
    }
    return this.getHackingMultipliers().money * (1 - (hostHackingLevel - 1) / currHackLevel) / 240 * (1 - this.getServerSecurityLevel(host) / 100)
}
export function FreeRam(this: NS, host: string) {
    return this.getServerMaxRam(host) - this.getServerUsedRam(host)
}