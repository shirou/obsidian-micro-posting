import { CALLOUT_TYPE } from "../constants";
import type { Entry, EntryStatus, EntryType } from "../types";

const CALLOUT_START_RE = new RegExp(`^>\\s*\\[!${CALLOUT_TYPE}\\]\\s*$`);

/**
 * Get text content from a callout line (strip leading `> `).
 * Returns null if the line is not a callout continuation.
 */
function calloutContent(line: string): string | null {
	if (line === ">") return "";
	if (line.startsWith("> ")) return line.substring(2);
	return null;
}

/**
 * Parse a single-file mode Markdown file and return Micro Posting entries.
 */
export function parseSingleFile(content: string, filePath: string): Entry[] {
	const lines = content.split("\n");
	const entries: Entry[] = [];
	let i = 0;

	while (i < lines.length) {
		if (!CALLOUT_START_RE.test(lines[i])) {
			i++;
			continue;
		}

		i++; // Skip `> [!micro-posting]` line

		// Read metadata lines
		const metadata: Record<string, string> = {};
		let reachedSeparator = false;

		while (i < lines.length) {
			const text = calloutContent(lines[i]);
			if (text === null) break; // End of callout

			if (text === "") {
				// Empty callout line = separator between metadata and content
				reachedSeparator = true;
				i++;
				break;
			}

			const colonIdx = text.indexOf(":");
			if (colonIdx > 0) {
				const key = text.substring(0, colonIdx).trim();
				const value = text.substring(colonIdx + 1).trim();
				metadata[key] = value;
			}
			i++;
		}

		// Read content lines
		const contentLines: string[] = [];
		if (reachedSeparator) {
			while (i < lines.length) {
				const text = calloutContent(lines[i]);
				if (text === null) break;
				contentLines.push(text);
				i++;
			}
		}

		const id = metadata.id;
		if (!id) continue; // Invalid entry without ID

		entries.push({
			id,
			content: contentLines.join("\n").trimEnd(),
			createdAt: metadata.createdAt ?? new Date().toISOString(),
			updatedAt: metadata.updatedAt ?? new Date().toISOString(),
			type: (metadata.type as EntryType) ?? "list",
			taskCompleted: false,
			status: (metadata.status as EntryStatus) ?? "active",
			source: "single-file",
			filePath,
		});
	}

	return entries;
}
