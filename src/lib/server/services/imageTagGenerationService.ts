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
	private promptsCache: {
		character: string | null;
		user: string | null;
		scene: string | null;
	} = { character: null, user: null, scene: null };

	/**
	 * Load image prompts from files
	 */
	async loadPrompts(): Promise<{ character: string; user: string; scene: string }> {
		const defaults = {
			character: 'Generate Danbooru tags for the character. Focus on expression, pose, clothing with colors. Output ONLY comma-separated tags.',
			user: 'Generate Danbooru tags for user presence/POV. Output "none" if user not visible. Output ONLY comma-separated tags.',
			scene: 'Generate Danbooru tags for the scene. Include composition tag (close-up, upper body, etc.), location, lighting. Output ONLY comma-separated tags.'
		};

		const loadPrompt = async (name: 'character' | 'user' | 'scene'): Promise<string> => {
			if (this.promptsCache[name]) {
				return this.promptsCache[name]!;
			}
			try {
				const content = await fs.readFile(path.join(PROMPTS_DIR, `image_${name}.txt`), 'utf-8');
				this.promptsCache[name] = content.trim();
				return this.promptsCache[name]!;
			} catch (error) {
				console.error(`Failed to load image_${name}.txt, using default:`, error);
				return defaults[name];
			}
		};

		const [character, user, scene] = await Promise.all([
			loadPrompt('character'),
			loadPrompt('user'),
			loadPrompt('scene')
		]);

		return { character, user, scene };
	}

	/**
	 * Clear prompts cache (call when prompts are updated)
	 */
	clearPromptsCache() {
		this.promptsCache = { character: null, user: null, scene: null };
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
	 * Can generate all tags or specific types (character, user, scene)
	 * @param type - Which tags to generate: 'all', 'character', 'user', or 'scene'
	 * @param imageTags - Always included tags (character appearance - hair, eyes, body)
	 * @param contextualTags - Character-specific tags the AI can choose from
	 */
	async generateTags({
		userId,
		conversationContext,
		characterName = '',
		imageTags = '',
		contextualTags = '',
		type = 'all'
	}: {
		userId: number;
		conversationContext: string;
		characterName?: string;
		imageTags?: string;
		contextualTags?: string;
		type?: 'all' | 'character' | 'user' | 'scene';
	}): Promise<{ generatedTags: string; alwaysTags: string; breakdown?: { character?: string; user?: string; scene?: string } }> {
		try {
			console.log(`🎨 Generating image tags (${type}) from conversation context...`);

			// Get user's Image LLM settings
			const settings = await imageLlmSettingsService.getUserSettings(userId);
			console.log(`🎨 Using Image LLM settings:`, {
				provider: settings.provider,
				model: settings.model,
				temperature: settings.temperature
			});

			// Load prompts and tag library
			const [prompts, tagLibrary] = await Promise.all([
				this.loadPrompts(),
				this.loadTagLibrary(userId)
			]);

			// Build base context for all prompts
			const baseContext = this.buildBaseContext({
				conversationContext,
				characterTags: contextualTags,
				characterName,
				tagLibrary
			});

			const breakdown: { character?: string; user?: string; scene?: string } = {};

			// Generate tags based on type
			if (type === 'all') {
				// Make three parallel LLM calls for character, user, and scene
				const [characterTags, userTags, sceneTags] = await Promise.all([
					this.callImageLLM({
						messages: [{ role: 'user', content: `${baseContext}\n\n${prompts.character}\n\nYour selected tags:` }],
						settings
					}),
					this.callImageLLM({
						messages: [{ role: 'user', content: `${baseContext}\n\n${prompts.user}\n\nYour selected tags:` }],
						settings
					}),
					this.callImageLLM({
						messages: [{ role: 'user', content: `${baseContext}\n\n${prompts.scene}\n\nYour selected tags:` }],
						settings
					})
				]);

				breakdown.character = characterTags.trim();
				breakdown.user = userTags.trim();
				breakdown.scene = sceneTags.trim();

				console.log('🤖 Character tags:', breakdown.character);
				console.log('🤖 User tags:', breakdown.user);
				console.log('🤖 Scene tags:', breakdown.scene);
			} else {
				// Generate only the requested type
				const tags = await this.callImageLLM({
					messages: [{ role: 'user', content: `${baseContext}\n\n${prompts[type]}\n\nYour selected tags:` }],
					settings
				});
				breakdown[type] = tags.trim();
				console.log(`🤖 ${type} tags:`, breakdown[type]);
			}

			// Combine all generated tags, filtering out "none" responses
			const allTags = Object.values(breakdown)
				.filter((tags): tags is string => !!tags && tags.toLowerCase() !== 'none' && tags.length > 0)
				.join(', ');

			console.log('🎨 Combined generated tags:', allTags);
			console.log('🎨 Always included tags:', imageTags);

			return {
				generatedTags: allTags,
				alwaysTags: imageTags, // These are always included in the final prompt
				breakdown
			};
		} catch (error: any) {
			console.error('❌ Failed to generate image tags:', error.message);
			return { generatedTags: '', alwaysTags: imageTags };
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
	 * Build the base context shared by all three tag generation prompts
	 */
	private buildBaseContext({
		conversationContext,
		characterTags,
		characterName,
		tagLibrary
	}: {
		conversationContext: string;
		characterTags: string;
		characterName: string;
		tagLibrary: string;
	}): string {
		let context = '';

		if (tagLibrary) {
			context += `Here is the library of valid Danbooru tags you can choose from:

${tagLibrary}

---

`;
		}

		if (characterTags) {
			context += `Character-specific tags for ${characterName || 'this character'} (you MAY include these if relevant):
${characterTags}

---

`;
		}

		context += `Recent conversation:
${conversationContext}

---

Based on the conversation, select appropriate Danbooru tags.`;

		return context;
	}
}

export const imageTagGenerationService = new ImageTagGenerationService();
