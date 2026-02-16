import type { TFile, Vault } from "obsidian";
import type { Entry, EntryType, MicroPostingSettings } from "../types";
import { getOrCreateDailyNote } from "../utils/daily-notes";
import { generateBlockId } from "../utils/id";

/**
 * Format content as a diary list line.
 */
function formatEntryLine(
	content: string,
	type: EntryType,
	taskCompleted: boolean,
	timestamp: string,
	blockId: string,
): string {
	let prefix: string;
	if (type === "task") {
		prefix = taskCompleted ? "- [x] " : "- [ ] ";
	} else {
		prefix = "- ";
	}
	const lines = content.split("\n");

	if (lines.length === 1) {
		return `${prefix}${timestamp} ${lines[0]} ^${blockId}`;
	}

	// Multi-line: first line has prefix+timestamp, continuation lines indented
	const result = [`${prefix}${timestamp} ${lines[0]}`];
	for (let i = 1; i < lines.length; i++) {
		const suffix = i === lines.length - 1 ? ` ^${blockId}` : "";
		result.push(`  ${lines[i]}${suffix}`);
	}
	return result.join("\n");
}

/**
 * Find insertion point (end of heading section) in file content.
 * Returns the line index where a new entry should be inserted.
 * If heading doesn't exist, appends the heading and returns the next line.
 */
function findInsertionPoint(
	content: string,
	heading: string,
): { content: string; insertLine: number } {
	const lines = content.split("\n");
	let headingLevel = 0;
	let headingIdx = -1;

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
		if (match) {
			if (headingIdx >= 0 && match[1].length <= headingLevel) {
				// Next same/higher level heading found
				// Insert before this heading (skip blank lines above)
				let insertAt = i;
				while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === "") {
					insertAt--;
				}
				return { content, insertLine: insertAt };
			}
			if (match[2].trim() === heading) {
				headingLevel = match[1].length;
				headingIdx = i;
			}
		}
	}

	if (headingIdx >= 0) {
		// Heading found, section extends to end of file
		// Find last non-empty line in section
		let insertAt = lines.length;
		while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === "") {
			insertAt--;
		}
		return { content, insertLine: insertAt };
	}

	// Heading not found — append it
	const newContent = `${content.trimEnd()}\n\n# ${heading}\n`;
	return {
		content: newContent,
		insertLine: newContent.split("\n").length - 1,
	};
}

/**
 * Append a new entry to a daily note.
 */
export async function appendDiaryEntry(
	vault: Vault,
	date: moment.Moment,
	content: string,
	type: EntryType,
	settings: MicroPostingSettings,
): Promise<Entry> {
	const file = await getOrCreateDailyNote(date);
	const blockId = generateBlockId();
	const timestamp = date.format("HH:mm");
	const entryLine = formatEntryLine(content, type, false, timestamp, blockId);
	const createdAt = date.format("YYYY-MM-DDTHH:mm:ssZ");

	await vault.process(file, (fileContent) => {
		const { content: prepared, insertLine } = findInsertionPoint(
			fileContent,
			settings.diaryHeading,
		);
		const lines = prepared.split("\n");
		lines.splice(insertLine, 0, entryLine);
		return lines.join("\n");
	});

	return {
		id: blockId,
		content,
		createdAt,
		updatedAt: createdAt,
		type,
		taskCompleted: false,
		status: "active",
		source: "diary",
		filePath: file.path,
	};
}

/**
 * Find lines of an entry by its block ID.
 * Returns start and end line indices (inclusive).
 */
function findEntryByBlockId(
	content: string,
	blockId: string,
): { start: number; end: number } | null {
	const lines = content.split("\n");
	const blockRef = `^${blockId}`;

	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].trimEnd().endsWith(blockRef)) continue;

		// Found the block ID line. Walk backwards to find list item start.
		let start = i;
		while (start > 0 && !lines[start].match(/^- /)) {
			start--;
		}
		return { start, end: i };
	}
	return null;
}

/**
 * Update an existing diary entry's content.
 */
export async function updateDiaryEntry(
	vault: Vault,
	file: TFile,
	entry: Entry,
	newContent: string,
): Promise<void> {
	const timestamp = window.moment(entry.createdAt).format("HH:mm");

	await vault.process(file, (fileContent) => {
		const pos = findEntryByBlockId(fileContent, entry.id);
		if (!pos) return fileContent;

		const lines = fileContent.split("\n");
		const newLine = formatEntryLine(
			newContent,
			entry.type,
			entry.taskCompleted,
			timestamp,
			entry.id,
		);
		const newLines = newLine.split("\n");
		lines.splice(pos.start, pos.end - pos.start + 1, ...newLines);
		return lines.join("\n");
	});
}

/**
 * Remove an entry from a daily note file (physical deletion).
 */
export async function removeDiaryEntry(
	vault: Vault,
	file: TFile,
	entry: Entry,
): Promise<void> {
	await vault.process(file, (fileContent) => {
		const pos = findEntryByBlockId(fileContent, entry.id);
		if (!pos) return fileContent;

		const lines = fileContent.split("\n");
		lines.splice(pos.start, pos.end - pos.start + 1);
		return lines.join("\n");
	});
}

/**
 * Toggle task checkbox status: - [ ] ↔ - [x]
 */
export async function toggleTaskStatus(
	vault: Vault,
	file: TFile,
	entry: Entry,
): Promise<void> {
	await vault.process(file, (fileContent) => {
		const pos = findEntryByBlockId(fileContent, entry.id);
		if (!pos) return fileContent;

		const lines = fileContent.split("\n");
		const firstLine = lines[pos.start];
		if (/^- \[ \] /.test(firstLine)) {
			lines[pos.start] = firstLine.replace("- [ ] ", "- [x] ");
		} else if (/^- \[x\] /i.test(firstLine)) {
			lines[pos.start] = firstLine.replace(/^- \[x\] /i, "- [ ] ");
		}
		return lines.join("\n");
	});
}
