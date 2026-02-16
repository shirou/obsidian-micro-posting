import { BLOCK_ID_PREFIX } from "../constants";
import type { Entry, MicroPostingPluginData } from "../types";
import { getEntryStatus } from "./plugin-data";

const BLOCK_ID_RE = new RegExp(`\\^(${BLOCK_ID_PREFIX}[a-z0-9]{4})\\s*$`);
const TIMESTAMP_RE = /^(\d{2}:\d{2})\s+/;
const TASK_UNCHECKED_RE = /^- \[ \] /;
const TASK_CHECKED_RE = /^- \[x\] /i;
const LIST_ITEM_RE = /^- /;

interface RawListItem {
	lines: string[];
	isTask: boolean;
	isChecked: boolean;
	blockId: string | null;
}

/**
 * Find lines belonging to the specified heading section.
 * Returns lines between the heading and the next heading of same/higher level.
 */
function findHeadingSection(content: string, heading: string): string[] | null {
	const lines = content.split("\n");
	let headingLevel = 0;
	let startIdx = -1;

	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
		if (match) {
			if (startIdx >= 0 && match[1].length <= headingLevel) {
				return lines.slice(startIdx + 1, i);
			}
			if (match[2].trim() === heading) {
				headingLevel = match[1].length;
				startIdx = i;
			}
		}
	}

	if (startIdx >= 0) {
		return lines.slice(startIdx + 1);
	}
	return null;
}

/**
 * Parse list items from section lines, collecting multi-line entries.
 */
function parseListItems(sectionLines: string[]): RawListItem[] {
	const items: RawListItem[] = [];
	let current: RawListItem | null = null;

	for (const line of sectionLines) {
		if (
			TASK_UNCHECKED_RE.test(line) ||
			TASK_CHECKED_RE.test(line) ||
			LIST_ITEM_RE.test(line)
		) {
			if (current) items.push(current);

			const isTask = TASK_UNCHECKED_RE.test(line) || TASK_CHECKED_RE.test(line);
			const isChecked = TASK_CHECKED_RE.test(line);

			current = {
				lines: [line],
				isTask,
				isChecked,
				blockId: null,
			};
		} else if (current && line.startsWith("  ") && line.trim() !== "") {
			current.lines.push(line);
		} else {
			if (current) items.push(current);
			current = null;
		}
	}
	if (current) items.push(current);

	// Extract block IDs
	for (const item of items) {
		const lastLine = item.lines[item.lines.length - 1];
		const match = lastLine.match(BLOCK_ID_RE);
		if (match) {
			item.blockId = match[1];
		}
	}

	return items;
}

/**
 * Extract content text from a raw list item.
 * Strips list marker, timestamp prefix, and block ID.
 */
function extractContent(item: RawListItem): {
	content: string;
	timestamp: string | null;
} {
	const firstLine = item.lines[0];

	// Remove list marker
	let text: string;
	if (TASK_UNCHECKED_RE.test(firstLine)) {
		text = firstLine.replace(TASK_UNCHECKED_RE, "");
	} else if (TASK_CHECKED_RE.test(firstLine)) {
		text = firstLine.replace(TASK_CHECKED_RE, "");
	} else {
		text = firstLine.replace(LIST_ITEM_RE, "");
	}

	// Extract timestamp
	let timestamp: string | null = null;
	const tsMatch = text.match(TIMESTAMP_RE);
	if (tsMatch) {
		timestamp = tsMatch[1];
		text = text.replace(TIMESTAMP_RE, "");
	}

	// Build full content (including continuation lines)
	const contentLines = [text];
	for (let i = 1; i < item.lines.length; i++) {
		contentLines.push(item.lines[i].replace(/^\s{2}/, ""));
	}

	// Remove block ID from last line
	const lastIdx = contentLines.length - 1;
	contentLines[lastIdx] = contentLines[lastIdx]
		.replace(BLOCK_ID_RE, "")
		.trimEnd();

	const content = contentLines.join("\n").trimEnd();
	return { content, timestamp };
}

/**
 * Parse a daily note file and return Micro Posting entries.
 */
export function parseDailyNote(
	fileContent: string,
	filePath: string,
	heading: string,
	fileDate: moment.Moment | null,
	pluginData: MicroPostingPluginData,
): Entry[] {
	const sectionLines = findHeadingSection(fileContent, heading);
	if (!sectionLines) return [];

	const rawItems = parseListItems(sectionLines);
	const entries: Entry[] = [];

	for (const item of rawItems) {
		if (!item.blockId) continue; // Not a Micro Posting entry

		const { content, timestamp } = extractContent(item);
		if (!content) continue;

		// Build createdAt from file date + timestamp
		let createdAt: string;
		if (fileDate && timestamp) {
			const [hours, minutes] = timestamp.split(":").map(Number);
			const dt = fileDate.clone().hour(hours).minute(minutes).second(0);
			createdAt = dt.format("YYYY-MM-DDTHH:mm:ssZ");
		} else if (fileDate) {
			createdAt = fileDate
				.clone()
				.startOf("day")
				.format("YYYY-MM-DDTHH:mm:ssZ");
		} else {
			createdAt = new Date().toISOString();
		}

		const status = getEntryStatus(pluginData, item.blockId);
		const meta = pluginData.entries[item.blockId];
		const updatedAt = meta?.updatedAt ?? createdAt;

		entries.push({
			id: item.blockId,
			content,
			createdAt,
			updatedAt,
			type: item.isTask ? "task" : "list",
			taskCompleted: item.isChecked,
			status,
			source: "diary",
			filePath,
		});
	}

	return entries;
}
