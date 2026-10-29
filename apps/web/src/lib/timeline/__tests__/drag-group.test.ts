import { describe, expect, test } from "bun:test";
import {
	buildDragGroup,
	getEarliestGroupOffset,
	getGroupEdgeOffsets,
} from "@/lib/timeline/drag-group";
import type { TimelineTrack } from "@/lib/timeline/types";

function buildTracks(): TimelineTrack[] {
	const element = (id: string, startTime: number, duration: number) =>
		({
			id,
			type: "video",
			name: id,
			mediaId: "m",
			startTime,
			duration,
			trimStart: 0,
			trimEnd: 0,
			sourceDuration: duration,
		}) as unknown as TimelineTrack["elements"][number];

	return [
		{
			id: "main",
			type: "video",
			name: "Main Track",
			elements: [element("a", 1000, 500), element("b", 2000, 300)],
			muted: false,
		},
		{
			id: "audio",
			type: "audio",
			name: "Audio",
			elements: [element("c", 800, 200)],
			muted: false,
		},
	] as unknown as TimelineTrack[];
}

describe("drag group", () => {
	const tracks = buildTracks();
	const selection = [
		{ trackId: "main", elementId: "a" },
		{ trackId: "main", elementId: "b" },
		{ trackId: "audio", elementId: "c" },
	];

	test("a lone element drags by itself", () => {
		const group = buildDragGroup({
			elementId: "a",
			startElementTime: 1000,
			selectedElements: [{ trackId: "main", elementId: "a" }],
			tracks,
		});
		expect(group.dragElementIds).toEqual(["a"]);
		expect(group.dragTimeOffsets).toEqual({});
	});

	test("an unselected element ignores the selection", () => {
		const group = buildDragGroup({
			elementId: "b",
			startElementTime: 2000,
			selectedElements: [{ trackId: "audio", elementId: "c" }],
			tracks,
		});
		expect(group.dragElementIds).toEqual(["b"]);
	});

	test("a multi-selection keeps offsets relative to the grabbed element", () => {
		const group = buildDragGroup({
			elementId: "a",
			startElementTime: 1000,
			selectedElements: selection,
			tracks,
		});
		expect(group.dragElementIds).toEqual(["a", "b", "c"]);
		expect(group.dragTimeOffsets).toEqual({ a: 0, b: 1000, c: -200 });
	});

	test("the group cannot be pushed before zero", () => {
		const { dragTimeOffsets } = buildDragGroup({
			elementId: "a",
			startElementTime: 1000,
			selectedElements: selection,
			tracks,
		});
		// grabbed element clamps at +200 so element "c" lands exactly on zero
		expect(getEarliestGroupOffset({ dragTimeOffsets })).toBe(-200);
	});

	test("edge offsets span the whole selection", () => {
		const { dragElementIds, dragTimeOffsets } = buildDragGroup({
			elementId: "a",
			startElementTime: 1000,
			selectedElements: selection,
			tracks,
		});
		expect(
			getGroupEdgeOffsets({
				groupIds: dragElementIds,
				dragTimeOffsets,
				tracks,
				fallbackDuration: 500,
			}),
		).toEqual({ leadOffset: -200, trailOffset: 1300 });
	});

	test("a single element spans its own duration", () => {
		expect(
			getGroupEdgeOffsets({
				groupIds: ["a"],
				dragTimeOffsets: {},
				tracks,
				fallbackDuration: 500,
			}),
		).toEqual({ leadOffset: 0, trailOffset: 500 });
	});
});
