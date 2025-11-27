import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import axios from 'axios';
import { OPENROUTER_API_KEY } from '$env/static/private';

export const GET: RequestHandler = async () => {
	try {
		// Fetch models from OpenRouter
		const response = await axios.get('https://openrouter.ai/api/v1/models', {
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`
			}
		});

		// Transform to simpler format
		const models = response.data.data.map((model: any) => ({
			id: model.id,
			name: model.name,
			description: model.description || '',
			contextLength: model.context_length,
			pricing: model.pricing
		}));

		return json({ models });
	} catch (error: any) {
		console.error('Failed to fetch models:', error);
		return json(
			{
				error: 'Failed to fetch models',
				models: []
			},
			{ status: 500 }
		);
	}
};
