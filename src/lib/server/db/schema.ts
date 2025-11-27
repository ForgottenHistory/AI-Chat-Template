import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').unique().notNull(),
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	bio: text('bio'),
	avatarData: text('avatar_data'), // Base64 image data
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const llmSettings = sqliteTable('llm_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'), // 'openrouter', 'featherless', etc.
	model: text('model').notNull().default('anthropic/claude-3.5-sonnet'),
	temperature: real('temperature').notNull().default(0.7),
	maxTokens: integer('max_tokens').notNull().default(500),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(8000)
});

export const decisionEngineSettings = sqliteTable('decision_engine_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'),
	model: text('model').notNull().default('anthropic/claude-3.5-sonnet'),
	temperature: real('temperature').notNull().default(0.3),
	maxTokens: integer('max_tokens').notNull().default(200),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(4000)
});

export const contentLlmSettings = sqliteTable('content_llm_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'),
	model: text('model').notNull().default('anthropic/claude-3.5-sonnet'),
	temperature: real('temperature').notNull().default(0.8),
	maxTokens: integer('max_tokens').notNull().default(2000),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(16000)
});

export const imageLlmSettings = sqliteTable('image_llm_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'),
	model: text('model').notNull().default('openai/dall-e-3'),
	temperature: real('temperature').notNull().default(1.0),
	maxTokens: integer('max_tokens').notNull().default(1000),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(4000)
});

export const sdSettings = sqliteTable('sd_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	mainPrompt: text('main_prompt').notNull().default('masterpiece, best quality, amazing quality, 1girl, solo'),
	negativePrompt: text('negative_prompt').notNull().default('lowres, bad anatomy, bad hands, text, error, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, speech bubble, multiple views'),
	model: text('model').notNull().default(''),
	steps: integer('steps').notNull().default(30),
	cfgScale: real('cfg_scale').notNull().default(7.0),
	sampler: text('sampler').notNull().default('DPM++ 2M'),
	scheduler: text('scheduler').notNull().default('Karras'),
	enableHr: integer('enable_hr', { mode: 'boolean' }).notNull().default(true),
	hrScale: real('hr_scale').notNull().default(1.5),
	hrUpscaler: text('hr_upscaler').notNull().default('Latent'),
	hrSteps: integer('hr_steps').notNull().default(15),
	hrCfg: real('hr_cfg').notNull().default(5.0),
	denoisingStrength: real('denoising_strength').notNull().default(0.7),
	enableAdetailer: integer('enable_adetailer', { mode: 'boolean' }).notNull().default(false),
	adetailerModel: text('adetailer_model').notNull().default('face_yolov8n.pt')
});

export const llmPresets = sqliteTable('llm_presets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	temperature: real('temperature').notNull(),
	maxTokens: integer('max_tokens').notNull(),
	topP: real('top_p').notNull(),
	frequencyPenalty: real('frequency_penalty').notNull(),
	presencePenalty: real('presence_penalty').notNull(),
	contextWindow: integer('context_window').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const characters = sqliteTable('characters', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	tags: text('tags'), // JSON array of tags
	imageData: text('image_data'), // Base64 image data (full size)
	thumbnailData: text('thumbnail_data'), // Base64 thumbnail for sidebar
	cardData: text('card_data').notNull(), // Full character card JSON
	// Image generation settings (per-character)
	imageTags: text('image_tags'), // Always included tags (hair color, eye color, body type)
	contextualTags: text('contextual_tags'), // AI chooses from these based on context
	mainPromptOverride: text('main_prompt_override'), // Override global main prompt
	negativePromptOverride: text('negative_prompt_override'), // Override global negative prompt
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const tagLibrary = sqliteTable('tag_library', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
		.unique(),
	content: text('content').notNull().default(''),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const conversations = sqliteTable('conversations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	characterId: integer('character_id')
		.notNull()
		.references(() => characters.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const messages = sqliteTable('messages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	conversationId: integer('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	role: text('role').notNull(), // 'user' or 'assistant'
	content: text('content').notNull(),
	swipes: text('swipes'), // JSON array of alternative content variants
	currentSwipe: integer('current_swipe').default(0), // Index of currently selected swipe
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LlmSettings = typeof llmSettings.$inferSelect;
export type NewLlmSettings = typeof llmSettings.$inferInsert;
export type DecisionEngineSettings = typeof decisionEngineSettings.$inferSelect;
export type NewDecisionEngineSettings = typeof decisionEngineSettings.$inferInsert;
export type ContentLlmSettings = typeof contentLlmSettings.$inferSelect;
export type NewContentLlmSettings = typeof contentLlmSettings.$inferInsert;
export type ImageLlmSettings = typeof imageLlmSettings.$inferSelect;
export type NewImageLlmSettings = typeof imageLlmSettings.$inferInsert;
export type SdSettings = typeof sdSettings.$inferSelect;
export type NewSdSettings = typeof sdSettings.$inferInsert;
export type LlmPreset = typeof llmPresets.$inferSelect;
export type NewLlmPreset = typeof llmPresets.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type TagLibrary = typeof tagLibrary.$inferSelect;
export type NewTagLibrary = typeof tagLibrary.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
