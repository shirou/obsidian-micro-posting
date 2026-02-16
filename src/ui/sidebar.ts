import { setIcon } from "obsidian";
import type MicroPostingPlugin from "../main";
import type { ViewMode } from "../types";

export class Sidebar {
	private containerEl: HTMLElement;
	private plugin: MicroPostingPlugin;
	private navEl: HTMLElement;
	private tagListEl: HTMLElement;
	private unsubscribes: (() => void)[] = [];

	constructor(containerEl: HTMLElement, plugin: MicroPostingPlugin) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.build();

		this.unsubscribes.push(
			plugin.store.on("entries-changed", () => this.renderTags()),
			plugin.store.on("filter-changed", () => this.renderTags()),
			plugin.store.on("view-mode-changed", () => {
				this.renderNav();
				this.renderTags();
			}),
		);
	}

	private build() {
		// Navigation
		this.navEl = this.containerEl.createDiv({ cls: "micro-posting-nav" });
		this.renderNav();

		// Separator
		this.containerEl.createEl("hr");

		// Tags section
		this.containerEl.createDiv({
			cls: "micro-posting-section-title",
			text: "Tags",
		});
		this.tagListEl = this.containerEl.createDiv({
			cls: "micro-posting-tag-list",
		});
		this.renderTags();
	}

	renderNav() {
		this.navEl.empty();
		const viewMode = this.plugin.store.getViewMode();
		const items: { label: string; icon: string; mode: ViewMode }[] = [
			{ label: "All", icon: "inbox", mode: "active" },
			{ label: "Archive", icon: "archive", mode: "archive" },
			{ label: "Trash", icon: "trash", mode: "trash" },
		];

		for (const item of items) {
			const el = this.navEl.createDiv({
				cls: `tree-item-self is-clickable${viewMode === item.mode ? " is-active" : ""}`,
			});
			const iconEl = el.createSpan({ cls: "tree-item-icon" });
			setIcon(iconEl, item.icon);
			el.createSpan({ cls: "tree-item-inner", text: item.label });
			el.addEventListener("click", () => {
				this.plugin.store.setViewMode(item.mode);
			});
		}
	}

	private renderTags() {
		this.tagListEl.empty();
		const tags = this.plugin.store.getTags();
		const currentTag = this.plugin.store.getFilter().tag;

		if (tags.length === 0) {
			this.tagListEl.createDiv({
				cls: "micro-posting-tag-empty",
				text: "No tags",
			});
			return;
		}

		for (const { tag, count } of tags) {
			const el = this.tagListEl.createDiv({
				cls: `tree-item-self is-clickable${currentTag === tag ? " is-active" : ""}`,
			});
			el.createSpan({ cls: "tree-item-inner", text: tag });
			el.createSpan({ cls: "tree-item-flair", text: String(count) });
			el.addEventListener("click", () => {
				const newTag = currentTag === tag ? null : tag;
				this.plugin.store.setFilter({ tag: newTag });
			});
		}
	}

	render() {
		this.renderNav();
		this.renderTags();
	}

	destroy() {
		for (const fn of this.unsubscribes) fn();
		this.unsubscribes = [];
	}
}
