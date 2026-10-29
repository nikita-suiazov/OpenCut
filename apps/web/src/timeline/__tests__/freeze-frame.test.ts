import { describe, expect, mock, test } from "bun:test";
import type {
	ImageElement,
	SceneTracks,
	VideoElement,
	VideoTrack,
} from "@/timeline/types";
import type { MediaTime } from "@/wasm";

// opencut-wasm cannot load under bun test; this code only needs its tick rate.
mock.module("opencut-wasm", () => ({
	TICKS_PER_SECOND: () => 120_000,
	mediaTimeFromSeconds: ({ seconds }: { seconds: number }) =>
		Math.round(seconds * 120_000),
	mediaTimeToSeconds: ({ time }: { time: number }) => time / 120_000,
	lastFrameTime: () => 0,
	parseTimecode: () => 0,
	roundToFrame: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
}));
await import("@/timeline/defaults");
const { applyFreezeFrame } = await import("@/timeline/freeze-frame");

const t = (ticks: number) => ticks as MediaTime;

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
}): VideoElement {
	return {
		id: params.id,
		type: "video",
		mediaId: "media-1",
		name: "Clip",
		startTime: t(params.startTime),
		duration: t(params.duration),
		trimStart: t(0),
		trimEnd: t(0),
		params: {
			"transform.positionX": 0,
			"transform.positionY": 0,
			"transform.scaleX": 1,
			"transform.scaleY": 1,
			"transform.rotate": 0,
			opacity: 1,
			volume: -3,
			muted: false,
		},
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
	stillDuration: t(300),
	stillMediaId: "still-media",
	stillElementId: "still-1",
};

describe("applyFreezeFrame", () => {
	test("splits the clip, inserts the still, shifts the tail", () => {
		const result = applyOrThrow({
			...baseParams,
			tracks: buildTracks([
				buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
				buildVideoElement({ id: "clip-2", startTime: 1000, duration: 500 }),
			]),
			freezeTime: t(400),
		});

		const [left, still, right, tail] = result.main.elements;
		expect(result.main.elements.length).toBe(4);
		expect(Number(left.duration)).toBe(400);
		expect(Number(left.trimEnd)).toBe(600);
		expect(still.id).toBe("still-1");
		expect(still.type).toBe("image");
		expect(Number(still.startTime)).toBe(400);
		expect(Number(still.duration)).toBe(300);
		expect((still as ImageElement).mediaId).toBe("still-media");
		expect(Number(right.startTime)).toBe(700);
		expect(Number(right.duration)).toBe(600);
		expect(Number(right.trimStart)).toBe(400);
		expect(tail.id).toBe("clip-2");
		expect(Number(tail.startTime)).toBe(1300);
	});

	test("freeze at the clip's end appends the still without splitting", () => {
		const result = applyOrThrow({
			...baseParams,
			tracks: buildTracks([
				buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
			]),
			freezeTime: t(1000),
		});
		const elements = result.main.elements;
		expect(elements.length).toBe(2);
		expect(Number(elements[0].duration)).toBe(1000);
		expect(elements[1].id).toBe("still-1");
		expect(Number(elements[1].startTime)).toBe(1000);
	});

	test("freeze at the clip's start shifts the whole clip right", () => {
		const result = applyOrThrow({
			...baseParams,
			tracks: buildTracks([
				buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
			]),
			freezeTime: t(0),
		});
		const elements = result.main.elements;
		expect(elements.length).toBe(2);
		expect(elements[0].id).toBe("still-1");
		expect(elements[1].id).toBe("clip-1");
		expect(Number(elements[1].startTime)).toBe(300);
	});

	test("bakes an animated zoom into the still at the freeze moment", () => {
		const animations = {
			"transform.scaleX": {
				keys: [
					{
						id: "k1",
						time: t(0),
						value: 1,
						segmentToNext: "linear",
						tangentMode: "flat",
					},
					{
						id: "k2",
						time: t(1000),
						value: 2,
						segmentToNext: "linear",
						tangentMode: "flat",
					},
				],
			},
		} as unknown as VideoElement["animations"];
		const result = applyOrThrow({
			...baseParams,
			tracks: buildTracks([
				{
					...buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
					animations,
				},
			]),
			freezeTime: t(500),
		});
		const still = result.main.elements.find(
			(element) => element.id === "still-1",
		);
		expect(still?.type).toBe("image");
		expect(still?.params["transform.scaleX"]).toBeCloseTo(1.5, 5);
		expect(still?.params["transform.scaleY"]).toBe(1);
		expect(still?.animations).toBeUndefined();
		// an image has no sound
		expect(still?.params.volume).toBeUndefined();
	});

	test("respects the retime rate when computing trims", () => {
		const result = applyOrThrow({
			...baseParams,
			tracks: buildTracks([
				{
					...buildVideoElement({ id: "clip-1", startTime: 0, duration: 1000 }),
					retime: { rate: 2 },
				},
			]),
			freezeTime: t(400),
		});
		const [left, , right] = result.main.elements;
		expect(Number(left.trimEnd)).toBe(1200);
		expect(Number(right.trimStart)).toBe(800);
	});

	test("returns null when the playhead is outside the clip, or for unknown ids", () => {
		const tracks = buildTracks([
			buildVideoElement({ id: "clip-1", startTime: 100, duration: 1000 }),
		]);
		expect(
			applyFreezeFrame({ ...baseParams, tracks, freezeTime: t(50) }),
		).toBeNull();
		expect(
			applyFreezeFrame({ ...baseParams, tracks, freezeTime: t(1200) }),
		).toBeNull();
		expect(
			applyFreezeFrame({
				...baseParams,
				tracks,
				trackId: "missing",
				freezeTime: t(400),
			}),
		).toBeNull();
		expect(
			applyFreezeFrame({
				...baseParams,
				tracks,
				elementId: "missing",
				freezeTime: t(400),
			}),
		).toBeNull();
	});
});
