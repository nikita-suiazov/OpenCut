import type { SceneTracks, TimelineElement } from "@/lib/timeline/types";
import { findTrackInSceneTracks } from "@/lib/timeline/track-element-update";
import { getSourceSpanAtClipTime } from "@/lib/retime/split";
import { isRetimableElement } from "@/lib/timeline/element-utils";

// Splitting an element duplicates the boundary keyframes on both halves.
// Editing one duplicate leaves the other stale, so playback ramps to the old
// value and snaps at the cut. After a keyframe write near an element edge,
// mirror the edited element's boundary values onto seamless neighbors.

// Keys this close to the cut (in ticks) count as boundary keys — one frame at
// 30fps. Sub-frame ramps across a seamless cut are never intentional.
const BOUNDARY_KEY_EPSILON = 4000;
// Tolerance for source-continuity comparison (split math is float-exact; this
// only absorbs rounding).
const SOURCE_CONTINUITY_EPSILON = 40;

function getSourceEnd({ element }: { element: TimelineElement }): number {
	const retime = isRetimableElement(element) ? element.retime : undefined;
	return (
		element.trimStart +
		getSourceSpanAtClipTime({ clipTime: element.duration, retime })
	);
}

function isSeamlessContinuation({
	left,
	right,
}: {
	left: TimelineElement;
	right: TimelineElement;
}): boolean {
	if (left.type !== right.type) {
		return false;
	}
	if ("mediaId" in left || "mediaId" in right) {
		if (
			!("mediaId" in left) ||
			!("mediaId" in right) ||
			left.mediaId !== right.mediaId
		) {
			return false;
		}
	}
	if (left.startTime + left.duration !== right.startTime) {
		return false;
	}
	return (
		Math.abs(getSourceEnd({ element: left }) - right.trimStart) <=
		SOURCE_CONTINUITY_EPSILON
	);
}

function closestBoundaryKey<TKey extends { time: number }>(
	keys: readonly TKey[],
	boundaryTime: number,
): TKey | null {
	const boundaryKeys = keys.filter(
		(key) => Math.abs(key.time - boundaryTime) <= BOUNDARY_KEY_EPSILON,
	);
	if (boundaryKeys.length === 0) {
		return null;
	}
	return boundaryKeys.reduce((closest, key) =>
		Math.abs(key.time - boundaryTime) < Math.abs(closest.time - boundaryTime)
			? key
			: closest,
	);
}

function replaceBoundaryKeyValues<
	TValue,
	TKey extends { time: number; value: TValue },
>(keys: readonly TKey[], boundaryTime: number, value: TValue): TKey[] | null {
	const nextKeys = keys.map((key) =>
		Math.abs(key.time - boundaryTime) <= BOUNDARY_KEY_EPSILON &&
		key.value !== value
			? { ...key, value }
			: key,
	);
	return nextKeys.some((key, index) => key !== keys[index]) ? nextKeys : null;
}

function copyBoundaryValues({
	from,
	fromBoundaryLocalTime,
	to,
	toBoundaryLocalTime,
}: {
	from: TimelineElement;
	fromBoundaryLocalTime: number;
	to: TimelineElement;
	toBoundaryLocalTime: number;
}): TimelineElement | null {
	const fromChannels = from.animations?.channels;
	const toChannels = to.animations?.channels;
	if (!fromChannels || !toChannels) {
		return null;
	}

	let changed = false;
	const nextChannels = { ...toChannels };

	for (const [name, fromChannel] of Object.entries(fromChannels)) {
		const toChannel = nextChannels[name];
		if (!fromChannel || !toChannel) {
			continue;
		}

		if (fromChannel.kind === "scalar" && toChannel.kind === "scalar") {
			const sourceKey = closestBoundaryKey(
				fromChannel.keys,
				fromBoundaryLocalTime,
			);
			if (!sourceKey) {
				continue;
			}
			const nextKeys = replaceBoundaryKeyValues(
				toChannel.keys,
				toBoundaryLocalTime,
				sourceKey.value,
			);
			if (nextKeys) {
				nextChannels[name] = { ...toChannel, keys: nextKeys };
				changed = true;
			}
		} else if (
			fromChannel.kind === "discrete" &&
			toChannel.kind === "discrete"
		) {
			const sourceKey = closestBoundaryKey(
				fromChannel.keys,
				fromBoundaryLocalTime,
			);
			if (!sourceKey) {
				continue;
			}
			const nextKeys = replaceBoundaryKeyValues(
				toChannel.keys,
				toBoundaryLocalTime,
				sourceKey.value,
			);
			if (nextKeys) {
				nextChannels[name] = { ...toChannel, keys: nextKeys };
				changed = true;
			}
		}
	}

	if (!changed) {
		return null;
	}
	return {
		...to,
		animations: { ...to.animations, channels: nextChannels },
	} as TimelineElement;
}

// Mirrors the edited element's boundary keyframe values onto abutting
// same-source neighbors on the same track. The edited element is the source of
// truth; neighbors' existing boundary keys are overwritten (never created).
export function syncSeamlessBoundaryKeys({
	tracks,
	trackId,
	elementId,
}: {
	tracks: SceneTracks;
	trackId: string;
	elementId: string;
}): SceneTracks {
	const track = findTrackInSceneTracks({ tracks, trackId });
	const edited = track?.elements.find((element) => element.id === elementId);
	if (!track || !edited || !edited.animations) {
		return tracks;
	}

	const replacements = new Map<string, TimelineElement>();
	for (const neighbor of track.elements) {
		if (neighbor.id === edited.id) {
			continue;
		}
		if (isSeamlessContinuation({ left: edited, right: neighbor })) {
			const next = copyBoundaryValues({
				from: edited,
				fromBoundaryLocalTime: edited.duration,
				to: neighbor,
				toBoundaryLocalTime: 0,
			});
			if (next) {
				replacements.set(neighbor.id, next);
			}
		} else if (isSeamlessContinuation({ left: neighbor, right: edited })) {
			const next = copyBoundaryValues({
				from: edited,
				fromBoundaryLocalTime: 0,
				to: neighbor,
				toBoundaryLocalTime: neighbor.duration,
			});
			if (next) {
				replacements.set(neighbor.id, next);
			}
		}
	}

	if (replacements.size === 0) {
		return tracks;
	}

	const replaceIn = <
		TTrack extends { id: string; elements: TimelineElement[] },
	>(
		candidate: TTrack,
	): TTrack =>
		candidate.id === trackId
			? {
					...candidate,
					elements: candidate.elements.map(
						(element) => replacements.get(element.id) ?? element,
					),
				}
			: candidate;

	return {
		overlay: tracks.overlay.map((overlayTrack) => replaceIn(overlayTrack)),
		main: replaceIn(tracks.main),
		audio: tracks.audio.map((audioTrack) => replaceIn(audioTrack)),
	};
}
