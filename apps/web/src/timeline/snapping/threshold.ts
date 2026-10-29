import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/timeline/scale";
import { TICKS_PER_SECOND } from "@/wasm";

// wide enough that clips grab each other by eye; hold Shift to place freely
const DEFAULT_TIMELINE_SNAP_THRESHOLD_PX = 16;

export function getTimelineSnapThresholdInTicks({
	zoomLevel,
	snapThresholdPx = DEFAULT_TIMELINE_SNAP_THRESHOLD_PX,
}: {
	zoomLevel: number;
	snapThresholdPx?: number;
}): number {
	const pixelsPerSecond = BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
	return (snapThresholdPx / pixelsPerSecond) * TICKS_PER_SECOND;
}
