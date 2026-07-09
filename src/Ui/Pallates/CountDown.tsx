import React, { useEffect, useState, type ReactNode } from "react"
export function CountDown({ timer, children }: { timer: number; children: ReactNode }) {
    const [remainingTime , setRemain] = useState(timer)
    useEffect(() => {
        let remain = remainingTime
        const itv = setInterval(() => {
            if(remainingTime!=0){
                remain = Math.max(remain - 1000, 0)
                setRemain(remain)
            }
        }, 1000)
        return () => clearInterval(itv)
    })
    return (
        <div>
            <span>Remaining time: </span>
            <span>{(remainingTime / 1000).toFixed(2)}s</span>
            <span>{children}</span>
        </div>
    )
}
