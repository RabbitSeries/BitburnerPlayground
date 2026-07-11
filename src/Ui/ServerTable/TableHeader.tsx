import type { NS } from "@ns"
import React, { useCallback, useRef} from "react"
import { Comparator, CurrentMoneyRateRank, HackLevelRank, HackTimeRank, MaxMoneyRank, PotentialMoneyRank, RootAccessRank, SecurityLevelRank } from "/utils/Comparators"
import type { TableHeaderMeta } from "./TableHeaderMeta"

export function TableHeader({ ns, setRanker }: { ns: NS, setRanker: (ranker: Comparator<string>) => void }) {
    const clickTimeout = useRef<number>(null)
    const handleClick = useCallback((comparator: Comparator<string>) => {
        return new Promise<Comparator<string>>((resolve, reject) => {
            if (clickTimeout.current !== null) {
                // Double clicked within timeout
                clickTimeout.current = null
                resolve(comparator.reversed())
            } else {
                clickTimeout.current = setTimeout(() => {
                    // Single click timeout check
                    if (clickTimeout.current === null) {
                        reject("Double clicked or clicked status lost.")
                    } else {
                        resolve(comparator)
                        clickTimeout.current = null
                    }
                }, 200) // Double click timeout gap
            }
        })
    }, [])
    // Can not access refs during render, create them
    const header = {
        "Rank": null,
        "Server": Comparator.sortBy<string>((a, b) => a.localeCompare(b)),
        "Root": RootAccessRank(ns),
        "Hack Level": HackLevelRank(ns),
        "Ports": null,
        "Money": RootAccessRank(ns).thenSortBy(MaxMoneyRank(ns).compare),
        "Security": RootAccessRank(ns).thenSortBy(SecurityLevelRank(ns).compare),
        "HWG Time/mins": RootAccessRank(ns).thenSortBy(HackTimeRank(ns).compare),
        "Growth": RootAccessRank(ns).thenSortBy(Comparator.comparing(ns.getServerGrowth).compare),
        "Current$/s": RootAccessRank(ns).thenSortBy(CurrentMoneyRateRank(ns).compare),
        "Potential$/s": RootAccessRank(ns).thenSortBy(PotentialMoneyRank(ns).compare),
        "RAM": RootAccessRank(ns)
            .thenSortBy(Comparator.comparing(ns.getServerMaxRam).compare)
            .reversed(),
        "Contracts": Comparator.comparing<string>((host) => ns.ls(host, ".cct").length).reversed(),
        "Cores": Comparator.sortBy<string>((a, b) => parseInt(a) - parseInt(b)),
        "Actions": null
    } satisfies Record<TableHeaderMeta, Comparator<string> | null>
    return (
        <thead>
            <tr>
                {Object.entries(header).map(([n, r]) => (
                    <th onClick={() => {
                        if (r) handleClick(r).then(setRanker).catch(ns.print)
                    }}>
                        {n}
                    </th>
                ))}
                <th style={{ textAlign: "center" }}>Action </th>
            </tr>
        </thead>
    )
}
