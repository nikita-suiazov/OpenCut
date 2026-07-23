import { describe, expect, mock, test } from "bun:test";
import type {
	SceneTracks,
	VideoElement,
	VideoTrack,
} from "@/lib/timeline/types";
import type { ElementAnimations } from "@/lib/animation/types";

// opencut-wasm cannot load under bun test (pulled in transitively via
// element-utils → creation); only TICKS_PER_SECOND is needed at import time.
mock.module("opencut-wasm", () => ({
	TICKS_PER_SECOND: () => 120_000,
}));

const { syncSeamlessBoundaryKeys } = await import(
	"@/lib/timeline/boundary-sync"
);

function buildAnimations(
	keys: Array<{ time: number; value: number }>,
): ElementAnimations {
	return {
		bindings: {
			"transform.positionY": {
				path: "transform.positionY",
				kind: "number",
				components: [{ key: "value", channelId: "transform.positionY:value" }],
			},
		},
		channels: {
			"transform.positionY:value": {
				kind: "scalar",
				keys: keys.map((key, index) => ({
					id: `k${index}`,
					time: key.time,
					value: key.value,
					segmentToNext: "linear",
					tangentMode: "flat",
				})),
			},
		},
	} as unknown as ElementAnimations;
}

function buildVideoElement(params: {
	id: string;
	startTime: number;
	duration: number;
	trimStart?: number;
	mediaId?: string;
	animations?: ElementAnimations;
}): VideoElement {
	return {
		id: params.id,
		type: "video",
		mediaId: params.mediaId ?? "media-1",
		name: params.id,
		startTime: params.startTime,
		duration: params.duration,
		trimStart: params.trimStart ?? 0,
		trimEnd: 0,
		transform: {
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		},
		opacity: 1,
		animations: params.animations,
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

function keysOf(tracks: SceneTracks, elementId: string) {
	const element = tracks.main.elements.find((el) => el.id === elementId);
	return element?.animations?.channels["transform.positionY:value"]?.keys ?? [];
}

// Split halves: left [0..120000) trims 0..120000, right starts at 120000 with
// trimStart 120000 — a seamless continuation of the same source.
function buildSplitPair({
	leftKeys,
	rightKeys,
}: {
	leftKeys: Array<{ time: number; value: number }>;
	rightKeys: Array<{ time: number; value: number }>;
}) {
	return buildTracks([
		buildVideoElement({
			id: "left",
			startTime: 0,
			duration: 120000,
			trimStart: 0,
			animations: buildAnimations(leftKeys),
		}),
		buildVideoElement({
			id: "right",
			startTime: 120000,
			duration: 120000,
			trimStart: 120000,
			animations: buildAnimations(rightKeys),
		}),
	]);
}

describe("syncSeamlessBoundaryKeys", () => {
	test("editing the right half updates the left half's boundary keys", () => {
		const tracks = buildSplitPair({
			leftKeys: [
				{ time: 60000, value: 100 },
				{ time: 119960, value: 572 },
				{ time: 120000, value: 572 },
			],
			rightKeys: [{ time: 0, value: 225 }],
		});

		const result = syncSeamlessBoundaryKeys({
			tracks,
			trackId: "main",
			elementId: "right",
		});

		const leftKeys = keysOf(result, "left");
		expect(leftKeys[0].value).toBe(100);
		expect(leftKeys[1].value).toBe(225);
		expect(leftKeys[2].value).toBe(225);
	});

	test("editing the left half updates the right half's start key", () => {
		const tracks = buildSplitPair({
			leftKeys: [{ time: 120000, value: 999 }],
			rightKeys: [
				{ time: 0, value: 572 },
				{ time: 60000, value: 572 },
			],
		});

		const result = syncSeamlessBoundaryKeys({
			tracks,
			trackId: "main",
			elementId: "left",
		});

		const rightKeys = keysOf(result, "right");
		expect(rightKeys[0].value).toBe(999);
		expect(rightKeys[1].value).toBe(572);
	});

	test("does not touch keys away from the boundary", () => {
		const tracks = buildSplitPair({
			leftKeys: [{ time: 60000, value: 100 }],
			rightKeys: [{ time: 0, value: 225 }],
		});

		const result = syncSeamlessBoundaryKeys({
			tracks,
			trackId: "main",
			elementId: "right",
		});

		expect(result).toBe(tracks);
	});

	test("ignores neighbors from a different media asset", () => {
		const tracks = buildTracks([
			buildVideoElement({
				id: "left",
				startTime: 0,
				duration: 120000,
				animations: buildAnimations([{ time: 120000, value: 572 }]),
			}),
			buildVideoElement({
				id: "right",
				startTime: 120000,
				duration: 120000,
				trimStart: 120000,
				mediaId: "media-other",
				animations: buildAnimations([{ time: 0, value: 225 }]),
			}),
		]);

		const result = syncSeamlessBoundaryKeys({
			tracks,
			trackId: "main",
			elementId: "right",
		});

		expect(result).toBe(tracks);
	});

	test("ignores neighbors whose source is not continuous", () => {
		const tracks = buildTracks([
			buildVideoElement({
				id: "left",
				startTime: 0,
				duration: 120000,
				trimStart: 0,
				animations: buildAnimations([{ time: 120000, value: 572 }]),
			}),
			buildVideoElement({
				id: "right",
				startTime: 120000,
				duration: 120000,
				trimStart: 600000,
				animations: buildAnimations([{ time: 0, value: 225 }]),
			}),
		]);

		const result = syncSeamlessBoundaryKeys({
			tracks,
			trackId: "main",
			elementId: "right",
		});

		expect(result).toBe(tracks);
	});

	test("ignores non-abutting neighbors", () => {
		const tracks = buildTracks([
			buildVideoElement({
				id: "left",
				startTime: 0,
				duration: 120000,
				animations: buildAnimations([{ time: 120000, value: 572 }]),
			}),
			buildVideoElement({
				id: "right",
				startTime: 160000,
				duration: 120000,
				trimStart: 120000,
				animations: buildAnimations([{ time: 0, value: 225 }]),
			}),
		]);

		const result = syncSeamlessBoundaryKeys({
			tracks,
			trackId: "main",
			elementId: "right",
		});

		expect(result).toBe(tracks);
	});
});
