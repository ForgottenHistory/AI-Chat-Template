import { queueService } from './queueService';
import { llmLogService } from './llmLogService';
import axios from 'axios';
import { env } from '$env/dynamic/private';

interface LlmCallParams {
	messages: { role: string; content: string }[];
	settings: {
		provider: string;
		model: string;
		temperature: number;
		maxTokens: number;
		topP: number;
		frequencyPenalty: number;
		presencePenalty: number;
		reasoningEnabled?: boolean;
	};
	logType: string;
	logCharacterName?: string;
	logUserName?: string;
	timeout?: number;
}

interface LlmCallResult {
	content: string;
	rawContent: string;
	model: string;
	usage: any;
}

/**
 * Shared LLM call function used by all LLM services
 * Handles: request building, reasoning parameter, queueing, response processing, logging, error handling
 */
export async function callLlm({
	messages,
	settings,
	logType,
	logCharacterName = 'LLM',
	logUserName = 'System',
	timeout = 120000
}: LlmCallParams): Promise<LlmCallResult> {
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

	// Log prompt
	const logId = llmLogService.savePromptLog(
		messages as Array<{ role: string; content: string }>,
		logType,
		logCharacterName,
		logUserName
	);

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
				timeout
			}
		);
	});

	const rawContent = response.data.choices[0].message.content || '';
	let content = rawContent;

	// Strip any <think></think> tags
	content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
	content = content.replace(/<\/?think>/gi, '').trim();

	// Log response
	llmLogService.saveResponseLog(
		content,
		rawContent,
		logType,
		logId,
		response.data
	);

	// Check if model returned empty content (e.g., used all tokens on reasoning)
	if (!content) {
		const reasoningTokens = response.data.usage?.completion_tokens_details?.reasoning_tokens;
		if (reasoningTokens) {
			throw new Error(`Model used ${reasoningTokens} tokens on reasoning but produced no output. Try increasing max tokens in settings.`);
		}
		throw new Error('Model returned empty response');
	}

	return {
		content,
		rawContent,
		model: response.data.model,
		usage: response.data.usage
	};
}
