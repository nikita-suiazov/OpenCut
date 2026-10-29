import { BaseNode } from "./base-node";
import type { TextElement } from "@/lib/timeline";
import type { EffectPass } from "@/lib/effects/types";
import type { Transform } from "@/lib/rendering";
import { CORNER_RADIUS_MAX, CORNER_RADIUS_MIN } from "@/lib/text/background";
import {
	drawTextDecoration,
	getTextBackgroundRect,
	setCanvasLetterSpacing,
} from "@/lib/text/layout";
import type { MeasuredTextElement } from "@/lib/text/measure-element";
import type { TextRun } from "@/lib/text/runs";
import { clamp } from "@/utils/math";

export type TextNodeParams = TextElement & {
	canvasCenter: { x: number; y: number };
	canvasHeight: number;
	textBaseline?: CanvasTextBaseline;
};

export interface ResolvedTextNodeState {
	transform: Transform;
	opacity: number;
	textColor: string;
	backgroundColor: string;
	effectPasses: EffectPass[][];
	measuredText: MeasuredTextElement;
}

export class TextNode extends BaseNode<TextNodeParams, ResolvedTextNodeState> {}

/**
 * One line, drawn run by run so a single element can mix colours. A line with
 * no colour markup is one run and takes the plain fillText path.
 */
function drawTextLine({
	ctx,
	runs,
	runWidths,
	lineWidth,
	lineY,
	textAlign,
	defaultColor,
}: {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	runs: TextRun[];
	runWidths: number[];
	lineWidth: number;
	lineY: number;
	textAlign: TextElement["textAlign"];
	defaultColor: string;
}): void {
	if (runs.length <= 1) {
		ctx.fillStyle = runs[0]?.color ?? defaultColor;
		ctx.fillText(runs[0]?.text ?? "", 0, lineY);
		ctx.fillStyle = defaultColor;
		return;
	}

	const alignToLeft: Record<TextElement["textAlign"], number> = {
		left: 0,
		center: -lineWidth / 2,
		right: -lineWidth,
	};
	let x = alignToLeft[textAlign];

	// Runs are placed by hand, so each one draws from its own left edge.
	const previousAlign = ctx.textAlign;
	ctx.textAlign = "left";
	for (let index = 0; index < runs.length; index++) {
		ctx.fillStyle = runs[index].color ?? defaultColor;
		ctx.fillText(runs[index].text, x, lineY);
		x += runWidths[index];
	}
	ctx.textAlign = previousAlign;
	ctx.fillStyle = defaultColor;
}

export function renderTextToContext({
	node,
	ctx,
}: {
	node: TextNode;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): void {
	const resolved = node.resolved;
	if (!resolved) {
		return;
	}

	const x = resolved.transform.position.x + node.params.canvasCenter.x;
	const y = resolved.transform.position.y + node.params.canvasCenter.y;
	const baseline = node.params.textBaseline ?? "middle";
	const {
		scaledFontSize,
		fontString,
		letterSpacing,
		lineHeightPx,
		lines,
		lineMetrics,
		lineRuns,
		lineRunWidths,
		block,
		fontSizeRatio,
		resolvedBackground,
	} = resolved.measuredText;
	const lineCount = lines.length;
	const resolvedBackgroundWithColor = {
		...resolvedBackground,
		color: resolved.backgroundColor,
	};

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(resolved.transform.scaleX, resolved.transform.scaleY);
	if (resolved.transform.rotate) {
		ctx.rotate((resolved.transform.rotate * Math.PI) / 180);
	}

	ctx.font = fontString;
	ctx.textAlign = node.params.textAlign;
	ctx.textBaseline = baseline;
	ctx.fillStyle = resolved.textColor;
	setCanvasLetterSpacing({ ctx, letterSpacingPx: letterSpacing });

	if (
		node.params.background.enabled &&
		node.params.background.color &&
		node.params.background.color !== "transparent" &&
		lineCount > 0
	) {
		const backgroundRect = getTextBackgroundRect({
			textAlign: node.params.textAlign,
			block,
			background: resolvedBackgroundWithColor,
			fontSizeRatio,
		});
		if (backgroundRect) {
			const p =
				clamp({
					value: resolvedBackgroundWithColor.cornerRadius,
					min: CORNER_RADIUS_MIN,
					max: CORNER_RADIUS_MAX,
				}) / 100;
			const radius =
				(Math.min(backgroundRect.width, backgroundRect.height) / 2) * p;
			ctx.fillStyle = resolvedBackgroundWithColor.color;
			ctx.beginPath();
			ctx.roundRect(
				backgroundRect.left,
				backgroundRect.top,
				backgroundRect.width,
				backgroundRect.height,
				radius,
			);
			ctx.fill();

			// Outline sits just inside the box, so the element's visual bounds
			// (selection, snapping) stay the ones the background reports.
			const borderWidth =
				(resolvedBackgroundWithColor.borderWidth ?? 0) * fontSizeRatio;
			const borderColor = resolvedBackgroundWithColor.borderColor;
			if (borderWidth > 0 && borderColor && borderColor !== "transparent") {
				const inset = borderWidth / 2;
				ctx.beginPath();
				ctx.roundRect(
					backgroundRect.left + inset,
					backgroundRect.top + inset,
					Math.max(0, backgroundRect.width - borderWidth),
					Math.max(0, backgroundRect.height - borderWidth),
					Math.max(0, radius - inset),
				);
				ctx.lineWidth = borderWidth;
				ctx.strokeStyle = borderColor;
				ctx.stroke();
			}
			ctx.fillStyle = resolved.textColor;
		}
	}

	for (let index = 0; index < lineCount; index++) {
		const lineY = index * lineHeightPx - block.visualCenterOffset;
		drawTextLine({
			ctx,
			runs: lineRuns[index],
			runWidths: lineRunWidths[index],
			lineWidth: lineMetrics[index].width,
			lineY,
			textAlign: node.params.textAlign,
			defaultColor: resolved.textColor,
		});
		drawTextDecoration({
			ctx,
			textDecoration: node.params.textDecoration ?? "none",
			lineWidth: lineMetrics[index].width,
			lineY,
			metrics: lineMetrics[index],
			scaledFontSize,
			textAlign: node.params.textAlign,
		});
	}

	ctx.restore();
}
