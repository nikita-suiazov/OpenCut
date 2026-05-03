import type { ElementAnimations } from "@/model/decorations/animations";
import type { ElementId } from "../ids";

export interface BaseTimelineElement {
	id: ElementId;
	name: string;
	duration: number;
	startTime: number;
	trimStart: number;
	trimEnd: number;
	sourceDuration?: number;
	animations?: ElementAnimations;
}

export interface RetimeConfig {
	rate: number;
	maintainPitch?: boolean;
}
