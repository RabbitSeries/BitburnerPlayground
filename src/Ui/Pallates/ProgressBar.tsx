// A progress bar is meant to display the status of a set of tasks

import React, { useCallback, useEffect, useRef, useState } from "react"

export type FailureReason = { id: string, reason: string }
export type PendingTask = {
    waitMessage: string, task: Promise<FailureReason | undefined>,
}
// The only argument should be the taskList
export function ProgressBar(config: {
    tasks: PendingTask[],
    resolve: () => void // parent script can then exit main
}) {
    const [options, setOptions] = useState<string[]>([])
    const [elapsed, setElapsed] = useState(0)
    const [resultRevealed, setRevealed] = useState(false)
    const [failedTasks] = useState<FailureReason[]>([])
    const [performanceResult, setResult] = useState(0)
    const [taskStat, setStat] = useState<string>("")
    const [reason, setReason] = useState<string>("")

    const failedSelection = useRef<HTMLSelectElement>(null)

    const onSelectChange = useCallback(() => {
        if (failedSelection.current) {
            const seleted = failedSelection.current!.selectedIndex
            setReason(failedTasks[seleted].reason)
        }
    }, [failedTasks]) // Actually failedTasks won't change

    // call effect handler only once
    useEffect(() => {
        // Move the async function inside so that eslint hook won't complain
        // about the static setState check
        const logger = async () => {
            const nowTime = Date.now()
            const itvId = setInterval(() => {
                // setElapsed(elapsed + (Date.now() - nowTime) / 1000)
                setElapsed((Date.now() - nowTime) / 1000)
            }, 100)
            const total = config.tasks.length
            const fetchFaildTasks = async () => {
                let i = 0
                // while shift will change config prop, which is not
                // a best practice
                for (const { waitMessage, task } of config.tasks) {
                    setStat(`[${i + 1}/${total}]: ${waitMessage}`)
                    // ! stale closure
                    // `${elapsed.toPrecision(2)} s`)
                    i++
                    const stat = await task
                    if (stat) {
                        failedTasks.push(stat)
                    }
                }
            }
            await fetchFaildTasks()
            clearInterval(itvId)
            setElapsed((Date.now() - nowTime) / 1000)
            setResult(failedTasks.length)
            // config.performanceResult = `Outcome: ${failedTasks.length}/${total}`
            if (failedTasks.length && failedSelection.current) {
                // Dom manipulation is not a best practice in react.
                // failedSelection.current.add() 
                setRevealed(true)
                setOptions(failedTasks.map(({ id }) => id))
                onSelectChange()
            }
            config.resolve()
        }
        logger()
        return () => { }
    }, [])// explicit empty dependency list to be called only once
    // But useEffect will be called again if it is unmounted and mouneted back.
    return <div>
        <label>{`${taskStat} -- ${elapsed.toFixed(4)}`}</label>
        <div hidden={!resultRevealed}>{
            `Outcome: ${config.tasks.length -
            performanceResult}/${config.tasks.length}, Failed: ` +
            performanceResult}
        </div>
        <div hidden={!resultRevealed}>
            Reason id:
            <select ref={failedSelection}
                onChange={onSelectChange}>
                {...options.map((option, i) =>
                    <option key={`${i}`} value={option}>{option}</option>)}
            </select>
        </div>
        <div hidden={!resultRevealed}>{reason}</div>
    </div>
}
