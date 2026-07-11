import React, { useEffect, useRef, useState } from "react"
import type { NS } from "@ns"
import { RootAccessRank, CurrentMoneyRateRank } from "/utils/Comparators"
import { ServerInfo } from "./ServerTable/ServerInfo"
import { Toolbar } from "./Pallates/Toolbar"
import type { ProcessHandle } from "./OS/Process"
import { TableHeader } from "./ServerTable/TableHeader"
import { ScanAllServers } from "/Hack/HackHelpers"
import { Ratio } from "./Hack/Ratio"

export default function HackOS({
    servers,
    ns,
    handle
}: {
    servers: string[]
    ns: NS
    handle: ProcessHandle
}) {
    const [ranker, setRanker] = useState(
        RootAccessRank(ns).thenSortBy(CurrentMoneyRateRank(ns).compare)
    )

    const [rows, setRows] = useState(servers
        .toSorted(ranker.compare).slice(0, 10))
    const [timer, setTimer] = useState(NaN)
    rows.sort(ranker.compare)

    // refs are used for callbacks and effects
    const refreshHandle = useRef<number>(null)

    useEffect(() => {
        refreshHandle.current = setInterval(() => {
            setTimer(Math.floor(Date.now() / 1000) % 60)
        }, 1000)
        return () => {
            if (refreshHandle.current) clearInterval(refreshHandle.current)
        }
    })
    return (
        <div className="multi-server-container">
            <h2>Network Server Information</h2>
            <div>{timer}</div>
            <Toolbar
                ns={ns}
                notifier={({ action }) =>
                    setRows(action === "Expand" ? ScanAllServers(ns).sorted :
                        rows.slice(0, 10))}
                ranker={ranker.compare}
                handle={{
                    close: () => {
                        if (refreshHandle.current) {
                            clearInterval(refreshHandle.current)
                        }
                        handle.close()
                    }
                }}
            />
            <table className="server-table">
                <TableHeader ns={ns} setRanker={setRanker} />
                <tbody>
                    {rows.map((host, rowId) => {
                        return (
                            <ServerInfo
                                // Use host as key
                                key={host}
                                ns={ns}
                                host={host}
                                rowId={rowId + 1}
                            />
                        )
                    })}
                </tbody>
            </table>
            <Ratio ns={ns} />
        </div>
    )
}
