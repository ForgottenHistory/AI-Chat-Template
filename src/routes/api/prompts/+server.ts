import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { promptTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch all prompt templates for user
export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const templates = await db
			.select()
			.from(promptTemplates)
			.where(eq(promptTemplates.userId, parseInt(userId)))
			.orderBy(promptTemplates.createdAt);

		return json({ templates });
	} catch (error) {
		console.error('Failed to fetch prompt templates:', error);
		return json({ error: 'Failed to fetch templates' }, { status: 500 });
	}
};

// POST - Create new prompt template
export const POST: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { name, description, content } = await request.json();

		if (!name || !content) {
			return json({ error: 'Name and content are required' }, { status: 400 });
		}

		const [template] = await db
			.insert(promptTemplates)
			.values({
				userId: parseInt(userId),
				name,
				description: description || null,
				content
			})
			.returning();

		return json({ template }, { status: 201 });
	} catch (error) {
		console.error('Failed to create prompt template:', error);
		return json({ error: 'Failed to create template' }, { status: 500 });
	}
};
