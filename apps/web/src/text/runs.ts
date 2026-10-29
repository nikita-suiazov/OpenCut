/**
 * Inline colour markup for text elements: `Open [Chat Workspace](#FF9A52)` is
 * one element that draws "Open " in the element colour and the bracketed part
 * in the colour after it. Keeps a caption a single box — background, border and
 * animation stay shared — instead of stacking one element per colour.
 */
export interface TextRun {
	text: string;
	color?: string;
}

const RUN_PATTERN = /\[([^\]\n]*)\]\((#[0-9a-fA-F]{3,8})\)/g;

export function parseTextRuns(line: string): TextRun[] {
	const runs: TextRun[] = [];
	let index = 0;

	RUN_PATTERN.lastIndex = 0;
	let match = RUN_PATTERN.exec(line);
	while (match) {
		if (match.index > index) {
			runs.push({ text: line.slice(index, match.index) });
		}
		runs.push({ text: match[1], color: match[2] });
		index = match.index + match[0].length;
		match = RUN_PATTERN.exec(line);
	}

	if (index < line.length) {
		runs.push({ text: line.slice(index) });
	}

	return runs.length > 0 ? runs : [{ text: line }];
}

export function hasTextMarkup(content: string): boolean {
	RUN_PATTERN.lastIndex = 0;
	return RUN_PATTERN.test(content);
}

/** The text as it reads without the colour markup. */
export function stripTextMarkup(content: string): string {
	return content.replace(RUN_PATTERN, "$1");
}
