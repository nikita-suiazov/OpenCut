import type { Effect } from "@/model/decorations/effect";
import type { Mask } from "@/model/decorations/mask";
import type { BlendMode, Transform } from "@/rendering";
import type { BaseTimelineElement } from "./base";

export interface ImageElement extends BaseTimelineElement {
	type: "image";
	mediaId: string;
	hidden?: boolean;
	transform: Transform;
	opacity: number;
	blendMode?: BlendMode;
	effects?: Effect[];
	masks?: Mask[];
}
