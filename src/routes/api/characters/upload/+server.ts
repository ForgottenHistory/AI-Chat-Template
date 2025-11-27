import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { characters, promptTemplates } from '$lib/server/db/schema';
import { characterImageParser } from '$lib/utils/characterImageParser';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const userId = cookies.get('userId');

		if (!userId) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const formData = await request.formData();
		const files = formData.getAll('files') as File[];
		const importSystemPrompts = formData.get('importSystemPrompts') === 'true';

		if (!files || files.length === 0) {
			return json({ error: 'No files provided' }, { status: 400 });
		}

		const results = {
			success: [] as any[],
			failed: [] as any[]
		};

		for (const file of files) {
			try {
				// Extract character data from PNG
				const cardData = await characterImageParser.extractFromPNG(file);

				if (!cardData) {
					results.failed.push({
						filename: file.name,
						error: 'Not a valid character card'
					});
					continue;
				}

				// Extract basic info for display (full card data is preserved in cardData field)
				const name = cardData.data?.name || 'Unknown';
				const description = cardData.data?.description || '';
				const tags = cardData.data?.tags || [];

				// Convert image to base64
				const arrayBuffer = await file.arrayBuffer();
				const base64 = Buffer.from(arrayBuffer).toString('base64');
				const imageData = `data:image/png;base64,${base64}`;

				// Store in database
				const newChar = await db
					.insert(characters)
					.values({
						userId: parseInt(userId),
						name,
						description,
						tags: JSON.stringify(tags),
						imageData,
						cardData: JSON.stringify(cardData)
					})
					.returning();

				results.success.push({
					filename: file.name,
					character: newChar[0]
				});

				// Create prompt template from system_prompt if checkbox is enabled
				if (importSystemPrompts && cardData.data?.system_prompt) {
					try {
						await db.insert(promptTemplates).values({
							userId: parseInt(userId),
							name: `${name} - System Prompt`,
							description: `System prompt from ${name} character card`,
							content: cardData.data.system_prompt
						});
					} catch (templateError) {
						console.warn('Failed to create prompt template:', templateError);
						// Don't fail the entire import if template creation fails
					}
				}
			} catch (error: any) {
				console.error(`Failed to process ${file.name}:`, error);
				results.failed.push({
					filename: file.name,
					error: error.message || 'Processing failed'
				});
			}
		}

		return json(results);
	} catch (error: any) {
		console.error('Upload error:', error);
		return json({ error: 'Upload failed' }, { status: 500 });
	}
};
