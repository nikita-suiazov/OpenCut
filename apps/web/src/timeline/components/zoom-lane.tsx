"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, SearchAddIcon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/editor/use-editor";
import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { useTimelineStore } from "@/timeline/timeline-store";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
	clampZoomFocus,
	clampZoomWindow,
	ZOOM_LEVEL_MAX,
	ZOOM_LEVEL_MIN,
	type ZoomSegment,
} from "@/timeline/zoom-segments";
import {
	getTimelinePixelsPerSecond,
	timelineTimeToPixels,
} from "@/timeline/pixel-utils";
import { TICKS_PER_SECOND } from "@/wasm";
import { TIMELINE_ZOOM_LANE_HEIGHT_PX } from "./layout";
import { cn } from "@/utils/ui";

const EDGE_ZONE_PX = 6;
const DRAG_THRESHOLD_PX = 3;
const MIN_SEGMENT_RENDER_WIDTH_PX = 12;
const RANGE_LABEL_MIN_WIDTH_PX = 110;

type DragMode = "move" | "resize-left" | "resize-right";

interface ZoomDragState {
	zoomId: string;
	pointerId: number;
	mode: DragMode;
	startClientX: number;
	originalStart: number;
	originalDuration: number;
	startTime: number;
	duration: number;
	moved: boolean;
}

interface TimelineZoomsRowProps {
	zoomLevel: number;
	dynamicTimelineWidth: number;
	handleWheel: (event: React.WheelEvent) => void;
	handleTimelineContentClick: (event: React.MouseEvent) => void;
	handleRulerTrackingMouseDown: (event: React.MouseEvent) => void;
	handleRulerMouseDown: (event: React.MouseEvent) => void;
}

export function TimelineZoomsRow({
	zoomLevel,
	dynamicTimelineWidth,
	handleWheel,
	handleTimelineContentClick,
	handleRulerTrackingMouseDown,
	handleRulerMouseDown,
}: TimelineZoomsRowProps) {
	const editor = useEditor();
	const zooms = useEditor((e) => e.scenes.getActiveSceneOrNull()?.zooms ?? []);
	const [dragState, setDragState] = useState<ZoomDragState | null>(null);

	return (
		<div
			className="relative flex-1 overflow-hidden border-t border-foreground/5"
			style={{ height: TIMELINE_ZOOM_LANE_HEIGHT_PX }}
		>
			<button
				className="relative w-full cursor-default select-none border-0 bg-transparent p-0"
				style={{
					height: TIMELINE_ZOOM_LANE_HEIGHT_PX,
					width: `${dynamicTimelineWidth}px`,
				}}
				aria-label="Zoom segments lane"
				type="button"
				onWheel={handleWheel}
				onClick={(event) => {
					if (!event.currentTarget.contains(event.target as Node)) return;
					handleTimelineContentClick(event);
				}}
				onMouseDown={(event) => {
					if (!event.currentTarget.contains(event.target as Node)) return;
					handleRulerMouseDown(event);
					handleRulerTrackingMouseDown(event);
				}}
			>
				{zooms.length === 0 && (
					<span className="text-muted-foreground/50 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[10px]">
						Press Z to add zoom
					</span>
				)}
				{zooms.map((zoom) => (
					<TimelineZoomSegment
						key={zoom.id}
						zoom={zoom}
						zooms={zooms}
						zoomLevel={zoomLevel}
						timelineDuration={editor.timeline.getTotalDuration()}
						dragState={dragState?.zoomId === zoom.id ? dragState : null}
						setDragState={setDragState}
					/>
				))}
			</button>
		</div>
	);
}

function formatSeconds(ticks: number): string {
	return `${(ticks / TICKS_PER_SECOND).toFixed(1)}s`;
}

function TimelineZoomSegment({
	zoom,
	zooms,
	zoomLevel,
	timelineDuration,
	dragState,
	setDragState,
}: {
	zoom: ZoomSegment;
	zooms: ZoomSegment[];
	zoomLevel: number;
	timelineDuration: number;
	dragState: ZoomDragState | null;
	setDragState: React.Dispatch<React.SetStateAction<ZoomDragState | null>>;
}) {
	const editor = useEditor();
	const selectedZoomId = useTimelineStore((s) => s.selectedZoomId);
	const setSelectedZoomId = useTimelineStore((s) => s.setSelectedZoomId);
	const { setElementSelection } = useElementSelection();
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const dragStateRef = useRef<ZoomDragState | null>(null);

	const isSelected = selectedZoomId === zoom.id;
	const displayStart = dragState?.startTime ?? zoom.startTime;
	const displayDuration = dragState?.duration ?? zoom.duration;

	const left = timelineTimeToPixels({ time: displayStart, zoomLevel });
	const width = Math.max(
		timelineTimeToPixels({ time: displayDuration, zoomLevel }),
		MIN_SEGMENT_RENDER_WIDTH_PX,
	);

	const selectZoom = () => {
		setElementSelection({ elements: [] });
		setSelectedZoomId(zoom.id);
	};

	const pixelsToTicks = (pixels: number) =>
		(pixels / getTimelinePixelsPerSecond({ zoomLevel })) * TICKS_PER_SECOND;

	const handlePointerDown = (mode: DragMode) => (event: React.PointerEvent) => {
		if (event.button !== 0) return;
		event.stopPropagation();
		event.preventDefault();

		if (event.detail >= 2) {
			setIsPopoverOpen(true);
			return;
		}

		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			// Pointer may already be released (fast click); drag still works
			// through the element's own move/up handlers.
		}
		const nextState: ZoomDragState = {
			zoomId: zoom.id,
			pointerId: event.pointerId,
			mode,
			startClientX: event.clientX,
			originalStart: zoom.startTime,
			originalDuration: zoom.duration,
			startTime: zoom.startTime,
			duration: zoom.duration,
			moved: false,
		};
		dragStateRef.current = nextState;
		setDragState(nextState);
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		const current = dragStateRef.current;
		if (!current || event.pointerId !== current.pointerId) return;

		const deltaPx = event.clientX - current.startClientX;
		if (!current.moved && Math.abs(deltaPx) < DRAG_THRESHOLD_PX) return;

		const deltaTicks = pixelsToTicks(deltaPx);
		let proposedStart = current.originalStart;
		let proposedDuration = current.originalDuration;

		if (current.mode === "move") {
			proposedStart = current.originalStart + deltaTicks;
		} else if (current.mode === "resize-left") {
			proposedStart = current.originalStart + deltaTicks;
			proposedDuration = current.originalDuration - deltaTicks;
		} else {
			proposedDuration = current.originalDuration + deltaTicks;
		}

		const clamped = clampZoomWindow({
			zooms,
			zoomId: zoom.id,
			startTime: proposedStart,
			duration: proposedDuration,
			timelineDuration,
		});
		// Moving must preserve duration even when clamped against an edge.
		const nextWindow =
			current.mode === "move"
				? { ...clamped, duration: current.originalDuration }
				: clamped;

		const nextState: ZoomDragState = {
			...current,
			...nextWindow,
			moved: true,
		};
		dragStateRef.current = nextState;
		setDragState(nextState);
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		const current = dragStateRef.current;
		if (!current || event.pointerId !== current.pointerId) return;
		dragStateRef.current = null;
		setDragState(null);

		if (current.moved) {
			editor.scenes.updateZoom({
				zoomId: zoom.id,
				updates: {
					startTime: current.startTime,
					duration: current.duration,
				},
			});
			selectZoom();
		} else {
			selectZoom();
		}
	};

	const showRangeLabel = width >= RANGE_LABEL_MIN_WIDTH_PX;

	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<PopoverAnchor asChild>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: drag surface; selection/removal is handled by the global keybindings system */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick only stops bubbling to the seek surface; keyboard access goes through the global keybindings system */}
				<div
					className={cn(
						"absolute top-0.5 bottom-0.5 flex cursor-grab items-center justify-center overflow-hidden rounded-sm border bg-emerald-500/25 transition-none",
						isSelected
							? "border-emerald-300 bg-emerald-500/40"
							: "border-emerald-500/50 hover:bg-emerald-500/30",
					)}
					style={{ left: `${left}px`, width: `${width}px` }}
					title={`${zoom.level.toFixed(1)}× zoom, ${formatSeconds(zoom.startTime)} – ${formatSeconds(zoom.startTime + zoom.duration)}`}
					onPointerDown={handlePointerDown("move")}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
					onMouseDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
				>
					<span className="pointer-events-none flex items-center gap-1 truncate px-2 text-[10px] font-medium text-emerald-100">
						<HugeiconsIcon icon={SearchAddIcon} className="size-3 shrink-0" />
						{zoom.level.toFixed(1)}×
						{showRangeLabel && (
							<span className="text-emerald-200/70">
								{formatSeconds(displayStart)} –{" "}
								{formatSeconds(displayStart + displayDuration)}
							</span>
						)}
					</span>
					<div
						className="absolute inset-y-0 left-0 cursor-ew-resize"
						style={{ width: EDGE_ZONE_PX }}
						onPointerDown={handlePointerDown("resize-left")}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onPointerCancel={handlePointerUp}
					/>
					<div
						className="absolute inset-y-0 right-0 cursor-ew-resize"
						style={{ width: EDGE_ZONE_PX }}
						onPointerDown={handlePointerDown("resize-right")}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onPointerCancel={handlePointerUp}
					/>
				</div>
			</PopoverAnchor>
			<PopoverContent
				className="flex w-56 flex-col gap-3 p-3"
				align="start"
				side="bottom"
				sideOffset={8}
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<ZoomPopoverContent
					zoom={zoom}
					onClose={() => setIsPopoverOpen(false)}
				/>
			</PopoverContent>
		</Popover>
	);
}

function ZoomPopoverContent({
	zoom,
	onClose,
}: {
	zoom: ZoomSegment;
	onClose: () => void;
}) {
	const editor = useEditor();
	const setSelectedZoomId = useTimelineStore((s) => s.setSelectedZoomId);
	const [draftLevel, setDraftLevel] = useState(zoom.level);

	const commitLevel = (level: number) => {
		editor.scenes.updateZoom({
			zoomId: zoom.id,
			updates: {
				level,
				...clampZoomFocus({
					focusX: zoom.focusX,
					focusY: zoom.focusY,
					level,
				}),
			},
		});
	};

	return (
		<>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<Label className="text-xs">Zoom level</Label>
					<span className="text-muted-foreground text-xs">
						{draftLevel.toFixed(1)}×
					</span>
				</div>
				<Slider
					value={[draftLevel]}
					min={ZOOM_LEVEL_MIN}
					max={ZOOM_LEVEL_MAX}
					step={0.1}
					onValueChange={(values) => setDraftLevel(values[0])}
					onValueCommit={(values) => commitLevel(values[0])}
				/>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="text-destructive hover:bg-destructive/10"
				onClick={() => {
					editor.scenes.removeZoom({ zoomId: zoom.id });
					setSelectedZoomId(null);
					onClose();
				}}
				aria-label="delete zoom"
			>
				<HugeiconsIcon icon={Delete02Icon} className="!size-3.5" />
				Delete
			</Button>
		</>
	);
}
