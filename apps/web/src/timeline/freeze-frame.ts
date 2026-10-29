import type {
	ImageElement,
	SceneTracks,
	VideoElement,
	VideoTrack,
} from "@/timeline/types";
import type { ParamValues } from "@/params";
import { findTrackInSceneTracks } from "@/timeline/track-element-update";
import { getSourceSpanAtClipTime } from "@/retime/split";
import {
	resolveAnimationPathValueAtTime,
	splitAnimationsAtTime,
} from "@/animation";
import {
	addMediaTime,
	roundMediaTime,
	subMediaTime,
	ZERO_MEDIA_TIME,
	type MediaTime,
} from "@/wasm";
import { generateUUID } from "@/utils/id";

export const FREEZE_FRAME_DURATION_SECONDS = 3;

// What a still bakes at the freeze moment, so a zoom carried by keyframes holds
// on the frozen frame; and what an image has no use for.
const BAKED_PARAMS = [
	"transform.positionX",
	"transform.positionY",
	"transform.scaleX",
	"transform.scaleY",
	"transform.rotate",
	"opacity",
] as const;
const AUDIO_PARAMS = ["volume", "muted"] as const;

/**
 * Split the video element at the playhead, insert a still of that frame
 * (`stillMediaId`) for `stillDuration`, and shift the rest of the track right.
 * Null when the track or element is not a video one or the playhead is outside it.
 */
export function applyFreezeFrame({
	tracks,
	trackId,
	elementId,
	freezeTime,
	stillDuration,
	stillMediaId,
	stillElementId,
}: {
	tracks: SceneTracks;
	trackId: string;
	elementId: string;
	freezeTime: MediaTime;
	stillDuration: MediaTime;
	stillMediaId: string;
	stillElementId: string;
}): SceneTracks | null {
	const track = findTrackInSceneTracks({ tracks, trackId });
	if (!track || track.type !== "video" || stillDuration <= 0) {
		return null;
	}

	const source = track.elements.find((element) => element.id === elementId);
	if (!source || source.type !== "video") {
		return null;
	}

	const sourceEnd = addMediaTime({ a: source.startTime, b: source.duration });
	if (freezeTime < source.startTime || freezeTime > sourceEnd) {
		return null;
	}

	const elements = track.elements
		.flatMap((element) =>
			element.id === source.id
				? splitSourceAtFreezeTime({ source, freezeTime })
				: [element],
		)
		.map((element) =>
			element.startTime >= freezeTime
				? {
						...element,
						startTime: addMediaTime({ a: element.startTime, b: stillDuration }),
					}
				: element,
		);

	elements.push(
		buildStillElement({
			source,
			freezeTime,
			stillDuration,
			stillMediaId,
			stillElementId,
		}),
	);
	elements.sort((a, b) => a.startTime - b.startTime);

	const updatedTrack: VideoTrack = { ...track, elements };

	return {
		overlay: tracks.overlay.map((overlayTrack) =>
			overlayTrack.id === trackId ? updatedTrack : overlayTrack,
		),
		main: tracks.main.id === trackId ? updatedTrack : tracks.main,
		audio: tracks.audio,
	};
}

function splitSourceAtFreezeTime({
	source,
	freezeTime,
}: {
	source: VideoElement;
	freezeTime: MediaTime;
}): VideoElement[] {
	const sourceEnd = addMediaTime({ a: source.startTime, b: source.duration });
	if (freezeTime <= source.startTime || freezeTime >= sourceEnd) {
		return [source];
	}

	const relativeTime = subMediaTime({ a: freezeTime, b: source.startTime });
	// The source-side split point is snapped once and the right half derived
	// from it, as SplitElementsCommand does, so the two spans always add up.
	const leftSourceSpan = roundMediaTime({
		time: getSourceSpanAtClipTime({
			clipTime: relativeTime,
			retime: source.retime,
		}),
	});
	const totalSourceSpan = roundMediaTime({
		time: getSourceSpanAtClipTime({
			clipTime: source.duration,
			retime: source.retime,
		}),
	});
	const rightSourceSpan = subMediaTime({ a: totalSourceSpan, b: leftSourceSpan });
	const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
		animations: source.animations,
		splitTime: relativeTime,
		shouldIncludeSplitBoundary: true,
	});

	return [
		{
			...source,
			duration: relativeTime,
			trimEnd: addMediaTime({ a: source.trimEnd, b: rightSourceSpan }),
			animations: leftAnimations,
		},
		{
			...source,
			id: generateUUID(),
			startTime: freezeTime,
			duration: subMediaTime({ a: source.duration, b: relativeTime }),
			trimStart: addMediaTime({ a: source.trimStart, b: leftSourceSpan }),
			animations: rightAnimations,
		},
	];
}

function buildStillElement({
	source,
	freezeTime,
	stillDuration,
	stillMediaId,
	stillElementId,
}: {
	source: VideoElement;
	freezeTime: MediaTime;
	stillDuration: MediaTime;
	stillMediaId: string;
	stillElementId: string;
}): ImageElement {
	const localTime = subMediaTime({ a: freezeTime, b: source.startTime });
	const params: ParamValues = { ...source.params };
	for (const key of AUDIO_PARAMS) {
		delete params[key];
	}
	for (const key of BAKED_PARAMS) {
		const base = source.params[key];
		if (typeof base !== "number") continue;
		params[key] = resolveAnimationPathValueAtTime({
			animations: source.animations,
			propertyPath: key,
			localTime,
			fallbackValue: base,
		});
	}

	return {
		id: stillElementId,
		type: "image",
		mediaId: stillMediaId,
		name: `${source.name} (freeze)`,
		startTime: freezeTime,
		duration: stillDuration,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		params,
		...(source.hidden !== undefined ? { hidden: source.hidden } : {}),
		...(source.effects !== undefined
			? { effects: structuredClone(source.effects) }
			: {}),
		...(source.masks !== undefined
			? { masks: structuredClone(source.masks) }
			: {}),
	};
}
