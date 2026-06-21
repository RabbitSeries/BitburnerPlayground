import type { CodingContractName, CodingContractObject, CodingContractSignatures } from "@ns"

class SmallHeap<T> {
	constructor(private sorter: (a: T, b: T) => number) { }

	public get size() {
		return this.q.length;
	}
	private q: T[] = []
	private sift_down(i: number) {
		while (i < this.q.length) {
			let minimal = i
			if (i * 2 + 1 < this.size && this.sorter(this.q[i * 2 + 1], this.q[minimal]) < 0) {
				minimal = i * 2 + 1
			}
			if (i * 2 + 2 < this.size && this.sorter(this.q[i * 2 + 2], this.q[minimal]) < 0) {
				minimal = i * 2 + 2
			}
			if (minimal !== i) {
				[this.q[i], this.q[minimal]] = [this.q[minimal], this.q[i]]
				i = minimal
			} else {
				break
			}
		}
	}
	private sift_up = (i: number) => {
		while (i) {
			const p = Math.floor((i - 1) / 2)
			if (this.sorter(this.q[i], this.q[p]) < 0) {
				[this.q[i], this.q[p]] = [this.q[p], this.q[i]]
				i = p
			} else {
				break
			}
		}
	}
	public push = (nextState: T) => {
		this.q.push(nextState)
		this.sift_up(this.size - 1)
	}
	public pop = () => {
		const s = this.q[0]
		if (this.q.length == 1) {
			this.q.pop()
		} else {
			[this.q[0], this.q[this.size - 1]] = [this.q[this.size - 1], this.q[0]]
			this.q.pop()
			this.sift_down(0)
		}
		return s
	}
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
	parity.reverse()
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
	"Total Ways to Sum": ({ data }) => {
		const count = Array.from<number[]>({ length: data + 1 }).map(() => new Map<number, number>())
		count[0].set(0, 1)
		for (let i = 1; i <= data; i++) {
			for (let j = i; j <= data; j++) {
				for (const [contains, ways] of count[j - i]) {
					count[j].set(contains + 1, (count[j].get(contains + 1) ?? 0) + ways)
				}
			}
		}
		return count[data]
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
		console.log("Data: " + `${data}`)
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
		const [vertexN, edges] = [data[0], data[1]]
		const graph = Array.from({ length: vertexN }, () => new Set<number>())
		const cliques = new Set<number>()
		for (const [u, v] of edges) {
			graph[u].add(v)
			graph[v].add(u)
			cliques.add(u)
			cliques.add(v)
		}
		const floodGraph = (entry: number, color: boolean, colored: Map<number, boolean>): boolean => {
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
		const start = {
			index: -1,
			isReference: true,
			content: "" // Carry this state's content information, this won't be hashed. This content should keep the same property with mapped value.
		}
		type State = typeof start;
		const key = (s: State) => `${s.index},${s.isReference}`
		// const endKey = key({index: data.length-1, isReference : true | false, content : any})
		// shortest[state] => shortest[state]+nextState.length
		// nextState: not isReference-> nextReference -> longest common string
		//            isReference    -> keep raw      -> i~n compress
		const shortest = new Map<string, number>([[key(start), 0]]) // HashKey => minLength
		const heappush = (nextState: State) => {
			const nextKey = key(nextState)
			if (!shortest.has(nextKey) || shortest.get(nextKey)! > nextState.content.length) {
				// Change > to >= to retrieve all results
				shortest.set(nextKey, nextState.content.length)
				q.push(nextState)
			}
		}
		const q = new SmallHeap<State>((a, b) =>
			a.index === b.index ? a.content.length - b.content.length : a.index - b.index
		)
		q.push(start)
		let result = "" // Change to [] to retrieve all results
		while (q.size > 0) {
			const s = q.pop()
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
				// Find longgest in common
				const laterPart = data.slice(s.index + 1)
				let res: { index: number; len: number }[] = []
				let maxLen = -Infinity
				for (let i = 1; i <= 9; i++) {
					// pre
					const pre = s.index - (i - 1)
					if (pre < 0) {
						break
					}
					let content = ""
					for (let j = 0; j < 9; j++) {
						content += data[pre + j]
						if (laterPart.startsWith(content) && content.length >= maxLen) {
							if (content.length > maxLen) {
								res = []
							}
							res.push({ index: i, len: content.length })
							maxLen = content.length
						}
					}
				}
				res.push({ len: 0, index: -1 }) // add a new start
				for (const { len, index: pre } of res) {
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
	},
	"Largest Rectangle in a Matrix": ({ data }) => {
		const [row, col] = [data.length, data[0].length]
		const prefixSum = Array.from({ length: data.length }).map(() => Array.from({ length: data[0].length }).map(() => 0))
		// Is this faster?
		// The prefix used later is only row prefix and column prefix.
		for (let i = 0; i < row; i++) {
			for (let j = 0; j < col; j++) {
				prefixSum[i][j] = data[i][j]
				if (i >= 1) {
					prefixSum[i][j] += prefixSum[i - 1][j]
				}
				if (j >= 1) {
					prefixSum[i][j] += prefixSum[i][j - 1]
				}
				if (i >= 1 && j >= 1) {
					prefixSum[i][j] -= prefixSum[i - 1][j - 1]
				}
			}
		}
		type Point = [number, number]
		const oneCount = (from: Point, to: Point) => {
			let total = prefixSum[to[0]][to[1]]
			if (from[0] >= 1) {
				total -= prefixSum[from[0] - 1][to[1]]
			}
			if (from[1] >= 1) {
				total -= prefixSum[to[0]][from[1] - 1]
			}
			if (from[0] >= 1 && from[1] >= 1) {
				total += prefixSum[from[0] - 1][from[1] - 1]
			}
			return total
		}
		let maxSize = 0
		let result: [Point, Point] | undefined = undefined
		// Greedy heap.
		const q = new SmallHeap<[Point, Point, number]>((a, b) => b[2] - a[2])
		for (let i = 0; i < row; i++) {
			for (let j = 0; j < col; j++) {
				const pos = [i, j] as Point
				if (!data[i][j]) {
					q.push([pos, pos, 1])
				}
			}
		}
		while (q.size) {
			const [from, to, size] = q.pop()!
			// Simple prediction branch cut.
			if ((row - from[0] + 1) * (col - from[1] + 1) <= maxSize) {
				continue
			}
			if (size > maxSize) {
				maxSize = size
				result = [from, to]
			}
			const exCol: Point = [to[0], to[1] + 1]
			if (exCol[1] < col && !data[exCol[0]][exCol[1]] && !oneCount(from, exCol)) {
				q.push([from, exCol, size + to[0] - from[0] + 1]) // add a col size
			}
			const exRow: Point = [to[0] + 1, to[1]]
			if (exRow[0] < row && !data[exRow[0]][exRow[1]] && !oneCount(from, exRow)) {
				q.push([from, exRow, size + to[1] - from[1] + 1]) // add a row size
			}
		}
		return result ?? null
	},
	"Total Number of Primes": ({ data }) => {
		const [start, end] = data
		const increment = end - start
		const endRoot = Math.ceil(Math.sqrt(end)) // floor is actually enough, but sqrt(25) might be 4.9999, ceil it.
		const sieve = Array.from({ length: endRoot + 1 }, () => true)
		sieve[0] = sieve[1] = false
		const primes: number[] = []
		for (let i = 2; i <= endRoot; i++) {
			if (sieve[i]) {
				primes.push(i)
				for (let j = i * i; j <= endRoot; j += i) { // smaller j is filtered by (i-1) * i
					sieve[j] = false
				}
			}
		}
		const range_sieve = Array.from({ length: increment + 1 }, () => true)
		if (start === 0) {
			range_sieve[0] = false
		}
		if (1 - start >= 0) {
			range_sieve[1 - start] = false
		}
		for (const p of primes) {
			// Find a num, start <= num <= end, such that num = p * k, k \in N+ and k >= p
			const num = Math.max(p * p, Math.floor((start + p - 1) / p) * p)
			for (let i = num; i <= end; i += p) {
				range_sieve[i - start] = false
			}
		}
		return range_sieve.reduce((p, v) => p + (+v), 0)
	}
}

// Add this to avoid eslint matching, just erase the syntax
export function solveSync<T extends CodingContractName>(
	contract: Extract<CodingContractObject, { type: T }>
) {
	return ContractSolves[contract.type](contract)
}
