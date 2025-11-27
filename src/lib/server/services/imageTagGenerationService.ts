import { imageLlmSettingsService } from './imageLlmSettingsService';
import { queueService } from './queueService';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';

const TAG_LIBRARY_DIR = 'data';
const PROMPTS_DIR = 'data/prompts';

class ImageTagGenerationService {
	private tagLibraryCache: Map<string, string> = new Map();
	private generatePromptCache: string | null = null;

	/**
	 * Load image generate prompt from file
	 */
	async loadGeneratePrompt(): Promise<string> {
		if (this.generatePromptCache) {
			return this.generatePromptCache;
		}

		try {
			const content = await fs.readFile(path.join(PROMPTS_DIR, 'image_generate.txt'), 'utf-8');
			this.generatePromptCache = content.trim();
			return this.generatePromptCache;
		} catch (error) {
			console.error('Failed to load image generate prompt, using default:', error);
			return 'Select appropriate Danbooru tags based on the conversation context. Output ONLY comma-separated tags.';
		}
	}

	/**
	 * Clear prompts cache (call when prompts are updated)
	 */
	clearPromptsCache() {
		this.generatePromptCache = null;
	}

	/**
	 * Load tag library for a user
	 */
	async loadTagLibrary(userId: number): Promise<string> {
		const cacheKey = `user_${userId}`;

		// Check cache first
		if (this.tagLibraryCache.has(cacheKey)) {
			return this.tagLibraryCache.get(cacheKey)!;
		}

		try {
			const filePath = path.join(TAG_LIBRARY_DIR, `tags_${userId}.txt`);
			const content = await fs.readFile(filePath, 'utf-8');
			this.tagLibraryCache.set(cacheKey, content);
			return content;
		} catch (error) {
			console.log('No tag library found for user, using empty');
			return '';
		}
	}

	/**
	 * Clear tag library cache for a user (call when tags are updated)
	 */
	clearCache(userId: number) {
		this.tagLibraryCache.delete(`user_${userId}`);
	}

	/**
	 * Generate image tags using the Image LLM
	 */
	async generateTags({
		userId,
		conversationContext,
		characterTags = '',
		characterName = ''
	}: {
		userId: number;
		conversationContext: string;
		characterTags?: string;
		characterName?: string;
	}): Promise<string> {
		try {
			console.log('🎨 Generating image tags from conversation context...');

			// Get user's Image LLM settings
			const settings = await imageLlmSettingsService.getUserSettings(userId);
			console.log(`🎨 Using Image LLM settings:`, {
				provider: settings.provider,
				model: settings.model,
				temperature: settings.temperature
			});

			// Load prompt and tag library
			const [generatePrompt, tagLibrary] = await Promise.all([
				this.loadGeneratePrompt(),
				this.loadTagLibrary(userId)
			]);

			// Build prompt
			const prompt = this.buildTagGenerationPrompt({
				conversationContext,
				characterTags,
				characterName,
				tagLibrary,
				generatePrompt
			});

			// Call LLM directly with Image LLM settings
			const response = await this.callImageLLM({
				messages: [
					{ role: 'user', content: prompt }
				],
				settings
			});

			const generatedTags = response.trim();
			console.log('🤖 LLM generated tags:', generatedTags);

			return generatedTags;
		} catch (error: any) {
			console.error('❌ Failed to generate image tags:', error.message);
			return '';
		}
	}

	/**
	 * Call Image LLM with specific settings
	 */
	private async callImageLLM({
		messages,
		settings
	}: {
		messages: { role: string; content: string }[];
		settings: any;
	}): Promise<string> {
		const requestBody = {
			model: settings.model,
			messages,
			temperature: settings.temperature,
			max_tokens: settings.maxTokens,
			top_p: settings.topP,
			frequency_penalty: settings.frequencyPenalty,
			presence_penalty: settings.presencePenalty
		};

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

	/**
	 * Build the prompt for tag generation
	 */
	private buildTagGenerationPrompt({
		conversationContext,
		characterTags,
		characterName,
		tagLibrary,
		generatePrompt
	}: {
		conversationContext: string;
		characterTags: string;
		characterName: string;
		tagLibrary: string;
		generatePrompt: string;
	}): string {
		let prompt = '';

		if (tagLibrary) {
			prompt += `Here is the library of valid Danbooru tags you can choose from:

${tagLibrary}

---

`;
		}

		if (characterTags) {
			prompt += `Character-specific tags for ${characterName || 'this character'} (you MAY include these if relevant):
${characterTags}

---

`;
		}

		prompt += `Recent conversation:
${conversationContext}

---

Based on the conversation, select appropriate Danbooru tags.

${generatePrompt}

Your selected tags:`;

		return prompt;
	}
}

export const imageTagGenerationService = new ImageTagGenerationService();
