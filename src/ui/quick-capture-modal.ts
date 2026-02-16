import { type App, Modal, Notice, setIcon } from "obsidian";
import type MicroPostingPlugin from "../main";
import type { EntryType } from "../types";

export class QuickCaptureModal extends Modal {
	private plugin: MicroPostingPlugin;
	private textareaEl!: HTMLTextAreaElement;
	private currentType: EntryType;
	private toggleBtn!: HTMLElement;
	private saving = false;

	constructor(app: App, plugin: MicroPostingPlugin) {
		super(app);
		this.plugin = plugin;
		this.currentType = plugin.settings.defaultType;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("micro-posting-quick-capture");

		// Title
		contentEl.createEl("h3", { text: "Quick Capture" });

		// Input row
		const inputRow = contentEl.createDiv({ cls: "micro-posting-input-row" });

		// Toggle button
		this.toggleBtn = inputRow.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Toggle task/list" },
		});
		this.updateToggleIcon();
		this.toggleBtn.addEventListener("click", () => this.toggleType());

		// Textarea
		this.textareaEl = inputRow.createEl("textarea", {
			cls: "micro-posting-textarea",
			attr: { placeholder: "Write something...", rows: "3" },
		});
		this.textareaEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				this.save();
			}
		});

		// Save button
		const saveBtn = contentEl.createEl("button", {
			text: "Save",
			cls: "mod-cta",
		});
		saveBtn.addEventListener("click", () => this.save());

		// Focus textarea
		setTimeout(() => this.textareaEl.focus(), 50);
	}

	private toggleType() {
		this.currentType = this.currentType === "task" ? "list" : "task";
		this.updateToggleIcon();
	}

	private updateToggleIcon() {
		this.toggleBtn.empty();
		setIcon(
			this.toggleBtn,
			this.currentType === "task" ? "check-square" : "list",
		);
	}

	private async save() {
		const content = this.textareaEl.value.trim();
		if (!content || this.saving) return;
		this.saving = true;
		try {
			await this.plugin.saveEntry(content, this.currentType);
			this.close();
		} catch (err) {
			new Notice(`Save failed: ${(err as Error).message}`);
		} finally {
			this.saving = false;
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
