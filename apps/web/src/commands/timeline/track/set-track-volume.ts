import { Command, type CommandResult } from "@/commands/base-command";
import type { SceneTracks } from "@/timeline";
import { EditorCore } from "@/core";
import {
	canTrackHaveAudio,
	findTrackInSceneTracks,
	updateTrackInSceneTracks,
} from "@/timeline";
import { clampDb } from "@/timeline/audio-state";

/** Track fader in dB. */
export class SetTrackVolumeCommand extends Command {
	private savedState: SceneTracks | null = null;

	constructor(
		private trackId: string,
		private volume: number,
	) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const targetTrack = findTrackInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
		});
		if (!targetTrack || !canTrackHaveAudio(targetTrack)) {
			return;
		}

		const volume = clampDb(this.volume);
		const updatedTracks = updateTrackInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			update: (track) =>
				canTrackHaveAudio(track) ? { ...track, volume } : track,
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			EditorCore.getInstance().timeline.updateTracks(this.savedState);
		}
	}
}
