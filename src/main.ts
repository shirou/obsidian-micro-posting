import { debounce, Notice, Plugin, type TAbstractFile, TFile } from "obsidian";
import { INITIAL_LOAD_DAYS, VIEW_TYPE } from "./constants";
import { parseDailyNote } from "./data/diary-parser";
import {
	appendDiaryEntry,
	removeDiaryEntry,
	toggleTaskStatus,
	updateDiaryEntry,
} from "./data/diary-writer";
import { EntryStore } from "./data/entry-store";
import {
	loadPluginData,
	savePluginData,
	setEntryStatus,
} from "./data/plugin-data";
import { parseSingleFile } from "./data/single-file-parser";
import {
	appendSingleFileEntry,
	removeSingleFileEntry,
	updateSingleFileEntry,
	updateSingleFileEntryStatus,
} from "./data/single-file-writer";
import { MicroPostingSettingTab } from "./settings";
import type {
	Entry,
	EntryStatus,
	EntryType,
	MicroPostingPluginData,
	MicroPostingSettings,
} from "./types";
import { MicroPostingView } from "./ui/micro-posting-view";
import { QuickCaptureModal } from "./ui/quick-capture-modal";
import {
	getDateFromDailyNote,
	getRecentDailyNoteFiles,
	isDailyNotesEnabled,
} from "./utils/daily-notes";

export default class MicroPostingPlugin extends Plugin {
	settings!: MicroPostingSettings;
	pluginData!: MicroPostingPluginData;
	store!: EntryStore;

	private writingCount = 0;
	private loadedDays = 0;

	async onload() {
		// 1. Load plugin data
		this.pluginData = await loadPluginData(this);
		this.settings = this.pluginData.settings;
		this.store = new EntryStore();
		this.store.setLayout(this.settings.defaultLayout);
		this.store.setHideCompletedTasks(this.settings.hideCompletedTasks);

		// 2. Register view
		this.registerView(VIEW_TYPE, (leaf) => new MicroPostingView(leaf, this));

		// 3. Ribbon icon
		this.addRibbonIcon("clock", "Micro Posting", () => this.activateView());

		// 4. Commands
		this.addCommand({
			id: "open",
			name: "Open",
			callback: () => this.activateView(),
		});
		this.addCommand({
			id: "quick-capture",
			name: "Quick Capture",
			callback: () => this.quickCapture(),
		});

		// 5. Settings tab
		this.addSettingTab(new MicroPostingSettingTab(this.app, this));

		// 6. File change watcher (debounced, trailing edge)
		const debouncedOnModify = debounce((file: TAbstractFile) => {
			if (this.writingCount > 0) return;
			if (file instanceof TFile) {
				this.onFileModified(file);
			}
		}, 300);
		this.registerEvent(this.app.vault.on("modify", debouncedOnModify));

		// 7. Initial entry load after layout ready
		this.app.workspace.onLayoutReady(() => this.loadEntries());
	}

	onunload() {
		// Views are automatically cleaned up by Obsidian
	}

	async activateView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length > 0) {
			this.app.workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
			this.app.workspace.revealLeaf(leaf);
		}
	}

	async quickCapture(): Promise<void> {
		// If view is open, focus its editor
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length > 0) {
			this.app.workspace.revealLeaf(leaves[0]);
			const view = leaves[0].view as MicroPostingView;
			view.focusEditor();
			return;
		}
		// Otherwise open the modal
		new QuickCaptureModal(this.app, this).open();
	}

	async loadEntries(): Promise<void> {
		const entries: Entry[] = [];

		// Diary mode entries
		if (isDailyNotesEnabled()) {
			try {
				const files = getRecentDailyNoteFiles(INITIAL_LOAD_DAYS);
				for (const file of files) {
					try {
						const content = await this.app.vault.read(file);
						const fileDate = getDateFromDailyNote(file);
						const parsed = parseDailyNote(
							content,
							file.path,
							this.settings.diaryHeading,
							fileDate,
							this.pluginData,
						);
						entries.push(...parsed);
					} catch (err) {
						console.warn(`Micro Posting: Failed to parse ${file.path}:`, err);
					}
				}
			} catch (err) {
				console.error("Micro Posting: Failed to load daily notes:", err);
			}
		} else if (this.settings.defaultSource === "diary") {
			new Notice(
				"Micro Posting: Daily Notes plugin is not enabled. " +
					"Enable it in Settings → Daily notes, or switch to Single File mode in Micro Posting settings.",
			);
		}

		// Single-file mode entries
		const singleFile = this.app.vault.getFileByPath(
			this.settings.singleFilePath,
		);
		if (singleFile) {
			try {
				const content = await this.app.vault.read(singleFile);
				const parsed = parseSingleFile(content, singleFile.path);
				entries.push(...parsed);
			} catch (err) {
				console.error("Micro Posting: Failed to parse single file:", err);
			}
		}

		// Detect duplicate block IDs — keep only the first occurrence
		const seen = new Set<string>();
		const deduped: Entry[] = [];
		for (const entry of entries) {
			if (seen.has(entry.id)) {
				console.warn(
					`Micro Posting: Duplicate block ID "${entry.id}" in ${entry.filePath} — skipping`,
				);
				continue;
			}
			seen.add(entry.id);
			deduped.push(entry);
		}

		this.store.setEntries(deduped);
		this.loadedDays = INITIAL_LOAD_DAYS;
	}

	/**
	 * Load additional older diary entries for lazy loading.
	 * Returns true if more entries were loaded.
	 */
	async loadMoreEntries(): Promise<boolean> {
		if (!isDailyNotesEnabled()) return false;

		const nextDays = this.loadedDays + INITIAL_LOAD_DAYS;
		const newEntries: Entry[] = [];

		try {
			const allFiles = getRecentDailyNoteFiles(nextDays);
			const alreadyLoaded = new Set(
				this.store
					.getEntries()
					.filter((e) => e.source === "diary")
					.map((e) => e.filePath),
			);

			for (const file of allFiles) {
				if (alreadyLoaded.has(file.path)) continue;
				try {
					const content = await this.app.vault.read(file);
					const fileDate = getDateFromDailyNote(file);
					const parsed = parseDailyNote(
						content,
						file.path,
						this.settings.diaryHeading,
						fileDate,
						this.pluginData,
					);
					newEntries.push(...parsed);
				} catch (err) {
					console.warn(`Micro Posting: Failed to parse ${file.path}:`, err);
				}
			}
		} catch (err) {
			console.error("Micro Posting: Failed to load more daily notes:", err);
			return false;
		}

		if (newEntries.length === 0) {
			this.loadedDays = nextDays;
			return false;
		}

		const current = this.store.getEntries();
		this.store.setEntries([...current, ...newEntries]);
		this.loadedDays = nextDays;
		return true;
	}

	private async onFileModified(file: TFile): Promise<void> {
		if (file.extension !== "md") return;

		try {
			// Check if it's the single-file
			if (file.path === this.settings.singleFilePath) {
				const content = await this.app.vault.read(file);
				const parsed = parseSingleFile(content, file.path);
				// Replace single-file entries while keeping diary entries
				const diaryEntries = this.store
					.getEntries()
					.filter((e) => e.source === "diary");
				this.store.setEntries([...diaryEntries, ...parsed]);
				return;
			}

			// Check if it's a daily note
			if (isDailyNotesEnabled()) {
				const fileDate = getDateFromDailyNote(file);
				if (fileDate) {
					const content = await this.app.vault.read(file);
					const parsed = parseDailyNote(
						content,
						file.path,
						this.settings.diaryHeading,
						fileDate,
						this.pluginData,
					);
					// Replace entries from this file while keeping others
					const otherEntries = this.store
						.getEntries()
						.filter((e) => e.filePath !== file.path);
					this.store.setEntries([...otherEntries, ...parsed]);
				}
			}
		} catch (err) {
			console.warn(
				`Micro Posting: Failed to process modified file ${file.path}:`,
				err,
			);
		}
	}

	// --- Writer wrappers (manage writingFlag) ---

	async saveEntry(content: string, type: EntryType): Promise<Entry> {
		this.writingCount++;
		try {
			let entry: Entry;
			if (this.settings.defaultSource === "diary") {
				if (!isDailyNotesEnabled()) {
					throw new Error(
						"Daily Notes plugin is not enabled. Enable it or switch to Single File mode.",
					);
				}
				entry = await appendDiaryEntry(
					this.app.vault,
					window.moment(),
					content,
					type,
					this.settings,
				);
			} else {
				entry = await appendSingleFileEntry(
					this.app.vault,
					this.settings.singleFilePath,
					content,
					type,
				);
			}
			this.store.addEntry(entry);
			return entry;
		} finally {
			this.writingCount--;
		}
	}

	async editEntry(entry: Entry, newContent: string): Promise<void> {
		this.writingCount++;
		try {
			if (entry.source === "diary") {
				const file = this.app.vault.getFileByPath(entry.filePath);
				if (!file) throw new Error(`File not found: ${entry.filePath}`);
				await updateDiaryEntry(this.app.vault, file, entry, newContent);
			} else {
				await updateSingleFileEntry(
					this.app.vault,
					this.settings.singleFilePath,
					entry,
					newContent,
				);
			}
			this.store.updateEntry(entry.id, {
				content: newContent,
				updatedAt: window.moment().format("YYYY-MM-DDTHH:mm:ssZ"),
			});
			this.store.setEditingEntry(null);
		} finally {
			this.writingCount--;
		}
	}

	async changeStatus(entry: Entry, status: EntryStatus): Promise<void> {
		this.writingCount++;
		try {
			if (entry.source === "diary") {
				// Diary mode: status is stored in plugin data
				setEntryStatus(this.pluginData, entry.id, status);
				await savePluginData(this, this.pluginData);
			} else {
				// Single-file mode: status is stored in the file
				await updateSingleFileEntryStatus(
					this.app.vault,
					this.settings.singleFilePath,
					entry,
					status,
				);
			}
			this.store.updateEntry(entry.id, {
				status,
				updatedAt: window.moment().format("YYYY-MM-DDTHH:mm:ssZ"),
			});
		} finally {
			this.writingCount--;
		}
	}

	async toggleTask(entry: Entry): Promise<void> {
		this.writingCount++;
		try {
			if (entry.source === "diary") {
				const file = this.app.vault.getFileByPath(entry.filePath);
				if (!file) throw new Error(`File not found: ${entry.filePath}`);
				await toggleTaskStatus(this.app.vault, file, entry);
			}
			// Single-file mode doesn't track task completion in file
			this.store.updateEntry(entry.id, {
				taskCompleted: !entry.taskCompleted,
				updatedAt: window.moment().format("YYYY-MM-DDTHH:mm:ssZ"),
			});
		} finally {
			this.writingCount--;
		}
	}

	async deleteEntryPermanently(entry: Entry): Promise<void> {
		this.writingCount++;
		try {
			if (entry.source === "diary") {
				const file = this.app.vault.getFileByPath(entry.filePath);
				if (!file) throw new Error(`File not found: ${entry.filePath}`);
				await removeDiaryEntry(this.app.vault, file, entry);
				// Clean up plugin data
				delete this.pluginData.entries[entry.id];
				await savePluginData(this, this.pluginData);
			} else {
				await removeSingleFileEntry(
					this.app.vault,
					this.settings.singleFilePath,
					entry,
				);
			}
			this.store.removeEntry(entry.id);
		} finally {
			this.writingCount--;
		}
	}
}
