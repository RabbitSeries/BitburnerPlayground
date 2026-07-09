// import type { NS } from "@ns"
import React, { useCallback, useRef } from "react"
import {Ratio as launchRatio} from "/Hack/Schedulers/Ratio"
import { ScanAllServers } from "/Hack/HackHelpers"
import type { NS } from "@ns"

export function Ratio(props : {ns: NS}) {
    // return <svg>
    //     <p />
    // </svg>
    // 0 - 100
    const hackSlider = useRef<HTMLInputElement>(null)
    const weaken1Slider = useRef<HTMLInputElement>(null)
    const growSlider = useRef<HTMLInputElement>(null)
    const weaken2Slider = useRef<HTMLInputElement>(null)
    const options = useRef(ScanAllServers(props.ns).sorted)
    const selectionRef = useRef<HTMLSelectElement>(null)

    const launch = useCallback((target :string, ns : NS)=>{
        launchRatio(ns, [+hackSlider.current!.value,
            +weaken1Slider.current!.value,
            +growSlider.current!.value,
            +weaken2Slider.current!.value], target)
    }, [])
    return <div>
        <div>
            <input type="range" ref={hackSlider} />
            <input type="range" ref={weaken1Slider} />
            <input type="range" ref={growSlider} />
            <input type="range" ref={weaken2Slider} />
        </div>
        <select>{ ...options.current.map((value,i ) =>
            <option key={i} value={value}>{value}</option>)}
        </select>
        <button onClick={() => launch(`${selectionRef.current?.value}`, props.ns)}>Launch</button>
    </div>
}
