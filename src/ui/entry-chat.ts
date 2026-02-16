import type MicroPostingPlugin from "../main";
import type { Entry } from "../types";
import type { EntryCard } from "./entry-card";
import { formatDateHeader, getEmptyStateMessage } from "./format-utils";

export type CardFactory = (entry: Entry) => EntryCard;

export class EntryChat {
	constructor(
		containerEl: HTMLElement,
		plugin: MicroPostingPlugin,
		cardFactory: CardFactory,
	) {
		containerEl.addClass("micro-posting-chat-mode");
		const entries = plugin.store.getFilteredEntries();

		if (entries.length === 0) {
			const emptyEl = containerEl.createDiv({ cls: "micro-posting-empty" });
			emptyEl.createEl("p", {
				text: getEmptyStateMessage(plugin.store.getViewMode()),
			});
			return;
		}

		// Chronological order (oldest first)
		const sorted = [...entries].sort(
			(a, b) =>
				new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
		);

		let lastDate = "";
		for (const entry of sorted) {
			const date = entry.createdAt.slice(0, 10);
			if (date !== lastDate) {
				containerEl.createDiv({
					cls: "micro-posting-chat-date-separator",
					text: formatDateHeader(date),
				});
				lastDate = date;
			}
			const bubble = containerEl.createDiv({
				cls: "micro-posting-chat-bubble",
			});
			const card = cardFactory(entry);
			bubble.appendChild(card.el);
		}

		// Scroll to bottom after MarkdownRenderer finishes (async)
		setTimeout(() => {
			containerEl.scrollTop = containerEl.scrollHeight;
		}, 0);
	}
}
