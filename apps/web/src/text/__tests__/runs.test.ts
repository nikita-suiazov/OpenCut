import { describe, expect, test } from "bun:test";
import { hasTextMarkup, parseTextRuns, stripTextMarkup } from "../runs";

describe("text colour runs", () => {
	test("splits a line into plain and coloured runs", () => {
		expect(parseTextRuns("Open [Chat Workspace](#FF9A52) now")).toEqual([
			{ text: "Open " },
			{ text: "Chat Workspace", color: "#FF9A52" },
			{ text: " now" },
		]);
	});

	test("a line without markup is one plain run", () => {
		expect(parseTextRuns("Plain caption")).toEqual([{ text: "Plain caption" }]);
		expect(parseTextRuns("")).toEqual([{ text: "" }]);
	});

	test("brackets without a colour stay text", () => {
		expect(parseTextRuns("[not a colour](red)")).toEqual([
			{ text: "[not a colour](red)" },
		]);
		expect(hasTextMarkup("[not a colour](red)")).toBe(false);
	});

	test("stripping leaves the text as it reads", () => {
		expect(stripTextMarkup("Hit [Apply](#ec6e3c) and [go](#fff)")).toBe(
			"Hit Apply and go",
		);
		expect(hasTextMarkup("Hit [Apply](#ec6e3c)")).toBe(true);
	});
});
