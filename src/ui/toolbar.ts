import { setIcon } from "obsidian";
import type MicroPostingPlugin from "../main";
import type { QuickFilter } from "../types";

export class Toolbar {
	private plugin: MicroPostingPlugin;
	private searchInput: HTMLInputElement;
	private countEl: HTMLSpanElement;
	private filterBtns: Map<QuickFilter, HTMLElement> = new Map();
	private listBtn: HTMLElement;
	private chatBtn: HTMLElement;
	private debounceTimer: number | undefined;
	private unsubscribes: (() => void)[] = [];
	private onSidebarToggle: (() => void) | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: MicroPostingPlugin,
		onSidebarToggle?: () => void,
	) {
		this.plugin = plugin;
		this.onSidebarToggle = onSidebarToggle ?? null;
		this.build(containerEl);

		this.unsubscribes.push(
			plugin.store.on("entries-changed", () => this.updateCount()),
			plugin.store.on("filter-changed", () => {
				this.updateCount();
				this.updateFilterButtons();
			}),
			plugin.store.on("layout-changed", () => this.updateLayoutButtons()),
		);

		this.updateCount();
		this.updateLayoutButtons();
	}

	private build(containerEl: HTMLElement) {
		// Sidebar toggle button
		const sidebarToggle = containerEl.createEl("button", {
			cls: "clickable-icon micro-posting-sidebar-toggle",
			attr: { "aria-label": "Toggle sidebar" },
		});
		setIcon(sidebarToggle, "panel-left");
		sidebarToggle.addEventListener("click", () => {
			this.onSidebarToggle?.();
		});

		// Search box
		const searchContainer = containerEl.createDiv({
			cls: "search-input-container",
		});
		this.searchInput = searchContainer.createEl("input", {
			attr: { type: "text", placeholder: "Search..." },
		});
		this.searchInput.addEventListener("input", () => this.onSearchInput());

		// Clear search button
		const clearBtn = searchContainer.createDiv({
			cls: "search-input-clear-button",
		});
		setIcon(clearBtn, "x");
		clearBtn.addEventListener("click", () => {
			this.searchInput.value = "";
			this.plugin.store.setFilter({ searchQuery: "" });
		});

		// Result count
		this.countEl = containerEl.createEl("span", {
			cls: "micro-posting-result-count",
		});

		// Quick filter buttons
		const filterGroup = containerEl.createDiv({
			cls: "micro-posting-quick-filters",
		});
		const filters: { key: QuickFilter; label: string }[] = [
			{ key: "with-link", label: "[[Link]]" },
			{ key: "no-tag", label: "No tag" },
			{ key: "with-hyperlink", label: "URL" },
			{ key: "with-image", label: "Image" },
		];
		for (const f of filters) {
			const btn = filterGroup.createEl("button", {
				cls: "micro-posting-filter-btn",
				text: f.label,
			});
			btn.addEventListener("click", () => this.toggleQuickFilter(f.key));
			this.filterBtns.set(f.key, btn);
		}

		// Layout toggle
		const layoutGroup = containerEl.createDiv({
			cls: "micro-posting-layout-toggle",
		});

		this.listBtn = layoutGroup.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "List view" },
		});
		setIcon(this.listBtn, "list");
		this.listBtn.addEventListener("click", () =>
			this.plugin.store.setLayout("list"),
		);

		this.chatBtn = layoutGroup.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Chat view" },
		});
		setIcon(this.chatBtn, "message-square");
		this.chatBtn.addEventListener("click", () =>
			this.plugin.store.setLayout("chat"),
		);
	}

	private onSearchInput() {
		window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => {
			this.plugin.store.setFilter({
				searchQuery: this.searchInput.value,
			});
		}, 200);
	}

	private toggleQuickFilter(key: QuickFilter) {
		const current = this.plugin.store.getFilter().quickFilter;
		const next = current === key ? null : key;
		this.plugin.store.setFilter({ quickFilter: next });
	}

	private updateFilterButtons() {
		const activeFilter = this.plugin.store.getFilter().quickFilter;
		this.filterBtns.forEach((btn, key) => {
			btn.toggleClass("is-active", key === activeFilter);
		});
	}

	private updateLayoutButtons() {
		const layout = this.plugin.store.getLayout();
		this.listBtn.toggleClass("is-active", layout === "list");
		this.chatBtn.toggleClass("is-active", layout === "chat");
	}

	private updateCount() {
		const filtered = this.plugin.store.getFilteredEntries().length;
		const total = this.plugin.store.getEntries().length;
		this.countEl.setText(
			filtered === total ? `${total}` : `${filtered} / ${total}`,
		);
	}

	destroy() {
		window.clearTimeout(this.debounceTimer);
		for (const fn of this.unsubscribes) fn();
		this.unsubscribes = [];
	}
}
