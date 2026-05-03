import type { ParamDefinition, ParamValues } from "@/model/decorations/param-values";
import type { EffectPass, EffectPassTemplate } from "@/model/decorations/effect";

export type {
	Effect,
	EffectPass,
	EffectPassTemplate,
	EffectUniformValue,
} from "@/model/decorations/effect";

export interface EffectRendererConfig {
	passes: EffectPassTemplate[];
	buildPasses?: (params: {
		effectParams: ParamValues;
		width: number;
		height: number;
	}) => EffectPass[];
}

export interface EffectDefinition {
	type: string;
	name: string;
	keywords: string[];
	params: ParamDefinition[];
	renderer: EffectRendererConfig;
}
