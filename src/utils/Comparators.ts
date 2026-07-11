import type { NS } from "@ns"
import { CurrMoneyFlow, PotentialMoneyFlow } from "./ServerStat"
export type Sorter<T> = (a: T, b: T) => number

export class Comparator<T> {
    private sortChain: Sorter<T>[]
    private reverseTag: number = 1
    private constructor(chain: Sorter<T>[], private currentSorter: Sorter<T>) {
        this.sortChain = [...chain]
    }

    public static comparing<T>(mapper: (a: T) => number) {
        return new Comparator<T>([], (a, b) => mapper(a) - mapper(b))
    }

    public static sortBy<T>(sorter: Sorter<T>) {
        return new Comparator([], sorter)
    }

    public compare: Sorter<T> = (a, b) => {
        for (const sorter of this.sortChain) {
            const cmp = sorter(a, b)
            if (cmp !== 0) {
                return cmp
            }
        }
        return this.reverseTag * this.currentSorter(a, b)
    }

    public thenComparing(mapper: (a: T) => number) {
        // Make a copy instead of referencing `this` inside the closure.
        return this.thenSortBy((a,b) => mapper(a) - mapper(b))
    }

    public thenSortBy(sorter: Sorter<T>): Comparator<T> {
        const tag = this.reverseTag
        const currentSorter = this.currentSorter
        return new Comparator([...this.sortChain, (a,b) =>
            tag * currentSorter(a,b)], sorter)
    }

    public reversed(): Comparator<T> {
        const cp = new Comparator([...this.sortChain], this.currentSorter)
        cp.reverseTag = -1 * this.reverseTag
        return cp
    }

    public reverse(): Comparator<T> {
        this.reverseTag = -1 * this.reverseTag
        return this
    }
}
export type nsSorter<T> = (ns: NS) => Comparator<T>
export const RootAccessRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>((a) => +ns.hasRootAccess(a)).reversed()
}
export const MaxMoneyRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(ns.getServerMaxMoney).reversed()
}
export const CurrentMoneyRateRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(CurrMoneyFlow.bind(ns)).reversed()
}
export const PotentialMoneyRank: nsSorter<string> = function (ns) {
    return Comparator.comparing<string>(PotentialMoneyFlow.bind(ns)).reversed()
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
