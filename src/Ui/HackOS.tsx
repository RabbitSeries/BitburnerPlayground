import React, { useEffect, useRef, useState } from 'react';
import type { NS } from "@ns";
import { RootAccessRank, CurrentMoneyRateRank } from "/utils/Comparators";
import ServerNode from './ServerTable/ServerInfo';
import { Toolbar } from './Pallates/Toolbar';
import type { ProcessHandle } from './OS/Process';
import { TableHeader } from './ServerTable/TableHeader';
import { ScanAllServers } from '/Hack/HackHelpers';
export default function HackOS({ servers, ns, handle }: { servers: string[], ns: NS, handle: ProcessHandle }) {
    const { current: rootAccessRanker } = useRef(RootAccessRank(ns))
    const [ranker, setRanker] = useState(rootAccessRanker.thenSortBy(CurrentMoneyRateRank(ns).compare))
    const [rows, setRows] = useState(servers.sort(ranker.compare).slice(0, 10))
    const timer = useRef<HTMLDivElement>(null)
    const sorted = rows.toSorted(ranker.compare)
    const refreshHandle = useRef<number>(null)
    useEffect(() => {
        // The return type should be number instead of NodeJS implemented NodeJS.Timeout.
        refreshHandle.current = setInterval(() => {
            if (timer.current) {
                timer.current.textContent = `${Math.floor(Date.now() / 1000) % 60}`;
            }
            setRows([...rows])
        }, 1000)
        return () => {
            if (refreshHandle.current) clearInterval(refreshHandle.current)
        }
    })
    return (
        <div className="multi-server-container">
            <h2>Network Server Information</h2>
            <div ref={timer}>Nah</div>
            <Toolbar
                ns={ns}
                notifier={({ action }) => setRows(action === "Expand" ? ScanAllServers(ns).sorted : sorted.slice(0, 10))}
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
                    {sorted.map((host, rowId) => {
                        return (<ServerNode key={host} ns={ns} host={host} rowId={rowId + 1}></ServerNode>)
                    })}
                </tbody>
            </table>
        </div>
    )
}
