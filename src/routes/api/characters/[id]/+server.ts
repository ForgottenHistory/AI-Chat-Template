import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { characters } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Get single character
export const GET: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const characterId = parseInt(params.id);
	if (isNaN(characterId)) {
		return json({ error: 'Invalid character ID' }, { status: 400 });
	}

	try {
		const [character] = await db
			.select()
			.from(characters)
			.where(and(eq(characters.id, characterId), eq(characters.userId, parseInt(userId))))
			.limit(1);

		if (!character) {
			return json({ error: 'Character not found' }, { status: 404 });
		}

		return json({ character });
	} catch (error) {
		console.error('Failed to fetch character:', error);
		return json({ error: 'Failed to fetch character' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	try {
		const userId = cookies.get('userId');

		if (!userId) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const characterId = parseInt(params.id);

		// Delete only if it belongs to the user
		await db
			.delete(characters)
			.where(and(eq(characters.id, characterId), eq(characters.userId, parseInt(userId))));

		return json({ success: true });
	} catch (error: any) {
		console.error('Failed to delete character:', error);
		return json({ error: 'Failed to delete character' }, { status: 500 });
	}
};
