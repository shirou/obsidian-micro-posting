import type MicroPostingPlugin from "../main";
import type { Entry } from "../types";
import type { EntryCard } from "./entry-card";
import { formatDateHeader, getEmptyStateMessage } from "./format-utils";

export type CardFactory = (entry: Entry) => EntryCard;

export class EntryList {
	constructor(
		containerEl: HTMLElement,
		plugin: MicroPostingPlugin,
		cardFactory: CardFactory,
	) {
		const entries = plugin.store.getFilteredEntries();

		if (entries.length === 0) {
			const emptyEl = containerEl.createDiv({ cls: "micro-posting-empty" });
			emptyEl.createEl("p", {
				text: getEmptyStateMessage(plugin.store.getViewMode()),
			});
			return;
		}

		// Group by date (entries are already sorted newest first)
		const groups = this.groupByDate(entries);
		for (const [date, dateEntries] of groups) {
			const groupEl = containerEl.createDiv({
				cls: "micro-posting-date-group",
			});
			groupEl.createEl("h6", {
				cls: "micro-posting-date-header",
				text: formatDateHeader(date),
			});
			for (const entry of dateEntries) {
				const card = cardFactory(entry);
				groupEl.appendChild(card.el);
			}
		}
	}

	private groupByDate(entries: Entry[]): Map<string, Entry[]> {
		const groups = new Map<string, Entry[]>();
		for (const entry of entries) {
			const date = entry.createdAt.slice(0, 10); // YYYY-MM-DD
			if (!groups.has(date)) {
				groups.set(date, []);
			}
			groups.get(date)?.push(entry);
		}
		return groups;
	}
}
