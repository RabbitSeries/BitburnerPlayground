/**
 * The proper way to pass a ProcessHandle from parent handle to subprocess/child handle is to create a new closer:
 * `{close: () => { 
 *      //clean parent event loop
 *      handle.close() 
 *      }
 * }`
 * @returns void
 */
export interface ProcessHandle {
    close: () => void
}
export class StopToken {
    stopping: boolean = false
    reqeust_stop = () => { this.stopping = true }
    is_stop_requested = () => this.stopping
}
export interface JThread {
    name: string,
    stop_token: StopToken,
    task: Promise<void>
}