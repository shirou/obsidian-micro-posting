import { ItemView, type WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE } from "../constants";
import type MicroPostingPlugin from "../main";
import type { Entry } from "../types";
import { EditorPanel } from "./editor";
import { EntryCard } from "./entry-card";
import { EntryChat } from "./entry-chat";
import { EntryList } from "./entry-list";
import { Sidebar } from "./sidebar";
import { Toolbar } from "./toolbar";

interface CachedCard {
	card: EntryCard;
	content: string;
}

export class MicroPostingView extends ItemView {
	private plugin: MicroPostingPlugin;

	// DOM zone references
	private toolbarEl!: HTMLElement;
	private sidebarEl!: HTMLElement;
	private contentAreaEl!: HTMLElement;
	private editorEl!: HTMLElement;

	// UI parts
	private toolbar!: Toolbar;
	private sidebar!: Sidebar;
	private editor!: EditorPanel;

	// Card cache: avoids re-calling MarkdownRenderer.render() for unchanged entries
	private cardCache = new Map<string, CachedCard>();

	// Store subscriptions
	private unsubscribes: (() => void)[] = [];

	// Lazy loading state
	private isLoadingMore = false;
	private noMoreEntries = false;

	constructor(leaf: WorkspaceLeaf, plugin: MicroPostingPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Micro Posting";
	}

	getIcon(): string {
		return "clock";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("micro-posting-root");

		// Create zones
		this.toolbarEl = container.createDiv({ cls: "micro-posting-toolbar" });
		const mainEl = container.createDiv({ cls: "micro-posting-main" });
		this.sidebarEl = mainEl.createDiv({ cls: "micro-posting-sidebar" });
		this.contentAreaEl = mainEl.createDiv({ cls: "micro-posting-content" });
		this.editorEl = container.createDiv({ cls: "micro-posting-editor" });

		// Initialize UI parts
		this.toolbar = new Toolbar(this.toolbarEl, this.plugin, () =>
			this.toggleSidebar(),
		);
		this.sidebar = new Sidebar(this.sidebarEl, this.plugin);

		// Apply initial sidebar visibility
		if (!this.plugin.settings.sidebarAlwaysVisible) {
			this.sidebarEl.addClass("is-collapsed");
		}
		this.editor = new EditorPanel(this.editorEl, this.plugin);
		this.renderEntries();

		// Store subscriptions
		this.unsubscribes.push(
			this.plugin.store.on("entries-changed", () => this.renderEntries()),
			this.plugin.store.on("filter-changed", () => this.renderEntries()),
			this.plugin.store.on("layout-changed", () => this.renderEntries()),
			this.plugin.store.on("view-mode-changed", () => this.renderEntries()),
		);

		// Lazy loading on scroll near bottom
		this.contentAreaEl.addEventListener("scroll", () => {
			this.onContentScroll();
		});

		// Auto focus
		if (this.plugin.settings.autoFocus) {
			this.editor.focus();
		}
	}

	async onClose(): Promise<void> {
		for (const fn of this.unsubscribes) fn();
		this.unsubscribes = [];
		this.clearCardCache();
		this.toolbar?.destroy();
		this.sidebar?.destroy();
		this.editor?.destroy();
	}

	private toggleSidebar() {
		// On mobile use is-mobile-open, on desktop use is-collapsed
		// biome-ignore lint/suspicious/noExplicitAny: Obsidian mobile API not in type definitions
		if ((this.app as any).isMobile) {
			this.sidebarEl.toggleClass(
				"is-mobile-open",
				!this.sidebarEl.hasClass("is-mobile-open"),
			);
		} else {
			this.sidebarEl.toggleClass(
				"is-collapsed",
				!this.sidebarEl.hasClass("is-collapsed"),
			);
		}
	}

	focusEditor() {
		this.editor?.focus();
	}

	private getOrCreateCard(entry: Entry): EntryCard {
		const cached = this.cardCache.get(entry.id);
		if (cached && cached.content === entry.content) {
			// Reuse cached card, update entry reference for menu/actions
			cached.card.updateEntry(entry);
			return cached.card;
		}
		// Destroy stale cached card if content changed
		if (cached) {
			cached.card.destroy();
		}
		const card = new EntryCard(entry, this.plugin);
		this.cardCache.set(entry.id, { card, content: entry.content });
		return card;
	}

	private renderEntries() {
		// Detach all cached card elements (empty() removes from DOM but doesn't destroy JS objects)
		this.contentAreaEl.empty();
		this.contentAreaEl.removeClass("micro-posting-chat-mode");

		const usedIds = new Set<string>();
		const cardFactory = (entry: Entry): EntryCard => {
			usedIds.add(entry.id);
			return this.getOrCreateCard(entry);
		};

		const layout = this.plugin.store.getLayout();
		if (layout === "list") {
			new EntryList(this.contentAreaEl, this.plugin, cardFactory);
		} else {
			new EntryChat(this.contentAreaEl, this.plugin, cardFactory);
		}

		// Prune cards no longer displayed
		for (const [id, { card }] of this.cardCache) {
			if (!usedIds.has(id)) {
				card.destroy();
				this.cardCache.delete(id);
			}
		}

		// Apply search highlight (deferred to let MarkdownRenderer.render() complete)
		const query = this.plugin.store.getFilter().searchQuery;
		const idsToHighlight = new Set(usedIds);
		setTimeout(() => {
			for (const [id, { card }] of this.cardCache) {
				if (idsToHighlight.has(id)) {
					card.highlightSearch(query);
				}
			}
		}, 0);
	}

	private async onContentScroll() {
		if (this.isLoadingMore || this.noMoreEntries) return;
		const el = this.contentAreaEl;
		const layout = this.plugin.store.getLayout();

		let shouldLoad = false;
		if (layout === "list") {
			// List view: oldest entries at bottom → load more on scroll down
			shouldLoad = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
		} else {
			// Chat view: oldest entries at top → load more on scroll up
			shouldLoad = el.scrollTop <= 200;
		}

		if (!shouldLoad) return;

		this.isLoadingMore = true;
		try {
			const loaded = await this.plugin.loadMoreEntries();
			if (!loaded) {
				this.noMoreEntries = true;
			}
		} finally {
			this.isLoadingMore = false;
		}
	}

	private clearCardCache() {
		for (const { card } of this.cardCache.values()) {
			card.destroy();
		}
		this.cardCache.clear();
	}
}
