import type { ParamValues } from "@/model/decorations/param-values";
import type { BaseTimelineElement } from "./base";

export interface EffectElement extends BaseTimelineElement {
	type: "effect";
	effectType: string;
	params: ParamValues;
}
