import { type App, PluginSettingTab, Setting } from "obsidian";
import { savePluginData } from "./data/plugin-data";
import type MicroPostingPlugin from "./main";

export class MicroPostingSettingTab extends PluginSettingTab {
	plugin: MicroPostingPlugin;

	constructor(app: App, plugin: MicroPostingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default save mode")
			.setDesc("Where new entries are stored by default")
			.addDropdown((drop) =>
				drop
					.addOption("diary", "Daily Note (Diary)")
					.addOption("single-file", "Single File")
					.setValue(this.plugin.settings.defaultSource)
					.onChange(async (value) => {
						this.plugin.settings.defaultSource = value as
							| "diary"
							| "single-file";
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Default entry type")
			.setDesc("Default prefix for new entries")
			.addDropdown((drop) =>
				drop
					.addOption("list", "List (- )")
					.addOption("task", "Task (- [ ] )")
					.setValue(this.plugin.settings.defaultType)
					.onChange(async (value) => {
						this.plugin.settings.defaultType = value as "list" | "task";
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Auto focus")
			.setDesc("Automatically focus the input area when the view opens")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoFocus)
					.onChange(async (value) => {
						this.plugin.settings.autoFocus = value;
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Diary heading")
			.setDesc("Heading title under which entries are stored in daily notes")
			.addText((text) =>
				text
					.setPlaceholder("Posts")
					.setValue(this.plugin.settings.diaryHeading)
					.onChange(async (value) => {
						this.plugin.settings.diaryHeading = value;
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Single file path")
			.setDesc("File path for single-file mode (relative to vault root)")
			.addText((text) =>
				text
					.setPlaceholder("micro-posting.md")
					.setValue(this.plugin.settings.singleFilePath)
					.onChange(async (value) => {
						this.plugin.settings.singleFilePath = value;
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Default layout")
			.setDesc("Initial layout when the view opens")
			.addDropdown((drop) =>
				drop
					.addOption("list", "List View")
					.addOption("chat", "Chat View")
					.setValue(this.plugin.settings.defaultLayout)
					.onChange(async (value) => {
						this.plugin.settings.defaultLayout = value as "list" | "chat";
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Hide completed tasks")
			.setDesc("Hide tasks marked as done from the active view")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideCompletedTasks)
					.onChange(async (value) => {
						this.plugin.settings.hideCompletedTasks = value;
						this.plugin.store.setHideCompletedTasks(value);
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName("Sidebar always visible")
			.setDesc("Keep the sidebar visible at all times")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.sidebarAlwaysVisible)
					.onChange(async (value) => {
						this.plugin.settings.sidebarAlwaysVisible = value;
						await this.save();
					}),
			);
	}

	private async save(): Promise<void> {
		this.plugin.pluginData.settings = this.plugin.settings;
		await savePluginData(this.plugin, this.plugin.pluginData);
	}
}
