import { hasKeyframesForPath } from "@/lib/animation/keyframe-query";
import { resolveNumberAtTime } from "@/lib/animation/resolve";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "./audio-constants";
import type { TimelineElement } from "./types";
const DEFAULT_STEP_SECONDS = 1 / 60;

export type AudioCapableElement = Extract<
	TimelineElement,
	{ type: "audio" | "video" }
>;

export function clampDb(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(VOLUME_DB_MAX, Math.max(VOLUME_DB_MIN, value));
}

export function dBToLinear(db: number): number {
	return 10 ** (clampDb(db) / 20);
}

export function hasAnimatedVolume({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return hasKeyframesForPath({
		animations: element.animations,
		propertyPath: "volume",
	});
}

import { TICKS_PER_SECOND } from "@/lib/wasm";

export function resolveEffectiveAudioGain({
	element,
	trackMuted = false,
	trackVolumeDb = 0,
	localTime,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	/** Track fader, added to the element's own dB before conversion. */
	trackVolumeDb?: number;
	localTime: number;
}): number {
	if (trackMuted || element.muted === true) {
		return 0;
	}

	const resolvedDb = resolveNumberAtTime({
		baseValue: element.volume ?? 0,
		animations: element.animations,
		propertyPath: "volume",
		localTime: Math.round(localTime * TICKS_PER_SECOND),
	});

	return dBToLinear(resolvedDb + trackVolumeDb);
}

export function buildAudioGainAutomation({
	element,
	trackMuted = false,
	trackVolumeDb = 0,
	fromLocalTime,
	toLocalTime,
	stepSeconds = DEFAULT_STEP_SECONDS,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	trackVolumeDb?: number;
	fromLocalTime: number;
	toLocalTime: number;
	stepSeconds?: number;
}): Array<{ localTime: number; gain: number }> {
	const startTime = Math.max(0, fromLocalTime);
	const endTime = Math.max(startTime, toLocalTime);
	const safeStep =
		Number.isFinite(stepSeconds) && stepSeconds > 0
			? stepSeconds
			: DEFAULT_STEP_SECONDS;
	const points: Array<{ localTime: number; gain: number }> = [];

	for (let localTime = startTime; localTime < endTime; localTime += safeStep) {
		points.push({
			localTime,
			gain: resolveEffectiveAudioGain({
				element,
				trackMuted,
				trackVolumeDb,
				localTime,
			}),
		});
	}

	points.push({
		localTime: endTime,
		gain: resolveEffectiveAudioGain({
			element,
			trackMuted,
			trackVolumeDb,
			localTime: endTime,
		}),
	});

	return points;
}
