import type { TextCanvasContext, TextBlockMeasurement } from "@/text/layout";
import { DEFAULTS } from "@/timeline/defaults";
import { clamp } from "@/utils/math";
import { CORNER_RADIUS_MAX, CORNER_RADIUS_MIN } from "./background";
import {
	drawTextDecoration,
	getTextBackgroundRect,
	measureTextBlock,
	setCanvasLetterSpacing,
} from "./layout";
import { FONT_SIZE_SCALE_REFERENCE } from "./typography";
import { parseTextRuns, type TextRun } from "./runs";

export type TextAlign = "left" | "center" | "right";
export type TextFontWeight = "normal" | "bold";
export type TextFontStyle = "normal" | "italic";
export type TextDecoration = "none" | "underline" | "line-through";

export interface TextLayoutParams {
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	textAlign: TextAlign;
	textDecoration?: TextDecoration;
	letterSpacing?: number;
	lineHeight?: number;
}

export interface ResolvedTextLayout {
	scaledFontSize: number;
	fontString: string;
	letterSpacing: number;
	lineHeightPx: number;
	fontSizeRatio: number;
	textAlign: TextAlign;
	textDecoration: TextDecoration;
}

export interface MeasuredTextLayout extends ResolvedTextLayout {
	/** The lines as drawn: colour markup stripped. */
	lines: string[];
	lineMetrics: TextMetrics[];
	/** Each line's colour runs (`Open [Chat Workspace](#FF9A52)`) and their widths. */
	lineRuns: TextRun[][];
	lineRunWidths: number[][];
	block: TextBlockMeasurement;
}

export interface ResolvedTextBackgroundLike {
	enabled: boolean;
	color: string;
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
	borderWidth?: number;
	borderColor?: string;
}

export function quoteFontFamily({ fontFamily }: { fontFamily: string }): string {
	return `"${fontFamily.replace(/"/g, '\\"')}"`;
}

export function buildTextFontString({
	fontFamily,
	fontWeight,
	fontStyle,
	scaledFontSize,
}: {
	fontFamily: string;
	fontWeight: TextFontWeight;
	fontStyle: TextFontStyle;
	scaledFontSize: number;
}): string {
	return `${fontStyle} ${fontWeight} ${scaledFontSize}px ${quoteFontFamily({ fontFamily })}, sans-serif`;
}

export function resolveTextLayout({
	text,
	canvasHeight,
}: {
	text: TextLayoutParams;
	canvasHeight: number;
}): ResolvedTextLayout {
	const scaledFontSize =
		text.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
	const fontWeight = text.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = text.fontStyle === "italic" ? "italic" : "normal";
	const letterSpacing = text.letterSpacing ?? DEFAULTS.text.letterSpacing;
	const lineHeightPx =
		scaledFontSize * (text.lineHeight ?? DEFAULTS.text.lineHeight);
	const fontSizeRatio = text.fontSize / 15;

	return {
		scaledFontSize,
		fontString: buildTextFontString({
			fontFamily: text.fontFamily,
			fontWeight,
			fontStyle,
			scaledFontSize,
		}),
		letterSpacing,
		lineHeightPx,
		fontSizeRatio,
		textAlign: text.textAlign,
		textDecoration: text.textDecoration ?? "none",
	};
}

export function measureTextLayout({
	text,
	canvasHeight,
	ctx,
}: {
	text: TextLayoutParams;
	canvasHeight: number;
	ctx: TextCanvasContext;
}): MeasuredTextLayout {
	const resolvedLayout = resolveTextLayout({ text, canvasHeight });
	// Colour markup is stripped for layout: lines/metrics describe the text as
	// drawn, lineRuns carries the colours (and widths) for the draw pass.
	const lineRuns = text.content.split("\n").map(parseTextRuns);
	const lines = lineRuns.map((runs) => runs.map((run) => run.text).join(""));

	ctx.save();
	ctx.font = resolvedLayout.fontString;
	ctx.textBaseline = "middle";
	setCanvasLetterSpacing({
		ctx,
		letterSpacingPx: resolvedLayout.letterSpacing,
	});
	const lineMetrics = lines.map((line) => ctx.measureText(line));
	const lineRunWidths = lineRuns.map((runs) =>
		runs.map((run) => ctx.measureText(run.text).width),
	);
	ctx.restore();

	const block = measureTextBlock({
		lineMetrics,
		lineHeightPx: resolvedLayout.lineHeightPx,
	});

	return {
		...resolvedLayout,
		lines,
		lineMetrics,
		lineRuns,
		lineRunWidths,
		block,
	};
}

/**
 * Where each run of a line starts: runs are placed by hand from the line's left
 * edge, so a line can mix colours and still align like one string.
 */
function runStarts({
	layout,
	index,
}: {
	layout: MeasuredTextLayout;
	index: number;
}): number[] {
	const alignToLeft: Record<TextAlign, number> = {
		left: 0,
		center: -layout.lineMetrics[index].width / 2,
		right: -layout.lineMetrics[index].width,
	};
	let x = alignToLeft[layout.textAlign];
	return layout.lineRunWidths[index].map((width) => {
		const start = x;
		x += width;
		return start;
	});
}

/** One line, run by run; a line without markup is one run and one plain call. */
function paintTextLine({
	ctx,
	layout,
	index,
	paint,
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	index: number;
	paint: (run: TextRun, x: number) => void;
}): void {
	const runs = layout.lineRuns[index];
	if (runs.length <= 1) {
		paint(runs[0] ?? { text: layout.lines[index] }, 0);
		return;
	}
	const starts = runStarts({ layout, index });
	const previousAlign = ctx.textAlign;
	ctx.textAlign = "left";
	runs.forEach((run, i) => paint(run, starts[i]));
	ctx.textAlign = previousAlign;
}

export function drawMeasuredTextLayout({
	ctx,
	layout,
	textColor,
	background,
	backgroundColor,
	textBaseline = "middle",
	colorRuns = true,
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	textColor: string;
	background?: ResolvedTextBackgroundLike | null;
	backgroundColor?: string;
	textBaseline?: CanvasTextBaseline;
	/** false: every run in textColor (a text mask draws its shape, not its colours). */
	colorRuns?: boolean;
}): void {
	ctx.font = layout.fontString;
	ctx.textAlign = layout.textAlign;
	ctx.textBaseline = textBaseline;
	ctx.fillStyle = textColor;
	setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

	if (
		background?.enabled &&
		backgroundColor &&
		backgroundColor !== "transparent" &&
		layout.lines.length > 0
	) {
		const backgroundRect = getTextBackgroundRect({
			textAlign: layout.textAlign,
			block: layout.block,
			background: {
				...background,
				color: backgroundColor,
			},
			fontSizeRatio: layout.fontSizeRatio,
		});
		if (backgroundRect) {
			const p =
				clamp({
					value: background.cornerRadius,
					min: CORNER_RADIUS_MIN,
					max: CORNER_RADIUS_MAX,
				}) / 100;
			const radius =
				(Math.min(backgroundRect.width, backgroundRect.height) / 2) * p;
			ctx.fillStyle = backgroundColor;
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
			const borderWidth = (background.borderWidth ?? 0) * layout.fontSizeRatio;
			const borderColor = background.borderColor;
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
			ctx.fillStyle = textColor;
		}
	}

	for (let index = 0; index < layout.lines.length; index++) {
		const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
		paintTextLine({
			ctx,
			layout,
			index,
			paint: (run, x) => {
				ctx.fillStyle = (colorRuns && run.color) || textColor;
				ctx.fillText(run.text, x, lineY);
			},
		});
		ctx.fillStyle = textColor;
		drawTextDecoration({
			ctx,
			textDecoration: layout.textDecoration,
			lineWidth: layout.lineMetrics[index].width,
			lineY,
			metrics: layout.lineMetrics[index],
			scaledFontSize: layout.scaledFontSize,
			textAlign: layout.textAlign,
		});
	}
}

export function strokeMeasuredTextLayout({
	ctx,
	layout,
	strokeColor,
	strokeWidth,
	textBaseline = "middle",
}: {
	ctx: TextCanvasContext;
	layout: MeasuredTextLayout;
	strokeColor: string;
	strokeWidth: number;
	textBaseline?: CanvasTextBaseline;
}): void {
	ctx.font = layout.fontString;
	ctx.textAlign = layout.textAlign;
	ctx.textBaseline = textBaseline;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = strokeWidth;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	setCanvasLetterSpacing({ ctx, letterSpacingPx: layout.letterSpacing });

	for (let index = 0; index < layout.lines.length; index++) {
		const lineY = index * layout.lineHeightPx - layout.block.visualCenterOffset;
		paintTextLine({
			ctx,
			layout,
			index,
			paint: (run, x) => ctx.strokeText(run.text, x, lineY),
		});
	}
}
