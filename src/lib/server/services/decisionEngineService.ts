import { decisionEngineSettingsService } from './decisionEngineSettingsService';
import { queueService } from './queueService';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';

const PROMPTS_DIR = 'data/prompts';

export interface DecisionResult {
	send_image: boolean;
	reason: string;
}

class DecisionEngineService {
	private promptCache: string | null = null;

	/**
	 * Load decision prompt from file
	 */
	async loadPrompt(): Promise<string> {
		if (this.promptCache) {
			return this.promptCache;
		}

		try {
			const content = await fs.readFile(path.join(PROMPTS_DIR, 'decision_system.txt'), 'utf-8');
			this.promptCache = content.trim();
			return this.promptCache;
		} catch (error) {
			console.error('Failed to load decision prompt, using default:', error);
			return 'Analyze the conversation and decide if an image should be sent. Respond with send_image: true/false';
		}
	}

	/**
	 * Clear prompt cache (call when prompts are updated)
	 */
	clearPromptCache() {
		this.promptCache = null;
	}

	/**
	 * Analyze conversation and make a decision about sending an image
	 */
	async analyzeForImageDecision({
		userId,
		conversationContext,
		lastImageTimestamp
	}: {
		userId: number;
		conversationContext: string;
		lastImageTimestamp?: Date | null;
	}): Promise<DecisionResult> {
		try {
			console.log('🧠 Decision Engine analyzing conversation...');

			// Get user's Decision LLM settings
			const settings = await decisionEngineSettingsService.getUserSettings(userId);
			console.log(`🧠 Using Decision LLM settings:`, {
				provider: settings.provider,
				model: settings.model,
				temperature: settings.temperature
			});

			// Load prompt
			const systemPrompt = await this.loadPrompt();

			// Build context with timing info
			let contextInfo = '';
			if (lastImageTimestamp) {
				const timeSinceLastImage = Date.now() - lastImageTimestamp.getTime();
				const minutesSinceLastImage = Math.floor(timeSinceLastImage / 60000);
				contextInfo = `\n\nTime since last image: ${minutesSinceLastImage} minutes`;
			} else {
				contextInfo = '\n\nNo images have been sent in this conversation yet.';
			}

			const userPrompt = `Recent conversation:
${conversationContext}
${contextInfo}

Analyze and respond with your decision:`;

			// Call LLM
			const response = await this.callDecisionLLM({
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				],
				settings
			});

			// Parse response
			const result = this.parseDecisionResponse(response);
			console.log('🧠 Decision result:', result);

			return result;
		} catch (error: any) {
			console.error('❌ Decision Engine failed:', error.message);
			return {
				send_image: false,
				reason: 'Decision engine error'
			};
		}
	}

	/**
	 * Call Decision LLM with specific settings
	 */
	private async callDecisionLLM({
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
					timeout: 30000
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
	 * Parse key-value response from LLM
	 */
	private parseDecisionResponse(response: string): DecisionResult {
		const result: DecisionResult = {
			send_image: false,
			reason: ''
		};

		// Parse key: value pairs
		const lines = response.split('\n');
		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(.+)$/i);
			if (match) {
				const [, key, value] = match;
				const keyLower = key.toLowerCase();

				if (keyLower === 'send_image') {
					result.send_image = value.toLowerCase().trim() === 'true';
				} else if (keyLower === 'reason') {
					result.reason = value.trim();
				}
			}
		}

		return result;
	}
}

export const decisionEngineService = new DecisionEngineService();
