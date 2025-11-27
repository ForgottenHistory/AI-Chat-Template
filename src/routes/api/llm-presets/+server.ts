import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { llmPresets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch all LLM presets for user
export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const presets = await db
			.select()
			.from(llmPresets)
			.where(eq(llmPresets.userId, parseInt(userId)))
			.orderBy(llmPresets.createdAt);

		return json({ presets });
	} catch (error) {
		console.error('Failed to fetch LLM presets:', error);
		return json({ error: 'Failed to fetch presets' }, { status: 500 });
	}
};

// POST - Create new LLM preset
export const POST: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const {
			name,
			provider,
			model,
			temperature,
			maxTokens,
			topP,
			frequencyPenalty,
			presencePenalty,
			contextWindow
		} = await request.json();

		if (!name) {
			return json({ error: 'Preset name is required' }, { status: 400 });
		}

		const [preset] = await db
			.insert(llmPresets)
			.values({
				userId: parseInt(userId),
				name,
				provider,
				model,
				temperature,
				maxTokens,
				topP,
				frequencyPenalty,
				presencePenalty,
				contextWindow
			})
			.returning();

		return json({ preset }, { status: 201 });
	} catch (error) {
		console.error('Failed to create LLM preset:', error);
		return json({ error: 'Failed to create preset' }, { status: 500 });
	}
};
