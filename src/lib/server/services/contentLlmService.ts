import { contentLlmSettingsService } from './contentLlmSettingsService';
import { queueService } from './queueService';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';

const PROMPTS_DIR = 'data/prompts';

export type ContentType = 'description' | 'personality' | 'scenario' | 'message_example' | 'greeting';

class ContentLlmService {
	private promptCache: Map<ContentType, string> = new Map();

	/**
	 * Load a content prompt from file
	 */
	async loadPrompt(type: ContentType): Promise<string> {
		if (this.promptCache.has(type)) {
			return this.promptCache.get(type)!;
		}

		try {
			const content = await fs.readFile(path.join(PROMPTS_DIR, `content_${type}.txt`), 'utf-8');
			this.promptCache.set(type, content.trim());
			return this.promptCache.get(type)!;
		} catch (error) {
			console.error(`Failed to load content prompt for ${type}, using default:`, error);
			return `Rewrite the following ${type.replace('_', ' ')} to be clean and well-formatted:\n\n{{input}}\n\nRewritten:`;
		}
	}

	/**
	 * Clear prompt cache (call when prompts are updated)
	 */
	clearPromptCache(type?: ContentType) {
		if (type) {
			this.promptCache.delete(type);
		} else {
			this.promptCache.clear();
		}
	}

	/**
	 * Rewrite character metadata using Content LLM
	 */
	async rewriteContent({
		userId,
		type,
		input
	}: {
		userId: number;
		type: ContentType;
		input: string;
	}): Promise<string> {
		try {
			console.log(`📝 Content LLM rewriting ${type}...`);

			// Get user's Content LLM settings
			const settings = await contentLlmSettingsService.getUserSettings(userId);
			console.log(`📝 Using Content LLM settings:`, {
				provider: settings.provider,
				model: settings.model,
				temperature: settings.temperature
			});

			// Load prompt template
			const promptTemplate = await this.loadPrompt(type);

			// Replace {{input}} placeholder
			const prompt = promptTemplate.replace('{{input}}', input);

			// Call LLM
			const response = await this.callContentLLM({
				messages: [{ role: 'user', content: prompt }],
				settings
			});

			console.log(`📝 Content LLM finished rewriting ${type}`);
			return response.trim();
		} catch (error: any) {
			console.error(`❌ Content LLM failed to rewrite ${type}:`, error.message);
			throw error;
		}
	}

	/**
	 * Call Content LLM with specific settings
	 */
	private async callContentLLM({
		messages,
		settings
	}: {
		messages: { role: string; content: string }[];
		settings: any;
	}): Promise<string> {
		const requestBody: any = {
			model: settings.model,
			messages,
			temperature: settings.temperature,
			max_tokens: settings.maxTokens,
			top_p: settings.topP,
			frequency_penalty: settings.frequencyPenalty,
			presence_penalty: settings.presencePenalty
		};

		// Add reasoning parameter if enabled
		if (settings.reasoningEnabled) {
			requestBody.reasoning = {
				enabled: true
			};
		}

		const response = await queueService.enqueue(settings.provider, async () => {
			return await axios.post(
				'https://openrouter.ai/api/v1/chat/completions',
				requestBody,
				{
					headers: {
						Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
						'Content-Type': 'application/json',
						'HTTP-Referer': 'https://localhost:5173',
						'X-Title': 'AI-Chat-Template'
					},
					timeout: 120000
				}
			);
		});

		let content = response.data.choices[0].message.content;
		// Strip any <think></think> tags
		content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
		content = content.replace(/<\/?think>/gi, '').trim();

		return content;
	}
}

export const contentLlmService = new ContentLlmService();
