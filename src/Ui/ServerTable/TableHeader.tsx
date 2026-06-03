import type { NS } from "@ns"
import React, { useCallback, useRef } from "react"
import { Comparator, CurrentMoneyRateRank, HackLevelRank, HackTimeRank, MaxMoneyRank, PotentialMoneyRank, RootAccessRank, SecurityLevelRank } from "/utils/Comparators"
import type { TableHeaderMeta } from "./TableHeaderMeta"

export function TableHeader({ ns, setRanker }: { ns: NS, setRanker: (ranker: Comparator<string>) => void }) {
	const lexSorter = useRef(Comparator.sortBy<string>((a, b) => a.localeCompare(b)))
	const intSorter = useRef(Comparator.sortBy<string>((a, b) => parseInt(a) - parseInt(b)))
	const clickTimeOut = useRef<number>(null)
	const handleClick = useCallback((comparator: Comparator<string>) => {
		return new Promise<Comparator<string>>((resolve, reject) => {
			if (clickTimeOut.current) {
				clickTimeOut.current = null
				resolve(comparator.reversed())
			} else {
				clickTimeOut.current = setTimeout(() => {
					if (clickTimeOut.current === null) {
						reject("Double clicked or clicked status lost")
					} else {
						resolve(comparator)
					}
					clickTimeOut.current = null
				}, 200)
			}
		})
	}, [])
	const header = useRef<Record<TableHeaderMeta, Comparator<string> | null>>({
		"Rank": null,
		"Server": lexSorter.current,
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
		"Cores": intSorter.current,
		"Actions": null
	})
	return (
		<thead>
			<tr>
				{Object.entries(header.current).map(([n, r]) => (
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
