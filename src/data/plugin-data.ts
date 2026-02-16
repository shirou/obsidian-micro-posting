import type { Plugin } from "obsidian";
import { DEFAULT_SETTINGS } from "../constants";
import type { EntryStatus, MicroPostingPluginData } from "../types";

const DEFAULT_DATA: MicroPostingPluginData = {
	settings: { ...DEFAULT_SETTINGS },
	entries: {},
};

export async function loadPluginData(
	plugin: Plugin,
): Promise<MicroPostingPluginData> {
	const saved = await plugin.loadData();
	if (!saved) return { ...DEFAULT_DATA, settings: { ...DEFAULT_SETTINGS } };

	return {
		settings: { ...DEFAULT_SETTINGS, ...saved.settings },
		entries: saved.entries ?? {},
	};
}

export async function savePluginData(
	plugin: Plugin,
	data: MicroPostingPluginData,
): Promise<void> {
	await plugin.saveData(data);
}

export function getEntryStatus(
	data: MicroPostingPluginData,
	blockId: string,
): EntryStatus {
	const meta = data.entries[blockId];
	return meta ? meta.status : "active";
}

export function setEntryStatus(
	data: MicroPostingPluginData,
	blockId: string,
	status: EntryStatus,
): void {
	if (status === "active") {
		delete data.entries[blockId];
	} else {
		data.entries[blockId] = {
			status,
			updatedAt: window.moment().format("YYYY-MM-DDTHH:mm:ssZ"),
		};
	}
}
