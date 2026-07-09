import type { NS } from "@ns"
import React, { useEffect, useRef } from "react"
import { FindPathTo, ScanAllServers, TryNuke } from "/Hack/HackHelpers"
import { upgradeLevelBy, upgradeLevelTo } from "/HacknetBuyer"
import { type JThread, type ProcessHandle } from "../OS/Process"
import { MemSharer, MinerPaths, type ScriptPathSignatures } from "../../Hack/Miners/Miners"
import type { Sorter } from "/utils/Comparators"
import { FreeRam } from "/utils/ServerStat"
import { PuchaseServer } from "/ServerBuyer"
// import { Ratio } from "/Hack/Schedulers/Ratio"
// import * as ContractSolver from "/Contract/Scanner"

interface Notification {
    action: "Expand" | "Collapse"
}
export function Toolbar({
    ns,
    handle,
    notifier,
    ranker
}: {
    ns: NS
    handle: ProcessHandle
    notifier: (notification: Notification) => void
    ranker: Sorter<string>
}) {
    const expander = useRef<HTMLButtonElement>(null)
    const levelTo = useRef<HTMLLabelElement>(null)
    const maxLevel = Math.max(
        ...[...Array(ns.hacknet.numNodes())]
            .map((_, i) => i)
            .map((i) => ns.hacknet.getNodeStats(i).level)
    )
    const AttachedHomeSession = useRef<JThread[]>([])
    useEffect(
        () => () => {
            for (const { stop_token, task } of AttachedHomeSession.current) {
                stop_token.reqeust_stop()
                const awaiter = async () => {
                    await task
                }
                awaiter()
            }
        },
        []
    ) // Add a dependency list, so this clean up will only becalled on unmount
    return (
        <div style={{ display: "flex", flexDirection: "row" }}>
            <button
                ref={expander}
                onClick={() => {
                    if (expander.current) {
                        if (expander.current.textContent === "Expand") {
                            notifier({ action: "Expand" })
                            expander.current.textContent = "Collapse"
                        } else {
                            notifier({ action: "Collapse" })
                            expander.current.textContent = "Expand"
                        }
                    }
                }}
            >
                Expand
            </button>
            <button
                onClick={() => {
                    for (const host of ScanAllServers(ns).valueset) {
                        TryNuke(ns, host)
                    }
                }}
            >
                NukeAll
            </button>
            <button
                onClick={() => {
                    for (const id in [...Array(ns.hacknet.numNodes())]) {
                        upgradeLevelBy(ns, +id, 1)
                    }
                }}
            >
                UpgradeHackNode
            </button>
            <button
                onClick={() => {
                    if (levelTo.current) {
                        const to = +levelTo.current.textContent
                        for (const id in [...Array(ns.hacknet.numNodes())]) {
                            upgradeLevelTo(ns, +id, to)
                        }
                    }
                }}
            >
                UpgradeTo
            </button>
            <button
                onClick={() => {
                    if (levelTo.current)
                        levelTo.current.textContent = `${Math.max(+levelTo.current.textContent - 1, 0)}`
                }}
            >
                -
            </button>
            <button
                onClick={() => {
                    if (levelTo.current)
                        levelTo.current.textContent = `${Math.min(+levelTo.current.textContent + 1, 200)}`
                }}
            >
                +
            </button>
            {/* There seems to be multiple affect to this label's textcontent. (TODO: this behavior seems to be called referential equality, go check it out!)
            The parent is periodically refreshing all nodes.
            So this label's default value evaluates on every refresh.
            Each time refresh to maxLevel.
            But this label is also bind to ref.
            So the diff alogrithm will also diff this lable's ref.
            So the label's textcontent will change if either of the following changes:
                - maxLevel's returned value
                - levelTo ref's current.textcontent
            if neither changes, content remains unchanged.
            After changed the content stays the at either of the refreshed value, which won't affect ref's value
        */}
            <label
                ref={levelTo}
                onClick={async ({ currentTarget }) =>
                    (currentTarget.textContent = `${Math.max(Math.min(+`${await ns.prompt("Upgrade to: ", { type: "text" })}`, 200), 0)}`)
                }
            >
                {maxLevel}
            </label>
            <button
                onClick={() =>
                    ns
                        .prompt("Print path to: ", { type: "text" })
                        .then((r) => FindPathTo(ns, `${r}`.trim()))
                        .then((r) => {
                            if (r) {
                                ns.alert(
                                    `${`home;${r.map((r) => `connect ${r}`).join(";")};backdoor`}`
                                )
                            }
                        })
                        .catch()
                }
            >
                Find Path
            </button>
            <button onClick={() => handle.close()}>Shut Down</button>
            <button
                onClick={async () => {
                    const wallet = ns.getServerMoneyAvailable("home")
                    let avai = 21
                    while (avai--) {
                        if (wallet >= ns.cloud.getServerCost(2 ** avai)) {
                            break
                        }
                    }
                    if (avai < 0) {
                        ns.prompt(`You are too poor.`)
                    } else {
                        ns.prompt(`2^{Ram} GB (0-${avai}):`, { type: "text" })
                            .then((r) => {
                                if (r.toString().length > 0) {
                                    return PuchaseServer(ns, 2 ** Math.min(20, +r))
                                } else {
                                    return "Invalid ram"
                                }
                            })
                            .then(ns.prompt)
                            .catch(ns.prompt)
                    }
                }
                }
            >
                Purchase a server
            </button>
            <button
                onClick={async () =>
                    new MemSharer(
                        ns,
                        "home",
                        Math.floor(
                            FreeRam.bind(ns)("home") /
							ns.getScriptRam(MinerPaths.MemSharer.scriptPath)
                        )
                    ).run()
                }
            >
                Share mem (HOME)
            </button>
            <button
                onClick={async () => {
                    for (const host of ScanAllServers(ns).sorted.filter((s) =>
                        ns.hasRootAccess(s)
                    )) {
                        ns.killall(host)
                        const thread = Math.floor(
                            FreeRam.bind(ns)(host) /
							ns.getScriptRam(MinerPaths.MemSharer.scriptPath)
                        )
                        new MemSharer(ns, host, thread).run()
                    }
                }}
            >
                Share mem (Servers)
            </button>
            <button
                onClick={async () => {
                    ns.prompt("Which script do you want to run", {
                        type: "select",
                        choices: Object.keys(MinerPaths)
                    })
                        .then(async (script) => {
                            if (script.toString().length > 0) {
                                return {
                                    host: await ns.prompt("Where?", { type: "text" }),
                                    target: await ns.prompt("Target?", {
                                        type: "select",
                                        choices: ScanAllServers(ns)
                                            .sorted.filter((h) => ns.hasRootAccess(h))
                                            .toSorted(ranker)
                                    }),
                                    script: MinerPaths[
                                        script.toString() as keyof ScriptPathSignatures
                                    ].scriptPath
                                }
                            }
                        })
                        .then((r) => {
                            if (r && r.toString().length > 0) {
                                const ram = ns.getServerMaxRam(r.host.toString())
                                const usage = ns.getScriptRam(r.script.toString())
                                ns.prompt(
                                    usage === 0
                                        ? "Invalid"
                                        : `run ${r.script} -t ${Math.floor(ram / usage)} ${r.target} 0`
                                )
                            }
                        })
                        .catch(ns.tprint)
                }}
            >
                Simulate Script
            </button>
            <button onClick={() => {
                // Ratio(ns,)
            }}>Arrange Ratio Scheduler</button>
            {/* <button onClick={() => ContractSolver.main(ns)}>Solve contracts</button> */}
        </div>
    )
}
