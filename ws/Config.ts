export enum LoggingLevel {
    Verbose,
    Error
}

export type Config = {
    playground: string
    port: number
    definitionFile: string
    filters: Set<string>
    pushAllOnStart: boolean
    servers: string[]
    refreshDefinitionFile: boolean
    cleanServers: boolean
    loggingLevel: number
}

export const config: Config = {
    playground: "./dist/out",
    definitionFile: "./NetscriptDefinitions.d.ts",
    port: 12525,
    filters: new Set([".js", ".txt"]),
    pushAllOnStart: true,
    servers: ["home"],
    refreshDefinitionFile: true,
    cleanServers: true,
    loggingLevel: LoggingLevel.Error
}
