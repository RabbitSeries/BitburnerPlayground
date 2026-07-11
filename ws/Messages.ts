import { z } from "zod"
type Request<T = undefined> = {
    jsonrpc: "2.0",
    id: number,
    method: string,
    params?: T
}
const FileNameShaped = z.object({ filename: z.string() })
type FileName = z.infer<typeof FileNameShaped>
type Server = { server: string }
const ContentShaped = z.object({ content: z.string() })
type Content = z.infer<typeof ContentShaped>
type FileServer = FileName & Server
export interface PushFile extends Request<FileServer & Content> {
    method: "pushFile"
}
export interface GetFile extends Request<FileServer> {
    method: "getFile"
}
export interface GetFileMetadata extends Request<FileServer> {
    method: "getFileMetadata"
}
export interface DeleteFile extends Request<FileServer> {
    method: "deleteFile"
}
export interface GetFileNames extends Request<Server> {
    method: "getFileNames"
}
export interface GetAllFiles extends Request<Server> {
    method: "getAllFiles"
}
export interface GetAllFileMetadata extends Request<Server> {
    method: "getAllFileMetadata"
}
export interface CalculateRam extends Request<FileServer> {
    method: "calculateRam"
}
export interface GetDefinitionFile extends Request {
    method: "getDefinitionFile"
}
export interface GetSaveFile extends Request {
    method: "getSaveFile"
}
export interface GetAllServers extends Request {
    method: "getAllServers"
}

function ResponseShaped<T extends z.core.SomeType>(t: T) {
    return z.object({
        jsonrpc: z.literal("2.0"),
        id: z.number(),
    }).and(z.union([
        z.object({error: z.any()}), // z.any() is not optional since around https://github.com/susumutomita/TenkaCloud/pull/1619
        z.object({
            result: t// even z.undefined() is not optional
        })
    ]))
}

const StatusShaped = z.literal("OK")
const MetadataShaped = FileNameShaped.extend({ atime: z.string(), btime: z.string(), mtime: z.string() })
export const AnyResponse = ResponseShaped(z.any())
export const PushFileResponse = ResponseShaped(StatusShaped)
export const GetFileResponse = PushFileResponse
export const GetFileMetadataResponse = ResponseShaped(MetadataShaped)
export const DeleteFileResponse = PushFileResponse
export const GetFileNamesResponse = ResponseShaped(z.string().array())
export const GetAllFilesResponse = ResponseShaped(FileNameShaped.extend(ContentShaped.shape))
export const GetAllFileMetadataResponse = ResponseShaped(MetadataShaped.array())
export const CalculateRamResponse = ResponseShaped(z.number())
export const GetDefinitionFileResponse = ResponseShaped(z.string())
export const GetSaveFileResponse = ResponseShaped(z.object({
    identifier: z.string(),
    binary: z.string(),
    save: z.string()
}))
export const GetAllServersResponse = ResponseShaped(z.object({
    hostname: z.string(),
    hasAdminRights: z.boolean(),
    purchaseByPlayer: z.boolean()
}).array())
