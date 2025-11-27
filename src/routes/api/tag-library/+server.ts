import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tagLibrary } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');

	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const userIdInt = parseInt(userId);

		// Get or create tag library for user
		let library = await db.query.tagLibrary.findFirst({
			where: eq(tagLibrary.userId, userIdInt)
		});

		if (!library) {
			// Create default tag library
			const [newLibrary] = await db
				.insert(tagLibrary)
				.values({
					userId: userIdInt,
					content: '',
					updatedAt: new Date()
				})
				.returning();
			library = newLibrary;
		}

		return json(library);
	} catch (error) {
		console.error('Error fetching tag library:', error);
		return json({ error: 'Failed to fetch tag library' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');

	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const userIdInt = parseInt(userId);
		const { content } = await request.json();

		if (typeof content !== 'string') {
			return json({ error: 'Invalid content' }, { status: 400 });
		}

		// Check if library exists
		const existing = await db.query.tagLibrary.findFirst({
			where: eq(tagLibrary.userId, userIdInt)
		});

		let library;
		if (existing) {
			// Update existing
			[library] = await db
				.update(tagLibrary)
				.set({
					content,
					updatedAt: new Date()
				})
				.where(eq(tagLibrary.userId, userIdInt))
				.returning();
		} else {
			// Create new
			[library] = await db
				.insert(tagLibrary)
				.values({
					userId: userIdInt,
					content,
					updatedAt: new Date()
				})
				.returning();
		}

		return json(library);
	} catch (error) {
		console.error('Error updating tag library:', error);
		return json({ error: 'Failed to update tag library' }, { status: 500 });
	}
};
