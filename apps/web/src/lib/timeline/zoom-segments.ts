import { TICKS_PER_SECOND } from "@/lib/wasm";
import { clamp } from "@/utils/math";

/**
 * A zoom segment applies a global "camera" zoom to the composited output
 * for a time range. Times are in ticks. Focus is the normalized (0..1)
 * center of the region that fills the screen at full zoom level.
 *
 * Transition timing and easing are ported from OpenScreen
 * (github.com/siddharthvaddem/openscreen): a Screen-Studio-style
 * cubic-bezier(0.16, 1, 0.3, 1) ease where the zoom-in window (~1.5s)
 * starts before the segment and completes 0.5s after its start, the
 * zoom-out (~1s) runs after the segment ends, and segments closer than
 * 1.5s pan directly into each other without dipping to 1x.
 */
export interface ZoomSegment {
	id: string;
	startTime: number;
	duration: number;
	level: number;
	focusX: number;
	focusY: number;
}

/** Output-space transform: p' = p * scale + translate. */
export interface ZoomCamera {
	scale: number;
	translateX: number;
	translateY: number;
}

export const ZOOM_LEVEL_MIN = 1.1;
export const ZOOM_LEVEL_MAX = 5;
export const DEFAULT_ZOOM_LEVEL = 1.8;
export const MIN_ZOOM_DURATION_TICKS = Math.round(0.25 * TICKS_PER_SECOND);

const TICKS_PER_MS = TICKS_PER_SECOND / 1000;
/** Zoom-out window after a segment ends (OpenScreen TRANSITION_WINDOW_MS). */
export const ZOOM_OUT_TRANSITION_TICKS = 1015.05 * TICKS_PER_MS;
/** Zoom-in window; completes ZOOM_IN_OVERLAP into the segment, so it starts before it. */
export const ZOOM_IN_TRANSITION_TICKS = ZOOM_OUT_TRANSITION_TICKS * 1.5;
const ZOOM_IN_OVERLAP_TICKS = 500 * TICKS_PER_MS;
/** Segments closer than this pan directly into each other (no dip to 1x). */
const CHAIN_GAP_TICKS = 1500 * TICKS_PER_MS;
const CONNECTED_PAN_TICKS = 1000 * TICKS_PER_MS;

export function getSortedZooms({
	zooms,
}: {
	zooms: ZoomSegment[];
}): ZoomSegment[] {
	return [...zooms].sort((a, b) => a.startTime - b.startTime);
}

export function findZoomAtTime({
	zooms,
	time,
}: {
	zooms: ZoomSegment[];
	time: number;
}): ZoomSegment | null {
	return (
		zooms.find(
			(zoom) => time >= zoom.startTime && time < zoom.startTime + zoom.duration,
		) ?? null
	);
}

/**
 * Computes where a new zoom segment can be placed at the playhead.
 * Default duration is max(1s, 5% of the timeline), truncated to the gap
 * before the next segment (OpenScreen behavior). Returns null when the
 * playhead is inside an existing segment or the gap is too small.
 */
export function getZoomPlacement({
	zooms,
	time,
	timelineDuration,
}: {
	zooms: ZoomSegment[];
	time: number;
	timelineDuration: number;
}): { startTime: number; duration: number } | null {
	if (timelineDuration <= 0) return null;

	const startTime = clamp({
		value: Math.round(time),
		min: 0,
		max: Math.max(0, timelineDuration - MIN_ZOOM_DURATION_TICKS),
	});

	if (findZoomAtTime({ zooms, time: startTime })) return null;

	const nextStart = getSortedZooms({ zooms })
		.map((zoom) => zoom.startTime)
		.filter((start) => start >= startTime)
		.at(0);

	const defaultDuration = Math.round(
		Math.max(TICKS_PER_SECOND, 0.05 * timelineDuration),
	);
	const maxEnd = Math.min(nextStart ?? Infinity, timelineDuration);
	const duration = Math.min(defaultDuration, maxEnd - startTime);
	if (duration < MIN_ZOOM_DURATION_TICKS) return null;

	return { startTime, duration };
}

/**
 * Clamps a moved/resized segment so it stays inside the timeline and
 * never overlaps its neighbors. The segment is kept inside the gap it
 * currently occupies (it cannot jump over a neighbor).
 */
export function clampZoomWindow({
	zooms,
	zoomId,
	startTime,
	duration,
	timelineDuration,
}: {
	zooms: ZoomSegment[];
	zoomId: string;
	startTime: number;
	duration: number;
	timelineDuration: number;
}): { startTime: number; duration: number } {
	const original = zooms.find((zoom) => zoom.id === zoomId);
	const others = zooms.filter((zoom) => zoom.id !== zoomId);
	const referenceStart = original?.startTime ?? startTime;
	const referenceEnd = referenceStart + (original?.duration ?? duration);

	const gapStart = Math.max(
		0,
		...others
			.filter((zoom) => zoom.startTime + zoom.duration <= referenceStart)
			.map((zoom) => zoom.startTime + zoom.duration),
	);
	const gapEnd = Math.min(
		timelineDuration,
		...others
			.filter((zoom) => zoom.startTime >= referenceEnd)
			.map((zoom) => zoom.startTime),
	);

	const clampedDuration = clamp({
		value: Math.round(duration),
		min: MIN_ZOOM_DURATION_TICKS,
		max: Math.max(MIN_ZOOM_DURATION_TICKS, gapEnd - gapStart),
	});
	const clampedStart = clamp({
		value: Math.round(startTime),
		min: gapStart,
		max: Math.max(gapStart, gapEnd - clampedDuration),
	});

	return { startTime: clampedStart, duration: clampedDuration };
}

/** Clamps a normalized focus center so the zoomed region stays in frame. */
export function clampZoomFocus({
	focusX,
	focusY,
	level,
}: {
	focusX: number;
	focusY: number;
	level: number;
}): { focusX: number; focusY: number } {
	const half = 1 / (2 * Math.max(level, 1.001));
	return {
		focusX: clamp({ value: focusX, min: half, max: 1 - half }),
		focusY: clamp({ value: focusY, min: half, max: 1 - half }),
	};
}

/** Cubic-bezier easing solver (CSS semantics, endpoints (0,0) and (1,1)). */
function cubicBezierEase(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): (t: number) => number {
	const sampleX = (u: number) =>
		3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3;
	const sampleY = (u: number) =>
		3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
	const sampleDerivativeX = (u: number) =>
		3 * (1 - u) * (1 - u) * x1 +
		6 * (1 - u) * u * (x2 - x1) +
		3 * u * u * (1 - x2);

	return (t: number) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;

		let u = t;
		for (let i = 0; i < 6; i++) {
			const slope = sampleDerivativeX(u);
			if (Math.abs(slope) < 1e-6) break;
			u -= (sampleX(u) - t) / slope;
			u = clamp({ value: u, min: 0, max: 1 });
		}
		if (Math.abs(sampleX(u) - t) > 1e-4) {
			let low = 0;
			let high = 1;
			for (let i = 0; i < 24; i++) {
				u = (low + high) / 2;
				if (sampleX(u) < t) low = u;
				else high = u;
			}
		}
		return sampleY(u);
	};
}

const easeZoom = cubicBezierEase(0.16, 1, 0.3, 1);
const easeConnectedPan = cubicBezierEase(0.1, 0, 0.2, 1);

/**
 * How strongly a segment's zoom applies at a time (0..1). Nonzero outside
 * the segment: the zoom-in starts before startTime and the zoom-out ends
 * after the segment.
 */
function getSegmentStrength({
	segment,
	time,
}: {
	segment: ZoomSegment;
	time: number;
}): number {
	const end = segment.startTime + segment.duration;
	const zoomInEnd = Math.min(segment.startTime + ZOOM_IN_OVERLAP_TICKS, end);
	const leadInStart = zoomInEnd - ZOOM_IN_TRANSITION_TICKS;
	const leadOutEnd = end + ZOOM_OUT_TRANSITION_TICKS;

	if (time < leadInStart || time > leadOutEnd) return 0;
	if (time < zoomInEnd) {
		return easeZoom((time - leadInStart) / ZOOM_IN_TRANSITION_TICKS);
	}
	if (time <= end) return 1;
	return 1 - easeZoom((time - end) / ZOOM_OUT_TRANSITION_TICKS);
}

function buildCamera({
	level,
	focusX,
	focusY,
	progress,
	width,
	height,
}: {
	level: number;
	focusX: number;
	focusY: number;
	progress: number;
	width: number;
	height: number;
}): ZoomCamera {
	const focus = clampZoomFocus({ focusX, focusY, level });
	return {
		scale: 1 + (level - 1) * progress,
		translateX: (width / 2 - focus.focusX * width * level) * progress,
		translateY: (height / 2 - focus.focusY * height * level) * progress,
	};
}

/**
 * Camera state at time t: null means identity (no zoom).
 */
export function getZoomCameraAtTime({
	zooms,
	time,
	width,
	height,
}: {
	zooms: ZoomSegment[];
	time: number;
	width: number;
	height: number;
}): ZoomCamera | null {
	if (width <= 0 || height <= 0) return null;

	const sorted = getSortedZooms({
		zooms: zooms.filter((zoom) => zoom.level > 1),
	});
	if (sorted.length === 0) return null;

	// Connected segments: pan directly between them instead of zooming out.
	for (let i = 0; i < sorted.length - 1; i++) {
		const current = sorted[i];
		const next = sorted[i + 1];
		const currentEnd = current.startTime + current.duration;
		const gap = next.startTime - currentEnd;
		if (gap < 0 || gap > CHAIN_GAP_TICKS) continue;

		if (time >= currentEnd && time < currentEnd + CONNECTED_PAN_TICKS) {
			const panProgress = easeConnectedPan(
				(time - currentEnd) / CONNECTED_PAN_TICKS,
			);
			return buildCamera({
				level: current.level + (next.level - current.level) * panProgress,
				focusX: current.focusX + (next.focusX - current.focusX) * panProgress,
				focusY: current.focusY + (next.focusY - current.focusY) * panProgress,
				progress: 1,
				width,
				height,
			});
		}
		if (time >= currentEnd + CONNECTED_PAN_TICKS && time < next.startTime) {
			return buildCamera({ ...next, progress: 1, width, height });
		}
	}

	// One dominant segment per frame: the one with the highest strength.
	let dominant: ZoomSegment | null = null;
	let strength = 0;
	for (const segment of sorted) {
		const segmentStrength = getSegmentStrength({ segment, time });
		if (segmentStrength >= strength) {
			strength = segmentStrength;
			dominant = segment;
		}
	}
	if (!dominant || strength <= 0.001) return null;

	const camera = buildCamera({
		...dominant,
		progress: strength,
		width,
		height,
	});
	return camera.scale <= 1.001 ? null : camera;
}
