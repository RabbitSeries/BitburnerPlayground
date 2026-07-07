import WebSocket, { WebSocketServer } from "ws"
import { config, LoggingLevel } from "./Config.js"
import {
	DeleteFileResponse,
	GetDefinitionFileResponse,
	GetFileNamesResponse,
	PushFileResponse,
	type DeleteFile,
	type GetDefinitionFile,
	type PushFile,
	type GetFileNames,
	AnyResponse
} from "./Messages.js"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import glob from "fast-glob"
import { watch } from "chokidar"
import { existsSync, rmSync } from "node:fs"

class Handler {
	private messageHandlers: Map<number, { handle: (json: object) => Promise<void>, method: string }> = new Map()
	private messageKeys: number[] = []
	public setHandler(id: number, method: string, handler: (json: object) => Promise<void>) {
		this.messageHandlers.set(id, { handle: handler, method })
		this.messageKeys.push(id)
	}
	public async handleMessage(json: string) {
		const obj = JSON.parse(json)
		const r = AnyResponse.safeParse(obj)
		if (r.success) {
			const id = r.data!.id
			if (this.messageHandlers.has(id)) {
				const { handle, method } = this.messageHandlers.get(id)!
				await handle(obj).catch((reason) =>
					console.log(`Error when handling message ${{ json, id }} - ${reason}`)
				)
				console.log({ stat: "OK", id: r.data.id, method })
			} else {
				console.log(`Incomming message does not have a registered handler.`)
			}
		} else {
			console.log("Failed to find id in incomming message ${json}.")
			console.log(`Error: ${r.error.message}.`)
		}
		if (this.messageHandlers.size > 100) {
			this.messageHandlers.delete(this.messageKeys.shift()!)
		}
	}
}

const handler = new Handler()
let messageId = 0

const ingameFileName = (file: string) => path.relative(config.playground, file).replaceAll(/\\/g, "/")

const validateFilenames = (filenames: string[]) =>
	filenames.filter((name) => config.filters.has(path.extname(name)))

async function iterateServers(func: (server: string) => void | Promise<void>) {
	for (const server of config.servers) {
		await func(server)
	}
}

export async function getDefinitionFile(socket: WebSocket) {
	const defRequest: GetDefinitionFile = {
		jsonrpc: "2.0",
		id: messageId++,
		method: "getDefinitionFile"
	}
	handler.setHandler(defRequest.id, defRequest.method, async (json) => {
		const { error, result } = GetDefinitionFileResponse.parse(json)
		if (!error && result) {
			await writeFile(config.definitionFile, result)
		}
	})
	socket.send(JSON.stringify(defRequest))
}

export async function pushFile(filename: string, socket: WebSocket, server: string) {
	const filePush: PushFile = {
		jsonrpc: "2.0",
		id: messageId++,
		method: "pushFile",
		params: {
			filename: ingameFileName(filename),
			server,
			content: await readFile(filename).then((it) => it.toString())
		}
	}
	handler.setHandler(filePush.id, filePush.method, async (json) => {
		const { error, result } = PushFileResponse.parse(json)
		if (config.loggingLevel <= LoggingLevel.Verbose) {
			console.log({
				PushStat: `${error ? `${error}:${result}` : result}`,
				file: filePush.params!.filename,
				aka: filename,
				server,
				bytes: filePush.params!.content.length
			})
		}
	})
	socket.send(JSON.stringify(filePush))
}

export async function getFilenames(socket: WebSocket, server: string) {
	const filenames = new Promise<string[]>((resolve, reject) => {
		const filenamesRequest: GetFileNames = {
			jsonrpc: "2.0",
			id: messageId++,
			method: "getFileNames",
			params: {
				server
			}
		}
		let finished = false
		setTimeout(() => {
			if (!finished) {
				return reject("Timeout")
			}
		}, 5000)
		handler.setHandler(filenamesRequest.id, filenamesRequest.method, async (json) => {
			const { error, result } = GetFileNamesResponse.parse(json)
			if (!error && result) {
				return resolve(result)
			}
			reject("Failed")
			finished = true
		})
		socket.send(JSON.stringify(filenamesRequest))
	})
	return filenames
}

export async function deleteFile(filename: string, socket: WebSocket, server: string) {
	const fileDeletion: DeleteFile = {
		jsonrpc: "2.0",
		id: messageId++,
		method: "deleteFile",
		params: {
			filename,
			server
		}
	}
	handler.setHandler(fileDeletion.id, fileDeletion.method, async (json) => {
		const { error, result } = DeleteFileResponse.parse(json)
		if (config.loggingLevel <= LoggingLevel.Verbose) {
			console.log({
				DeleteStat: `${error ? `${error}:${result}` : result}`,
				file: fileDeletion.params!.filename,
				server
			})
		}
	})
	socket.send(JSON.stringify(fileDeletion))
}

export async function startWebsocketServer() {
	const server = new WebSocketServer({ port: config.port })
	server.on("connection", async (socket, message) => {
		const mBuf = message.read()
		if (mBuf) {
			console.log(`Incomming message on connection: ${message.read()}`)
		}
		socket.on("message", (data) => {
			try {
				handler.handleMessage(data.toString())
			} catch {
				console.log(`Failed to parse incomming message: ${data}`)
			}
		})
		if (config.cleanServers) {
			await iterateServers((server) => getFilenames(socket, server)
				.then((filenames) => {
					for (const filename of validateFilenames(filenames)) {
						deleteFile(filename, socket, server)
					}
				})
				.catch((err) =>
					console.log(`Failed to retrieve filenames:` +
						`${{ server, err }}`))
			)
		}
		if (config.pushAllOnStart) {
			const filenames = await glob(`${config.playground}/**/*`)
			for (const filename of validateFilenames(filenames)) {
				const p = path.resolve("./src", path.relative(path.resolve("dist", "out"), path.resolve(filename)))
				if (existsSync(p.replace(".js", ".ts")) || existsSync(p.replace(".js", ".tsx"))) {
					iterateServers((server) => pushFile(filename, socket, server))
				} else {
					rmSync(filename)
				}
			}
		}
		if (config.refreshDefinitionFile) {
			getDefinitionFile(socket)
		}
		setupWatcher(socket)
	})
}

function setupWatcher(socket: WebSocket) {
	const watcher = watch(config.playground)
	const addOrChange = (p: string) => {
		if (!config.filters.has(path.extname(p))) {
			return
		}
		for (const server of config.servers) {
			pushFile(p, socket, server)
		}
	}
	watcher.on("add", addOrChange)
	watcher.on("change", addOrChange)
	watcher.on("unlink", (p) => {
		if (!config.filters.has(path.extname(p))) {
			return
		}
		for (const server of config.servers) {
			deleteFile(ingameFileName(p), socket, server)
		}
	})
}
