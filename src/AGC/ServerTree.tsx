import type { NS } from "@ns"
import React, { useEffect, useRef, useState } from "react"
import { Server } from "/UI/ServerTable/ServerInfo"

export type ServerNode = {
	name: string
	subnodes: ServerNode[]
}

type PositionedNode = ServerNode & {
	depth: number
	x: number
	y: number
	baseX: number
	baseY: number
	angle: number
	sectorStart: number
	sectorEnd: number
	radius: number
	vx: number
	vy: number
}

type ViewTransform = {
	scale: number
	offsetX: number
	offsetY: number
}

type DragState = {
	active: boolean
	moved: boolean
	mode: "pan" | "node"
	startX: number
	startY: number
	originX: number
	originY: number
	nodeName: string | null
}

const CARD_WIDTH = 148
const CARD_HEIGHT = 62
const CANVAS_PADDING = 48
const ORBIT_BASE_RADIUS = 176
const ORBIT_STEP = 210
const SECTOR_GAP = 0.05
const SECTOR_FILL_RATIO = 0.72
const RING_BAND_WIDTH = 96
const RING_REPULSION_DISTANCE = CARD_WIDTH * 1.12
const RING_REPULSION_FORCE = 0.52
const RING_TANGENT_FORCE = 0.024
const RING_SPRING_FORCE = 0.018
const RING_CENTERING_FORCE = 0.006
const RING_DAMPING = 0.94
const RING_AMBIENT_FORCE = 0.0022
const FRAME_MS = 1000 / 60
const MIN_SCALE = 0.45
const MAX_SCALE = 2.25
const ZOOM_STEP = 0.0015
const CLICK_DRAG_THRESHOLD = 6
const CELL_STYLE = {
	padding: "14px 10px",
	borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
	verticalAlign: "top" as const
}
const DETAIL_FIELDS = [
	"Host",
	"Root",
	"HackLevel",
	"Ports",
	"Money",
	"Secrurity",
	"HackTime",
	"Growth",
	"CurrMoneyRate",
	"PotentialMoneyRate",
	"RAM",
	"Contracts",
	"CORES",
	"Actions"
] as const

function buildTree(ns: NS): ServerNode {
	const root: ServerNode = { name: "home", subnodes: [] }
	const queue: ServerNode[] = [root]
	const visited = new Set<string>(["home"])

	while (queue.length) {
		const node = queue.shift()!
		const children = ns
			.scan(node.name)
			.filter((host) => !visited.has(host))
			.sort((left, right) => left.localeCompare(right))
			.map((host) => {
				visited.add(host)
				return { name: host, subnodes: [] }
			})

		node.subnodes = children
		queue.push(...children)
	}

	return root
}

function maxDepth(node: ServerNode): number {
	if (node.subnodes.length === 0) return 0
	return 1 + Math.max(...node.subnodes.map(maxDepth))
}

function subtreeWeight(node: ServerNode): number {
	if (node.subnodes.length === 0) return 1
	return node.subnodes.reduce((total, child) => total + subtreeWeight(child), 0)
}

function positionOrbit(
	node: ServerNode,
	depth: number,
	sectorStart: number,
	sectorEnd: number,
	centerX: number,
	centerY: number,
	positioned: PositionedNode[]
) {
	const angle = depth === 0 ? -Math.PI / 2 : (sectorStart + sectorEnd) / 2
	const radius = depth === 0 ? 0 : ORBIT_BASE_RADIUS + (depth - 1) * ORBIT_STEP

	positioned.push({
		...node,
		depth,
		x: centerX + Math.cos(angle) * radius,
		y: centerY + Math.sin(angle) * radius,
		baseX: centerX + Math.cos(angle) * radius,
		baseY: centerY + Math.sin(angle) * radius,
		angle,
		sectorStart,
		sectorEnd,
		radius,
		vx: depth === 0 ? 0 : Math.cos(angle + Math.PI / 2) * jitterFromName(node.name) * 6,
		vy: depth === 0 ? 0 : Math.sin(angle + Math.PI / 2) * jitterFromName(node.name) * 6
	})

	if (node.subnodes.length === 0) return

	const totalWeight = node.subnodes.reduce((total, child) => total + subtreeWeight(child), 0)
	const totalSpan = sectorEnd - sectorStart
	const gap = Math.min(SECTOR_GAP, totalSpan / Math.max(node.subnodes.length * 3, 1))
	let cursor = sectorStart

	for (const child of node.subnodes) {
		const childSpan = totalSpan * (subtreeWeight(child) / totalWeight)
		const childStart = cursor + gap / 2
		const childEnd = cursor + childSpan - gap / 2
		positionOrbit(child, depth + 1, childStart, childEnd, centerX, centerY, positioned)
		cursor += childSpan
	}
}

// function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
//     ctx.beginPath()
//     ctx.roundRect(x, y, width, height, radius)
// }

function drawFrame(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number
) {
	ctx.beginPath()
	ctx.moveTo(x + 12, y)
	ctx.lineTo(x + width - 12, y)
	ctx.lineTo(x + width, y + 12)
	ctx.lineTo(x + width, y + height - 12)
	ctx.lineTo(x + width - 12, y + height)
	ctx.lineTo(x + 12, y + height)
	ctx.lineTo(x, y + height - 12)
	ctx.lineTo(x, y + 12)
	ctx.closePath()
}

function drawServerNode(
	ctx: CanvasRenderingContext2D,
	ns: NS,
	node: PositionedNode,
	selected: boolean
) {
	const x = node.x - CARD_WIDTH / 2
	const y = node.y - CARD_HEIGHT / 2
	const hasRoot = ns.hasRootAccess(node.name)
	const isHome = node.name === "home"
	const edgeColor = selected ? "#f5f2d0" : isHome ? "#d2b56f" : hasRoot ? "#7ee0d3" : "#c96f61"
	const accentColor = selected
		? "rgba(245, 242, 208, 0.26)"
		: isHome
			? "rgba(210, 181, 111, 0.18)"
			: hasRoot
				? "rgba(126, 224, 211, 0.15)"
				: "rgba(201, 111, 97, 0.16)"

	ctx.save()
	ctx.shadowColor = selected ? "rgba(245, 242, 208, 0.28)" : "rgba(0, 0, 0, 0.42)"
	ctx.shadowBlur = selected ? 22 : 18
	ctx.shadowOffsetY = 10
	drawFrame(ctx, x, y, CARD_WIDTH, CARD_HEIGHT)
	const fill = ctx.createLinearGradient(x, y, x + CARD_WIDTH, y + CARD_HEIGHT)
	fill.addColorStop(0, "#090b10")
	fill.addColorStop(0.68, "#11161f")
	fill.addColorStop(1, "#07090d")
	ctx.fillStyle = fill
	ctx.fill()
	ctx.restore()

	ctx.save()
	drawFrame(ctx, x, y, CARD_WIDTH, CARD_HEIGHT)
	ctx.lineWidth = selected ? 2.6 : isHome ? 2.2 : 1.5
	ctx.strokeStyle = edgeColor
	ctx.stroke()
	ctx.restore()

	ctx.save()
	ctx.fillStyle = accentColor
	ctx.fillRect(x + 8, y + 8, CARD_WIDTH - 16, 8)
	ctx.fillRect(x + 8, y + CARD_HEIGHT - 14, CARD_WIDTH - 16, 6)
	ctx.restore()

	ctx.save()
	ctx.strokeStyle = "rgba(255, 255, 255, 0.06)"
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(x + 14, y + 22)
	ctx.lineTo(x + CARD_WIDTH - 14, y + 22)
	ctx.moveTo(x + 14, y + CARD_HEIGHT - 18)
	ctx.lineTo(x + CARD_WIDTH - 14, y + CARD_HEIGHT - 18)
	ctx.stroke()
	ctx.restore()

	ctx.fillStyle = "#e8edf7"
	ctx.font = `600 ${isHome ? 15 : 14}px Consolas`
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText(node.name.toUpperCase(), node.x, node.y - 6, CARD_WIDTH - 22)

	ctx.font = "11px Consolas"
	ctx.fillStyle = edgeColor
	ctx.fillText(
		isHome ? "PRIME NODE" : hasRoot ? "AUTHORIZED" : "RESTRICTED",
		node.x,
		node.y + 16,
		CARD_WIDTH - 22
	)
}

function drawConnection(
	ctx: CanvasRenderingContext2D,
	parent: PositionedNode,
	child: PositionedNode
) {
	ctx.save()
	ctx.beginPath()
	const parentEdgeX = parent.x + Math.cos(child.angle) * (CARD_WIDTH * 0.34)
	const parentEdgeY = parent.y + Math.sin(child.angle) * (CARD_HEIGHT * 0.42)
	const childEdgeX = child.x - Math.cos(child.angle) * (CARD_WIDTH * 0.34)
	const childEdgeY = child.y - Math.sin(child.angle) * (CARD_HEIGHT * 0.42)
	const controlRadius = Math.hypot(child.x - parent.x, child.y - parent.y) * 0.28
	const controlAX = parentEdgeX + Math.cos(parent.angle) * controlRadius
	const controlAY = parentEdgeY + Math.sin(parent.angle) * controlRadius
	const controlBX = childEdgeX - Math.cos(child.angle) * controlRadius
	const controlBY = childEdgeY - Math.sin(child.angle) * controlRadius
	ctx.moveTo(parentEdgeX, parentEdgeY)
	ctx.bezierCurveTo(controlAX, controlAY, controlBX, controlBY, childEdgeX, childEdgeY)
	ctx.strokeStyle = "rgba(124, 208, 222, 0.34)"
	ctx.lineWidth = 1.4
	ctx.stroke()

	ctx.fillStyle = "rgba(124, 208, 222, 0.72)"
	ctx.beginPath()
	ctx.arc(childEdgeX, childEdgeY, 2.4, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

function repositionNode(node: PositionedNode, centerX: number, centerY: number, radius: number) {
	node.radius = radius
	node.baseX = centerX + Math.cos(node.angle) * radius
	node.baseY = centerY + Math.sin(node.angle) * radius
}

function normalizeAngle(angle: number) {
	while (angle <= -Math.PI) angle += Math.PI * 2
	while (angle > Math.PI) angle -= Math.PI * 2
	return angle
}

function currentNodeAngle(node: PositionedNode, centerX: number, centerY: number) {
	return normalizeAngle(Math.atan2(node.y - centerY, node.x - centerX))
}

function equalMovingRingSector(
	node: PositionedNode,
	ringNodeCount: number,
	centerX: number,
	centerY: number
) {
	const center = currentNodeAngle(node, centerX, centerY)
	const slice = (Math.PI * 2) / Math.max(ringNodeCount, 1)
	const span = slice * SECTOR_FILL_RATIO
	return {
		start: center - span / 2,
		end: center + span / 2,
		center
	}
}

function angleInsideSector(angle: number, start: number, end: number) {
	const normalizedAngle = normalizeAngle(angle)
	const normalizedStart = normalizeAngle(start)
	const normalizedEnd = normalizeAngle(end)
	if (normalizedStart <= normalizedEnd) {
		return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd
	}
	return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd
}

function jitterFromName(name: string) {
	let hash = 0
	for (const char of name) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0
	}
	return ((hash % 1000) / 1000 - 0.5) * 0.18
}

function relaxRingNodes(
	nodes: PositionedNode[],
	centerX: number,
	centerY: number,
	deltaTime: number,
	manualOffsets: Map<string, { dx: number; dy: number }>
) {
	const groups = new Map<number, PositionedNode[]>()
	for (const node of nodes) {
		if (node.depth === 0) continue
		const group = groups.get(node.depth) ?? []
		group.push(node)
		groups.set(node.depth, group)
	}

	for (const group of groups.values()) {
		for (const node of group) {
			const naturalRadius = ORBIT_BASE_RADIUS + (node.depth - 1) * ORBIT_STEP
			const baseDx = node.baseX - centerX
			const baseDy = node.baseY - centerY
			const radialLength = Math.hypot(baseDx, baseDy) || 1
			const radialX = baseDx / radialLength
			const radialY = baseDy / radialLength
			const tangentX = -radialY
			const tangentY = radialX
			let forceX = 0
			let forceY = 0

			for (const other of group) {
				if (other === node) continue
				const diffX = node.x - other.x
				const diffY = node.y - other.y
				const distance = Math.hypot(diffX, diffY) || 0.0001

				if (distance >= RING_REPULSION_DISTANCE) continue

				const overlap = (RING_REPULSION_DISTANCE - distance) / RING_REPULSION_DISTANCE
				const strength = overlap * overlap * RING_REPULSION_FORCE
				forceX += (diffX / distance) * strength
				forceY += (diffY / distance) * strength
			}

			const offset = manualOffsets.get(node.name)
			const isManuallyDragged = offset !== undefined
			const displayBaseX = node.baseX + (offset?.dx ?? 0)
			const displayBaseY = node.baseY + (offset?.dy ?? 0)
			const springX = displayBaseX - node.x
			const springY = displayBaseY - node.y
			forceX += springX * (isManuallyDragged ? RING_SPRING_FORCE * 1.4 : RING_SPRING_FORCE)
			forceY += springY * (isManuallyDragged ? RING_SPRING_FORCE * 1.4 : RING_SPRING_FORCE)

			const radialDistance = (node.x - centerX) * radialX + (node.y - centerY) * radialY
			const radialError = naturalRadius - radialDistance
			forceX += radialX * radialError * RING_CENTERING_FORCE
			forceY += radialY * radialError * RING_CENTERING_FORCE

			const tangentProjection = springX * tangentX + springY * tangentY
			forceX += tangentX * tangentProjection * RING_TANGENT_FORCE
			forceY += tangentY * tangentProjection * RING_TANGENT_FORCE

			const ambientPhase = Date.now() * 0.0012 + node.depth * 0.7 + node.angle * 2.1
			forceX += tangentX * Math.sin(ambientPhase) * RING_AMBIENT_FORCE
			forceY += tangentY * Math.sin(ambientPhase) * RING_AMBIENT_FORCE

			node.vx = (node.vx + forceX * deltaTime) * RING_DAMPING
			node.vy = (node.vy + forceY * deltaTime) * RING_DAMPING
		}

		for (const node of group) {
			const naturalRadius = ORBIT_BASE_RADIUS + (node.depth - 1) * ORBIT_STEP
			const offset = manualOffsets.get(node.name)
			const isManuallyDragged = offset !== undefined
			node.x += node.vx * deltaTime
			node.y += node.vy * deltaTime
			if (!isManuallyDragged) {
				const nextAngle = Math.atan2(node.y - centerY, node.x - centerX)
				const nextRadius = Math.hypot(node.x - centerX, node.y - centerY)
				node.angle = normalizeAngle(nextAngle)
				node.radius = Math.max(naturalRadius, nextRadius)
			}
			repositionNode(node, centerX, centerY, node.radius)
		}
	}
}

function applyManualOffsets(
	nodes: PositionedNode[],
	manualOffsets: Map<string, { dx: number; dy: number }>
) {
	for (const node of nodes) {
		if (node.name === "home") {
			node.x = node.baseX
			node.y = node.baseY
			node.vx = 0
			node.vy = 0
			continue
		}
		const offset = manualOffsets.get(node.name)
		if (offset) {
			node.x = node.baseX + offset.dx
			node.y = node.baseY + offset.dy
		}
	}
}

function findNodeAtPoint(nodes: PositionedNode[], x: number, y: number) {
	return nodes.findLast(
		(node) =>
			x >= node.x - CARD_WIDTH / 2 &&
			x <= node.x + CARD_WIDTH / 2 &&
			y >= node.y - CARD_HEIGHT / 2 &&
			y <= node.y + CARD_HEIGHT / 2
	)
}

function renderDetailCell(
	field: (typeof DETAIL_FIELDS)[number],
	cell: React.JSX.Element,
	host: string,
	ns: NS
) {
	if (field === "HackTime") {
		return (
			<td key={`${host}-${field}`} style={CELL_STYLE}>
				<div>{ns.formatNumber(ns.getHackTime(host) / 1000 / 60, 1)} min hack</div>
				<div>{ns.formatNumber(ns.getWeakenTime(host) / 1000 / 60, 1)} min weaken</div>
				<div>{ns.formatNumber(ns.getGrowTime(host) / 1000 / 60, 1)} min grow</div>
			</td>
		)
	}

	return React.cloneElement(cell, {
		key: `${host}-${field}`,
		style: {
			...CELL_STYLE,
			...(cell.props.style ?? {})
		}
	})
}

function fitTransform(
	viewportWidth: number,
	viewportHeight: number,
	contentWidth: number,
	contentHeight: number
): ViewTransform {
	const scale = clamp(
		Math.min(
			(viewportWidth - CANVAS_PADDING * 2) / contentWidth,
			(viewportHeight - CANVAS_PADDING * 2) / contentHeight
		),
		MIN_SCALE,
		1
	)

	return {
		scale,
		offsetX: (viewportWidth - contentWidth * scale) / 2,
		offsetY: (viewportHeight - contentHeight * scale) / 2
	}
}

function drawScene(
	ctx: CanvasRenderingContext2D,
	ns: NS,
	nodes: PositionedNode[],
	selectedNode: string | null,
	centerX: number,
	centerY: number,
	maxOrbitDepth: number,
	contentWidth: number,
	contentHeight: number,
	viewportWidth: number,
	viewportHeight: number,
	transform: ViewTransform
) {
	ctx.clearRect(0, 0, viewportWidth, viewportHeight)

	const background = ctx.createLinearGradient(0, 0, viewportWidth, viewportHeight)
	background.addColorStop(0, "#010204")
	background.addColorStop(0.52, "#060910")
	background.addColorStop(1, "#020305")
	ctx.fillStyle = background
	ctx.fillRect(0, 0, viewportWidth, viewportHeight)

	ctx.save()
	ctx.strokeStyle = "rgba(104, 124, 152, 0.12)"
	ctx.lineWidth = 1
	for (let y = 24; y < viewportHeight; y += 24) {
		ctx.beginPath()
		ctx.moveTo(0, y)
		ctx.lineTo(viewportWidth, y)
		ctx.stroke()
	}
	for (let x = 24; x < viewportWidth; x += 24) {
		ctx.beginPath()
		ctx.moveTo(x, 0)
		ctx.lineTo(x, viewportHeight)
		ctx.stroke()
	}
	ctx.strokeStyle = "rgba(185, 204, 228, 0.05)"
	ctx.strokeRect(18, 18, viewportWidth - 36, viewportHeight - 36)
	ctx.strokeRect(34, 34, viewportWidth - 68, viewportHeight - 68)
	ctx.fillStyle = "rgba(126, 224, 211, 0.08)"
	ctx.fillRect(36, 22, 112, 18)
	ctx.font = "11px Consolas"
	ctx.textAlign = "left"
	ctx.textBaseline = "middle"
	ctx.fillStyle = "#b9c7d8"
	ctx.fillText("NETWORK TOPOLOGY", 44, 31)
	ctx.restore()

	ctx.save()
	ctx.translate(transform.offsetX, transform.offsetY)
	ctx.scale(transform.scale, transform.scale)

	ctx.fillStyle = "rgba(255, 255, 255, 0.02)"
	ctx.fillRect(0, 0, contentWidth, contentHeight)
	ctx.strokeStyle = "rgba(126, 224, 211, 0.08)"
	ctx.lineWidth = 1
	ctx.strokeRect(0.5, 0.5, contentWidth - 1, contentHeight - 1)
	const selected = selectedNode
		? (nodes.find((node) => node.name === selectedNode) ?? null)
		: null
	const nodesByDepth = new Map<number, PositionedNode[]>()
	for (const node of nodes.filter((candidate) => candidate.depth > 0)) {
		const group = nodesByDepth.get(node.depth) ?? []
		group.push(node)
		nodesByDepth.set(node.depth, group)
	}
	const selectedAngle = selected ? currentNodeAngle(selected, centerX, centerY) : null
	for (const node of nodes.filter((candidate) => candidate.depth > 0)) {
		const orbitRadius = ORBIT_BASE_RADIUS + (node.depth - 1) * ORBIT_STEP
		const innerRadius = Math.max(orbitRadius - RING_BAND_WIDTH / 2, ORBIT_BASE_RADIUS * 0.58)
		const outerRadius = orbitRadius + RING_BAND_WIDTH / 2
		const sector = equalMovingRingSector(
			node,
			(nodesByDepth.get(node.depth) ?? [node]).length,
			centerX,
			centerY
		)
		const isSelected = node.name === selectedNode
		const isAncestorSector =
			selectedAngle !== null &&
			selected !== null &&
			node.depth < selected.depth &&
			angleInsideSector(selectedAngle, sector.start, sector.end)
		const isDescendantSector =
			selectedAngle !== null &&
			selected !== null &&
			node.depth > selected.depth &&
			angleInsideSector(selectedAngle, sector.start, sector.end)

		ctx.beginPath()
		ctx.arc(centerX, centerY, outerRadius, sector.start, sector.end)
		ctx.arc(centerX, centerY, innerRadius, sector.end, sector.start, true)
		ctx.closePath()
		ctx.fillStyle = isSelected
			? "rgba(245, 242, 208, 0.15)"
			: isAncestorSector
				? "rgba(245, 242, 208, 0.08)"
				: isDescendantSector
					? node.depth % 2 === 0
						? "rgba(210, 181, 111, 0.028)"
						: "rgba(126, 224, 211, 0.045)"
					: node.depth % 2 === 0
						? "rgba(210, 181, 111, 0.016)"
						: "rgba(126, 224, 211, 0.024)"
		ctx.fill()
	}
	for (let depth = 1; depth <= maxOrbitDepth; depth++) {
		const orbitRadius = ORBIT_BASE_RADIUS + (depth - 1) * ORBIT_STEP
		ctx.beginPath()
		ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2)
		ctx.strokeStyle =
			depth % 2 === 0 ? "rgba(210, 181, 111, 0.08)" : "rgba(126, 224, 211, 0.08)"
		ctx.lineWidth = 1
		ctx.stroke()

		ctx.fillStyle = "rgba(185, 199, 216, 0.68)"
		ctx.font = "10px Consolas"
		ctx.textAlign = "center"
		ctx.fillText(`RING ${depth}`, centerX, centerY - orbitRadius - 10)
	}

	ctx.save()
	const coreGlow = ctx.createRadialGradient(
		centerX,
		centerY,
		0,
		centerX,
		centerY,
		ORBIT_BASE_RADIUS * 0.88
	)
	coreGlow.addColorStop(0, "rgba(210, 181, 111, 0.14)")
	coreGlow.addColorStop(0.5, "rgba(126, 224, 211, 0.05)")
	coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
	ctx.fillStyle = coreGlow
	ctx.beginPath()
	ctx.arc(centerX, centerY, ORBIT_BASE_RADIUS * 0.88, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	const byName = new Map(nodes.map((node) => [node.name, node]))
	for (const node of nodes) {
		for (const child of node.subnodes) {
			const childNode = byName.get(child.name)
			if (childNode) drawConnection(ctx, node, childNode)
		}
	}

	for (const node of nodes) {
		drawServerNode(ctx, ns, node, node.name === selectedNode)
	}

	ctx.restore()
}

export function ServerTree(arg: { ns: NS }) {
	const canvas = useRef<HTMLCanvasElement>(null)
	const container = useRef<HTMLDivElement>(null)
	const transformRef = useRef<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 })
	const redrawRef = useRef<() => void>(() => { })
	const nodeRef = useRef<PositionedNode[]>([])
	const manualOffsetRef = useRef(new Map<string, { dx: number; dy: number }>())
	const animationFrameRef = useRef<number | null>(null)
	const lastFrameRef = useRef<number | null>(null)
	const [selectedNode, setSelectedNode] = useState<string>("home")
	const selectedNodeRef = useRef<string>("home")
	const dragRef = useRef<DragState>({
		active: false,
		moved: false,
		mode: "pan",
		startX: 0,
		startY: 0,
		originX: 0,
		originY: 0,
		nodeName: null
	})

	useEffect(() => {
		const element = canvas.current
		const viewport = container.current
		if (!element || !viewport) return

		const tree = buildTree(arg.ns)
		const nodes: PositionedNode[] = []
		nodeRef.current = nodes
		const ctx = element.getContext("2d")
		if (!ctx) return

		const orbitDepth = maxDepth(tree)
		const outerRadius =
			orbitDepth === 0
				? CARD_WIDTH
				: ORBIT_BASE_RADIUS + Math.max(orbitDepth - 1, 0) * ORBIT_STEP + CARD_WIDTH
		const centerX = outerRadius + CANVAS_PADDING
		const centerY = outerRadius + CANVAS_PADDING
		positionOrbit(tree, 0, -Math.PI, Math.PI, centerX, centerY, nodes)
		applyManualOffsets(nodes, manualOffsetRef.current)
		const contentWidth = centerX * 2
		const contentHeight = centerY * 2
		const dpr = globalThis.devicePixelRatio || 1

		const redraw = () => {
			const viewportWidth = Math.max(320, viewport.clientWidth)
			const viewportHeight = Math.max(420, Math.min(680, globalThis.innerHeight * 0.62))

			element.width = Math.ceil(viewportWidth * dpr)
			element.height = Math.ceil(viewportHeight * dpr)
			element.style.width = `${viewportWidth}px`
			element.style.height = `${viewportHeight}px`
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

			drawScene(
				ctx,
				arg.ns,
				nodes,
				selectedNodeRef.current,
				centerX,
				centerY,
				orbitDepth,
				contentWidth,
				contentHeight,
				viewportWidth,
				viewportHeight,
				transformRef.current
			)
		}

		transformRef.current = fitTransform(
			Math.max(320, viewport.clientWidth),
			Math.max(420, Math.min(680, globalThis.innerHeight * 0.62)),
			contentWidth,
			contentHeight
		)
		redrawRef.current = redraw
		redraw()

		const animate = (timestamp: number) => {
			const previousFrame = lastFrameRef.current ?? timestamp
			const deltaTime = Math.min(2.2, (timestamp - previousFrame) / FRAME_MS)
			lastFrameRef.current = timestamp

			relaxRingNodes(nodes, centerX, centerY, deltaTime, manualOffsetRef.current)
			applyManualOffsets(nodes, manualOffsetRef.current)
			redraw()
			animationFrameRef.current = globalThis.requestAnimationFrame(animate)
		}
		animationFrameRef.current = globalThis.requestAnimationFrame(animate)

		const resizeObserver = new ResizeObserver(() => {
			if (!dragRef.current.active) {
				const viewportWidth = Math.max(320, viewport.clientWidth)
				const viewportHeight = Math.max(420, Math.min(680, globalThis.innerHeight * 0.62))
				transformRef.current = fitTransform(
					viewportWidth,
					viewportHeight,
					contentWidth,
					contentHeight
				)
			}
			redraw()
		})
		resizeObserver.observe(viewport)

		const handlePointerDown = (event: PointerEvent) => {
			const rect = element.getBoundingClientRect()
			const localX = event.clientX - rect.left
			const localY = event.clientY - rect.top
			const worldX = (localX - transformRef.current.offsetX) / transformRef.current.scale
			const worldY = (localY - transformRef.current.offsetY) / transformRef.current.scale
			const hit = findNodeAtPoint(nodeRef.current, worldX, worldY)
			const rightButton = event.button === 2
			dragRef.current = {
				active: true,
				moved: false,
				mode: rightButton && hit ? "node" : "pan",
				startX: event.clientX,
				startY: event.clientY,
				originX:
					rightButton && hit
						? (manualOffsetRef.current.get(hit.name)?.dx ?? 0)
						: transformRef.current.offsetX,
				originY:
					rightButton && hit
						? (manualOffsetRef.current.get(hit.name)?.dy ?? 0)
						: transformRef.current.offsetY,
				nodeName: rightButton && hit ? hit.name : null
			}
			element.setPointerCapture(event.pointerId)
			if (rightButton && hit) {
				if (selectedNodeRef.current !== hit.name) {
					manualOffsetRef.current.delete(selectedNodeRef.current)
					applyManualOffsets(nodeRef.current, manualOffsetRef.current)
				}
				setSelectedNode(hit.name)
			}
			element.style.cursor = rightButton && hit ? "move" : "grabbing"
		}

		const handlePointerMove = (event: PointerEvent) => {
			if (!dragRef.current.active) return
			const distance = Math.hypot(
				event.clientX - dragRef.current.startX,
				event.clientY - dragRef.current.startY
			)
			if (distance > CLICK_DRAG_THRESHOLD) {
				dragRef.current.moved = true
			}
			if (dragRef.current.mode === "node" && dragRef.current.nodeName) {
				manualOffsetRef.current.set(dragRef.current.nodeName, {
					dx:
						dragRef.current.originX +
						(event.clientX - dragRef.current.startX) / transformRef.current.scale,
					dy:
						dragRef.current.originY +
						(event.clientY - dragRef.current.startY) / transformRef.current.scale
				})
				applyManualOffsets(nodeRef.current, manualOffsetRef.current)
			} else {
				transformRef.current = {
					...transformRef.current,
					offsetX: dragRef.current.originX + (event.clientX - dragRef.current.startX),
					offsetY: dragRef.current.originY + (event.clientY - dragRef.current.startY)
				}
			}
			redraw()
		}

		const endDrag = (pointerId?: number) => {
			dragRef.current.active = false
			if (typeof pointerId === "number" && element.hasPointerCapture(pointerId)) {
				element.releasePointerCapture(pointerId)
			}
			dragRef.current.nodeName = null
			element.style.cursor = "grab"
		}

		const handlePointerUp = (event: PointerEvent) => {
			if (!dragRef.current.moved && dragRef.current.mode === "pan") {
				const rect = element.getBoundingClientRect()
				const localX = event.clientX - rect.left
				const localY = event.clientY - rect.top
				const worldX = (localX - transformRef.current.offsetX) / transformRef.current.scale
				const worldY = (localY - transformRef.current.offsetY) / transformRef.current.scale
				const hit = findNodeAtPoint(nodeRef.current, worldX, worldY)
				if (hit) {
					if (selectedNodeRef.current !== hit.name) {
						manualOffsetRef.current.delete(selectedNodeRef.current)
						applyManualOffsets(nodeRef.current, manualOffsetRef.current)
					}
					setSelectedNode(hit.name)
				} else {
					manualOffsetRef.current.delete(selectedNodeRef.current)
					setSelectedNode("home")
					applyManualOffsets(nodeRef.current, manualOffsetRef.current)
				}
			}
			endDrag(event.pointerId)
		}

		const handlePointerLeave = () => {
			if (!dragRef.current.active) element.style.cursor = "grab"
		}

		const handlePointerCancel = (event: PointerEvent) => {
			endDrag(event.pointerId)
		}

		const handleWheel = (event: WheelEvent) => {
			event.preventDefault()

			const rect = element.getBoundingClientRect()
			const pointerX = event.clientX - rect.left
			const pointerY = event.clientY - rect.top
			const worldX = (pointerX - transformRef.current.offsetX) / transformRef.current.scale
			const worldY = (pointerY - transformRef.current.offsetY) / transformRef.current.scale
			const nextScale = clamp(
				transformRef.current.scale * Math.exp(-event.deltaY * ZOOM_STEP),
				MIN_SCALE,
				MAX_SCALE
			)

			transformRef.current = {
				scale: nextScale,
				offsetX: pointerX - worldX * nextScale,
				offsetY: pointerY - worldY * nextScale
			}
			redraw()
		}

		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault()
		}

		element.addEventListener("pointerdown", handlePointerDown)
		element.addEventListener("pointermove", handlePointerMove)
		element.addEventListener("pointerup", handlePointerUp)
		element.addEventListener("pointerleave", handlePointerLeave)
		element.addEventListener("pointercancel", handlePointerCancel)
		element.addEventListener("wheel", handleWheel, { passive: false })
		element.addEventListener("contextmenu", handleContextMenu)
		globalThis.addEventListener("resize", redraw)

		return () => {
			resizeObserver.disconnect()
			if (animationFrameRef.current !== null) {
				globalThis.cancelAnimationFrame(animationFrameRef.current)
			}
			animationFrameRef.current = null
			lastFrameRef.current = null
			element.removeEventListener("pointerdown", handlePointerDown)
			element.removeEventListener("pointermove", handlePointerMove)
			element.removeEventListener("pointerup", handlePointerUp)
			element.removeEventListener("pointerleave", handlePointerLeave)
			element.removeEventListener("pointercancel", handlePointerCancel)
			element.removeEventListener("wheel", handleWheel)
			element.removeEventListener("contextmenu", handleContextMenu)
			globalThis.removeEventListener("resize", redraw)
		}
	}, [arg.ns])

	useEffect(() => {
		selectedNodeRef.current = selectedNode
		redrawRef.current()
	}, [selectedNode])

	const selectedServer = Server(arg.ns, selectedNode, 1)
	const detailCells = DETAIL_FIELDS.map((field) => selectedServer[field])

	return (
		<div style={{ display: "grid", gap: "16px" }}>
			<div
				ref={container}
				style={{
					padding: "12px 0 4px",
					borderRadius: "18px",
					overflow: "hidden",
					background: "linear-gradient(180deg, #06080d, #020305)",
					boxShadow: "0 24px 60px rgba(0, 0, 0, 0.42)",
					border: "1px solid rgba(126, 224, 211, 0.16)"
				}}
			>
				<canvas
					ref={canvas}
					style={{
						display: "block",
						width: "100%",
						cursor: "grab",
						touchAction: "none"
					}}
				/>
			</div>
			<section
				style={{
					borderRadius: "18px",
					overflow: "hidden",
					background: "linear-gradient(180deg, #06080d, #020305)",
					boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)",
					border: "1px solid rgba(210, 181, 111, 0.18)",
					color: "#d7dfeb"
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "14px 18px",
						borderBottom: "1px solid rgba(126, 224, 211, 0.12)",
						background:
							"linear-gradient(90deg, rgba(126, 224, 211, 0.08), rgba(210, 181, 111, 0.04))",
						font: "600 13px Consolas",
						letterSpacing: "0.08em"
					}}
				>
					<span>NODE DOSSIER</span>
					<span style={{ color: "#f1e6bc" }}>{selectedNode.toUpperCase()}</span>
				</div>
				<div style={{ overflowX: "auto" }}>
					<table
						style={{
							width: "100%",
							minWidth: "980px",
							borderCollapse: "collapse",
							fontFamily: "Consolas, monospace"
						}}
					>
						<thead>
							<tr>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Server
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Root
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Hack Level
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Ports
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Money
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Security
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									HWG Time/mins
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Growth
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Current$/s
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Potential$/s
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									RAM
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Contracts
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Cores
								</th>
								<th
									style={{
										padding: "12px 10px",
										textAlign: "left",
										color: "#7ee0d3",
										borderBottom: "1px solid rgba(126, 224, 211, 0.12)"
									}}
								>
									Action
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								style={{
									color: arg.ns.hasRootAccess(selectedNode)
										? "#d7dfeb"
										: "#f0b5ac"
								}}
							>
								{detailCells.map((cell, index) =>
									renderDetailCell(
										DETAIL_FIELDS[index],
										cell,
										selectedNode,
										arg.ns
									)
								)}
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
