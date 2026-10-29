import { MIXKIT, SOUND_CATEGORIES } from "./catalog";
import type { SoundEffect } from "./types";

// Nominal — nothing in the panel reads these, but SoundEffect requires them.
const ENCODING = {
	type: "mp3",
	channels: 2,
	bitrate: 256,
	bitdepth: 16,
	samplerate: 44100,
} as const;

const flattened = SOUND_CATEGORIES.flatMap((category) =>
	category.sounds.map((sound) => ({ category, sound })),
);

// Negative ids keep local sounds from colliding with Freesound ids anywhere
// they are persisted (saved sounds, timeline elements).
export const LOCAL_SOUNDS: SoundEffect[] = flattened.map(
	({ category, sound }, index) => {
		const { author, license } = sound.credit ?? MIXKIT;
		const url = `/sounds/${category.id}/${sound.file}`;

		return {
			...ENCODING,
			id: -(index + 1),
			name: sound.name,
			description: sound.description ?? category.description,
			url,
			previewUrl: url,
			downloadUrl: url,
			duration: sound.duration,
			filesize: sound.filesize,
			username: author,
			// The category id rides along as a tag, so the panel's category chips
			// are nothing more than a search query.
			tags: [category.id, ...sound.tags],
			license,
			created: "2026-07-27T00:00:00Z",
			downloads: 0,
			rating: 5,
			ratingCount: 0,
		};
	},
);

export function searchLocalSounds({
	query,
}: {
	query?: string;
}): SoundEffect[] {
	const needle = query?.trim().toLowerCase();
	if (!needle) return LOCAL_SOUNDS;

	// Match on word starts, never bare substrings: "ui" must mean the UI
	// category, not "b(ui)ld", and "win" must not drag in "re(win)d".
	return LOCAL_SOUNDS.filter((sound) =>
		[...sound.name.toLowerCase().split(/[^a-z0-9]+/), ...sound.tags].some(
			(word) => word.toLowerCase().startsWith(needle),
		),
	);
}
