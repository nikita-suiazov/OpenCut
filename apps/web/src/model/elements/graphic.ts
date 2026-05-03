import type { Effect } from "@/model/decorations/effect";
import type { Mask } from "@/model/decorations/mask";
import type { ParamValues } from "@/model/decorations/param-values";
import type { BlendMode, Transform } from "@/rendering";
import type { BaseTimelineElement } from "./base";

export interface GraphicElement extends BaseTimelineElement {
	type: "graphic";
	definitionId: string;
	params: ParamValues;
	hidden?: boolean;
	transform: Transform;
	opacity: number;
	blendMode?: BlendMode;
	effects?: Effect[];
	masks?: Mask[];
}
