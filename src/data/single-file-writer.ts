import type { TFile, Vault } from "obsidian";
import { CALLOUT_TYPE } from "../constants";
import type { Entry, EntryStatus, EntryType } from "../types";
import { generateUUID } from "../utils/id";

const CALLOUT_HEADER_RE = new RegExp(`^>\\s*\\[!${CALLOUT_TYPE}\\]\\s*$`);

/**
 * Format an entry as a callout block.
 */
function formatCallout(
	id: string,
	createdAt: string,
	updatedAt: string,
	type: EntryType,
	status: EntryStatus,
	content: string,
): string {
	const metaLines = [
		`> [!${CALLOUT_TYPE}]`,
		`> id: ${id}`,
		`> createdAt: ${createdAt}`,
		`> updatedAt: ${updatedAt}`,
		`> type: ${type}`,
		`> status: ${status}`,
		`>`,
	];

	const contentLines = content.split("\n").map((line) => `> ${line}`);

	return [...metaLines, ...contentLines].join("\n");
}

/**
 * Get or create the single-file target.
 */
async function getOrCreateFile(vault: Vault, filePath: string): Promise<TFile> {
	const file = vault.getFileByPath(filePath);
	if (file) return file;
	return await vault.create(filePath, "");
}

/**
 * Find callout block boundaries by entry ID.
 */
function findCalloutById(
	content: string,
	entryId: string,
): { start: number; end: number } | null {
	const lines = content.split("\n");
	const idLine = `> id: ${entryId}`;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim() !== idLine.trim()) continue;

		// Walk backwards to find `> [!micro-posting]`
		let start = i - 1;
		let foundHeader = false;
		while (start >= 0) {
			if (CALLOUT_HEADER_RE.test(lines[start].trim())) {
				foundHeader = true;
				break;
			}
			if (!lines[start].startsWith(">")) break;
			start--;
		}
		if (!foundHeader) continue;

		// Walk forwards to find end of callout
		let end = i + 1;
		while (end < lines.length && lines[end].startsWith(">")) {
			end++;
		}

		return { start, end: end - 1 };
	}
	return null;
}

/**
 * Append a new entry to the single file.
 */
export async function appendSingleFileEntry(
	vault: Vault,
	filePath: string,
	content: string,
	type: EntryType,
): Promise<Entry> {
	const file = await getOrCreateFile(vault, filePath);
	const id = generateUUID();
	const now = window.moment().format("YYYY-MM-DDTHH:mm:ssZ");
	const callout = formatCallout(id, now, now, type, "active", content);

	await vault.process(file, (fileContent) => {
		const trimmed = fileContent.trimEnd();
		if (trimmed.length === 0) return `${callout}\n`;
		return `${trimmed}\n\n${callout}\n`;
	});

	return {
		id,
		content,
		createdAt: now,
		updatedAt: now,
		type,
		taskCompleted: false,
		status: "active",
		source: "single-file",
		filePath,
	};
}

/**
 * Update an existing entry's content in the single file.
 */
export async function updateSingleFileEntry(
	vault: Vault,
	filePath: string,
	entry: Entry,
	newContent: string,
): Promise<void> {
	const file = vault.getFileByPath(filePath);
	if (!file) return;

	const now = window.moment().format("YYYY-MM-DDTHH:mm:ssZ");

	await vault.process(file, (fileContent) => {
		const pos = findCalloutById(fileContent, entry.id);
		if (!pos) return fileContent;

		const lines = fileContent.split("\n");
		const newCallout = formatCallout(
			entry.id,
			entry.createdAt,
			now,
			entry.type,
			entry.status,
			newContent,
		);
		const newLines = newCallout.split("\n");
		lines.splice(pos.start, pos.end - pos.start + 1, ...newLines);
		return lines.join("\n");
	});
}

/**
 * Update an entry's status in the single file.
 */
export async function updateSingleFileEntryStatus(
	vault: Vault,
	filePath: string,
	entry: Entry,
	status: EntryStatus,
): Promise<void> {
	const file = vault.getFileByPath(filePath);
	if (!file) return;

	const now = window.moment().format("YYYY-MM-DDTHH:mm:ssZ");

	await vault.process(file, (fileContent) => {
		const pos = findCalloutById(fileContent, entry.id);
		if (!pos) return fileContent;

		const lines = fileContent.split("\n");
		const newCallout = formatCallout(
			entry.id,
			entry.createdAt,
			now,
			entry.type,
			status,
			entry.content,
		);
		const newLines = newCallout.split("\n");
		lines.splice(pos.start, pos.end - pos.start + 1, ...newLines);
		return lines.join("\n");
	});
}

/**
 * Remove an entry from the single file (physical deletion).
 */
export async function removeSingleFileEntry(
	vault: Vault,
	filePath: string,
	entry: Entry,
): Promise<void> {
	const file = vault.getFileByPath(filePath);
	if (!file) return;

	await vault.process(file, (fileContent) => {
		const pos = findCalloutById(fileContent, entry.id);
		if (!pos) return fileContent;

		const lines = fileContent.split("\n");

		// Also remove trailing blank line if present
		let removeEnd = pos.end + 1;
		if (removeEnd < lines.length && lines[removeEnd].trim() === "") {
			removeEnd++;
		}

		lines.splice(pos.start, removeEnd - pos.start);
		return lines.join("\n");
	});
}
