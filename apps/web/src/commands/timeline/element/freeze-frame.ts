import {
	Command,
	createElementSelectionResult,
	type CommandResult,
} from "@/commands/base-command";
import { EditorCore } from "@/core";
import type { SceneTracks } from "@/timeline";
import { applyFreezeFrame } from "@/timeline/freeze-frame";
import type { MediaTime } from "@/wasm";
import { generateUUID } from "@/utils/id";

export class FreezeFrameCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly stillElementId = generateUUID();

	constructor(
		private readonly params: {
			trackId: string;
			elementId: string;
			freezeTime: MediaTime;
			stillDuration: MediaTime;
			stillMediaId: string;
		},
	) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const tracks = editor.scenes.getActiveScene().tracks;
		const updatedTracks = applyFreezeFrame({
			tracks,
			...this.params,
			stillElementId: this.stillElementId,
		});

		if (!updatedTracks) {
			return undefined;
		}

		this.savedState = tracks;
		editor.timeline.updateTracks(updatedTracks);

		return createElementSelectionResult([
			{ trackId: this.params.trackId, elementId: this.stillElementId },
		]);
	}

	undo(): void {
		if (this.savedState) {
			EditorCore.getInstance().timeline.updateTracks(this.savedState);
		}
	}
}
