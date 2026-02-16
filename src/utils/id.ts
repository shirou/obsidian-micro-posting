import { BLOCK_ID_PREFIX } from "../constants";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateBlockId(): string {
	let id = BLOCK_ID_PREFIX;
	for (let i = 0; i < 4; i++) {
		id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
	}
	return id;
}

const BLOCK_ID_RE = new RegExp(`^${BLOCK_ID_PREFIX}[a-z0-9]{4}$`);

export function isMicroPostingBlockId(id: string): boolean {
	return BLOCK_ID_RE.test(id);
}

export function generateUUID(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
