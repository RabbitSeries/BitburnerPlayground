import type {
	CodingContractName,
	CodingContractObject,
	CodingContractSignatures,
	NS,
	ScriptArg
} from "@ns"
import { ScanAllServers } from "/Hack/HackHelpers"
// Don't import {type NS} from "@ns"
// instead import type {NS} from "@ns"
export async function SolveContract(ns: NS, args: ScriptArg[] = []) {
	const ContractName = "Spiralize Matrix" as CodingContractName
	const total = 100
	const now = Date.now()
	if (args.length === 0) {
		for (const host of ["home", ...ScanAllServers(ns).sorted]) {
			ns.ls(host, ".cct").forEach((file) => {
				const contract = ns.codingcontract.getContract(file, host)
				const result = solveContract(contract)
				ns.tprint(host, ": ", ns.codingcontract.attempt(result, file, host))
			})
		}
	} else if (args[0] === "TEST") {
		// ================================================================Test
		const susccess = await RunTests(ns, ContractName, total)
		ns.tprint(`${susccess}/${total}`)
	} else if (args[0] === "ALL") {
		for (const [Name] of Object.entries(ContractSolves)) {
			// const thisNow = Date.now()
			ns.tprint(`${Name}: ${await RunTests(ns, Name as CodingContractName, total)}/${total}`)
			// ns.tprint("This costs: ", ns.tFormat(Date.now() - thisNow, true))
		}
	} else {
		// ================================================================Dev
		const filename = ns.codingcontract.createDummyContract(ContractName)
		const contract = ns.codingcontract.getContract(filename, "home")
		await ns.prompt(contract.type + "\n" + contract.description)
		const result = solveContract(contract)
		const submit = await ns.prompt(`${result}`)
		if (result === null || !submit) {
			return
		}
		const submission = ns.codingcontract.attempt(result, filename, "home")
		if (submission.length === 0) {
			ns.tprint("Failed on: ", contract.data)
			ns.tprint("My guess: ", result)
			return
		} else {
			ns.rm(filename)
			await ns.prompt("Success: " + contract.numTriesRemaining())
		}
	}
	ns.tprint("Total cost: ", ns.tFormat(Date.now() - now, true))
}

export async function main(ns: NS) {
	return SolveContract(ns, ns.args)
}
// Add this to avoid eslint matching, just erase the syntax
function solveContract<T extends CodingContractName>(
	contract: Extract<CodingContractObject, { type: T }>
) {
	return ContractSolves[contract.type](contract)
}
export async function RunTests(ns: NS, ContractName: CodingContractName, times: number) {
	let count = 0
	for (let i = 0; i < times; i++) {
		try {
			const filename = ns.codingcontract.createDummyContract(ContractName)
			const contract = ns.codingcontract.getContract(filename, "home")
			const result = solveContract(contract)
			if (
				result === null ||
				ns.codingcontract.attempt(result, filename, "home").trim().length === 0
			) {
				ns.tprint("Failed on: ", contract.data)
				ns.tprint("My guess: ", result)
				continue
			}
			ns.rm(filename)
			count++
		} catch (e) {
			ns.tprint(e)
		}
	}
	return count
}

const AlgorithmicStockTraderSolver = (TransN: number, prices: number[]): number => {
	const DayN = prices.length
	prices = [0, ...prices] /* Index from 1 */
	const holding = Array<number>(TransN + 1).fill(0),
		sold = Array<number>(TransN + 1).fill(0)
	for (let day = 1; day <= DayN; day++) {
		for (let trans = TransN; trans >= 0; trans--) {
			holding[trans] = Math.max(
				day > 1 ? holding[trans] : -Infinity /* Impossible holding at day 0 */,
				sold[trans] - prices[day]
			)
			sold[trans] = Math.max(
				sold[trans],
				day > 1 && trans > 0
					? holding[trans - 1] + prices[day]
					: -Infinity /* Impossible holding at trans -1*/
			)
		}
	}
	return sold[TransN]
}

// heuristics
// const UniquePathsInAGridSolver = (graph: number[][]) => {
//     const rows = graph.length, cols = graph[0].length
//     const isValid = (x: number, y: number) => x >= 0 && y >= 0 && x < rows && y < cols && graph[x][y] !== 1
//     const begin = [0, 0]
//     const paths = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
//     const q = [begin]
//     const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false))
//     visited[0][0] = true
//     paths[0][0] = 1
//     while (q.length > 0) {
//         const [x, y] = q.shift()!
//         for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
//             if (isValid(nx, ny)) {
//                 paths[nx][ny] += paths[x][y]
//                 if (!visited[nx][ny]) {
//                     visited[nx][ny] = true
//                     q.push([nx, ny])
//                 }
//             }
//         }
//     }
//     return paths[rows - 1][cols - 1]
// }

// Took some time to prove the concept of parity:
const Parity = (data: (0 | 1)[]) =>
	data.map((v, i) => (i === 0 || v === 0 ? 0 : i)).reduce((a, b) => a ^ b, 0)

const HammingEncode = (data: number) => {
	const binary = [...data.toString(2)].map((v) => parseInt(v)) as (0 | 1)[]
	const CorrectionCodeBitsN = (dataLen: number) => {
		//  2^k  - 1 >= n+k
		let l = 0,
			r = Math.floor(3 + Math.log2(dataLen))
		let best = 0
		while (l <= r) {
			const mid = (l + r) >> 1
			if (2 ** mid - 1 >= dataLen + mid) {
				best = mid
				r = mid - 1
			} else {
				l = mid + 1
			}
		}
		return best
	}
	const corrN = CorrectionCodeBitsN(binary.length)
	let mixed = 0
	const totalLen = corrN + binary.length
	const encoded = Array.from(
		{ length: totalLen + 1 },
		(_, j) => ((j & (j - 1)) === 0 ? 0 : binary[mixed++]) // original correction bits should be 0
	)
	const parity = [...Parity(encoded).toString(2)]
	// From bit 1 to bit k, mix into encoded in appropriate decode index, hamming code ues 2^i
	parity
		.reverse()
		.map((v) => parseInt(v))
		.forEach((v, i) => (encoded[2 ** i] |= v))
	encoded[0] = encoded.reduce((a, b) => (a ^ b) as 0 | 1, 0) // Mix the extended bit, make the 1 bit's count even
	return encoded.join("")
}

const HammingDecode = (data: string) => {
	const binary = [...data].map((v) => parseInt(v)) as (0 | 1)[]
	const verification = Parity(binary)
	binary[verification] ^= 1 // Reverse this bit if 1's count is not even and verification is not 0, this is actually wrong, but whatever
	return parseInt(binary.map((v, i) => ((i & (i - 1)) === 0 ? "" : v)).join(""), 2)
}

// Use this and "add missing properties" to generate all solutions
// export const ContractSolves: Record<CodingContractName, ()=>null>
export const ContractSolves: {
	[T in CodingContractName]: ({
		data
	}: Extract<CodingContractObject, { type: T }>) => CodingContractSignatures[T][1] | null
} = {
	"Find Largest Prime Factor": ({ data }) => {
		const factor = (input: number) => {
			for (let i = 2; i <= Math.floor(Math.sqrt(input)); i++) {
				if (input % i === 0) {
					input /= i
					return i
				}
			}
		}
		while (data >= 2) {
			const prime = factor(data)
			if (prime !== undefined) {
				data /= prime
			} else {
				break
			}
		}
		return data
	},
	"Subarray with Maximum Sum": ({ data }) => {
		const maxSum: number[] = [0, ...data]
		const prefix = [0]
		data.forEach((v, i) => prefix.push(v + prefix[i]))
		let max = -Infinity
		for (let i = 1; i <= data.length; i++) {
			for (let j = i - 1; j >= 1; j--) {
				const range = prefix[i] - prefix[j]
				maxSum[i] = Math.max(maxSum[j] + range, maxSum[i])
			}
			max = Math.max(maxSum[i], max)
		}
		return max
	},
	"Total Ways to Sum": ({ data: num }) => {
		const count = Array.from<number[]>({ length: num + 1 }).map(() => new Map<number, number>())
		count[0].set(0, 1)
		for (let i = 1; i <= num; i++) {
			for (let j = i; j <= num; j++) {
				for (const [contains, ways] of count[j - i]) {
					count[j].set(contains + 1, (count[j].get(contains + 1) ?? 0) + ways)
				}
			}
		}
		return count[num]
			.entries()
			.filter(([contains]) => contains >= 2)
			.map(([, ways]) => ways)
			.reduce((a, b) => a + b, 0)
	},
	"Total Ways to Sum II": ({ data }) => {
		const num = data[0],
			part = data[1]
		const ways = Array.from({ length: num + 1 }, () => 0)
		ways[0] = 1
		for (let i = 1; i <= part.length; i++) {
			for (let j = part[i - 1]; j <= num; j++) {
				ways[j] += ways[j - part[i - 1]]
			}
		}
		return ways[num]
	},
	"Spiralize Matrix": ({ data }: { data: number[][] }) => {
		const col_row = [data[0].length, data.length - 1]
		let direction = 0,
			i = 0,
			j = 0
		const dx = [0, 1, 0, -1],
			dy = [1, 0, -1, 0]
		const result: number[] = []
		while (col_row[direction % 2] > 0) {
			for (let s = 0; s < col_row[direction % 2] - 1; s++) {
				result.push(data[i][j])
				i += dx[direction]
				j += dy[direction]
			}
			result.push(data[i][j])
			if (direction % 2 === 0) {
				col_row[0]--
			} else {
				col_row[1]--
			}
			direction = (direction + 1) % 4
			i += dx[direction]
			j += dy[direction]
		}
		return result
		// const rows = data.length, cols = data[0].length
		// const visited = Array.from({ length: rows }, () => Array.from<boolean>({ length: cols }).fill(false))
		// const isValid = (nextI: number, nextJ: number) => nextI >= 0 && nextI < rows && nextJ >= 0 && nextJ < cols
		// let direction = 0, i = 0, j = 0
		// const dx = [0, 1, 0, -1], dy = [1, 0, -1, 0]
		// const result: number[] = []
		// while (isValid(i, j) && !visited[i][j]) {
		//     visited[i][j] = true
		//     result.push(data[i][j])
		//     const nextI = i + dx[direction], nextJ = j + dy[direction]
		//     if (!isValid(nextI, nextJ) || visited[nextI][nextJ]) {
		//         direction = (direction + 1) % 4
		//     }
		//     i += dx[direction]
		//     j += dy[direction]
		// }
	},
	"Array Jumping Game": ({ data }) => {
		const dfs = (i: number): boolean => {
			if (i >= data.length - 1) return true
			for (let j = i + data[i]; j >= i + 1; j--) {
				if (dfs(j)) {
					return true
				}
			}
			return false
		}
		return +dfs(0) as 0 | 1
	},
	"Array Jumping Game II": ({ data }) => {
		if (data[0] === 0) {
			return 0
		}
		const dp = Array.from({ length: data.length }, () => Infinity)
		dp[0] = 0 // Min jumps from i reaching j, locate at 0 at first
		for (let i = 0; i < data.length; i++) {
			// from location i
			// reaching
			for (let j = i + 1; j <= Math.min(i + data[i], data.length - 1); j++) {
				// Jumped 1 ~ data[i] to locate at index i+j
				dp[j] = Math.min(dp[i] + 1, dp[j])
			}
		}
		const minJmp = dp[data.length - 1]
		return minJmp === Infinity ? 0 : minJmp
	},
	"Merge Overlapping Intervals": ({ data }) => {
		data.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))
		const sorted = [data[0]]
		for (const [l, r] of data.slice(1)) {
			const last = sorted.slice(-1)[0]
			if (l > last[1]) {
				sorted.push([l, r])
			} else {
				last[1] = Math.max(last[1], r)
			}
		}
		return sorted
	},
	"Generate IP Addresses": ({ data }) => {
		const ipList: string[] = []
		const dfs = (i: number, ip: string[]) => {
			if (i === data.length) {
				if (ip.length === 4) {
					ipList.push(ip.join("."))
				}
				return
			}
			for (let j = i; j < i + 3 && ip.length < 4 && (j === i || data[i] !== "0"); j++) {
				const nextGroup = data.slice(i, j + 1)
				if (parseInt(nextGroup) > 255) {
					break
				}
				const nextIp = [...ip, nextGroup]
				dfs(j + 1, nextIp)
			}
		}
		dfs(0, [])
		return ipList
	},
	"Algorithmic Stock Trader I": ({ data: parsed }) => {
		let minBuyPrice = Infinity,
			profit = -Infinity
		for (const price of parsed) {
			minBuyPrice = Math.min(price, minBuyPrice)
			profit = Math.max(profit, price - minBuyPrice)
		}
		return Math.max(profit, 0)
	},
	"Algorithmic Stock Trader II": ({ data: parsed }) => {
		const prices = [Infinity, ...parsed]
		return prices
			.map((v, i) => v - prices[i - 1])
			.filter((v) => v > 0)
			.reduce((a, b) => a + b, 0)
	},
	"Algorithmic Stock Trader III": ({ data }) => AlgorithmicStockTraderSolver(2, data),
	"Algorithmic Stock Trader IV": ({ data: parsed }) => {
		// ! This is something new, I have another statemachine solution, but complex
		return AlgorithmicStockTraderSolver(parsed[0], parsed[1])
	},
	"Minimum Path Sum in a Triangle": ({ data }) => {
		const dp = Array.from({ length: data.length }, () => 0)
		for (let i = 0; i < data.length; i++) {
			for (let j = data[i].length - 1; j >= 0; j--) {
				if (i > 0 && j === data[i].length - 1) {
					dp[j] = dp[j - 1] // The last element in each row should use last row's last element's min sum at first
				}
				dp[j] += data[i][j] // Each element should use last row's j's min path sum, then plus data[i][j] to the sum
				if (j > 0) {
					dp[j] = Math.min(dp[j - 1] + data[i][j], dp[j])
				}
			}
		}
		return Math.min(...dp) // Reaching the last row is definite, just min them all
		// heuristics
		// const endRow = data.length - 1
		// const minSum = Array.from({ length: data.length }, (_, i) => Array.from({ length: data[i].length }, () => Infinity))
		// const q: { i: number, j: number, sum: number }[] = [{ i: 0, j: 0, sum: data[0][0] }]
		// minSum[0][0] = data[0][0]
		// let min = Infinity
		// while (q.length > 0) {
		//     const { i, j, sum } = q.shift()!
		//     if (i === endRow) {
		//         min = Math.min(min, sum)
		//         continue
		//     }
		//     if (minSum[i][j] < sum) {
		//         continue
		//     }
		//     for (const nj of [j, j + 1]) {
		//         const ni = i + 1
		//         if (ni <= endRow && nj < minSum[ni].length && (minSum[ni][nj] === -1 || minSum[ni][nj] > (sum + data[ni][nj]))) {
		//             minSum[ni][nj] = sum + data[ni][nj]
		//             q.push({ i: ni, j: nj, sum: sum + data[ni][nj] })
		//         }
		//     }
		// }
		// return min
	},
	"Unique Paths in a Grid I": ({ data: [rows, cols] }) => {
		const dp = Array.from({ length: cols }, () => 0)
		dp[0] = 1
		for (let i = 0; i < rows; i++) {
			for (let j = 1; j < cols; j++) {
				dp[j] += dp[j - 1] // const [nx, ny] of [[x + 1, y], [x, y + 1], dp[i][j] = dp[i-1][j] + dp[i-1][j-1]
			}
		}
		return dp[cols - 1]
	},
	"Unique Paths in a Grid II": ({ data: graph }) => {
		const rows = graph.length,
			cols = graph[0].length
		const dp = Array.from({ length: cols }, () => 0)
		dp[0] = 1
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (graph[i][j] === 1) {
					dp[j] = 0 // Unreachable Overwrite the data
				} else if (j + 1 < cols) {
					dp[j + 1] += dp[j]
				}
			}
		}
		return dp[cols - 1]
	},
	"Shortest Path in a Grid": ({ data: graph }) => {
		const rows = graph.length,
			cols = graph[0].length
		const isValid = (x: number, y: number) =>
			x >= 0 && y >= 0 && x < rows && y < cols && graph[x][y] !== 1
		const pq: { x: number; y: number; path: string }[] = [{ x: 0, y: 0, path: "" }]
		const shortest = Array.from({ length: rows }, () => Array.from({ length: cols }, () => -1))
		shortest[0][0] = 0
		const dx = [-1, 1, 0, 0],
			dy = [0, 0, -1, 1]
		const dir = "UDLR"
		while (pq.length > 0) {
			const { x, y, path } = pq.shift()!
			if (x === rows - 1 && y == cols - 1) {
				return path
			}
			if (path.length > shortest[x][y]) {
				continue
			}
			for (let i = 0; i < 4; i++) {
				const next = { x: x + dx[i], y: y + dy[i], path: path + dir[i] }
				if (
					isValid(next.x, next.y) &&
					(shortest[next.x][next.y] === -1 || next.path.length < shortest[next.x][next.y])
				) {
					shortest[next.x][next.y] = next.path.length
					pq.push(next)
					pq.sort((a, b) => a.path.length - b.path.length)
				}
			}
		}
		return ""
	},
	"Sanitize Parentheses in Expression": ({ data }) => {
		const validate = (input: string) => {
			const stack: string[] = []
			for (const char of input) {
				if (char === "(") {
					stack.push(char)
				} else if (char === ")") {
					while (stack.length > 0 && stack.slice(-1)[0] !== "(") {
						stack.pop()
					}
					if (stack.length > 0 && stack.slice(-1)[0] === "(") {
						stack.pop()
					} else {
						return false
					}
				}
			}
			return stack.length === 0
		}
		let q: string[] = [data]
		if (validate(q[0])) {
			return q
		}
		const visited = new Set([data])
		while (q.length > 0) {
			const nextq: string[] = []
			const validated = q.filter((exp) => validate(exp))
			if (validated.length > 0) {
				return validated
			}
			for (const exp of q) {
				for (let i = 0; i < exp.length; i++) {
					if (exp[i] === "(" || exp[i] === ")") {
						const nextExp = `${exp.slice(0, i)}${exp.slice(i + 1)}`
						if (!visited.has(nextExp)) {
							visited.add(nextExp)
							nextq.push(nextExp)
						}
					}
				}
			}
			q = nextq
		}
		return [""]
	},
	"Find All Valid Math Expressions": ({ data }) => {
		// ! This is something new
		const digits = data[0],
			target = data[1]
		const expList: string[] = []
		const dfs = (i: number, exp: string, current: number, lastMatched: number) => {
			if (i === digits.length) {
				// const parsed = evaluate(exp)
				if (current === target) {
					expList.push(exp.replaceAll("(", "").replaceAll(")", ""))
				}
				return
			}
			for (let j = i + 1; j <= digits.length; j++) {
				const slice = digits.slice(i, j)
				if (slice.length > 1 && slice.startsWith("0")) {
					break
				}
				const seek = parseInt(`${slice}`)
				if (exp.length === 0) {
					dfs(j, `${slice}`, seek, seek)
				} else {
					dfs(j, `${exp}+${slice}`, current + seek, seek)
					dfs(j, `${exp}-${slice}`, current - seek, -seek)
					dfs(
						j,
						`${exp}*${slice}`,
						current - lastMatched + lastMatched * seek,
						lastMatched * seek
					)
				}
			}
		}
		dfs(0, "", 0, 0)
		return [...new Set(expList)]
	},
	"HammingCodes: Integer to Encoded Binary": ({ data }) => {
		return HammingEncode(data)
	},
	"HammingCodes: Encoded Binary to Integer": ({ data }) => {
		return HammingDecode(data)
	},
	"Proper 2-Coloring of a Graph": ({ data }) => {
		const vertexN = data[0],
			edges = data[1]
		const graph = Array.from({ length: vertexN }, () => new Set<number>())
		const cliques = new Set<number>()
		for (const [u, v] of edges) {
			graph[u].add(v)
			graph[v].add(u)
			cliques.add(u)
			cliques.add(v)
		}
		const floodGraph = (
			entry: number,
			color: boolean,
			colored: Map<number, boolean>
		): boolean => {
			const q: [number, boolean][] = [[entry, color]]
			while (q.length > 0) {
				const [node, fill] = q.shift()!
				for (const adj of graph[node]) {
					if (colored.has(adj)) {
						if (colored.get(adj)! === fill) {
							return false
						}
					} else {
						colored.set(adj, !fill)
						q.push([adj, !fill])
					}
				}
			}
			return true
		}
		const colored = new Map<number, boolean>()
		for (const entry of cliques.values()) {
			if (colored.has(entry)) {
				continue
			}
			if (!floodGraph(entry, false, colored)) {
				return []
			}
		}
		return Array.from({ length: vertexN }, (_, i) => +(colored.get(i) ?? false)) as (0 | 1)[]
	},
	"Compression I: RLE Compression": ({ data }) => {
		let index = 0
		const result: { len: number; char: string }[] = []
		while (index < data.length) {
			if (
				result.length === 0 ||
				data[index] !== data[index - 1] ||
				result.slice(-1)[0].len >= 9
			) {
				result.push({ len: 1, char: data[index] })
			} else {
				result.slice(-1)[0].len++
			}
			index++
		}
		return result.map(({ len, char }) => `${len}${char}`).join("")
	},
	"Compression II: LZ Decompression": ({ data }) => {
		let result = ""
		let index = 0
		let isReference = false
		while (index < data.length) {
			if (isReference) {
				const len = data[index].charCodeAt(0) - "0".charCodeAt(0)
				index++
				if (len !== 0) {
					const offset = data[index].charCodeAt(0) - "0".charCodeAt(0)
					const content = result.slice(-offset)
					// Copy len/conten.length's content
					// Remain length in content is len%content.length, index apply -1
					// End index is excluded in slice api, apply + 1
					result +=
						Array.from(
							{ length: Math.floor(len / content.length) },
							() => content
						).join("") + content.slice(0, len % content.length)
					index++
				}
				isReference = false
			} else {
				const len = data[index].charCodeAt(0) - "0".charCodeAt(0)
				result += data.slice(index + 1, index + 1 + len)
				index += len + 1
				isReference = true
			}
		}
		return result
	},
	"Compression III: LZ Compression": ({ data }) => {
		type state = {
			index: number
			isReference: boolean
			content: string // Carry this state's content information, this won't be hashed. This content should keep the same property with mapped value.
		}
		const key = (s: state) => `${s.index},${s.isReference}`
		const findLongestCommon = (preEnd: number) => {
			let res: { len: number; pre: number }[] = []
			let maxLen = -Infinity
			for (let i = 1; i <= 9; i++) {
				// pre
				const pre = preEnd - (i - 1)
				if (pre < 0) {
					break
				}
				for (let j = 0; j < 9; j++) {
					const content = data.slice(pre, pre + j + 1)
					if (data.slice(preEnd + 1).startsWith(content) && content.length >= maxLen) {
						if (content.length > maxLen) {
							res = []
						}
						res.push({ len: content.length, pre: i })
						maxLen = content.length
					}
				}
			}
			return res
		}
		const start: state = {
			index: -1,
			isReference: true,
			content: ""
		}
		// const endKey = key({index: data.length-1, isReference : true | false, content : any})
		// shortest[state] => shortest[state]+nextState.length
		// nextState: not isReference-> nextReference -> longest common string
		//            isReference    -> keep raw      -> i~n compress
		const shortest = new Map<string, number>([[key(start), 0]]) // HashKey => minLength
		const q: state[] = [start]
		const sorter = (a: state, b: state) =>
			a.index === b.index ? a.content.length - b.content.length : a.index - b.index
		const sift_down = (i: number) => {
			while (i < q.length) {
				let minimal = i
				if (i * 2 + 1 < q.length && sorter(q[i * 2 + 1], q[minimal]) < 0) {
					minimal = i * 2 + 1
				}
				if (i * 2 + 2 < q.length && sorter(q[i * 2 + 2], q[minimal]) < 0) {
					minimal = i * 2 + 2
				}
				if (minimal !== i) {
					;[q[i], q[minimal]] = [q[minimal], q[i]]
					i = minimal
				} else {
					break
				}
			}
		}
		const sift_up = (i: number) => {
			while (i) {
				const p = Math.floor((i - 1) / 2)
				if (sorter(q[i], q[p]) < 0) {
					;[q[i], q[p]] = [q[p], q[i]]
					i = p
				} else {
					break
				}
			}
		}
		const heappush = (nextState: state) => {
			const nextKey = key(nextState)
			if (!shortest.has(nextKey) || shortest.get(nextKey)! > nextState.content.length) {
				// Change > to >= to retrieve all results
				shortest.set(nextKey, nextState.content.length)
				q.push(nextState)
				sift_up(q.length - 1)
			}
		}
		const heappop = () => {
			const s = q[0]
			if (q.length == 1) {
				q.pop()
			} else {
				;[q[0], q[q.length - 1]] = [q[q.length - 1], q[0]]
				q.pop()
				sift_down(0)
			}
			return s
		}
		let result = "" // Change result to [] to retrieve all results
		while (q.length > 0) {
			const s = heappop()
			if (shortest.get(key(s))! > s.content.length) {
				continue
			} // shortes[s] === s.content.length from here
			if (result.length !== 0 && s.content.length !== result.length) {
				// Result has been found, and the latter result is not optimal result, clear heap
				break
			}
			if (s.index === data.length - 1) {
				// Reached end
				result = s.content
				continue // or just break here
			}
			if (s.isReference) {
				for (let index = s.index; index < data.length && index < s.index + 10; index++) {
					heappush({
						index,
						isReference: false,
						content: `${s.content}${index - s.index}${data.slice(s.index + 1, index + 1)}`
					})
				}
			} else {
				for (const { len, pre } of [...findLongestCommon(s.index), { len: 0, pre: -1 }]) {
					heappush({
						index: s.index + len,
						isReference: true,
						content: `${s.content}${pre === -1 ? 0 : `${len}${pre}`}`
					})
				}
			}
		}
		return result
	},
	"Encryption I: Caesar Cipher": ({ data: parsed }) => {
		const plaintext = parsed[0],
			shift = parsed[1]
		const raw = Array.from({ length: 26 }, (_, i) => String.fromCharCode("A".charCodeAt(0) + i))
		const shifted = [
			...raw.slice((raw.length - shift) % 26),
			...raw.slice(0, (raw.length - shift) % 26)
		]
		return [...plaintext]
			.map((char) => (char === " " ? char : shifted[char.charCodeAt(0) - "A".charCodeAt(0)]))
			.join("")
	},
	"Encryption II: Vigenère Cipher": ({ data: parsed }) => {
		const square = Array.from({ length: 26 }).map((_, rowBase) =>
			Array.from({ length: 26 })
				.map((_, col) => String.fromCharCode(((rowBase + col) % 26) + "A".charCodeAt(0)))
				.join("")
		)
		const plaintext = parsed[0],
			keyword = parsed[1]
		return [...plaintext]
			.map(
				(text, i) =>
					square[text.charCodeAt(0) - "A".charCodeAt(0)][
						keyword[i % keyword.length].charCodeAt(0) - "A".charCodeAt(0)
					]
			)
			.join("")
	},
	"Square Root": ({ data }) => {
		// TODO Add Digit by digit method
		let l = 0n,
			r = data
		let best = 0n
		while (l <= r) {
			const mid = l + ((r - l) >> 1n) // caution on overflow, -- C++ Primer
			if (mid ** 2n <= data) {
				best = mid
				l = mid + 1n
			} else {
				r = mid - 1n
			}
		}
		const gap = data - best ** 2n
		return (best + 1n) ** 2n - data > gap ? best : best + 1n
	}
}

// console.log(((contract) => {
//     const data = contract.data
//     const endRow = data.length - 1
//     const minSum = Array.from({ length: data.length }, (_, i) => Array.from({ length: data[i].length }, () => Infinity))
//     const q: { i: number, j: number, sum: number }[] = [{ i: 0, j: 0, sum: data[0][0] }]
//     minSum[0][0] = data[0][0]
//     let min = Infinity
//     while (q.length > 0) {
//         const { i, j, sum } = q.shift()!
//         if (i === endRow) {
//             min = Math.min(min, sum)
//             continue
//         }
//         if (minSum[i][j] < sum) {
//             continue
//         }
//         for (const nj of [j, j + 1]) {
//             const ni = i + 1
//             if (ni <= endRow && nj < minSum[ni].length && (minSum[ni][nj] === -1 || minSum[ni][nj] > (sum + data[ni][nj]))) {
//                 minSum[ni][nj] = sum + data[ni][nj]
//                 q.push({ i: ni, j: nj, sum: sum + data[ni][nj] })
//             }
//         }
//     }
//     return min
// })({ data: [[1], [9, 5], [4, 5, 4], [2, 2, 5, 5], [8, 2, 1, 4, 4], [1, 7, 3, 6, 2, 8], [9, 2, 2, 2, 6, 4, 6], [9, 8, 3, 2, 9, 8, 4, 5], [1, 9, 8, 8, 6, 2, 6, 4, 7], [8, 6, 5, 6, 3, 8, 8, 3, 3, 1], [7, 9, 9, 2, 1, 6, 2, 5, 5, 5, 4]] }))
