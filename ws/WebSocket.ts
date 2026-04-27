import WebSocket, { WebSocketServer } from "ws"
import { config } from "./Config.js"
import type {
	DeleteFile,
	DeleteFileResponse,
	GetDefinitionFile,
	GetDefinitionFileResponse,
	GetFileNames,
	GetFileNamesResponse,
	PushFile,
	PushFileResponse
} from "./Messages.js"
import { readFile, writeFile } from "node:fs/promises"
import { extname, relative } from "node:path"
import glob from "fast-glob"
import { watch } from "chokidar"

const messageHandlers: Map<number, (json: object) => void | Promise<void>> = new Map()
let messageKeys: number[] = []

function setHandler(id: number, handler: (json: object) => void | Promise<void>) {
	messageHandlers.set(id, handler)
	messageKeys.push(id)
}

let messageId = 0

const ingameFileName = (file: string) => relative(config.playground, file).replaceAll(/\\/g, "/")

const validateFilenames = (filenames: string[]) =>
	filenames.filter((name) => config.filters.has(extname(name)))

async function iterateServers(func: (server: string) => void | Promise<void>) {
	for (const server of config.servers) {
		await func(server)
	}
}

async function handleMessage(json: object) {
	if ("id" in json && typeof json["id"] === "number") {
		const id = json["id"]
		if (messageHandlers.has(id)) {
			try {
				await messageHandlers.get(id)!(json)
			} catch (err) {
				console.log(`Error when handling message ${{ json, id }} - ${err}`)
			}
		} else {
			console.log(`Incomming message does not have a registered handler.`)
		}
	} else {
		console.log("Failed to find id in incomming message.")
	}
	console.log(json)
	if (messageHandlers.size > 100) {
		messageKeys.slice(0, 50).map((p) => messageHandlers.delete(p))
		messageKeys = messageKeys.slice(50)
	}
}

export async function getDefinitionFile(socket: WebSocket) {
	const defRequest: GetDefinitionFile = {
		jsonrpc: "2.0",
		id: messageId++,
		method: "getDefinitionFile"
	}
	setHandler(defRequest.id, async (json) => {
		const { error, result } = json as GetDefinitionFileResponse
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
	setHandler(filePush.id, (json) => {
		const { error, result } = json as PushFileResponse
		console.log({
			Pushstat: `${error ?? ""}:${result}`,
			file: filePush.params!.filename,
			aka: filename,
			server,
			bytes: filePush.params!.content.length
		})
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
		setHandler(filenamesRequest.id, async (json) => {
			const { error, result } = json as GetFileNamesResponse
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
	setHandler(fileDeletion.id, (json) => {
		const { error, result } = json as DeleteFileResponse
		console.log({
			Deletestat: `${error ?? ""}:${result}`,
			file: fileDeletion.params!.filename,
			aka: filename,
			server
		})
	})
	socket.send(JSON.stringify(fileDeletion))
}

export async function pushEntirePlayground(socket: WebSocket) {
	const filenames = await glob(`${config.playground}/**/*`)
	for (const file of validateFilenames(filenames)) {
		iterateServers((server) => pushFile(file, socket, server))
	}
}

export async function startWebsocketServer() {
	const server = new WebSocketServer({ port: config.port })
	server.on("connection", async (socket, message) => {
		const mBuf = message.read()
		if (mBuf) {
			console.log(`Incomming message: ${message.read()}`)
		}
		socket.on("message", (data) => {
			try {
				handleMessage(JSON.parse(data.toString()))
			} catch {
				console.log(`Failed to parse incomming message ${data}`)
			}
		})
		if (config.cleanServers) {
			await iterateServers(async (server) => {
				await getFilenames(socket, server)
					.then((filenames) => {
						for (const filename of validateFilenames(filenames)) {
							deleteFile(filename, socket, server)
						}
					})
					.catch((err) => console.log(`Error to retrive filenames: ${{ server, err }}`))
			})
		}
		if (config.pushAllOnStart) {
			pushEntirePlayground(socket)
		}
		if (config.refreshDefinitionFile) {
			getDefinitionFile(socket)
		}
		setupWatcher(socket)
	})
}
function setupWatcher(socket: WebSocket) {
	const watcher = watch(config.playground)
	const addOrChange = (path: string) => {
		if (!config.filters.has(extname(path))) {
			return
		}
		for (const server of config.servers) {
			pushFile(path, socket, server)
		}
	}
	watcher.on("add", addOrChange)
	watcher.on("change", addOrChange)
	watcher.on("unlink", (path) => {
		if (!config.filters.has(extname(path))) {
			return
		}
		for (const server of config.servers) {
			deleteFile(ingameFileName(path), socket, server)
		}
	})
}
