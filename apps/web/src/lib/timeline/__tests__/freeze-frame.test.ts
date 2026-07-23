import { describe, expect, mock, test } from "bun:test";
import type {
	ImageElement,
	SceneTracks,
	VideoElement,
	VideoTrack,
} from "@/lib/timeline/types";

// opencut-wasm cannot load under bun test; the transitive chain
// freeze-frame → animation/keyframes → property-registry → timeline/creation
// only needs TICKS_PER_SECOND at import time.
mock.module("opencut-wasm", () => ({
	TICKS_PER_SECOND: () => 705_600_000,
}));

const { applyFreezeFrame } = await import("@/lib/timeline/freeze-frame");
const { upsertElementKeyframe } = await import("@/lib/animation/keyframes");

function applyOrThrow(
	params: Parameters<typeof applyFreezeFrame>[0],
): SceneTracks {
	const result = applyFreezeFrame(params);
	if (!result) {
		throw new Error("applyFreezeFrame returned null");
	}
	return result;
}

function buildVideoElement(params: {
	id: string;
	startTime: number;
	duration: number;
	trimStart?: number;
	trimEnd?: number;
}): VideoElement {
	return {
		id: params.id,
		type: "video",
		mediaId: "media-1",
		name: "Clip",
		startTime: params.startTime,
		duration: params.duration,
		trimStart: params.trimStart ?? 0,
		trimEnd: params.trimEnd ?? 0,
		transform: {
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		},
		opacity: 1,
	};
}

function buildTracks(elements: VideoTrack["elements"]): SceneTracks {
	return {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			muted: false,
			hidden: false,
			elements,
		},
		audio: [],
	};
}

const baseParams = {
	trackId: "main",
	elementId: "clip-1",
	stillDuration: 300,
	stillMediaId: "still-media",
	stillElementId: "still-1",
};

describe("applyFreezeFrame", () => {
	test("splits the clip, inserts the still, shifts the tail", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
			buildVideoElement({ id: "clip-2", startTime: 1000, duration: 500 }),
		]);

		const result = applyOrThrow({
			...baseParams,
			tracks,
			freezeTime: 400,
		});

		const elements = result.main.elements;
		expect(elements.length).toBe(4);

		const [left, still, right, tail] = elements;
		expect(left.duration).toBe(400);
		expect((left as VideoElement).trimEnd).toBe(600);

		expect(still.id).toBe("still-1");
		expect(still.type).toBe("image");
		expect(still.startTime).toBe(400);
		expect(still.duration).toBe(300);
		expect((still as ImageElement).mediaId).toBe("still-media");

		expect(right.startTime).toBe(700);
		expect(right.duration).toBe(600);
		expect((right as VideoElement).trimStart).toBe(400);

		expect(tail.id).toBe("clip-2");
		expect(tail.startTime).toBe(1300);
	});

	test("freeze at clip end appends the still without splitting", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
		]);

		const result = applyOrThrow({
			...baseParams,
			tracks,
			freezeTime: 1000,
		});

		const elements = result.main.elements;
		expect(elements.length).toBe(2);
		expect(elements[0].duration).toBe(1000);
		expect(elements[1].id).toBe("still-1");
		expect(elements[1].startTime).toBe(1000);
	});

	test("freeze at clip start shifts the whole clip right", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
		]);

		const result = applyOrThrow({
			...baseParams,
			tracks,
			freezeTime: 0,
		});

		const elements = result.main.elements;
		expect(elements.length).toBe(2);
		expect(elements[0].id).toBe("still-1");
		expect(elements[0].startTime).toBe(0);
		expect(elements[1].id).toBe("clip-1");
		expect(elements[1].startTime).toBe(300);
	});

	test("bakes animated zoom into the still at the freeze moment", () => {
		let animations = upsertElementKeyframe({
			animations: undefined,
			propertyPath: "transform.scaleX",
			time: 0,
			value: 1,
			interpolation: "linear",
		});
		animations = upsertElementKeyframe({
			animations,
			propertyPath: "transform.scaleX",
			time: 1000,
			value: 2,
			interpolation: "linear",
		});

		const tracks = buildTracks([
			{
				...buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
				animations,
			},
		]);

		const result = applyOrThrow({
			...baseParams,
			tracks,
			freezeTime: 500,
		});

		const still = result.main.elements.find(
			(element) => element.id === "still-1",
		);
		expect(still?.type).toBe("image");
		expect((still as ImageElement).transform.scaleX).toBeCloseTo(1.5, 5);
		expect((still as ImageElement).animations).toBeUndefined();
	});

	test("respects retime rate when computing trims", () => {
		const tracks = buildTracks([
			{
				...buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
				retime: { rate: 2 },
			},
		]);

		const result = applyOrThrow({
			...baseParams,
			tracks,
			freezeTime: 400,
		});

		const [left, , right] = result.main.elements;
		expect((left as VideoElement).trimEnd).toBe(1200);
		expect((right as VideoElement).trimStart).toBe(800);
	});

	test("rounds fractional playhead ticks so timeline times stay integral", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
		]);

		const result = applyOrThrow({
			...baseParams,
			tracks,
			freezeTime: 400.417910447,
		});

		for (const element of result.main.elements) {
			expect(Number.isInteger(element.startTime)).toBe(true);
			expect(Number.isInteger(element.duration)).toBe(true);
			expect(Number.isInteger(element.trimStart)).toBe(true);
			expect(Number.isInteger(element.trimEnd)).toBe(true);
		}
		expect(result.main.elements[1].startTime).toBe(400);
	});

	test("returns null when the playhead is outside the clip", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 100, duration: 1000 }),
		]);

		expect(
			applyFreezeFrame({ ...baseParams, tracks, freezeTime: 50 }),
		).toBeNull();
		expect(
			applyFreezeFrame({ ...baseParams, tracks, freezeTime: 1200 }),
		).toBeNull();
	});

	test("returns null for unknown track or element", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
		]);

		expect(
			applyFreezeFrame({
				...baseParams,
				tracks,
				trackId: "missing",
				freezeTime: 400,
			}),
		).toBeNull();
		expect(
			applyFreezeFrame({
				...baseParams,
				tracks,
				elementId: "missing",
				freezeTime: 400,
			}),
		).toBeNull();
	});
});
