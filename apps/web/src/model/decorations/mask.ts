export type MaskType =
	| "split"
	| "cinematic-bars"
	| "rectangle"
	| "ellipse"
	| "heart"
	| "diamond"
	| "star"
	| "text"
	| "custom";

export interface BaseMaskParams {
	feather: number;
	inverted: boolean;
	strokeColor: string;
	strokeWidth: number;
	strokeAlign: "inside" | "center" | "outside";
}

export interface SplitMaskParams extends BaseMaskParams {
	centerX: number;
	centerY: number;
	rotation: number;
}

export interface RectangleMaskParams extends BaseMaskParams {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
	rotation: number;
	scale: number;
}

export type TextFontWeight = "normal" | "bold";
export type TextFontStyle = "normal" | "italic";
export type TextDecoration = "none" | "underline" | "line-through";

export interface TextMaskParams extends BaseMaskParams {
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	textDecoration: TextDecoration;
	letterSpacing: number;
	lineHeight: number;
	centerX: number;
	centerY: number;
	rotation: number;
	scale: number;
}

export interface CustomMaskPathPoint {
	id: string;
	x: number;
	y: number;
	inX: number;
	inY: number;
	outX: number;
	outY: number;
}

export interface CustomMaskParams extends BaseMaskParams {
	path: CustomMaskPathPoint[];
	closed: boolean;
	centerX: number;
	centerY: number;
	rotation: number;
	scale: number;
}

export interface SplitMask {
	id: string;
	type: "split";
	params: SplitMaskParams;
}

export interface CinematicBarsMask {
	id: string;
	type: "cinematic-bars";
	params: RectangleMaskParams;
}

export interface RectangleMask {
	id: string;
	type: "rectangle";
	params: RectangleMaskParams;
}

export interface EllipseMask {
	id: string;
	type: "ellipse";
	params: RectangleMaskParams;
}

export interface HeartMask {
	id: string;
	type: "heart";
	params: RectangleMaskParams;
}

export interface DiamondMask {
	id: string;
	type: "diamond";
	params: RectangleMaskParams;
}

export interface StarMask {
	id: string;
	type: "star";
	params: RectangleMaskParams;
}

export interface TextMask {
	id: string;
	type: "text";
	params: TextMaskParams;
}

export interface CustomMask {
	id: string;
	type: "custom";
	params: CustomMaskParams;
}

export type Mask =
	| SplitMask
	| CinematicBarsMask
	| RectangleMask
	| EllipseMask
	| HeartMask
	| DiamondMask
	| StarMask
	| TextMask
	| CustomMask;
