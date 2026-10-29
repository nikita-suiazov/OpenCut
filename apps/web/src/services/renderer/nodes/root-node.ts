import type { ZoomSegment } from "@/timeline/zoom-segments";
import { BaseNode } from "./base-node";

export type RootNodeParams = {
	duration: number;
	zooms?: ZoomSegment[];
};

export class RootNode extends BaseNode<RootNodeParams> {
	get duration() {
		return this.params.duration ?? 0;
	}
}
