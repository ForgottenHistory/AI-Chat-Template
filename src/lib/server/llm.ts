import { llmService } from './services/llmService';
import { llmLogService } from './services/llmLogService';
import { logger } from './utils/logger';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import type { Message, Character, LlmSettings } from './db/schema';
import fs from 'fs/promises';
import path from 'path';

/**
 * Default system prompt used when file doesn't exist
 */
const DEFAULT_SYSTEM_PROMPT = `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`;

const SYSTEM_PROMPT_FILE = path.join(process.cwd(), 'data', 'prompts', 'system.txt');

/**
 * Load system prompt from file
 */
async function loadSystemPromptFromFile(): Promise<string> {
	try {
		return await fs.readFile(SYSTEM_PROMPT_FILE, 'utf-8');
	} catch (error) {
		// File doesn't exist, return default
		return DEFAULT_SYSTEM_PROMPT;
	}
}

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(
	template: string,
	variables: {
		char: string;
		user: string;
		personality: string;
		scenario: string;
		description: string;
	}
): string {
	return template
		.replace(/\{\{char\}\}/g, variables.char)
		.replace(/\{\{user\}\}/g, variables.user)
		.replace(/\{\{personality\}\}/g, variables.personality)
		.replace(/\{\{scenario\}\}/g, variables.scenario)
		.replace(/\{\{description\}\}/g, variables.description);
}

/**
 * Generate a chat completion for a character conversation
 * @param conversationHistory - Array of previous messages in the conversation
 * @param character - Character card data
 * @param settings - User's LLM settings
 * @param messageType - Type of message for logging ('chat', 'regenerate', 'swipe')
 * @returns Generated assistant message content
 */
export async function generateChatCompletion(
	conversationHistory: Message[],
	character: Character,
	settings: LlmSettings,
	messageType: string = 'chat'
): Promise<string> {
	// Parse character card data
	let characterData: any = {};
	try {
		characterData = JSON.parse(character.cardData);
		// Handle both v1 and v2 character card formats
		if (characterData.data) {
			characterData = characterData.data;
		}
	} catch (error) {
		console.error('Failed to parse character card data:', error);
		throw new Error('Invalid character card data');
	}

	// Get user display name
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, settings.userId))
		.limit(1);

	const userName = user?.displayName || user?.username || 'User';

	// Load system prompt from file
	const basePrompt = await loadSystemPromptFromFile();

	// Prepare template variables
	const templateVariables = {
		char: character.name || 'Character',
		user: userName,
		personality: characterData.personality || '',
		scenario: characterData.scenario || '',
		description: characterData.description || ''
	};

	// Replace variables in template
	const systemPrompt = replaceTemplateVariables(basePrompt, templateVariables);

	// Add example dialogues if present (after template)
	let finalSystemPrompt = systemPrompt;
	if (characterData.mes_example) {
		finalSystemPrompt += `\n\nExample Dialogue:\n${characterData.mes_example}`;
	}

	// Add custom system prompt if present (after everything)
	if (characterData.system_prompt) {
		finalSystemPrompt += `\n\n${characterData.system_prompt}`;
	}

	// Format conversation history for LLM
	const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

	// Add system prompt
	formattedMessages.push({
		role: 'system',
		content: finalSystemPrompt.trim()
	});

	// Add conversation history
	for (const msg of conversationHistory) {
		formattedMessages.push({
			role: msg.role as 'user' | 'assistant',
			content: msg.content
		});
	}

	// Log prompt for debugging (keep last 5 per type)
	const logId = llmLogService.savePromptLog(
		formattedMessages,
		messageType,
		character.name || 'Character',
		userName
	);

	logger.info(`Generating ${messageType} completion`, {
		character: character.name,
		user: userName,
		model: settings.model,
		messageCount: formattedMessages.length
	});

	// Call LLM service with user settings
	const response = await llmService.createChatCompletion({
		messages: formattedMessages,
		userId: settings.userId,
		model: settings.model,
		temperature: settings.temperature,
		maxTokens: settings.maxTokens
	});

	logger.success(`Generated ${messageType} completion`, {
		character: character.name,
		model: response.model,
		contentLength: response.content.length,
		tokensUsed: response.usage?.total_tokens
	});

	// Log response for debugging (matching ID to prompt)
	llmLogService.saveResponseLog(response.content, response.content, messageType, logId, response);

	return response.content;
}
