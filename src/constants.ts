import type { MicroPostingSettings } from "./types";

export const VIEW_TYPE = "micro-posting-view";
export const BLOCK_ID_PREFIX = "mp-";
export const CALLOUT_TYPE = "micro-posting";
export const DEFAULT_HEADING = "Posts";
export const DEFAULT_SINGLE_FILE = "micro-posting.md";
export const INITIAL_LOAD_DAYS = 30;

export const DEFAULT_SETTINGS: MicroPostingSettings = {
	defaultSource: "diary",
	defaultType: "list",
	autoFocus: true,
	diaryHeading: DEFAULT_HEADING,
	singleFilePath: DEFAULT_SINGLE_FILE,
	defaultLayout: "list",
	hideCompletedTasks: false,
	sidebarAlwaysVisible: true,
};
