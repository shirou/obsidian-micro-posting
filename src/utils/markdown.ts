import { BLOCK_ID_PREFIX } from "../constants";

export function extractTags(content: string): string[] {
	const withoutCode = content
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`[^`]*`/g, "");
	const matches = withoutCode.match(
		/#[a-zA-Z\u3000-\u9fff\uf900-\ufaff][^\s#]*/g,
	);
	return matches ? [...new Set(matches)] : [];
}

export function stripBlockId(content: string): string {
	return content.replace(
		new RegExp(`\\s*\\^${BLOCK_ID_PREFIX}[a-z0-9]{4}\\s*$`),
		"",
	);
}

export function hasInternalLink(content: string): boolean {
	return /\[\[.+?\]\]/.test(content);
}

export function hasExternalLink(content: string): boolean {
	return /https?:\/\/[^\s)>]+/.test(content);
}

export function hasImage(content: string): boolean {
	return /!\[.*?\]\(.+?\)/.test(content) || /!\[\[.+?\]\]/.test(content);
}
