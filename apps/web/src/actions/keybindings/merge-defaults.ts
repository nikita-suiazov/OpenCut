/**
 * Stored keybindings against the current defaults. Untouched ones follow the
 * defaults, so a new action's default shortcut reaches existing users too;
 * customized ones keep the user's choices and only gain defaults for actions
 * still unbound, on keys still free.
 */
export function mergeKeybindingsWithDefaults<TKey, TAction>({
	stored,
	isCustomized,
	defaults,
}: {
	stored: Iterable<[TKey, TAction]>;
	isCustomized: boolean;
	defaults: ReadonlyMap<TKey, TAction>;
}): Map<TKey, TAction> {
	if (!isCustomized) {
		return new Map(defaults);
	}
	const keybindings = new Map(stored);
	const boundActions = new Set(keybindings.values());
	for (const [key, action] of defaults) {
		if (!keybindings.has(key) && !boundActions.has(action)) {
			keybindings.set(key, action);
		}
	}
	return keybindings;
}
