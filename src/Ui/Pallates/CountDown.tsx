import React, { useEffect, useRef, type ReactNode } from "react";
export function CountDown({ timer, children }: { timer: number, children: ReactNode }) {
    const timerSpan = useRef<HTMLSpanElement>(null)
    useEffect(() => {
        const itv = setInterval(() => {
            if (timerSpan.current && timerSpan.current.textContent !== "0") {
                timerSpan.current.textContent = `${Math.max(+timerSpan.current.textContent - 1, 0)}`
            }
        }, 1000)
        return () => clearInterval(itv)
    })
    return <div>
        <span>Remaining time: </span>
        <span ref={timerSpan}>{Math.floor(timer / 1000)}</span>
        <span>{children}</span>
    </div>
}