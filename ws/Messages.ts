type RequestNoParam = {
	jsonrpc: "2.0"
	id: number
	method: string
}
export type Request<T = undefined> = RequestNoParam & { params?: T }
export type Response<T = undefined> = RequestNoParam & {
	result?: T
	error?: object | string | number
}
type FileName = { filename: string }
type Server = { server: string }
type Content = { content: string }
type FileServer = FileName & Server
export interface PushFile extends Request<FileServer & Content> {
	method: "pushFile"
}
type Status = "OK" | undefined
export type PushFileResponse = Response<Status>
export interface GetFile extends Request<FileServer> {
	method: "getFile"
}
export type GetFileResponse = Response<Status>
export interface GetFileMetadata extends Request<FileServer> {
	method: "getFileMetadata"
}
type Metadata = FileName & { atime: string; btime: string; mtime: string }
export type GetFileMetadataResponse = Response<Metadata>
export interface DeleteFile extends Request<FileServer> {
	method: "deleteFile"
}
export type DeleteFileResponse = Response<Status>
export interface GetFileNames extends Request<Server> {
	method: "getFileNames"
}
export type GetFileNamesResponse = Response<string[]>
export interface GetAllFiles extends Request<Server> {
	method: "getAllFiles"
}
export type GetAllFilesResponse = Response<FileName & Content>
export interface GetAllFileMetadata extends Request<Server> {
	method: "getAllFileMetadata"
}
export type GetAllFileMetadataResponse = Response<Metadata[]>
export interface CalculateRam extends Request<FileServer> {
	method: "calculateRam"
}
export type CalculateRamResponse = Response<number>
export interface GetDefinitionFile extends Request {
	method: "getDefinitionFile"
}
export type GetDefinitionFileResponse = Response<string>
export interface GetSaveFile extends Request {
	method: "getSaveFile"
}
export type GetSaveFileResponse = Response<{ identifier: string; binary: string; save: string }>
export interface GetAllServers extends Request {
	method: "getAllServers"
}
export type GetAllServersResponse = Response<
	{ hostname: string; hasAdminRights: boolean; purchaseByPlayer: boolean }[]
>
