import React, { useCallback, useEffect, useRef, useState } from "react"

export type FailureReason = { id: string, reason: string }
export type PendingTask = {
    waitMessage: string, task: Promise<FailureReason | undefined>,
}

// A progress bar is meant to display the status of a set of tasks
export function ProgressBar(config: {
    tasks: PendingTask[],
    resolve: () => void // parent script can then exit main
}) {
    const [elapsed, setElapsed] = useState(0)
    const [resultRevealed, setRevealed] = useState(false)
    const [failedTasks, setFailedTasks] = useState<FailureReason[]>([])
    const [taskStat, setStat] = useState<string>("")
    const [reasonId, setId] = useState(-1)

    const failedSelection = useRef<HTMLSelectElement>(null)

    const onSelectChange = useCallback(() => {
        if (failedSelection.current) {
            setId(failedSelection.current!.selectedIndex)
        }
    }, []) // Actually failedTasks won't change

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
            const failedTasksLocal : FailureReason[] = []
            // while shift will change config prop, which is not a best
            // practice
            for (let i = 1; i <= config.tasks.length ; i++) {
                const { waitMessage, task } = config.tasks[i - 1]
                setStat(`[${i}/${config.tasks.length}]: ${waitMessage}`)
                // ! stale closure
                // `${elapsed.toPrecision(2)} s`)
                const stat = await task
                if (stat) {
                    failedTasksLocal.push(stat)
                }
            }
            clearInterval(itvId)
            setElapsed((Date.now() - nowTime) / 1000)
            setFailedTasks(failedTasksLocal)
            // config.performanceResult = `Outcome: ${failedTasks.length}/${total}`
            if (failedTasksLocal.length && failedSelection.current) {
                // Dom manipulation is not a best practice in react.
                // failedSelection.current.add()
                setRevealed(true)
                onSelectChange()
            }
            config.resolve()
        }
        logger()
        return () => { }
    })
    // But useEffect will be called again if it is unmounted and mouneted back.
    return <div>
        <label>{`${taskStat} -- ${elapsed.toFixed(4)}`}</label>
        <div hidden={!resultRevealed}>{
            `Outcome: ${config.tasks.length - failedTasks.length}/` +
            `${config.tasks.length}, Failed: ${failedTasks.length}`
        }
        </div>
        <div hidden={!resultRevealed}>
            Reason id:
            <select ref={failedSelection} onChange={onSelectChange}>{
                failedTasks.map(({id}) =>
                    <option key={`${id}`} value={id}>{id}</option>)
            }
            </select>
        </div>
        <div hidden={!resultRevealed}>{
            reasonId >= 0 && failedTasks.length >= 1 ?
                failedTasks[reasonId].reason : ""
        }
        </div>
    </div>
}
