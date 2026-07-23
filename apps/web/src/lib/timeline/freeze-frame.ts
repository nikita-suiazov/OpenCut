import type {
	ImageElement,
	SceneTracks,
	VideoElement,
	VideoTrack,
} from "@/lib/timeline/types";
import { findTrackInSceneTracks } from "@/lib/timeline/track-element-update";
import { getSourceSpanAtClipTime } from "@/lib/retime/split";
import { splitAnimationsAtTime } from "@/lib/animation/keyframes";
import {
	resolveAnimationPathValueAtTime,
	resolveTransformAtTime,
} from "@/lib/animation/resolve";
import { generateUUID } from "@/utils/id";

export const FREEZE_FRAME_DURATION_SECONDS = 3;

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
	freezeTime: number;
	stillDuration: number;
	stillMediaId: string;
	stillElementId: string;
}): SceneTracks | null {
	// Playback time can be fractional ticks mid-playback; timeline times must
	// stay integral — the wasm timecode boundary deserializes them as i64.
	freezeTime = Math.round(freezeTime);
	stillDuration = Math.round(stillDuration);
	const track = findTrackInSceneTracks({ tracks, trackId });
	if (!track || track.type !== "video" || stillDuration <= 0) {
		return null;
	}

	const source = track.elements.find((element) => element.id === elementId);
	if (!source || source.type !== "video") {
		return null;
	}

	const sourceEnd = source.startTime + source.duration;
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
				? { ...element, startTime: element.startTime + stillDuration }
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
	freezeTime: number;
}): VideoElement[] {
	if (
		freezeTime <= source.startTime ||
		freezeTime >= source.startTime + source.duration
	) {
		return [source];
	}

	const relativeTime = freezeTime - source.startTime;
	const leftSourceSpan = getSourceSpanAtClipTime({
		clipTime: relativeTime,
		retime: source.retime,
	});
	const totalSourceSpan = getSourceSpanAtClipTime({
		clipTime: source.duration,
		retime: source.retime,
	});
	const rightSourceSpan = totalSourceSpan - leftSourceSpan;
	const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
		animations: source.animations,
		splitTime: relativeTime,
		shouldIncludeSplitBoundary: true,
	});

	return [
		{
			...source,
			duration: relativeTime,
			trimEnd: source.trimEnd + rightSourceSpan,
			animations: leftAnimations,
		},
		{
			...source,
			id: generateUUID(),
			startTime: freezeTime,
			duration: source.duration - relativeTime,
			trimStart: source.trimStart + leftSourceSpan,
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
	freezeTime: number;
	stillDuration: number;
	stillMediaId: string;
	stillElementId: string;
}): ImageElement {
	// Zoom/pan lives in animation keyframes — bake the animated values at the
	// freeze moment into the still so it matches the frame it was taken from.
	const localTime = freezeTime - source.startTime;
	return {
		id: stillElementId,
		type: "image",
		mediaId: stillMediaId,
		name: `${source.name} (freeze)`,
		startTime: freezeTime,
		duration: stillDuration,
		trimStart: 0,
		trimEnd: 0,
		transform: resolveTransformAtTime({
			baseTransform: source.transform,
			animations: source.animations,
			localTime,
		}),
		opacity: resolveAnimationPathValueAtTime({
			animations: source.animations,
			propertyPath: "opacity",
			localTime,
			fallbackValue: source.opacity,
		}),
		...(source.hidden !== undefined ? { hidden: source.hidden } : {}),
		...(source.blendMode !== undefined ? { blendMode: source.blendMode } : {}),
		...(source.effects !== undefined
			? { effects: structuredClone(source.effects) }
			: {}),
		...(source.masks !== undefined
			? { masks: structuredClone(source.masks) }
			: {}),
	};
}
