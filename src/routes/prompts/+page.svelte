<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();

	// Tab state
	type PromptsTab = 'chat' | 'decision' | 'content' | 'image';
	let activeTab = $state<PromptsTab>('chat');

	let prompts = $state<Record<string, Record<string, string>>>({});
	let loading = $state(true);
	let saving = $state<string | null>(null);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const tabs = [
		{ id: 'chat' as const, label: 'Chat', description: 'Prompts for character conversations' },
		{ id: 'decision' as const, label: 'Decision', description: 'Prompts for decision-making before sending content' },
		{ id: 'content' as const, label: 'Content', description: 'Prompts for content creation and generation' },
		{ id: 'image' as const, label: 'Image', description: 'Prompts for image generation' }
	];

	const PROMPT_CONFIG: Record<string, Record<string, { title: string; description: string; default: string }>> = {
		chat: {
			system: {
				title: 'System Prompt',
				description: 'The main prompt sent to the LLM for character responses',
				default: `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`
			},
			impersonate: {
				title: 'Impersonate Prompt',
				description: 'Used when generating a message as the user',
				default: `Write the next message as {{user}} in this roleplay chat with {{char}}.

Stay in character as {{user}}. Write a natural response that fits the conversation flow.`
			}
		},
		decision: {
			system: {
				title: 'Decision Engine Prompt',
				description: 'Analyzes conversations to decide if the character should send an image',
				default: `You are a decision engine that analyzes roleplay conversations to determine if the character should send an image.

Analyze the recent conversation and decide if this is an appropriate moment for the character to send an image/photo of themselves.

Consider:
- Did the user ask to see the character or request a photo?
- Is there a natural moment where the character would share how they look?
- Has it been a while since an image was sent and the conversation warrants one?
- Would sending an image enhance the roleplay experience at this moment?

Do NOT send an image if:
- The conversation is purely dialogue/text focused
- An image was just sent recently
- The scene doesn't call for visual content

Respond with key-value pairs, one per line:
send_image: true/false
reason: brief explanation for your decision`
			}
		},
		content: {
			description: {
				title: 'Description Rewriter',
				description: 'Cleans up character descriptions from imported cards',
				default: `Rewrite the following character description to be clean, well-formatted, and suitable for roleplay.

Guidelines:
- Remove any meta-instructions, placeholders, or formatting artifacts
- Keep the core character traits, appearance, and background
- Write in third person
- Use clear, concise prose

Original description:
{{input}}

Rewritten description:`
			},
			personality: {
				title: 'Personality Rewriter',
				description: 'Cleans up character personality traits',
				default: `Rewrite the following character personality to be clean and well-structured.

Guidelines:
- Extract key personality traits
- Remove redundant or contradictory information
- Format as a clear, readable list or prose

Original personality:
{{input}}

Rewritten personality:`
			},
			scenario: {
				title: 'Scenario Rewriter',
				description: 'Cleans up roleplay scenarios',
				default: `Rewrite the following roleplay scenario to be clean and engaging.

Guidelines:
- Set up a clear starting situation
- Establish the relationship between the character and user
- Keep it open-ended enough for roleplay to develop

Original scenario:
{{input}}

Rewritten scenario:`
			},
			message_example: {
				title: 'Message Example Rewriter',
				description: 'Cleans up example messages that show character voice',
				default: `Rewrite the following example messages to demonstrate the character's voice and style.

Guidelines:
- Show how the character speaks and acts
- Include a mix of dialogue and actions
- Format actions with asterisks (*action*)

Original examples:
{{input}}

Rewritten examples:`
			},
			greeting: {
				title: 'Greeting Rewriter',
				description: 'Cleans up character greeting/first messages',
				default: `Rewrite the following greeting message to be clean and engaging.

Guidelines:
- Create an inviting opening for roleplay
- Show the character's personality
- Include both dialogue and scene-setting actions

Original greeting:
{{input}}

Rewritten greeting:`
			}
		},
		image: {
			generate: {
				title: 'Image Tag Generation Prompt',
				description: 'Instructions for generating Danbooru-style tags from roleplay context',
				default: `Guidelines:
- Choose 5-10 tags that best match the current scene and conversation context
- **ALWAYS include a focus/composition tag** (close-up, upper body, cowboy shot, full body, portrait, etc.)
- **CLOTHING/APPEARANCE MUST BE HIGHLY SPECIFIC** - This is critical!
  * ALWAYS add color + clothing type: "white shirt", "black jacket", "blue dress", "red hoodie"
  * Add style details: "torn clothing", "elegant gown", "casual wear", "formal suit"
  * NEVER use vague terms: "clothes", "outfit" (too vague - specify color/style!)
- Focus on: expression, pose, action, clothing (COLOR + TYPE + DETAILS), environment, lighting, mood
- Match the scene to what's happening in the roleplay

- Only use tags from the library above or the character-specific tags
- Output ONLY comma-separated tags, no explanations
- Be specific and contextual - capture the current scene

Example output format:
upper body, smiling, white shirt, black jacket, indoor, soft lighting, looking at viewer`
			}
		}
	};

	const VARIABLES: Record<string, { name: string; description: string }[]> = {
		chat: [
			{ name: '{{char}}', description: 'Character name' },
			{ name: '{{user}}', description: 'Your display name' },
			{ name: '{{description}}', description: 'Character description' },
			{ name: '{{personality}}', description: 'Character personality' },
			{ name: '{{scenario}}', description: 'Roleplay scenario' }
		],
		decision: [],
		content: [
			{ name: '{{input}}', description: 'The original text to be rewritten' }
		],
		image: []
	};

	onMount(() => {
		loadPrompts();
	});

	async function loadPrompts() {
		loading = true;
		try {
			const response = await fetch('/api/prompts');
			const data = await response.json();
			if (data.prompts) {
				prompts = data.prompts;
			}
		} catch (error) {
			console.error('Failed to load prompts:', error);
		} finally {
			loading = false;
		}
	}

	async function savePrompt(category: string, name: string) {
		const key = `${category}_${name}`;
		saving = key;
		message = null;
		try {
			const response = await fetch('/api/prompts', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ category, name, content: prompts[category]?.[name] })
			});

			const data = await response.json();

			if (response.ok) {
				message = { type: 'success', text: `Saved to data/prompts/${data.file}` };
				setTimeout(() => (message = null), 3000);
			} else {
				message = { type: 'error', text: data.error || 'Failed to save prompt' };
			}
		} catch (error) {
			message = { type: 'error', text: 'Failed to save prompt' };
		} finally {
			saving = null;
		}
	}

	function resetToDefault(category: string, name: string) {
		const config = PROMPT_CONFIG[category]?.[name];
		if (config) {
			if (!prompts[category]) prompts[category] = {};
			prompts[category][name] = config.default;
		}
	}

	function getPromptValue(category: string, name: string): string {
		return prompts[category]?.[name] || '';
	}

	function setPromptValue(category: string, name: string, value: string) {
		if (!prompts[category]) prompts[category] = {};
		prompts[category][name] = value;
	}
</script>

<svelte:head>
	<title>Prompts | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/prompts">
	<div class="h-full overflow-y-auto bg-[var(--bg-primary)]">
		<div class="max-w-5xl mx-auto px-8 py-8">
			<!-- Header -->
			<div class="mb-6">
				<h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">Prompts</h1>
				<p class="text-[var(--text-secondary)]">
					Customize the prompts used for each LLM type
				</p>
			</div>

			<!-- Success/Error Message -->
			{#if message}
				<div
					class="mb-6 p-4 rounded-xl border {message.type === 'success'
						? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
						: 'bg-[var(--error)]/10 border-[var(--error)]/30 text-[var(--error)]'}"
				>
					{message.text}
				</div>
			{/if}

			<!-- Tabs -->
			<div class="flex flex-wrap gap-2 mb-6">
				{#each tabs as tab}
					<button
						onclick={() => (activeTab = tab.id)}
						class="px-5 py-2.5 rounded-xl font-medium transition-all {activeTab === tab.id
							? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg'
							: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'}"
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Tab Description -->
			<p class="text-sm text-[var(--text-muted)] mb-6">
				{tabs.find(t => t.id === activeTab)?.description}
			</p>

			<div class="grid grid-cols-1 {(VARIABLES[activeTab] || []).length > 0 ? 'lg:grid-cols-3' : ''} gap-6">
				<!-- Stacked Prompt Editors -->
				<div class="{(VARIABLES[activeTab] || []).length > 0 ? 'lg:col-span-2' : ''} space-y-6">
					{#each Object.entries(PROMPT_CONFIG[activeTab] || {}) as [name, config]}
						{@const key = `${activeTab}_${name}`}
						<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] overflow-hidden">
							<div class="p-6">
								{#if loading}
									<div class="space-y-4">
										<div class="h-6 bg-[var(--bg-tertiary)] rounded animate-pulse w-1/3"></div>
										<div class="h-48 bg-[var(--bg-tertiary)] rounded-xl animate-pulse"></div>
										<div class="h-10 bg-[var(--bg-tertiary)] rounded-xl animate-pulse w-1/4"></div>
									</div>
								{:else}
									<div class="mb-4">
										<h3 class="text-lg font-semibold text-[var(--text-primary)]">{config.title}</h3>
										<p class="text-sm text-[var(--text-muted)]">{config.description}</p>
									</div>

									<textarea
										value={getPromptValue(activeTab, name)}
										oninput={(e) => setPromptValue(activeTab, name, e.currentTarget.value)}
										rows="10"
										placeholder={config.default}
										class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] font-mono text-sm resize-y"
									></textarea>

									<div class="flex items-center gap-3 mt-4">
										<button
											onclick={() => savePrompt(activeTab, name)}
											disabled={saving !== null}
											class="px-6 py-2.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
										>
											{#if saving === key}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
												Saving...
											{:else}
												Save
											{/if}
										</button>
										<button
											onclick={() => resetToDefault(activeTab, name)}
											class="px-6 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-xl transition border border-[var(--border-primary)]"
										>
											Reset to Default
										</button>
									</div>

									<p class="text-xs text-[var(--text-muted)] mt-3">
										File: <code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">data/prompts/{activeTab}_{name}.txt</code>
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Variables Sidebar (only shown when there are variables) -->
				{#if (VARIABLES[activeTab] || []).length > 0}
					<div class="lg:col-span-1">
						<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] overflow-hidden sticky top-8">
							<div class="p-6">
								<h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Available Variables</h3>
								<p class="text-sm text-[var(--text-secondary)] mb-4">
									These variables are replaced with actual data when generating responses.
								</p>
								<div class="space-y-2">
									{#each VARIABLES[activeTab] || [] as variable}
										<div
											class="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]"
										>
											<code class="text-[var(--accent-primary)] font-mono text-sm">
												{variable.name}
											</code>
											<p class="text-xs text-[var(--text-muted)] mt-1">{variable.description}</p>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</MainLayout>
