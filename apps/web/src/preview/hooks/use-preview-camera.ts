import { useMemo } from "react";
import { useEditor } from "@/editor/use-editor";
import {
	getZoomCameraAtTime,
	type ZoomCamera,
} from "@/timeline/zoom-segments";
import { useTimelineStore } from "@/timeline/timeline-store";

/**
 * The zoom camera the renderer is applying to the frame right now. Preview
 * overlays run element geometry through it so handles and hit tests land on
 * what is actually drawn. Mirrors the render tree: while a zoom segment is
 * being edited the preview is un-zoomed, so the camera is identity then too.
 */
export function usePreviewCamera(): ZoomCamera | null {
	const zooms = useEditor((e) => e.scenes.getActiveSceneOrNull()?.zooms);
	const selectedZoomId = useTimelineStore((s) => s.selectedZoomId);
	const currentTime = useEditor((e) => e.playback.getCurrentTime());
	const lastFrameTime = useEditor((e) => e.timeline.getLastFrameTime());
	const canvasSize = useEditor(
		(e) => e.project.getActive().settings.canvasSize,
	);

	return useMemo(() => {
		if (selectedZoomId) return null;
		return getZoomCameraAtTime({
			zooms: zooms ?? [],
			time: Math.min(currentTime, lastFrameTime),
			width: canvasSize.width,
			height: canvasSize.height,
		});
	}, [
		zooms,
		selectedZoomId,
		currentTime,
		lastFrameTime,
		canvasSize.width,
		canvasSize.height,
	]);
}
