import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');
const SYSTEM_PROMPT_FILE = path.join(PROMPTS_DIR, 'system.txt');

const DEFAULT_SYSTEM_PROMPT = `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`;

// Ensure prompts directory exists
async function ensurePromptsDir() {
	try {
		await fs.mkdir(PROMPTS_DIR, { recursive: true });
	} catch (error) {
		// Directory already exists
	}
}

// GET - Read system prompt from file
export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		await ensurePromptsDir();

		let systemPrompt = DEFAULT_SYSTEM_PROMPT;
		try {
			systemPrompt = await fs.readFile(SYSTEM_PROMPT_FILE, 'utf-8');
		} catch (error) {
			// File doesn't exist, use default
			await fs.writeFile(SYSTEM_PROMPT_FILE, DEFAULT_SYSTEM_PROMPT, 'utf-8');
		}

		return json({ systemPrompt });
	} catch (error) {
		console.error('Failed to read system prompt:', error);
		return json({ error: 'Failed to read system prompt' }, { status: 500 });
	}
};

// PUT - Write system prompt to file
export const PUT: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { systemPrompt } = await request.json();

		await ensurePromptsDir();
		await fs.writeFile(SYSTEM_PROMPT_FILE, systemPrompt || DEFAULT_SYSTEM_PROMPT, 'utf-8');

		return json({ success: true });
	} catch (error) {
		console.error('Failed to save system prompt:', error);
		return json({ error: 'Failed to save system prompt' }, { status: 500 });
	}
};
