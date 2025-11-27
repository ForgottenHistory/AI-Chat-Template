import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { promptTemplates } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT - Update prompt template
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const templateId = parseInt(params.id);
	if (isNaN(templateId)) {
		return json({ error: 'Invalid template ID' }, { status: 400 });
	}

	try {
		const { name, description, content } = await request.json();

		// Verify ownership
		const [existing] = await db
			.select()
			.from(promptTemplates)
			.where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.userId, parseInt(userId))))
			.limit(1);

		if (!existing) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		const [updated] = await db
			.update(promptTemplates)
			.set({
				name: name !== undefined ? name : existing.name,
				description: description !== undefined ? description : existing.description,
				content: content !== undefined ? content : existing.content,
				updatedAt: new Date()
			})
			.where(eq(promptTemplates.id, templateId))
			.returning();

		return json({ template: updated });
	} catch (error) {
		console.error('Failed to update prompt template:', error);
		return json({ error: 'Failed to update template' }, { status: 500 });
	}
};

// DELETE - Delete prompt template
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const templateId = parseInt(params.id);
	if (isNaN(templateId)) {
		return json({ error: 'Invalid template ID' }, { status: 400 });
	}

	try {
		// Verify ownership
		const [existing] = await db
			.select()
			.from(promptTemplates)
			.where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.userId, parseInt(userId))))
			.limit(1);

		if (!existing) {
			return json({ error: 'Template not found' }, { status: 404 });
		}

		await db.delete(promptTemplates).where(eq(promptTemplates.id, templateId));

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete prompt template:', error);
		return json({ error: 'Failed to delete template' }, { status: 500 });
	}
};
