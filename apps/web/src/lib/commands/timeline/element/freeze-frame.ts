import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { SceneTracks } from "@/lib/timeline";
import { applyFreezeFrame } from "@/lib/timeline/freeze-frame";
import { generateUUID } from "@/utils/id";

export class FreezeFrameCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly stillElementId = generateUUID();

	constructor(
		private readonly params: {
			trackId: string;
			elementId: string;
			freezeTime: number;
			stillDuration: number;
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

		return {
			select: [
				{ trackId: this.params.trackId, elementId: this.stillElementId },
			],
		};
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
