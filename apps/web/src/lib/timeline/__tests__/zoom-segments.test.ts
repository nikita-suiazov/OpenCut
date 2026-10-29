import { describe, expect, mock, test } from "bun:test";

// opencut-wasm cannot load under bun test; zoom-segments only needs
// TICKS_PER_SECOND at import time.
mock.module("opencut-wasm", () => ({
	TICKS_PER_SECOND: () => 705_600_000,
}));

const TICKS = 705_600_000;

const {
	clampZoomFocus,
	clampZoomWindow,
	findZoomAtTime,
	getZoomCameraAtTime,
	getZoomPlacement,
	MIN_ZOOM_DURATION_TICKS,
} = await import("@/lib/timeline/zoom-segments");
type ZoomSegment = import("@/lib/timeline/zoom-segments").ZoomSegment;
type ZoomCamera = import("@/lib/timeline/zoom-segments").ZoomCamera;

const WIDTH = 1920;
const HEIGHT = 1080;

function buildZoom(params: Partial<ZoomSegment> & { id: string }): ZoomSegment {
	return {
		startTime: 0,
		duration: 2 * TICKS,
		level: 2,
		focusX: 0.5,
		focusY: 0.5,
		...params,
	};
}

function cameraAt({ zooms, time }: { zooms: ZoomSegment[]; time: number }) {
	return getZoomCameraAtTime({ zooms, time, width: WIDTH, height: HEIGHT });
}

/** Content-space point that is displayed at the canvas center. */
function visibleCenter(camera: ZoomCamera): { x: number; y: number } {
	return {
		x: (WIDTH / 2 - camera.translateX) / camera.scale,
		y: (HEIGHT / 2 - camera.translateY) / camera.scale,
	};
}

describe("getZoomPlacement", () => {
	test("places max(1s, 5% of timeline) at the playhead", () => {
		expect(
			getZoomPlacement({
				zooms: [],
				time: 1 * TICKS,
				timelineDuration: 10 * TICKS,
			}),
		).toEqual({ startTime: 1 * TICKS, duration: 1 * TICKS });
		expect(
			getZoomPlacement({ zooms: [], time: 0, timelineDuration: 100 * TICKS }),
		).toEqual({ startTime: 0, duration: 5 * TICKS });
	});

	test("trims duration to the next segment", () => {
		const placement = getZoomPlacement({
			zooms: [buildZoom({ id: "a", startTime: 2 * TICKS })],
			time: 1.5 * TICKS,
			timelineDuration: 10 * TICKS,
		});
		expect(placement).toEqual({
			startTime: 1.5 * TICKS,
			duration: 0.5 * TICKS,
		});
	});

	test("rejects placement inside an existing segment", () => {
		const placement = getZoomPlacement({
			zooms: [buildZoom({ id: "a", startTime: 0 })],
			time: 1 * TICKS,
			timelineDuration: 10 * TICKS,
		});
		expect(placement).toBeNull();
	});

	test("rejects placement when the gap is too small", () => {
		const placement = getZoomPlacement({
			zooms: [
				buildZoom({
					id: "a",
					startTime: 1 * TICKS + Math.floor(MIN_ZOOM_DURATION_TICKS / 2),
				}),
			],
			time: 1 * TICKS,
			timelineDuration: 10 * TICKS,
		});
		expect(placement).toBeNull();
	});

	test("clamps to the timeline end", () => {
		const placement = getZoomPlacement({
			zooms: [],
			time: 9.5 * TICKS,
			timelineDuration: 10 * TICKS,
		});
		expect(placement?.startTime).toBe(9.5 * TICKS);
		expect(placement?.duration).toBe(0.5 * TICKS);
	});
});

describe("clampZoomWindow", () => {
	const zooms = [
		buildZoom({ id: "a", startTime: 0, duration: 1 * TICKS }),
		buildZoom({ id: "b", startTime: 2 * TICKS, duration: 2 * TICKS }),
		buildZoom({ id: "c", startTime: 6 * TICKS, duration: 1 * TICKS }),
	];

	test("keeps a moved segment inside its gap", () => {
		const clamped = clampZoomWindow({
			zooms,
			zoomId: "b",
			startTime: 0.2 * TICKS,
			duration: 2 * TICKS,
			timelineDuration: 10 * TICKS,
		});
		expect(clamped.startTime).toBe(1 * TICKS);
		expect(clamped.duration).toBe(2 * TICKS);
	});

	test("cannot jump over the next segment", () => {
		const clamped = clampZoomWindow({
			zooms,
			zoomId: "b",
			startTime: 7 * TICKS,
			duration: 2 * TICKS,
			timelineDuration: 10 * TICKS,
		});
		expect(clamped.startTime).toBe(4 * TICKS);
	});

	test("enforces the minimum duration on resize", () => {
		const clamped = clampZoomWindow({
			zooms,
			zoomId: "b",
			startTime: 2 * TICKS,
			duration: 1,
			timelineDuration: 10 * TICKS,
		});
		expect(clamped.duration).toBe(MIN_ZOOM_DURATION_TICKS);
	});
});

describe("getZoomCameraAtTime", () => {
	// Segment from 3s to 5s: zoom-in completes at 3.5s, lead-in starts
	// ~1.52s before that (~1.98s), zoom-out ends ~1.02s after 5s.
	const zooms = [buildZoom({ id: "a", startTime: 3 * TICKS })];

	test("is identity before the lead-in window and after the lead-out", () => {
		expect(cameraAt({ zooms, time: 1.5 * TICKS })).toBeNull();
		expect(cameraAt({ zooms, time: 6.5 * TICKS })).toBeNull();
		expect(cameraAt({ zooms: [], time: 0 })).toBeNull();
	});

	test("is already mostly zoomed at the exact segment start", () => {
		const camera = cameraAt({ zooms, time: 3 * TICKS });
		expect(camera?.scale ?? 1).toBeGreaterThan(1.5);
	});

	test("reaches the full level and focus during the hold", () => {
		const focused = [
			buildZoom({ id: "a", startTime: 3 * TICKS, focusX: 0.4, focusY: 0.6 }),
		];
		const camera = cameraAt({ zooms: focused, time: 4 * TICKS });
		expect(camera?.scale).toBeCloseTo(2);
		const center = visibleCenter(camera as ZoomCamera);
		expect(center.x).toBeCloseTo(0.4 * WIDTH);
		expect(center.y).toBeCloseTo(0.6 * HEIGHT);
	});

	test("eases in monotonically across the lead-in window", () => {
		let previousScale = 0;
		for (let i = 0; i <= 10; i++) {
			const time = Math.round((2 + (i * 1.5) / 10) * TICKS);
			const scale = cameraAt({ zooms, time })?.scale ?? 1;
			expect(scale).toBeGreaterThanOrEqual(previousScale);
			previousScale = scale;
		}
		expect(previousScale).toBeCloseTo(2);
	});

	test("eases out after the segment end", () => {
		const justAfter = cameraAt({ zooms, time: Math.round(5.05 * TICKS) });
		expect(justAfter?.scale ?? 1).toBeGreaterThan(1.3);
		const nearOutEnd = cameraAt({ zooms, time: Math.round(5.98 * TICKS) });
		expect(nearOutEnd?.scale ?? 1).toBeLessThan(1.2);
	});

	test("clamps the visible region inside the frame", () => {
		const edgeFocused = [
			buildZoom({ id: "a", startTime: 3 * TICKS, focusX: 0.95, focusY: 0.95 }),
		];
		const camera = cameraAt({ zooms: edgeFocused, time: 4 * TICKS });
		expect(camera?.scale).toBeCloseTo(2);
		// Region half-size is 1/4 of the frame at 2x; center may not exceed 3/4.
		const center = visibleCenter(camera as ZoomCamera);
		expect(center.x).toBeCloseTo(0.75 * WIDTH);
		expect(center.y).toBeCloseTo(0.75 * HEIGHT);
	});

	test("back-to-back segments pan directly without dipping to 1x", () => {
		const chained = [
			buildZoom({ id: "a", startTime: 0, duration: 2 * TICKS, level: 2 }),
			buildZoom({
				id: "b",
				startTime: 2 * TICKS,
				duration: 2 * TICKS,
				level: 3,
				focusX: 0.3,
				focusY: 0.3,
			}),
		];
		const panStart = cameraAt({ zooms: chained, time: 2 * TICKS + 1000 });
		expect(panStart?.scale ?? 1).toBeGreaterThan(1.95);
		const panMid = cameraAt({ zooms: chained, time: 2.5 * TICKS });
		expect(panMid?.scale ?? 1).toBeGreaterThan(2);
		expect(panMid?.scale ?? 1).toBeLessThan(3);
		const hold = cameraAt({ zooms: chained, time: 3.5 * TICKS });
		expect(hold?.scale).toBeCloseTo(3);
	});

	test("segments with a gap up to 1.5s stay connected", () => {
		const connected = [
			buildZoom({ id: "a", startTime: 0, duration: 2 * TICKS, level: 2 }),
			buildZoom({
				id: "b",
				startTime: 3.2 * TICKS,
				duration: 2 * TICKS,
				level: 3,
			}),
		];
		// End of the pan window: almost at B's level.
		const nearPanEnd = cameraAt({ zooms: connected, time: 2.9 * TICKS });
		expect(nearPanEnd?.scale ?? 1).toBeGreaterThan(2.5);
		// Between pan end and B start: held at B's full state.
		const held = cameraAt({ zooms: connected, time: 3.1 * TICKS });
		expect(held?.scale).toBeCloseTo(3);
	});

	test("segments with a large gap fully zoom out in between", () => {
		const separate = [
			buildZoom({ id: "a", startTime: 0, duration: 2 * TICKS, level: 2 }),
			buildZoom({
				id: "b",
				startTime: 5 * TICKS,
				duration: 2 * TICKS,
				level: 3,
			}),
		];
		expect(cameraAt({ zooms: separate, time: 3.5 * TICKS })).toBeNull();
	});

	test("level at or below 1 renders as identity", () => {
		const flat = [buildZoom({ id: "a", level: 1 })];
		expect(cameraAt({ zooms: flat, time: 1 * TICKS })).toBeNull();
	});
});

describe("findZoomAtTime / clampZoomFocus", () => {
	test("finds the segment containing a time", () => {
		const zooms = [buildZoom({ id: "a", startTime: 1 * TICKS })];
		expect(findZoomAtTime({ zooms, time: 1 * TICKS })?.id).toBe("a");
		expect(findZoomAtTime({ zooms, time: 3 * TICKS })).toBeNull();
	});

	test("clamps focus so the region stays in frame", () => {
		expect(clampZoomFocus({ focusX: 0, focusY: 1, level: 2 })).toEqual({
			focusX: 0.25,
			focusY: 0.75,
		});
	});
});
