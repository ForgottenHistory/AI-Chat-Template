import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');

// Prompt types organized by LLM category
const DEFAULT_PROMPTS: Record<string, Record<string, string>> = {
	chat: {
		system: `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`,
		impersonate: `Write the next message as {{user}} in this roleplay chat with {{char}}.

Stay in character as {{user}}. Write a natural response that fits the conversation flow.`
	},
	decision: {
		system: `You are a decision-making assistant. Analyze the context and make a decision about how to proceed.

Respond with a JSON object containing your decision and reasoning.`
	},
	content: {
		system: `You are a creative content generator. Create engaging, well-written content based on the given parameters.

Focus on:
- Creativity and originality
- Coherent narrative structure
- Engaging writing style`
	},
	image: {
		generate: `Guidelines:
- Choose 5-10 tags that best match the current scene and conversation context
- **ALWAYS include a focus/composition tag** (close-up, upper body, cowboy shot, full body, portrait, etc.)
- **CLOTHING/APPEARANCE MUST BE HIGHLY SPECIFIC** - This is critical!
  * ALWAYS add color + clothing type: "white shirt", "black jacket", "blue dress", "red hoodie"
  * Add style details: "torn clothing", "elegant gown", "casual wear", "formal suit"
  * NEVER use vague terms: "clothes", "outfit" (too vague - specify color/style!)
- Focus on: expression, pose, action, clothing (COLOR + TYPE + DETAILS), environment, lighting, mood
- Match the scene to what's happening in the roleplay

- Only use tags from the library above or the character-specific tags
- Output ONLY comma-separated tags, no explanations
- Be specific and contextual - capture the current scene

Example output format:
upper body, smiling, white shirt, black jacket, indoor, soft lighting, looking at viewer`
	}
};

// Flatten prompts for file paths (e.g., "chat_system", "decision_analyze")
function getPromptKey(category: string, name: string): string {
	return `${category}_${name}`;
}

// Ensure prompts directory exists
async function ensurePromptsDir() {
	try {
		await fs.mkdir(PROMPTS_DIR, { recursive: true });
	} catch (error) {
		// Directory already exists
	}
}

// Read a prompt file with fallback to default
async function readPromptFile(category: string, name: string): Promise<string> {
	const key = getPromptKey(category, name);
	const filePath = path.join(PROMPTS_DIR, `${key}.txt`);
	try {
		return await fs.readFile(filePath, 'utf-8');
	} catch (error) {
		// File doesn't exist, create with default
		const defaultContent = DEFAULT_PROMPTS[category]?.[name] || '';
		if (defaultContent) {
			await fs.writeFile(filePath, defaultContent, 'utf-8');
		}
		return defaultContent;
	}
}

// GET - Read all prompts from files
export const GET: RequestHandler = async ({ cookies, url }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		await ensurePromptsDir();

		const category = url.searchParams.get('category');

		// If category specified, return only that category's prompts
		if (category && DEFAULT_PROMPTS[category]) {
			const prompts: Record<string, string> = {};
			for (const name of Object.keys(DEFAULT_PROMPTS[category])) {
				prompts[name] = await readPromptFile(category, name);
			}
			return json({ prompts, category });
		}

		// Return all prompts organized by category
		const allPrompts: Record<string, Record<string, string>> = {};
		for (const cat of Object.keys(DEFAULT_PROMPTS)) {
			allPrompts[cat] = {};
			for (const name of Object.keys(DEFAULT_PROMPTS[cat])) {
				allPrompts[cat][name] = await readPromptFile(cat, name);
			}
		}

		return json({ prompts: allPrompts });
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
		const { category, name, content } = await request.json();

		if (!category || !DEFAULT_PROMPTS[category]) {
			return json({ error: 'Invalid prompt category' }, { status: 400 });
		}

		if (!name || !DEFAULT_PROMPTS[category].hasOwnProperty(name)) {
			return json({ error: 'Invalid prompt name' }, { status: 400 });
		}

		await ensurePromptsDir();
		const key = getPromptKey(category, name);
		const filePath = path.join(PROMPTS_DIR, `${key}.txt`);
		await fs.writeFile(filePath, content || DEFAULT_PROMPTS[category][name], 'utf-8');

		return json({ success: true, file: `${key}.txt` });
	} catch (error) {
		console.error('Failed to save prompt:', error);
		return json({ error: 'Failed to save prompt' }, { status: 500 });
	}
};
