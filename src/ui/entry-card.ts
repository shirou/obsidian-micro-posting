import { Component, MarkdownRenderer, Menu, setIcon } from "obsidian";
import type MicroPostingPlugin from "../main";
import type { Entry } from "../types";
import { stripBlockId } from "../utils/markdown";

const FOLD_HEIGHT_PX = 150; // Max height before folding

export class EntryCard {
	readonly el: HTMLElement;
	private component: Component;
	private entry: Entry;
	private plugin: MicroPostingPlugin;
	private bodyEl!: HTMLElement;
	private isFolded = false;

	constructor(entry: Entry, plugin: MicroPostingPlugin) {
		this.entry = entry;
		this.plugin = plugin;
		this.component = new Component();
		this.component.load();
		this.el = createDiv({ cls: "micro-posting-card" });
		this.render();
	}

	/** Update the entry reference (for cache reuse when content is unchanged). */
	updateEntry(entry: Entry) {
		this.entry = entry;
	}

	private render() {
		// Header (timestamp + menu button)
		const header = this.el.createDiv({ cls: "micro-posting-card-header" });
		header.createSpan({
			cls: "micro-posting-card-time",
			text: this.formatTime(this.entry.createdAt),
		});

		const menuBtn = header.createEl("button", {
			cls: "clickable-icon micro-posting-card-menu",
			attr: { "aria-label": "More options" },
		});
		setIcon(menuBtn, "more-horizontal");
		menuBtn.addEventListener("click", (e) => this.showMenu(e));

		// Body (Markdown rendered)
		this.bodyEl = this.el.createDiv({ cls: "micro-posting-card-body" });
		const content = stripBlockId(this.entry.content);
		MarkdownRenderer.render(
			this.plugin.app,
			content,
			this.bodyEl,
			this.entry.filePath,
			this.component,
		);

		// Long content folding: use ResizeObserver to detect when rendering completes
		this.observeFold();

		// Event delegation: handles elements created asynchronously by MarkdownRenderer
		this.bodyEl.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;

			// Tag click → set filter
			const tagEl = target.closest("a.tag") as HTMLElement | null;
			if (tagEl) {
				e.preventDefault();
				this.plugin.store.setFilter({ tag: tagEl.innerText });
				return;
			}

			// Task checkbox toggle
			if (
				this.entry.type === "task" &&
				target instanceof HTMLInputElement &&
				target.type === "checkbox"
			) {
				e.preventDefault();
				this.plugin.toggleTask(this.entry);
			}
		});
	}

	private foldObserver: ResizeObserver | null = null;
	private foldToggleEl: HTMLElement | null = null;

	private observeFold() {
		this.foldObserver = new ResizeObserver(() => {
			// Only apply once when content exceeds threshold
			if (this.bodyEl.scrollHeight > FOLD_HEIGHT_PX && !this.foldToggleEl) {
				this.foldObserver?.disconnect();
				this.foldObserver = null;
				this.isFolded = true;
				this.bodyEl.addClass("is-folded");
				this.foldToggleEl = this.el.createDiv({
					cls: "micro-posting-fold-toggle",
					text: "Show more",
				});
				this.foldToggleEl.addEventListener("click", () => {
					this.isFolded = !this.isFolded;
					this.bodyEl.toggleClass("is-folded", this.isFolded);
					this.foldToggleEl?.setText(this.isFolded ? "Show more" : "Show less");
				});
			}
		});
		this.foldObserver.observe(this.bodyEl);
	}

	private formatTime(isoDate: string): string {
		const d = new Date(isoDate);
		return d.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	private showMenu(e: MouseEvent) {
		const menu = new Menu();
		const viewMode = this.plugin.store.getViewMode();

		if (viewMode === "active") {
			menu.addItem((i) =>
				i
					.setTitle("Copy")
					.setIcon("copy")
					.onClick(() => {
						navigator.clipboard.writeText(stripBlockId(this.entry.content));
					}),
			);
			menu.addItem((i) =>
				i
					.setTitle("Edit")
					.setIcon("pencil")
					.onClick(() => {
						this.plugin.store.setEditingEntry(this.entry);
					}),
			);
			menu.addSeparator();
			menu.addItem((i) =>
				i
					.setTitle("Archive")
					.setIcon("archive")
					.onClick(() => {
						this.plugin.changeStatus(this.entry, "archived");
					}),
			);
			menu.addItem((i) =>
				i
					.setTitle("Delete")
					.setIcon("trash")
					.onClick(() => {
						this.plugin.changeStatus(this.entry, "deleted");
					}),
			);
		} else {
			menu.addItem((i) =>
				i
					.setTitle("Copy")
					.setIcon("copy")
					.onClick(() => {
						navigator.clipboard.writeText(stripBlockId(this.entry.content));
					}),
			);
			menu.addItem((i) =>
				i
					.setTitle("Restore")
					.setIcon("undo")
					.onClick(() => {
						this.plugin.changeStatus(this.entry, "active");
					}),
			);
			if (viewMode === "trash") {
				menu.addSeparator();
				menu.addItem((i) =>
					i
						.setTitle("Delete permanently")
						.setIcon("x")
						.onClick(() => {
							this.plugin.deleteEntryPermanently(this.entry);
						}),
				);
			}
		}

		menu.showAtMouseEvent(e);
	}

	highlightSearch(query: string) {
		// Remove previous highlights
		this.el.querySelectorAll("mark.micro-posting-highlight").forEach((mark) => {
			const parent = mark.parentNode;
			if (parent) {
				parent.replaceChild(
					document.createTextNode(mark.textContent ?? ""),
					mark,
				);
				parent.normalize();
			}
		});

		if (!query) return;

		const lowerQuery = query.toLowerCase();
		const walker = document.createTreeWalker(this.bodyEl, NodeFilter.SHOW_TEXT);

		const nodesToProcess: Text[] = [];
		let node: Text | null = walker.nextNode() as Text | null;
		while (node) {
			if (node.textContent?.toLowerCase().includes(lowerQuery)) {
				nodesToProcess.push(node);
			}
			node = walker.nextNode() as Text | null;
		}

		for (const textNode of nodesToProcess) {
			const text = textNode.textContent ?? "";
			const lower = text.toLowerCase();
			const frag = document.createDocumentFragment();
			let lastIdx = 0;
			let idx = lower.indexOf(lowerQuery, lastIdx);

			while (idx !== -1) {
				if (idx > lastIdx) {
					frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
				}
				const mark = document.createElement("mark");
				mark.className = "micro-posting-highlight";
				mark.textContent = text.slice(idx, idx + query.length);
				frag.appendChild(mark);
				lastIdx = idx + query.length;
				idx = lower.indexOf(lowerQuery, lastIdx);
			}

			if (lastIdx < text.length) {
				frag.appendChild(document.createTextNode(text.slice(lastIdx)));
			}

			textNode.parentNode?.replaceChild(frag, textNode);
		}
	}

	destroy() {
		this.foldObserver?.disconnect();
		this.foldObserver = null;
		this.component.unload();
	}
}
