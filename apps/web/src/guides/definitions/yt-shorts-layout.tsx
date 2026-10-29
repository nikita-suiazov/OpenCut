const ICON = "#FFFFFF";
const TEXT_PRIMARY = "#E6E6E6";
const TEXT_SECONDARY = "#BFBFBF";

/**
 * YouTube Shorts UI safe-zone overlay (1080x1920). Simplified geometry of the
 * 2025 mobile player: top search/camera row, right action rail, bottom
 * channel/title/music block and seekbar.
 */
export function YouTubeShortsLayout() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 1080 1920"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>YouTube Shorts Layout</title>

			{/* Top bar: "Shorts" + search / camera / kebab */}
			<text
				x="48"
				y="132"
				fill={ICON}
				fontFamily="system-ui, sans-serif"
				fontSize="52"
				fontWeight="700"
			>
				Shorts
			</text>
			<g stroke={ICON} strokeWidth="7" strokeLinecap="round">
				<circle cx="856" cy="112" r="24" />
				<path d="M874 130 L896 152" />
			</g>
			<g stroke={ICON} strokeWidth="7" strokeLinejoin="round">
				<rect x="948" y="86" width="52" height="52" rx="12" />
				<path d="M964 104 L984 112 L964 120 Z" fill={ICON} strokeWidth="4" />
			</g>
			<g fill={ICON}>
				<circle cx="1040" cy="94" r="6" />
				<circle cx="1040" cy="112" r="6" />
				<circle cx="1040" cy="130" r="6" />
			</g>

			{/* Right action rail (bottom-anchored) */}
			{/* Like */}
			<g transform="translate(972 1108)">
				<path
					d="M20 34 L20 74 H4 V34 Z M26 74 V33 L44 8 C47 4 55 6 55 12 L50 30 H70 C75 30 78 35 77 40 L69 68 C68 72 65 74 61 74 Z"
					fill={ICON}
				/>
				<text
					x="40"
					y="112"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					325K
				</text>
			</g>
			{/* Dislike */}
			<g transform="translate(972 1268)">
				<path
					d="M60 46 L60 6 H76 V46 Z M54 6 V47 L36 72 C33 76 25 74 25 68 L30 50 H10 C5 50 2 45 3 40 L11 12 C12 8 15 6 19 6 Z"
					fill={ICON}
				/>
				<text
					x="40"
					y="112"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					Dislike
				</text>
			</g>
			{/* Comments */}
			<g transform="translate(972 1428)">
				<path
					d="M8 12 C8 7 12 4 16 4 H64 C69 4 72 7 72 12 V48 C72 53 69 56 64 56 H30 L12 72 V56 C9 56 8 52 8 48 Z"
					fill={ICON}
				/>
				<text
					x="40"
					y="112"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					1,024
				</text>
			</g>
			{/* Share */}
			<g transform="translate(972 1588)">
				<path
					d="M46 6 L76 32 L46 58 V42 C24 42 12 50 4 66 C6 44 18 24 46 22 Z"
					fill={ICON}
				/>
				<text
					x="40"
					y="112"
					textAnchor="middle"
					fill={TEXT_PRIMARY}
					fontFamily="system-ui, sans-serif"
					fontSize="28"
					fontWeight="600"
				>
					Share
				</text>
			</g>
			{/* Sound disc */}
			<g transform="translate(978 1752)">
				<rect width="64" height="64" rx="14" fill={ICON} opacity="0.9" />
				<circle cx="32" cy="32" r="14" fill="#000000" opacity="0.55" />
			</g>

			{/* Bottom-left: channel row, title, music */}
			<circle cx="88" cy="1618" r="34" fill={ICON} />
			<text
				x="140"
				y="1630"
				fill={TEXT_PRIMARY}
				fontFamily="system-ui, sans-serif"
				fontSize="32"
				fontWeight="600"
			>
				@channel
			</text>
			<rect x="332" y="1588" width="180" height="60" rx="30" fill={ICON} />
			<text
				x="422"
				y="1628"
				textAnchor="middle"
				fill="#000000"
				fontFamily="system-ui, sans-serif"
				fontSize="28"
				fontWeight="700"
			>
				Subscribe
			</text>
			<rect
				x="52"
				y="1682"
				width="560"
				height="30"
				rx="15"
				fill={TEXT_PRIMARY}
			/>
			<rect
				x="52"
				y="1726"
				width="420"
				height="30"
				rx="15"
				fill={TEXT_SECONDARY}
			/>
			<g>
				<path
					d="M66 1790 a20 20 0 1 0 12 36 v-44 l22 6 v-14 l-30 -8 Z"
					fill={ICON}
				/>
				<rect
					x="110"
					y="1792"
					width="330"
					height="28"
					rx="14"
					fill={TEXT_SECONDARY}
				/>
			</g>

			{/* Seekbar */}
			<rect x="0" y="1908" width="1080" height="6" fill={ICON} opacity="0.6" />
			<rect x="0" y="1908" width="430" height="6" fill={ICON} />
		</svg>
	);
}
