import type { TFile } from "obsidian";
import {
	appHasDailyNotesPluginLoaded,
	createDailyNote,
	getAllDailyNotes,
	getDailyNote,
	getDateFromFile,
} from "obsidian-daily-notes-interface";

export function isDailyNotesEnabled(): boolean {
	return appHasDailyNotesPluginLoaded();
}

export function getDailyNoteFile(date: moment.Moment): TFile | null {
	const dailyNotes = getAllDailyNotes();
	return getDailyNote(date, dailyNotes);
}

export async function getOrCreateDailyNote(
	date: moment.Moment,
): Promise<TFile> {
	const existing = getDailyNoteFile(date);
	if (existing) return existing;
	return await createDailyNote(date);
}

export function getRecentDailyNoteFiles(days: number): TFile[] {
	const dailyNotes = getAllDailyNotes();
	const files: TFile[] = [];
	const today = window.moment();

	for (let i = 0; i < days; i++) {
		const date = today.clone().subtract(i, "days");
		const note = getDailyNote(date, dailyNotes);
		if (note) files.push(note);
	}

	return files;
}

export function getDateFromDailyNote(file: TFile): moment.Moment | null {
	return getDateFromFile(file, "day");
}
