import type {
	Entry,
	FilterState,
	LayoutMode,
	QuickFilter,
	ViewMode,
} from "../types";
import {
	extractTags,
	hasExternalLink,
	hasImage,
	hasInternalLink,
} from "../utils/markdown";

type StoreEvent =
	| "entries-changed"
	| "filter-changed"
	| "layout-changed"
	| "view-mode-changed"
	| "editing-changed";

const STATUS_MAP: Record<ViewMode, string> = {
	active: "active",
	archive: "archived",
	trash: "deleted",
};

export class EntryStore {
	private entries: Entry[] = [];
	private filter: FilterState = {
		searchQuery: "",
		tag: null,
		quickFilter: null,
	};
	private layout: LayoutMode = "list";
	private viewMode: ViewMode = "active";
	private editingEntry: Entry | null = null;
	private hideCompletedTasks = false;
	private listeners: Map<StoreEvent, Set<() => void>> = new Map();

	on(event: StoreEvent, callback: () => void): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(callback);
		return () => {
			this.listeners.get(event)?.delete(callback);
		};
	}

	private emit(event: StoreEvent): void {
		const cbs = this.listeners.get(event);
		if (cbs) {
			for (const cb of cbs) {
				cb();
			}
		}
	}

	// --- Getters ---

	getEntries(): Entry[] {
		return [...this.entries];
	}

	getFilteredEntries(): Entry[] {
		let result = [...this.entries];

		// viewMode filter
		const targetStatus = STATUS_MAP[this.viewMode];
		result = result.filter((e) => e.status === targetStatus);

		// searchQuery filter
		if (this.filter.searchQuery) {
			const query = this.filter.searchQuery.toLowerCase();
			result = result.filter((e) => e.content.toLowerCase().includes(query));
		}

		// tag filter
		if (this.filter.tag) {
			const tag = this.filter.tag;
			result = result.filter((e) => extractTags(e.content).includes(tag));
		}

		// quickFilter
		if (this.filter.quickFilter) {
			result = this.applyQuickFilter(result, this.filter.quickFilter);
		}

		// hideCompletedTasks
		if (this.hideCompletedTasks) {
			result = result.filter((e) => !(e.type === "task" && e.taskCompleted));
		}

		// Sort by createdAt descending (newest first)
		result.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		return result;
	}

	getFilter(): FilterState {
		return { ...this.filter };
	}

	getLayout(): LayoutMode {
		return this.layout;
	}

	getViewMode(): ViewMode {
		return this.viewMode;
	}

	getEditingEntry(): Entry | null {
		return this.editingEntry;
	}

	getTags(): { tag: string; count: number }[] {
		const tagCounts = new Map<string, number>();

		// Count tags from entries matching current viewMode
		const targetStatus = STATUS_MAP[this.viewMode];

		for (const entry of this.entries) {
			if (entry.status !== targetStatus) continue;
			for (const tag of extractTags(entry.content)) {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			}
		}

		return Array.from(tagCounts.entries())
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => b.count - a.count);
	}

	// --- Setters ---

	setEntries(entries: Entry[]): void {
		this.entries = entries;
		this.emit("entries-changed");
	}

	addEntry(entry: Entry): void {
		this.entries.unshift(entry);
		this.emit("entries-changed");
	}

	updateEntry(id: string, updates: Partial<Entry>): void {
		const idx = this.entries.findIndex((e) => e.id === id);
		if (idx >= 0) {
			this.entries[idx] = { ...this.entries[idx], ...updates };
			this.emit("entries-changed");
		}
	}

	removeEntry(id: string): void {
		this.entries = this.entries.filter((e) => e.id !== id);
		this.emit("entries-changed");
	}

	setFilter(filter: Partial<FilterState>): void {
		this.filter = { ...this.filter, ...filter };
		this.emit("filter-changed");
	}

	setLayout(layout: LayoutMode): void {
		if (this.layout === layout) return;
		this.layout = layout;
		this.emit("layout-changed");
	}

	setViewMode(mode: ViewMode): void {
		if (this.viewMode === mode) return;
		this.viewMode = mode;
		this.emit("view-mode-changed");
	}

	setEditingEntry(entry: Entry | null): void {
		this.editingEntry = entry;
		this.emit("editing-changed");
	}

	setHideCompletedTasks(hide: boolean): void {
		if (this.hideCompletedTasks === hide) return;
		this.hideCompletedTasks = hide;
		this.emit("filter-changed");
	}

	// --- Private ---

	private applyQuickFilter(entries: Entry[], filter: QuickFilter): Entry[] {
		switch (filter) {
			case "with-link":
				return entries.filter((e) => hasInternalLink(e.content));
			case "no-tag":
				return entries.filter((e) => extractTags(e.content).length === 0);
			case "with-hyperlink":
				return entries.filter((e) => hasExternalLink(e.content));
			case "with-image":
				return entries.filter((e) => hasImage(e.content));
		}
	}
}
