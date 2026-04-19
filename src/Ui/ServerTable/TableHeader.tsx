import type { NS } from "@ns";
import React, { useCallback, useRef } from "react";
import { Comparator, CurrentMoneyRateRank, HackLevelRank, HackTimeRank, MaxMoneyRank, PotentialMoneyRank, RootAccessRank, SecurityLevelRank } from "/utils/Comparators";
export function TableHeader({ ns, setRanker }: { ns: NS, setRanker: (ranker: Comparator<string>) => void }) {
    const clickTimeOut = useRef<number>(null)
    const handleClick = useCallback((comparator: Comparator<string>) => {
        if (clickTimeOut.current) {
            clickTimeOut.current = null;
            return new Promise<Comparator<string>>((resolve) => {
                resolve(comparator.reversed())
            });
        }
        return new Promise<Comparator<string>>((resolve, reject) => {
            clickTimeOut.current = setTimeout(() => {
                if (clickTimeOut.current === null) {
                    reject("Double clicked or clicked status lost");
                } else {
                    resolve(comparator)
                }
                clickTimeOut.current = null;
            }, 200)
        })
    }, [])
    const { current: content } = useRef<Record<string, Comparator<string> | null>>({
        "Rank": null,
        "Server": null,
        "Root": RootAccessRank(ns),
        "Hack Level": HackLevelRank(ns),
        "Ports": null,
        "Money": RootAccessRank(ns).thenSortBy(MaxMoneyRank(ns).compare),
        "Security": RootAccessRank(ns).thenSortBy(SecurityLevelRank(ns).compare),
        "HWG Time/mins": RootAccessRank(ns).thenSortBy(HackTimeRank(ns).compare),
        "Growth": RootAccessRank(ns).thenSortBy((a, b) => ns.getServerGrowth(b) - ns.getServerGrowth(a)),
        "Current$/s": RootAccessRank(ns).thenSortBy(CurrentMoneyRateRank(ns).compare),
        "Potential$/s": RootAccessRank(ns).thenSortBy(PotentialMoneyRank(ns).compare),
        "RAM": RootAccessRank(ns).thenSortBy(Comparator.comparing(ns.getServerMaxRam).compare).reversed(),
        "Contracts": Comparator.comparing<string>(host => ns.ls(host, ".cct").length).reversed(),
        "Cores": null
    })
    return <thead>
        <tr>
            {Object.entries(content).map(([n, r]) => <th onClick={() => { if (r) handleClick(r).then(setRanker).catch(ns.print) }}>{n} </th>)}
            <th style={{ textAlign: "center" }}>Action </th>
        </tr>
    </thead>
}