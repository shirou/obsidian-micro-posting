import type { ViewMode } from "../types";

export function formatDateHeader(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00`);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const diff = today.getTime() - date.getTime();
	const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (dayDiff === 0) return "Today";
	if (dayDiff === 1) return "Yesterday";
	if (dayDiff < 7) {
		return date.toLocaleDateString(undefined, { weekday: "long" });
	}
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function getEmptyStateMessage(viewMode: ViewMode): string {
	switch (viewMode) {
		case "archive":
			return "No archived entries.";
		case "trash":
			return "Trash is empty.";
		default:
			return "No entries yet. Type something below and press Enter to save.";
	}
}
