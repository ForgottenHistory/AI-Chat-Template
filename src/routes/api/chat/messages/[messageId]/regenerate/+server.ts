import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { messages, conversations, characters, llmSettings } from '$lib/server/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { generateChatCompletion } from '$lib/server/llm';
import { emitTyping } from '$lib/server/socket';

// POST - Regenerate a message (create new swipe variant)
export const POST: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const messageId = parseInt(params.messageId);
	if (isNaN(messageId)) {
		return json({ error: 'Invalid message ID' }, { status: 400 });
	}

	try {
		// Get the message and verify ownership
		const [messageData] = await db
			.select({
				message: messages,
				conversation: conversations
			})
			.from(messages)
			.innerJoin(conversations, eq(messages.conversationId, conversations.id))
			.where(and(
				eq(messages.id, messageId),
				eq(conversations.userId, parseInt(userId))
			))
			.limit(1);

		if (!messageData) {
			return json({ error: 'Message not found' }, { status: 404 });
		}

		const { message, conversation } = messageData;

		// Only allow regenerating assistant messages
		if (message.role !== 'assistant') {
			return json({ error: 'Can only regenerate assistant messages' }, { status: 400 });
		}

		// Get character
		const [character] = await db
			.select()
			.from(characters)
			.where(eq(characters.id, conversation.characterId))
			.limit(1);

		if (!character) {
			return json({ error: 'Character not found' }, { status: 404 });
		}

		// Get conversation history up to this message
		const conversationHistory = await db
			.select()
			.from(messages)
			.where(and(
				eq(messages.conversationId, conversation.id),
				lt(messages.id, messageId)
			))
			.orderBy(messages.createdAt);

		// Get LLM settings
		const [settings] = await db
			.select()
			.from(llmSettings)
			.where(eq(llmSettings.userId, parseInt(userId)))
			.limit(1);

		if (!settings) {
			return json({ error: 'LLM settings not found' }, { status: 404 });
		}

		// Emit typing indicator
		emitTyping(conversation.id, true);

		// Generate new response
		const newContent = await generateChatCompletion(
			conversationHistory,
			character,
			settings,
			undefined, // no custom template
			'swipe' // message type for logging
		);

		// Parse existing swipes
		const swipes = message.swipes ? JSON.parse(message.swipes) : [message.content];

		// Add new variant to swipes
		swipes.push(newContent);

		// Stop typing indicator
		emitTyping(conversation.id, false);

		// Update message with new swipe
		await db
			.update(messages)
			.set({
				swipes: JSON.stringify(swipes),
				currentSwipe: swipes.length - 1,
				content: newContent
			})
			.where(eq(messages.id, messageId));

		return json({ success: true, content: newContent, swipeCount: swipes.length });
	} catch (error) {
		console.error('Failed to regenerate message:', error);
		return json({ error: 'Failed to regenerate message' }, { status: 500 });
	}
};
