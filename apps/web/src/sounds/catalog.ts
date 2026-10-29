import type { SoundCredit } from "./types";

/**
 * Sound effects that ship with this fork, served from `public/sounds/<category>`.
 * The Sounds panel is therefore useful with no Freesound key configured — and
 * stays useful when that API is down or rate limited.
 *
 * Sourced from Mixkit (https://mixkit.co/free-sound-effects/), free for
 * commercial and personal projects with no attribution required. See
 * public/sounds/CREDITS.txt for the redistribution caveat.
 *
 * `duration` and `filesize` are measured from the shipped files; keep them in
 * sync when you add or replace a sound.
 */

export const MIXKIT: SoundCredit = {
	author: "Mixkit",
	license: "Mixkit Free Sound Effects License",
};

const OWN: SoundCredit = {
	author: "OpenCut",
	license: "Bundled with this project",
};

export interface CatalogSound {
	file: string;
	name: string;
	duration: number;
	filesize: number;
	tags: string[];
	description?: string;
	credit?: SoundCredit;
}

export interface SoundCategory {
	id: string;
	label: string;
	description: string;
	sounds: CatalogSound[];
}

export const SOUND_CATEGORIES: SoundCategory[] = [
	{
		id: "transition",
		label: "Transitions",
		description: "Whooshes and sweeps for cuts, scene changes and camera moves.",
		sounds: [
			{ file: "sweep-air.mp3", name: "Sweep air", duration: 0.765, filesize: 18045, tags: ["sweep","air","fast","transition"] },
			{ file: "sweep-fast.mp3", name: "Sweep fast", duration: 0.834, filesize: 19194, tags: ["sweep","fast","transition"] },
			{ file: "sweep-sci-fi.mp3", name: "Sweep sci-fi", duration: 1.15, filesize: 22373, tags: ["sweep","sci-fi","futuristic","transition"] },
			{ file: "swoosh-fast.mp3", name: "Swoosh fast", duration: 0.541, filesize: 12617, tags: ["swoosh","fast","transition"] },
			{ file: "swoosh-speeding.mp3", name: "Swoosh speeding", duration: 4.006, filesize: 66836, tags: ["swoosh","speed","fast","pass"] },
			{ file: "tape-rewind.mp3", name: "Tape rewind", duration: 4.278, filesize: 102504, tags: ["tape","rewind","retro","transition"] },
			{ file: "whoosh-air.mp3", name: "Whoosh air", duration: 2.256, filesize: 39381, tags: ["whoosh","air","light","transition"] },
			{ file: "whoosh-cinematic.mp3", name: "Whoosh cinematic", duration: 1.334, filesize: 44574, tags: ["whoosh","cinematic","transition","fast"] },
			{ file: "whoosh-fast.mp3", name: "Whoosh fast", duration: 1.757, filesize: 57624, tags: ["whoosh","fast","transition","quick"] },
			{ file: "whoosh-rocket.mp3", name: "Whoosh rocket", duration: 4.534, filesize: 69520, tags: ["whoosh","rocket","fast","transition"] },
			{ file: "whoosh-trailer-impact.mp3", name: "Whoosh trailer impact", duration: 9.222, filesize: 210709, tags: ["whoosh","trailer","impact","epic"] },
			{ file: "whoosh-tunnel.mp3", name: "Whoosh tunnel", duration: 6.618, filesize: 111029, tags: ["whoosh","tunnel","reverb","cinematic"] },
			{ file: "zoom-vacuum.mp3", name: "Zoom vacuum", duration: 1.169, filesize: 10986, tags: ["zoom","vacuum","air","transition"] },
		],
	},
	{
		id: "impact",
		label: "Impacts",
		description: "Bass drops, booms and trailer hits — the sound a punchline lands on.",
		sounds: [
			{ file: "bass-drop-power.mp3", name: "Bass drop power", duration: 6.565, filesize: 256166, tags: ["bass","drop","power","synth"] },
			{ file: "bass-drop-pulsing.mp3", name: "Bass drop pulsing", duration: 7.29, filesize: 238435, tags: ["bass","drop","pulse","transition"] },
			{ file: "bass-hit.mp3", name: "Bass hit", duration: 1.052, filesize: 18659, tags: ["bass","hit","drop","boom"] },
			{ file: "bass-hit-futuristic.mp3", name: "Bass hit futuristic", duration: 2.744, filesize: 30748, tags: ["bass","hit","futuristic","drop"] },
			{ file: "bomb-drop.mp3", name: "Bomb drop", duration: 7.955, filesize: 171765, tags: ["bomb","drop","explosion","impact"] },
			{ file: "braam-horn.mp3", name: "Braam horn", duration: 4.945, filesize: 156379, tags: ["braam","horn","trailer","epic","warfare"] },
			{ file: "braam-horn-deep.mp3", name: "Braam horn deep", duration: 10.459, filesize: 365136, tags: ["braam","horn","trailer","epic","deep"] },
			{ file: "cinematic-impact-big.mp3", name: "Cinematic impact big", duration: 7.675, filesize: 88502, tags: ["cinematic","impact","big","boom"] },
			{ file: "logo-impact.mp3", name: "Logo impact", duration: 8.973, filesize: 281323, tags: ["logo","intro","impact","movie"] },
			{ file: "movie-impact.mp3", name: "Movie impact", duration: 5.145, filesize: 161076, tags: ["movie","impact","epic","boom"] },
			{ file: "shockwave-impact.mp3", name: "Shockwave impact", duration: 6.504, filesize: 164348, tags: ["shockwave","electric","impact","heavy"] },
			{ file: "stomp-impact.mp3", name: "Stomp impact", duration: 2.85, filesize: 91755, tags: ["stomp","impact","heavy","apocalyptic"] },
			{ file: "sub-bass-knock.mp3", name: "Sub bass knock", duration: 3.005, filesize: 98442, tags: ["bass","sub","knock","deep","drop"] },
			{ file: "trailer-impact.mp3", name: "Trailer impact", duration: 4.866, filesize: 154441, tags: ["trailer","impact","epic","boom"] },
			{ file: "whoosh-deep-impact.mp3", name: "Whoosh deep impact", duration: 3.946, filesize: 33672, tags: ["whoosh","impact","deep","cinematic"] },
		],
	},
	{
		id: "riser",
		label: "Risers",
		description: "Build-ups and tension sweeps that set up a drop or a reveal.",
		sounds: [
			{ file: "blockbuster-build.mp3", name: "Blockbuster build", duration: 4.599, filesize: 110585, tags: ["blockbuster","build","epic","transition"] },
			{ file: "orchestra-build.mp3", name: "Orchestra build", duration: 7.095, filesize: 118189, tags: ["orchestra","build","epic","transition"] },
			{ file: "riser-brass.mp3", name: "Riser brass", duration: 26.987, filesize: 533867, tags: ["riser","brass","mysterious","buildup"] },
			{ file: "riser-choir.mp3", name: "Riser choir", duration: 17.427, filesize: 388460, tags: ["riser","choir","tech","buildup"] },
			{ file: "riser-drama.mp3", name: "Riser drama", duration: 30.962, filesize: 701383, tags: ["riser","drama","buildup","cinematic"] },
			{ file: "riser-engine.mp3", name: "Riser engine", duration: 13.337, filesize: 244767, tags: ["riser","engine","helicopter","buildup"] },
			{ file: "riser-stutter-intro.mp3", name: "Riser stutter intro", duration: 6.472, filesize: 147537, tags: ["riser","stutter","intro","space"] },
			{ file: "riser-synth.mp3", name: "Riser synth", duration: 9.241, filesize: 224059, tags: ["riser","synth","buildup","cinematic"] },
			{ file: "riser-trailer.mp3", name: "Riser trailer", duration: 2.165, filesize: 45849, tags: ["riser","trailer","buildup","cinematic"] },
			{ file: "sweep-horror-long.mp3", name: "Sweep horror long", duration: 8.579, filesize: 126701, tags: ["sweep","horror","long","tension"] },
		],
	},
	{
		id: "meme",
		label: "Meme",
		description: "Reaction sounds: sad horn, buzzer, cartoon punch, laughing crowd.",
		sounds: [
			{ file: "bruh.mp3", name: "Bruh", duration: 0.478, filesize: 8490, tags: ["bruh","voice","meme","reaction"], credit: { author: "youtu.be/ELHq8HvexFo", license: "Ripped clip — do not redistribute" } },
			{ file: "cartoon-dazzle.mp3", name: "Cartoon dazzle", duration: 1.873, filesize: 61796, tags: ["cartoon","dazzle","birds","funny","meme"] },
			{ file: "cartoon-punch.mp3", name: "Cartoon punch", duration: 0.28, filesize: 5887, tags: ["cartoon","punch","funny","meme"] },
			{ file: "clown-horn.mp3", name: "Clown horn", duration: 2.467, filesize: 21773, tags: ["clown","horn","circus","funny","meme"] },
			{ file: "clown-longhorn.mp3", name: "Clown longhorn", duration: 1.194, filesize: 19699, tags: ["clown","horn","long","funny","meme"] },
			{ file: "crowd-laugh.mp3", name: "Crowd laugh", duration: 4.026, filesize: 95057, tags: ["crowd","laugh","laughter","meme"] },
			{ file: "crowd-laugh-big.mp3", name: "Crowd laugh big", duration: 7.306, filesize: 98346, tags: ["crowd","laugh","big","laughter"] },
			{ file: "laugh-and-applause.mp3", name: "Laugh and applause", duration: 10.378, filesize: 249511, tags: ["laugh","applause","audience","meme"] },
			{ file: "monkey-applause.mp3", name: "Monkey applause", duration: 4.213, filesize: 124156, tags: ["monkey","applause","cartoon","funny"] },
			{ file: "punch-grunt.mp3", name: "Punch grunt", duration: 0.479, filesize: 6925, tags: ["punch","grunt","effort","voice"] },
			{ file: "punch-whistle.mp3", name: "Punch whistle", duration: 1.178, filesize: 20438, tags: ["punch","whistle","cartoon","funny"] },
			{ file: "record-scratch.mp3", name: "Record scratch", duration: 1.202, filesize: 38839, tags: ["record","scratch","vinyl","stop","meme"] },
			{ file: "record-scratch-dj.mp3", name: "Record scratch dj", duration: 1.211, filesize: 38997, tags: ["record","scratch","vinyl","dj","meme"] },
			{ file: "sad-horn.mp3", name: "Sad horn", duration: 1.838, filesize: 31963, tags: ["sad","horn","trombone","fail","meme"] },
			{ file: "wow.mp3", name: "Wow", duration: 2.509, filesize: 37527, tags: ["wow","voice","meme","reaction","surprise"], credit: { author: "youtu.be/Xp2ROiFUZ6w", license: "Ripped clip — do not redistribute" } },
			{ file: "wrong-buzzer.mp3", name: "Wrong buzzer", duration: 2.549, filesize: 93902, tags: ["wrong","buzzer","bass","fail","meme"] },
			{ file: "yes-victory-shout.mp3", name: "Yes victory shout", duration: 0.935, filesize: 16631, tags: ["yes","victory","shout","voice","meme"] },
		],
	},
	{
		id: "hit",
		label: "Hits",
		description: "Punches, slashes and stabs for quick accents on a cut.",
		sounds: [
			{ file: "hammer-hit.mp3", name: "Hammer hit", duration: 0.771, filesize: 22338, tags: ["hammer","metal","hit","heavy"] },
			{ file: "horror-drum-hit.mp3", name: "Horror drum hit", duration: 4.092, filesize: 27875, tags: ["horror","drum","hit","hard"] },
			{ file: "knife-slice.mp3", name: "Knife slice", duration: 1.55, filesize: 32176, tags: ["knife","slice","cut","quick"] },
			{ file: "ninja-strike.mp3", name: "Ninja strike", duration: 1.126, filesize: 20697, tags: ["ninja","strike","quick","hit"] },
			{ file: "punch-air.mp3", name: "Punch air", duration: 1.931, filesize: 15875, tags: ["punch","air","whoosh","hit"] },
			{ file: "punch-hard.mp3", name: "Punch hard", duration: 0.868, filesize: 10601, tags: ["punch","hard","quick","hit"] },
			{ file: "punch-martial-arts.mp3", name: "Punch martial arts", duration: 1.256, filesize: 20776, tags: ["punch","martial","fast","hit"] },
			{ file: "samurai-impact.mp3", name: "Samurai impact", duration: 1.054, filesize: 25380, tags: ["samurai","sword","impact","hit"] },
			{ file: "slap.mp3", name: "Slap", duration: 3.01, filesize: 17268, tags: ["slap","clap","short","hit"] },
			{ file: "sword-slash.mp3", name: "Sword slash", duration: 2.042, filesize: 28694, tags: ["sword","slash","swoosh","hit"] },
			{ file: "sword-strike.mp3", name: "Sword strike", duration: 1.33, filesize: 43948, tags: ["sword","strike","metal","hit"] },
			{ file: "trailer-whoosh-hit.mp3", name: "Trailer whoosh hit", duration: 4.408, filesize: 70301, tags: ["trailer","whoosh","hit","movie"] },
		],
	},
	{
		id: "win",
		label: "Win",
		description: "Victories, coins and achievements for reveals and payoffs.",
		sounds: [
			{ file: "achievement-bell.mp3", name: "Achievement bell", duration: 2.4, filesize: 62322, tags: ["achievement","bell","unlock","reward"] },
			{ file: "achievement-done.mp3", name: "Achievement done", duration: 3.592, filesize: 66666, tags: ["achievement","complete","unlock","reward"] },
			{ file: "coin-win.mp3", name: "Coin win", duration: 1.025, filesize: 35075, tags: ["coin","win","game","collect"] },
			{ file: "coins-clinking.mp3", name: "Coins clinking", duration: 1.016, filesize: 32558, tags: ["coins","clink","money","cash"] },
			{ file: "crowd-cheer-victory.mp3", name: "Crowd cheer victory", duration: 9.667, filesize: 208139, tags: ["crowd","cheer","victory","celebration"] },
			{ file: "crowd-whistle-cheer.mp3", name: "Crowd whistle cheer", duration: 14.76, filesize: 504323, tags: ["crowd","whistle","cheer","celebration"] },
			{ file: "fanfare-horns.mp3", name: "Fanfare horns", duration: 3.119, filesize: 60091, tags: ["fanfare","horns","success","announce"] },
			{ file: "game-win.mp3", name: "Game win", duration: 2.487, filesize: 49292, tags: ["win","game","video","success"] },
			{ file: "gold-coin-prize.mp3", name: "Gold coin prize", duration: 1.962, filesize: 64305, tags: ["gold","coin","prize","reward"] },
			{ file: "instant-win.mp3", name: "Instant win", duration: 1.312, filesize: 19104, tags: ["win","instant","success","reward"] },
			{ file: "jackpot.mp3", name: "Jackpot", duration: 17.857, filesize: 595664, tags: ["jackpot","casino","coins","alarm"] },
			{ file: "party-horn.mp3", name: "Party horn", duration: 1.134, filesize: 24860, tags: ["party","horn","blower","celebration","confetti"], description: "Birthday party blower — pairs with the confetti burst.", credit: OWN },
			{ file: "payout-award.mp3", name: "Payout award", duration: 4.098, filesize: 129078, tags: ["payout","award","money","reward"] },
			{ file: "win-chimes.mp3", name: "Win chimes", duration: 2.643, filesize: 84035, tags: ["win","chimes","success","bright"] },
			{ file: "win-notification.mp3", name: "Win notification", duration: 1.754, filesize: 57416, tags: ["win","notification","success"] },
		],
	},
	{
		id: "ui",
		label: "UI",
		description: "Pops, clicks and tones for captions, callouts and screen recordings.",
		sounds: [
			{ file: "button-light.mp3", name: "Button light", duration: 0.404, filesize: 16077, tags: ["button","light","click","ui"] },
			{ file: "camera-click.mp3", name: "Camera click", duration: 0.894, filesize: 24104, tags: ["camera","click","photo","classic"] },
			{ file: "camera-shutter.mp3", name: "Camera shutter", duration: 0.27, filesize: 9229, tags: ["camera","shutter","click","photo"] },
			{ file: "click-sci-fi.mp3", name: "Click sci-fi", duration: 0.602, filesize: 18518, tags: ["click","sci-fi","ui","tap"] },
			{ file: "confirm-tone.mp3", name: "Confirm tone", duration: 1.304, filesize: 43636, tags: ["confirm","tone","ok","ui"] },
			{ file: "correct-tone.mp3", name: "Correct tone", duration: 1.96, filesize: 63471, tags: ["correct","tone","right","ui"] },
			{ file: "glitch-quick.mp3", name: "Glitch quick", duration: 1.946, filesize: 34341, tags: ["glitch","quick","digital","virtual"] },
			{ file: "glitch-text.mp3", name: "Glitch text", duration: 4.593, filesize: 146404, tags: ["glitch","text","intro","digital"] },
			{ file: "keyboard-typing.mp3", name: "Keyboard typing", duration: 9.942, filesize: 248171, tags: ["keyboard","typing","keys","type","ui"], description: "Continuous typing — trim it to the length of the take.", credit: { author: "Trending Collection SFX pack", license: "Third-party pack — no license granted to us" } },
			{ file: "click.mp3", name: "Mouse click", duration: 0.221, filesize: 2108, tags: ["click","mouse","cursor","tap"], description: "The click used for cursor hits in screen recordings.", credit: OWN },
			{ file: "notification-positive.mp3", name: "Notification positive", duration: 2.755, filesize: 35113, tags: ["notification","positive","alert","ui"] },
			{ file: "pop-bubble.mp3", name: "Pop bubble", duration: 0.381, filesize: 12316, tags: ["pop","bubble","alert","ui"] },
			{ file: "pop-dry.mp3", name: "Pop dry", duration: 0.305, filesize: 9706, tags: ["pop","dry","alert","ui"] },
			{ file: "pop-long.mp3", name: "Pop long", duration: 0.47, filesize: 8699, tags: ["pop","long","bubble","ui"] },
			{ file: "pop-message.mp3", name: "Pop message", duration: 1.025, filesize: 6309, tags: ["pop","message","alert","ui"] },
			{ file: "pop-up.mp3", name: "Pop up soft", duration: 1.032, filesize: 33024, tags: ["pop","bubble","appear","outro"], description: "Soft pop for cards and end screens appearing.", credit: OWN },
			{ file: "success-tone.mp3", name: "Success tone", duration: 2.644, filesize: 65337, tags: ["success","done","complete","confirm","ui"], description: "Success chime for an action landing in a screen recording.", credit: { author: "youtu.be/l2gMp4wg_gM", license: "Ripped clip — do not redistribute" } },
			{ file: "wrong-tone.mp3", name: "Wrong tone", duration: 1.95, filesize: 63781, tags: ["wrong","fail","tone","ui"] },
		],
	},
];
