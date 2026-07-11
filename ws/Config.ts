export enum LoggingLevel {
    Off,
    Error,
    Warning,
    Info,
    Debug,
    Verbose
}

export type Config = {
    playground: string
    port: number
    definitionFile: string
    filters: string[]
    pushAllOnStart: boolean
    servers: string[]
    refreshDefinitionFile: boolean
    cleanServers: boolean
    loggingLevel: number
}

export function defineConfig(c : Config){
    return c
}

export default defineConfig({
    playground: "./dist/out",
    definitionFile: "./NetscriptDefinitions.d.ts",
    port: 12525,
    filters: [".js", ".txt"],
    pushAllOnStart: true,
    servers: ["home"],
    refreshDefinitionFile: true,
    cleanServers: true,
    loggingLevel: LoggingLevel.Error
})
