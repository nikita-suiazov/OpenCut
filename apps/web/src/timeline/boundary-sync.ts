import type { SceneTracks, TimelineElement } from "@/timeline/types";
import type {
	AnimationChannel,
	ChannelData,
	ElementAnimations,
} from "@/animation/types";
import { findTrackInSceneTracks } from "@/timeline/track-element-update";
import { getSourceSpanAtClipTime } from "@/retime/split";
import { isRetimableElement } from "@/timeline/element-utils";

// Splitting an element duplicates the boundary keyframes on both halves.
// Editing one duplicate leaves the other stale, so playback ramps to the old
// value and snaps at the cut. After a keyframe write near an element edge,
// mirror the edited element's boundary values onto seamless neighbors.

// Keys this close to the cut (in ticks) count as boundary keys — one frame at
// 30fps. Sub-frame ramps across a seamless cut are never intentional.
const BOUNDARY_KEY_EPSILON = 4000;
// Tolerance for source-continuity comparison (split math snaps to ticks; this
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

function isChannel(data: ChannelData | undefined): data is AnimationChannel {
	return !!data && Array.isArray((data as AnimationChannel).keys);
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

/** The `to` channel with its boundary keys set to `from`'s boundary value, or null when nothing changes. */
function syncChannel({
	from,
	fromBoundary,
	to,
	toBoundary,
}: {
	from: AnimationChannel;
	fromBoundary: number;
	to: AnimationChannel;
	toBoundary: number;
}): AnimationChannel | null {
	const sourceKey = closestBoundaryKey(
		from.keys as ReadonlyArray<{ time: number; value: unknown }>,
		fromBoundary,
	);
	if (!sourceKey) {
		return null;
	}
	const keys = (to.keys as Array<{ time: number; value: unknown }>).map((key) =>
		Math.abs(key.time - toBoundary) <= BOUNDARY_KEY_EPSILON &&
		key.value !== sourceKey.value
			? { ...key, value: sourceKey.value }
			: key,
	);
	return keys.some((key, index) => key !== to.keys[index])
		? ({ ...to, keys } as AnimationChannel)
		: null;
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
	if (!from.animations || !to.animations) {
		return null;
	}

	let changed = false;
	const next: ElementAnimations = { ...to.animations };
	const sync = (fromChannel: AnimationChannel, toChannel: AnimationChannel) =>
		syncChannel({
			from: fromChannel,
			fromBoundary: fromBoundaryLocalTime,
			to: toChannel,
			toBoundary: toBoundaryLocalTime,
		});

	for (const [path, fromData] of Object.entries(from.animations)) {
		const toData = next[path];
		if (!fromData || !toData) {
			continue;
		}

		if (isChannel(fromData) && isChannel(toData)) {
			const synced = sync(fromData, toData);
			if (synced) {
				next[path] = synced;
				changed = true;
			}
			continue;
		}

		// a composite property (a vector, say): component by component
		if (!isChannel(fromData) && !isChannel(toData)) {
			const components = { ...toData };
			let componentChanged = false;
			for (const [component, fromChannel] of Object.entries(fromData)) {
				const toChannel = components[component];
				if (!fromChannel || !toChannel) continue;
				const synced = sync(fromChannel, toChannel);
				if (synced) {
					components[component] = synced;
					componentChanged = true;
				}
			}
			if (componentChanged) {
				next[path] = components;
				changed = true;
			}
		}
	}

	return changed ? ({ ...to, animations: next } as TimelineElement) : null;
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
