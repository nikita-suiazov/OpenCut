import { describe, expect, mock, test } from "bun:test";

// opencut-wasm cannot load under bun test; audio.ts only needs TICKS_PER_SECOND.
mock.module("opencut-wasm", () => ({
	TICKS_PER_SECOND: () => 705_600_000,
}));

const TICKS = 705_600_000;

const { collectAudioClips } = await import("@/lib/media/audio");
type SceneTracks = import("@/lib/timeline").SceneTracks;

function buildTracks({
	startTime,
	duration,
}: {
	startTime: number;
	duration: number;
}): SceneTracks {
	return {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements: [],
			muted: false,
			hidden: false,
		},
		audio: [
			{
				id: "sfx",
				name: "Clicks",
				type: "audio",
				muted: false,
				elements: [
					{
						id: "click-1",
						type: "audio",
						sourceType: "library",
						sourceUrl: "/sounds/ui/click.mp3",
						name: "Click",
						startTime,
						duration,
						trimStart: 0,
						trimEnd: 0,
						sourceDuration: duration,
						volume: 0,
						muted: false,
					},
				],
			},
		],
	};
}

describe("collectAudioClips", () => {
	test("library clip times come back in seconds, like upload clips", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response(new Blob([new Uint8Array(8)], { type: "audio/mpeg" }), {
				status: 200,
			})) as typeof fetch;

		try {
			const clips = await collectAudioClips({
				tracks: buildTracks({
					startTime: 2 * TICKS,
					duration: Math.round(0.25 * TICKS),
				}),
				mediaAssets: [],
			});

			expect(clips).toHaveLength(1);
			// Ticks here schedule the sound days into the timeline, so it never
			// plays — that silently muted every sound from the bundled library.
			expect(clips[0].startTime).toBe(2);
			expect(clips[0].duration).toBeCloseTo(0.25, 5);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
