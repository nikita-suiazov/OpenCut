const ICON = "#FFFFFF";
const TEXT_PRIMARY = "#E6E6E6";
const TEXT_SECONDARY = "#BFBFBF";

/**
 * Instagram Reels UI safe-zone overlay (1080x1920). Simplified geometry of
 * the 2025 mobile player: top title/camera, right action rail, bottom
 * account/caption/audio block and the app navigation bar.
 */
export function InstagramReelsLayout() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 1080 1920"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Instagram Reels Layout</title>

			{/* Top bar: "Reels" + camera */}
			<text
				x="48"
				y="136"
				fill={ICON}
				fontFamily="system-ui, sans-serif"
				fontSize="52"
				fontWeight="700"
			>
				Reels
			</text>
			<path d="M232 118 L252 106 V138 Z" fill={ICON} opacity="0.9" />
			<g stroke={ICON} strokeWidth="7" strokeLinejoin="round">
				<rect x="964" y="84" width="60" height="56" rx="14" />
				<circle cx="994" cy="112" r="13" />
			</g>

			{/* Right action rail (bottom-anchored, outline icons) */}
			{/* Like */}
			<g transform="translate(972 1168)">
				<path
					d="M36 64 L10 38 A16 16 0 1 1 36 16 A16 16 0 1 1 62 38 Z"
					stroke={ICON}
					strokeWidth="5.5"
					strokeLinejoin="round"
				/>
				<text
					x="36"
					y="104"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					87.4K
				</text>
			</g>
			{/* Comments */}
			<g transform="translate(972 1322)">
				<path
					d="M36 6 C53 6 66 19 66 34 C66 49 53 62 36 62 C31 62 27 61 23 59 L8 64 L13 50 C8 45 6 40 6 34 C6 19 19 6 36 6 Z"
					stroke={ICON}
					strokeWidth="5.5"
					strokeLinejoin="round"
				/>
				<text
					x="36"
					y="104"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					2,318
				</text>
			</g>
			{/* Share (paper plane) */}
			<g transform="translate(972 1476)">
				<path
					d="M8 30 L64 6 L44 62 L32 40 Z M32 40 L64 6"
					stroke={ICON}
					strokeWidth="5.5"
					strokeLinejoin="round"
				/>
				<text
					x="36"
					y="104"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					Share
				</text>
			</g>
			{/* More */}
			<g fill={ICON} transform="translate(1008 1626)">
				<circle cx="0" cy="0" r="6" />
				<circle cx="0" cy="22" r="6" />
				<circle cx="0" cy="44" r="6" />
			</g>
			{/* Audio tile */}
			<rect
				x="978"
				y="1706"
				width="60"
				height="60"
				rx="14"
				stroke={ICON}
				strokeWidth="6"
			/>

			{/* Bottom-left: account row, caption, audio */}
			<circle cx="84" cy="1594" r="34" stroke={ICON} strokeWidth="5" />
			<text
				x="136"
				y="1606"
				fill={TEXT_PRIMARY}
				fontFamily="system-ui, sans-serif"
				fontSize="32"
				fontWeight="600"
			>
				username
			</text>
			<rect
				x="330"
				y="1564"
				width="150"
				height="58"
				rx="14"
				stroke={ICON}
				strokeWidth="5"
			/>
			<text
				x="405"
				y="1602"
				textAnchor="middle"
				fill={ICON}
				fontFamily="system-ui, sans-serif"
				fontSize="27"
				fontWeight="600"
			>
				Follow
			</text>
			<rect
				x="50"
				y="1652"
				width="600"
				height="30"
				rx="15"
				fill={TEXT_PRIMARY}
			/>
			<rect
				x="50"
				y="1696"
				width="440"
				height="30"
				rx="15"
				fill={TEXT_SECONDARY}
			/>
			<g>
				<path
					d="M62 1760 a18 18 0 1 0 11 33 v-40 l20 5 v-13 l-27 -7 Z"
					fill={ICON}
				/>
				<rect
					x="104"
					y="1762"
					width="300"
					height="26"
					rx="13"
					fill={TEXT_SECONDARY}
				/>
			</g>

			{/* App navigation bar */}
			<g stroke={ICON} strokeWidth="6" strokeLinejoin="round">
				<path d="M104 1868 L128 1846 L152 1868 V1894 H104 Z" />
				<circle cx="342" cy="1868" r="20" />
				<path d="M357 1883 L372 1898" strokeLinecap="round" />
				<rect x="518" y="1846" width="44" height="48" rx="10" />
				<path d="M518 1860 H562 M532 1846 L540 1860 M550 1846 L558 1860" />
				<path d="M732 1852 h40 v42 h-40 Z M732 1862 h40" />
				<circle cx="952" cy="1870" r="22" />
			</g>
		</svg>
	);
}
