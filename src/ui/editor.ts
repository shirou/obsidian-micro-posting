import { Notice, setIcon } from "obsidian";
import type MicroPostingPlugin from "../main";
import type { EntryType } from "../types";

export class EditorPanel {
	private containerEl: HTMLElement;
	private plugin: MicroPostingPlugin;
	private textareaEl!: HTMLTextAreaElement;
	private toggleBtn!: HTMLElement;
	private editIndicatorEl!: HTMLElement;
	private currentType: EntryType;
	private unsubscribes: (() => void)[] = [];

	constructor(containerEl: HTMLElement, plugin: MicroPostingPlugin) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.currentType = plugin.settings.defaultType;
		this.render();
	}

	private render() {
		// Edit indicator (hidden by default)
		this.editIndicatorEl = this.containerEl.createDiv({
			cls: "micro-posting-edit-indicator",
		});
		this.editIndicatorEl.hide();

		const inputRow = this.containerEl.createDiv({
			cls: "micro-posting-input-row",
		});

		// Task/list toggle button
		this.toggleBtn = inputRow.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Toggle task/list" },
		});
		this.updateToggleIcon();
		this.toggleBtn.addEventListener("click", () => this.toggleType());

		// Textarea
		this.textareaEl = inputRow.createEl("textarea", {
			cls: "micro-posting-textarea",
			attr: { placeholder: "Write something...", rows: "1" },
		});
		this.textareaEl.addEventListener("input", () => this.autoResize());
		this.textareaEl.addEventListener("keydown", (e) => this.onKeydown(e));

		// Save button
		const saveBtn = inputRow.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "Save (Enter)" },
		});
		setIcon(saveBtn, "corner-down-left");
		saveBtn.addEventListener("click", () => this.save());

		// Subscribe to editing changes
		this.unsubscribes.push(
			this.plugin.store.on("editing-changed", () => this.onEditingChanged()),
		);
	}

	private onKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			this.save();
		} else if (e.key === "Escape") {
			this.cancelEdit();
		}
	}

	private async save() {
		const content = this.textareaEl.value.trim();
		if (!content) return;

		const editing = this.plugin.store.getEditingEntry();
		try {
			if (editing) {
				await this.plugin.editEntry(editing, content);
			} else {
				await this.plugin.saveEntry(content, this.currentType);
			}
			this.textareaEl.value = "";
			this.autoResize();
			this.cancelEdit();
			this.textareaEl.focus();
		} catch (err) {
			new Notice(`Save failed: ${(err as Error).message}`);
			// Keep textarea content on failure
		}
	}

	private onEditingChanged() {
		const editing = this.plugin.store.getEditingEntry();
		if (editing) {
			this.textareaEl.value = editing.content;
			this.autoResize();
			this.textareaEl.focus();

			// Show edit indicator
			this.editIndicatorEl.empty();
			this.editIndicatorEl.createSpan({ text: "Editing entry" });
			const cancelBtn = this.editIndicatorEl.createEl("button", {
				cls: "clickable-icon micro-posting-edit-cancel",
				attr: { "aria-label": "Cancel edit" },
			});
			setIcon(cancelBtn, "x");
			cancelBtn.addEventListener("click", () => this.cancelEdit());
			this.editIndicatorEl.show();
		} else {
			this.editIndicatorEl.hide();
		}
	}

	private cancelEdit() {
		if (this.plugin.store.getEditingEntry()) {
			this.plugin.store.setEditingEntry(null);
			this.textareaEl.value = "";
			this.autoResize();
		}
	}

	private autoResize() {
		this.textareaEl.style.height = "auto";
		this.textareaEl.style.height = `${this.textareaEl.scrollHeight}px`;
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

	focus() {
		this.textareaEl.focus();
	}

	destroy() {
		for (const fn of this.unsubscribes) fn();
		this.unsubscribes = [];
	}
}
