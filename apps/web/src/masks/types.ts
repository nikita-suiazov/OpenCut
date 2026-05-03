import type { ElementBounds } from "@/preview/element-bounds";
import type { PreviewSnapLine } from "@/preview/preview-snap";
import type { ParamDefinition } from "@/model/decorations/param-values";
import type {
	BaseMaskParams,
	Mask,
	MaskType,
} from "@/model/decorations/mask";

export type {
	BaseMaskParams,
	CinematicBarsMask,
	CustomMask,
	CustomMaskParams,
	CustomMaskPathPoint,
	DiamondMask,
	EllipseMask,
	HeartMask,
	Mask,
	MaskType,
	RectangleMask,
	RectangleMaskParams,
	SplitMask,
	SplitMaskParams,
	StarMask,
	TextDecoration,
	TextFontStyle,
	TextFontWeight,
	TextMask,
	TextMaskParams,
} from "@/model/decorations/mask";

export interface MaskRenderer {
	buildPath?: (params: {
		resolvedParams: unknown;
		width: number;
		height: number;
	}) => Path2D;
	buildStrokePath?: (params: {
		resolvedParams: unknown;
		width: number;
		height: number;
	}) => Path2D;
	/** Renders the feathered mask directly onto ctx, bypassing JFA. */
	renderMask?: (params: {
		resolvedParams: unknown;
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		feather: number;
	}) => void;
	renderMaskHandlesFeather?: boolean;
	renderStroke?: (params: {
		resolvedParams: unknown;
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}) => void;
}

export interface MaskFeatures {
	hasPosition: boolean;
	hasRotation: boolean;
	sizeMode: "none" | "uniform" | "width-height" | "height-only" | "width-only";
}

export type MaskHandleIcon = "rotate" | "feather";

export type MaskHandleKind = "corner" | "edge" | "icon" | "point" | "tangent";

export interface MaskHandlePosition {
	id: string;
	x: number;
	y: number;
	cursor: string;
	kind: MaskHandleKind;
	isSelected?: boolean;
	edgeAxis?: "horizontal" | "vertical";
	rotation?: number;
	icon?: MaskHandleIcon;
}

export interface MaskLineOverlay {
	id: string;
	type: "line";
	start: { x: number; y: number };
	end: { x: number; y: number };
	cursor?: string;
	handleId?: string;
}

export interface MaskRectOverlay {
	id: string;
	type: "rect";
	center: { x: number; y: number };
	width: number;
	height: number;
	rotation: number;
	dashed?: boolean;
	cursor?: string;
	handleId?: string;
}

export interface MaskShapeOverlay {
	id: string;
	type: "shape";
	center: { x: number; y: number };
	width: number;
	height: number;
	rotation: number;
	pathData: string;
	cursor?: string;
	handleId?: string;
}

export interface MaskCanvasPathOverlay {
	id: string;
	type: "canvas-path";
	pathData: string;
	coordinateSpace?: "canvas" | "overlay";
	cursor?: string;
	handleId?: string;
	strokeWidth?: number;
	strokeOpacity?: number;
}

export type MaskOverlay =
	| MaskLineOverlay
	| MaskRectOverlay
	| MaskShapeOverlay
	| MaskCanvasPathOverlay;

export interface MaskDefaultContext {
	elementSize?: { width: number; height: number };
}

export interface MaskParamUpdateArgs<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	handleId: string;
	startParams: TParams;
	deltaX: number;
	deltaY: number;
	startCanvasX: number;
	startCanvasY: number;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
}

export interface MaskSnapArgs<TParams extends BaseMaskParams = BaseMaskParams> {
	handleId: string;
	startParams: TParams;
	proposedParams: TParams;
	bounds: ElementBounds;
	canvasSize: { width: number; height: number };
	snapThreshold: { x: number; y: number };
}

export interface MaskSnapResult<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	params: TParams;
	activeLines: PreviewSnapLine[];
}

export interface MaskInteractionResult {
	handles: MaskHandlePosition[];
	overlays: MaskOverlay[];
}

export interface MaskInteractionDefinition<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	getInteraction(args: {
		params: TParams;
		bounds: ElementBounds;
		displayScale: number;
		scaleX: number;
		scaleY: number;
	}): MaskInteractionResult;
	snap?(args: MaskSnapArgs<TParams>): MaskSnapResult<TParams>;
}

export interface MaskDefinition<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	type: MaskType;
	name: string;
	features: MaskFeatures;
	params: ParamDefinition<keyof TParams & string>[];
	renderer: MaskRenderer;
	interaction: MaskInteractionDefinition<TParams>;
	/** When defined and returning false, the mask is not applied and the element renders fully visible. */
	isActive?: (params: TParams) => boolean;
	buildDefault(context: MaskDefaultContext): Omit<Mask, "id">;
	computeParamUpdate(args: MaskParamUpdateArgs<TParams>): Partial<TParams>;
}
