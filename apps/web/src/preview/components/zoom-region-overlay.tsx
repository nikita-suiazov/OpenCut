"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/editor/use-editor";
import { useTimelineStore } from "@/timeline/timeline-store";
import { usePreviewViewport } from "./preview-viewport";
import { CornerHandle, getResizeCursor } from "./handle-primitives";
import { clampZoomFocus, ZOOM_LEVEL_MAX, ZOOM_LEVEL_MIN } from "@/timeline/zoom-segments";
import { clamp } from "@/utils/math";

interface ZoomDraft {
	focusX: number;
	focusY: number;
	level: number;
}

interface DragSession {
	pointerId: number;
	mode: "move" | "corner";
	startCanvasX: number;
	startCanvasY: number;
	startFocusX: number;
	startFocusY: number;
}

/**
 * Region picker for the selected zoom segment: a draggable rect over the
 * un-zoomed preview showing exactly what will fill the screen. Corner drag
 * changes the zoom level.
 */
export function ZoomRegionOverlay() {
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const selectedZoomId = useTimelineStore((s) => s.selectedZoomId);
	const setSelectedZoomId = useTimelineStore((s) => s.setSelectedZoomId);
	const zoom = useEditor(
		(e) =>
			e.scenes
				.getActiveSceneOrNull()
				?.zooms?.find((segment) => segment.id === selectedZoomId) ?? null,
	);
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const canvasSize = useEditor(
		(e) => e.project.getActive()?.settings.canvasSize,
	);

	// Playback applies the zoom effect, so leave region-editing mode.
	useEffect(() => {
		if (isPlaying && selectedZoomId) {
			setSelectedZoomId(null);
		}
	}, [isPlaying, selectedZoomId, setSelectedZoomId]);

	const [draft, setDraft] = useState<ZoomDraft | null>(null);
	const sessionRef = useRef<DragSession | null>(null);
	const draftRef = useRef<ZoomDraft | null>(null);

	if (!zoom || !canvasSize || isPlaying) {
		return null;
	}

	const width = canvasSize.width;
	const height = canvasSize.height;
	const state: ZoomDraft = draft ?? {
		focusX: zoom.focusX,
		focusY: zoom.focusY,
		level: zoom.level,
	};

	const regionWidth = width / state.level;
	const regionHeight = height / state.level;
	const centerCanvasX = state.focusX * width;
	const centerCanvasY = state.focusY * height;

	const { x: scaleX, y: scaleY } = viewport.getDisplayScale();
	const center = viewport.canvasToOverlay({
		canvasX: centerCanvasX,
		canvasY: centerCanvasY,
	});
	const overlayWidth = regionWidth * scaleX;
	const overlayHeight = regionHeight * scaleY;

	const updateDraft = (next: ZoomDraft) => {
		draftRef.current = next;
		setDraft(next);
	};

	const beginDrag = ({
		event,
		mode,
	}: {
		event: React.PointerEvent;
		mode: DragSession["mode"] | "jump";
	}) => {
		if (event.button !== 0) return;
		event.stopPropagation();
		event.preventDefault();
		const canvasPoint = viewport.screenToCanvas({
			clientX: event.clientX,
			clientY: event.clientY,
		});
		if (!canvasPoint) return;

		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			// Pointer may already be released (fast click); drag still works
			// through the element's own move/up handlers.
		}
		// "jump" recenters the region on the clicked point, then behaves
		// like a move drag (OpenScreen behavior).
		const isJump = mode === "jump";
		const nextState = isJump
			? {
					...state,
					...clampZoomFocus({
						focusX: canvasPoint.x / width,
						focusY: canvasPoint.y / height,
						level: state.level,
					}),
				}
			: state;
		sessionRef.current = {
			pointerId: event.pointerId,
			mode: isJump ? "move" : mode,
			startCanvasX: canvasPoint.x,
			startCanvasY: canvasPoint.y,
			startFocusX: nextState.focusX,
			startFocusY: nextState.focusY,
		};
		updateDraft(nextState);
	};

	const handlePointerMove = (event: React.PointerEvent) => {
		const session = sessionRef.current;
		if (!session || event.pointerId !== session.pointerId) return;
		const canvasPoint = viewport.screenToCanvas({
			clientX: event.clientX,
			clientY: event.clientY,
		});
		if (!canvasPoint) return;
		const current = draftRef.current ?? state;

		if (session.mode === "move") {
			const nextFocus = clampZoomFocus({
				focusX:
					session.startFocusX + (canvasPoint.x - session.startCanvasX) / width,
				focusY:
					session.startFocusY + (canvasPoint.y - session.startCanvasY) / height,
				level: current.level,
			});
			updateDraft({ ...current, ...nextFocus });
			return;
		}

		const offsetX = Math.abs(canvasPoint.x - session.startFocusX * width);
		const offsetY = Math.abs(canvasPoint.y - session.startFocusY * height);
		if (offsetX < 1 && offsetY < 1) return;

		const levelFromX = offsetX >= 1 ? width / (2 * offsetX) : Infinity;
		const levelFromY = offsetY >= 1 ? height / (2 * offsetY) : Infinity;
		const level = clamp({
			value: Math.min(levelFromX, levelFromY),
			min: ZOOM_LEVEL_MIN,
			max: ZOOM_LEVEL_MAX,
		});
		updateDraft({
			level,
			...clampZoomFocus({
				focusX: session.startFocusX,
				focusY: session.startFocusY,
				level,
			}),
		});
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		const session = sessionRef.current;
		if (!session || event.pointerId !== session.pointerId) return;
		sessionRef.current = null;

		const committed = draftRef.current;
		draftRef.current = null;
		setDraft(null);
		const hasChanged =
			committed &&
			(committed.focusX !== zoom.focusX ||
				committed.focusY !== zoom.focusY ||
				committed.level !== zoom.level);
		if (committed && hasChanged) {
			editor.scenes.updateZoom({ zoomId: zoom.id, updates: committed });
		}
	};

	const corners = [
		{ key: "nw", x: -1, y: -1 },
		{ key: "ne", x: 1, y: -1 },
		{ key: "se", x: 1, y: 1 },
		{ key: "sw", x: -1, y: 1 },
	] as const;

	return (
		<div className="pointer-events-none absolute inset-0" aria-hidden>
			{/* Clips the outside-region dim to the canvas bounds. */}
			<div
				className="absolute overflow-hidden"
				style={{
					left: viewport.sceneLeft,
					top: viewport.sceneTop,
					width: viewport.sceneWidth,
					height: viewport.sceneHeight,
				}}
			>
				{/* Click anywhere on the frame to recenter the zoom region there. */}
				<div
					className="absolute inset-0 cursor-crosshair"
					style={{ pointerEvents: "auto" }}
					onPointerDown={(event) => beginDrag({ event, mode: "jump" })}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
				/>
				<div
					className="absolute cursor-grab rounded-[2px] border-2 border-emerald-400/90"
					style={{
						left: center.x - viewport.sceneLeft - overlayWidth / 2,
						top: center.y - viewport.sceneTop - overlayHeight / 2,
						width: overlayWidth,
						height: overlayHeight,
						boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
						pointerEvents: "auto",
					}}
					onPointerDown={(event) => beginDrag({ event, mode: "move" })}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
				>
					<span className="absolute top-1 left-1 rounded-sm bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
						{state.level.toFixed(1)}×
					</span>
				</div>
			</div>
			{corners.map((corner) => (
				<CornerHandle
					key={corner.key}
					cursor={getResizeCursor({
						angleDeg: corner.x * corner.y === 1 ? 45 : 135,
					})}
					screen={{
						x: center.x + (corner.x * overlayWidth) / 2,
						y: center.y + (corner.y * overlayHeight) / 2,
					}}
					onPointerDown={(event) => beginDrag({ event, mode: "corner" })}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
				/>
			))}
		</div>
	);
}
