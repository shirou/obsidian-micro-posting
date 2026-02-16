export type EntryType = "task" | "list";
export type EntryStatus = "active" | "archived" | "deleted";
export type EntrySource = "diary" | "single-file";
export type LayoutMode = "list" | "chat";
export type ViewMode = "active" | "archive" | "trash";

export interface Entry {
	id: string;
	content: string;
	createdAt: string; // ISO 8601
	updatedAt: string;
	type: EntryType;
	taskCompleted: boolean;
	status: EntryStatus;
	source: EntrySource;
	filePath: string;
}

export interface MicroPostingSettings {
	defaultSource: EntrySource;
	defaultType: EntryType;
	autoFocus: boolean;
	diaryHeading: string;
	singleFilePath: string;
	defaultLayout: LayoutMode;
	hideCompletedTasks: boolean;
	sidebarAlwaysVisible: boolean;
}

export interface EntryMetadata {
	status: EntryStatus;
	updatedAt: string;
}

export interface MicroPostingPluginData {
	settings: MicroPostingSettings;
	entries: Record<string, EntryMetadata>;
}

export interface FilterState {
	searchQuery: string;
	tag: string | null;
	quickFilter: QuickFilter | null;
}

export type QuickFilter =
	| "with-link"
	| "no-tag"
	| "with-hyperlink"
	| "with-image";
