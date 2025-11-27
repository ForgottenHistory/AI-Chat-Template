import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');

const DEFAULT_PROMPTS: Record<string, string> = {
	system: `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`,
	impersonate: `Write the next message as {{user}} in this roleplay chat with {{char}}.

Stay in character as {{user}}. Write a natural response that fits the conversation flow.`
};

// Ensure prompts directory exists
async function ensurePromptsDir() {
	try {
		await fs.mkdir(PROMPTS_DIR, { recursive: true });
	} catch (error) {
		// Directory already exists
	}
}

// Read a prompt file with fallback to default
async function readPromptFile(name: string): Promise<string> {
	const filePath = path.join(PROMPTS_DIR, `${name}.txt`);
	try {
		return await fs.readFile(filePath, 'utf-8');
	} catch (error) {
		// File doesn't exist, create with default
		const defaultContent = DEFAULT_PROMPTS[name] || '';
		if (defaultContent) {
			await fs.writeFile(filePath, defaultContent, 'utf-8');
		}
		return defaultContent;
	}
}

// GET - Read all prompts from files
export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		await ensurePromptsDir();

		const prompts: Record<string, string> = {};
		for (const name of Object.keys(DEFAULT_PROMPTS)) {
			prompts[name] = await readPromptFile(name);
		}

		return json({ prompts });
	} catch (error) {
		console.error('Failed to read prompts:', error);
		return json({ error: 'Failed to read prompts' }, { status: 500 });
	}
};

// PUT - Write a prompt to file
export const PUT: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { name, content } = await request.json();

		if (!name || !DEFAULT_PROMPTS.hasOwnProperty(name)) {
			return json({ error: 'Invalid prompt name' }, { status: 400 });
		}

		await ensurePromptsDir();
		const filePath = path.join(PROMPTS_DIR, `${name}.txt`);
		await fs.writeFile(filePath, content || DEFAULT_PROMPTS[name], 'utf-8');

		return json({ success: true });
	} catch (error) {
		console.error('Failed to save prompt:', error);
		return json({ error: 'Failed to save prompt' }, { status: 500 });
	}
};
