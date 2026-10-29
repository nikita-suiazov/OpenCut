import { describe, expect, test } from "bun:test";
import { mergeKeybindingsWithDefaults } from "../merge-defaults";

const defaults = new Map([
	["s", "split"],
	["z", "add-zoom"],
	["space", "toggle-play"],
]);

describe("mergeKeybindingsWithDefaults", () => {
	test("untouched bindings follow the current defaults, new actions included", () => {
		const merged = mergeKeybindingsWithDefaults({
			stored: [
				["s", "split"],
				["space", "toggle-play"],
			],
			isCustomized: false,
			defaults,
		});
		expect(merged.get("z")).toBe("add-zoom");
		expect(merged.size).toBe(3);
	});

	test("customized bindings stay, a new action gets its free default key", () => {
		const merged = mergeKeybindingsWithDefaults({
			stored: [
				["x", "split"],
				["space", "toggle-play"],
			],
			isCustomized: true,
			defaults,
		});
		expect(merged.get("x")).toBe("split");
		expect(merged.has("s")).toBe(false); // split is already bound, on the user's key
		expect(merged.get("z")).toBe("add-zoom");
	});

	test("a default never takes a key the user gave to something else", () => {
		const merged = mergeKeybindingsWithDefaults({
			stored: [["z", "toggle-play"]],
			isCustomized: true,
			defaults,
		});
		expect(merged.get("z")).toBe("toggle-play");
		expect([...merged.values()].includes("add-zoom")).toBe(false);
	});
});
