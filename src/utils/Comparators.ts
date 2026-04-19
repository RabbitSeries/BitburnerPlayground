import type { NS } from "@ns"
import { CurrMoneyRate, PotentialMoneyRate } from "./ServerStat"
export type Sorter<T> = (a: T, b: T) => number
export class Comparator<T> {
    public static comparing<T>(cmp: (a: T) => number) {
        return Comparator.sortBy<T>((a, b) => cmp(a) - cmp(b))
    }
    public static sortBy<T>(sorter: Sorter<T>): Comparator<T> {
        return new Comparator([], sorter)
    }
    public compare: Sorter<T> = (a, b) => {
        for (const sorter of this.sortChain) {
            const cmp = sorter(a, b)
            if (cmp !== 0) {
                return cmp
            }
        }
        return this.currentSorter(a, b)
    }
    public thenSortBy(sorter: Sorter<T>): Comparator<T> {
        return new Comparator([...this.sortChain, this.currentSorter], sorter)
    }
    public reversed(): Comparator<T> {
        return new Comparator([...this.sortChain], (a, b) => {
            return -1 * this.currentSorter(a, b)
        })
    }
    private constructor(chain: Sorter<T>[], sorter: Sorter<T>) {
        this.sortChain = [...chain]
        this.currentSorter = sorter
    }
    private sortChain: Sorter<T>[]
    private currentSorter: Sorter<T>
}
export type nsSorter<T> = (ns: NS) => Comparator<T>;
export const RootAccessRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>((a) => +ns.hasRootAccess(a)).reversed()
}
export const MaxMoneyRank: nsSorter<string> = function (ns) {
    return Comparator.comparing(ns.getServerMaxMoney).reversed()
}
export const CurrentMoneyRateRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(CurrMoneyRate.bind(ns)).reversed()
}
export const PotentialMoneyRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(PotentialMoneyRate.bind(ns)).reversed()
}
export const HackLevelRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(ns.getServerRequiredHackingLevel)
}
export const HackTimeRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(ns.getHackTime)
}
export const SecurityLevelRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(ns.getServerSecurityLevel)
}