import type { ElementRef, TimelineElement, TimelineTrack } from "./types";

export interface DragGroup {
	dragElementIds: string[];
	dragTimeOffsets: Record<string, number>;
}

export function findElementLocation({
	tracks,
	elementId,
}: {
	tracks: TimelineTrack[];
	elementId: string;
}): { trackId: string; element: TimelineElement } | null {
	for (const track of tracks) {
		const element = track.elements.find(({ id }) => id === elementId);
		if (element) return { trackId: track.id, element };
	}
	return null;
}

/**
 * Elements that travel with the grabbed one. Dragging any member of a
 * multi-selection moves the whole selection, keeping relative timing.
 */
export function buildDragGroup({
	elementId,
	startElementTime,
	selectedElements,
	tracks,
}: {
	elementId: string;
	startElementTime: number;
	selectedElements: ElementRef[];
	tracks: TimelineTrack[];
}): DragGroup {
	const isGrabbedSelected = selectedElements.some(
		(selected) => selected.elementId === elementId,
	);
	if (!isGrabbedSelected || selectedElements.length < 2) {
		return { dragElementIds: [elementId], dragTimeOffsets: {} };
	}

	const dragElementIds: string[] = [];
	const dragTimeOffsets: Record<string, number> = {};
	for (const selected of selectedElements) {
		const location = findElementLocation({
			tracks,
			elementId: selected.elementId,
		});
		if (!location) continue;
		dragElementIds.push(selected.elementId);
		dragTimeOffsets[selected.elementId] =
			location.element.startTime - startElementTime;
	}
	return { dragElementIds, dragTimeOffsets };
}

/** How far the group reaches before the grabbed element (never positive). */
export function getEarliestGroupOffset({
	dragTimeOffsets,
}: {
	dragTimeOffsets: Record<string, number>;
}): number {
	return Math.min(0, ...Object.values(dragTimeOffsets));
}

/**
 * Outer edges of the dragged selection, relative to the grabbed element's
 * start. A single element just yields [0, its duration].
 */
export function getGroupEdgeOffsets({
	groupIds,
	dragTimeOffsets,
	tracks,
	fallbackDuration,
}: {
	groupIds: string[];
	dragTimeOffsets: Record<string, number>;
	tracks: TimelineTrack[];
	fallbackDuration: number;
}): { leadOffset: number; trailOffset: number } {
	let leadOffset = 0;
	let trailOffset = fallbackDuration;

	for (const elementId of groupIds) {
		const location = findElementLocation({ tracks, elementId });
		if (!location) continue;
		const offset = dragTimeOffsets[elementId] ?? 0;
		leadOffset = Math.min(leadOffset, offset);
		trailOffset = Math.max(trailOffset, offset + location.element.duration);
	}

	return { leadOffset, trailOffset };
}
