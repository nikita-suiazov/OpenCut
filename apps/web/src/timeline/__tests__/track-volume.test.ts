import { describe, expect, mock, test } from "bun:test";
import type { AudioTrack, TextTrack } from "../types";
import type { AudioCapableElement } from "../audio-state";

// opencut-wasm cannot load under bun test; the gain math only needs its tick rate.
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
const { getTrackVolumeDb, resolveEffectiveAudioGain } =
	await import("../audio-state");

const audioTrack = (volume?: number) =>
	({
		id: "sfx",
		name: "Clicks",
		type: "audio",
		muted: false,
		elements: [],
		volume,
	}) as unknown as AudioTrack;
const element = {
	id: "click",
	type: "audio",
	params: { volume: -6, muted: false },
} as unknown as AudioCapableElement;

describe("track fader", () => {
	test("a track without a fader is unity; silent tracks have none", () => {
		expect(getTrackVolumeDb(audioTrack())).toBe(0);
		expect(
			getTrackVolumeDb({
				id: "t",
				name: "T",
				type: "text",
				elements: [],
				hidden: false,
			} as unknown as TextTrack),
		).toBe(0);
		expect(getTrackVolumeDb(audioTrack(-9))).toBe(-9);
	});

	test("the fader adds to the clip's own dB", () => {
		expect(
			resolveEffectiveAudioGain({ element, trackVolumeDb: -6, localTime: 0 }),
		).toBeCloseTo(10 ** (-12 / 20), 6);
		expect(
			resolveEffectiveAudioGain({ element, trackVolumeDb: 6, localTime: 0 }),
		).toBeCloseTo(1, 6);
		expect(resolveEffectiveAudioGain({ element, localTime: 0 })).toBeCloseTo(
			10 ** (-6 / 20),
			6,
		);
	});

	test("a muted track stays silent whatever its fader", () => {
		expect(
			resolveEffectiveAudioGain({
				element,
				trackMuted: true,
				trackVolumeDb: 6,
				localTime: 0,
			}),
		).toBe(0);
	});
});
