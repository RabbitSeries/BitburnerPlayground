import type { AutocompleteData, NS } from "@ns"
import HackOS from "./UI/HackOS"
import * as HackHelpers from "/Hack/HackHelpers"
import React from "react"
import { ServerTree } from "./AGC/ServerTree"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(_data: AutocompleteData, _args: string[]) {
    return ["Contract/Scanner.js ."]
}
let globalNS: NS | undefined = undefined
export { globalNS }
export async function main(ns: NS) {
    globalNS = ns
    ns.disableLog("ALL")
    if (ns.args.length === 0) {
        ns.tprint("Begin OS") // Can add a banner here
        const allServers = HackHelpers.ScanAllServers(ns)
        return new Promise<void>((resolve) =>
        {
            ns.tprintRaw(
                <HackOS
                    servers={allServers.sorted}
                    ns={ns}
                    handle={{
                        close: () => {
                            resolve()
                        }
                    }}
                />
            )
            const logging = false
            if(logging){
                ns.tprintRaw(<ServerTree ns={ns} />)
            }
        }
        ).catch(ns.tprint)
    } else {
        ns.exec("Contract/Scanner.js", "home", 1, ".")
    }
}
