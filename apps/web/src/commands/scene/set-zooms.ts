import { Command, type CommandResult } from "@/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene } from "@/timeline";
import type { ZoomSegment } from "@/timeline/zoom-segments";
import { updateSceneInArray } from "@/timeline/scenes";

/** Replaces the active scene's zoom segments. Add/update/remove all go through this. */
export class SetZoomsCommand extends Command {
	private savedScenes: TScene[] | null = null;

	constructor(private zooms: ZoomSegment[]) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return;

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		editor.scenes.setScenes({
			scenes: updateSceneInArray({
				scenes,
				sceneId: activeScene.id,
				updates: { zooms: this.zooms },
			}),
		});
	}

	undo(): void {
		if (this.savedScenes) {
			EditorCore.getInstance().scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}
