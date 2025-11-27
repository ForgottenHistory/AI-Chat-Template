<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();

	let prompts = $state<Record<string, string>>({});
	let loading = $state(true);
	let saving = $state<string | null>(null);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const PROMPT_CONFIG = {
		system: {
			title: 'System Prompt',
			description: 'The main prompt sent to the LLM for character responses',
			file: 'system.txt',
			default: `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`
		},
		impersonate: {
			title: 'Impersonate Prompt',
			description: 'Used when generating a message as the user',
			file: 'impersonate.txt',
			default: `Write the next message as {{user}} in this roleplay chat with {{char}}.

Stay in character as {{user}}. Write a natural response that fits the conversation flow.`
		}
	};

	const VARIABLES = [
		{ name: '{{char}}', description: 'Character name' },
		{ name: '{{user}}', description: 'Your display name' },
		{ name: '{{description}}', description: 'Character description' },
		{ name: '{{personality}}', description: 'Character personality' },
		{ name: '{{scenario}}', description: 'Roleplay scenario' }
	];

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

	async function savePrompt(name: string) {
		saving = name;
		message = null;
		try {
			const response = await fetch('/api/prompts', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, content: prompts[name] })
			});

			if (response.ok) {
				const config = PROMPT_CONFIG[name as keyof typeof PROMPT_CONFIG];
				message = { type: 'success', text: `Saved to data/prompts/${config.file}` };
				setTimeout(() => (message = null), 3000);
			} else {
				const data = await response.json();
				message = { type: 'error', text: data.error || 'Failed to save prompt' };
			}
		} catch (error) {
			message = { type: 'error', text: 'Failed to save prompt' };
		} finally {
			saving = null;
		}
	}

	function resetToDefault(name: string) {
		const config = PROMPT_CONFIG[name as keyof typeof PROMPT_CONFIG];
		if (config) {
			prompts[name] = config.default;
		}
	}

	function insertVariable(name: string, variable: string) {
		prompts[name] = (prompts[name] || '') + variable;
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
					Customize the prompts used for character interactions
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

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Stacked Prompt Editors -->
				<div class="lg:col-span-2 space-y-6">
					{#each Object.entries(PROMPT_CONFIG) as [name, config]}
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
										bind:value={prompts[name]}
										rows="10"
										placeholder={config.default}
										class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] font-mono text-sm resize-y"
									></textarea>

									<div class="flex items-center gap-3 mt-4">
										<button
											onclick={() => savePrompt(name)}
											disabled={saving !== null}
											class="px-6 py-2.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
										>
											{#if saving === name}
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
												Saving...
											{:else}
												Save
											{/if}
										</button>
										<button
											onclick={() => resetToDefault(name)}
											class="px-6 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-xl transition border border-[var(--border-primary)]"
										>
											Reset to Default
										</button>
									</div>

									<p class="text-xs text-[var(--text-muted)] mt-3">
										File: <code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">data/prompts/{config.file}</code>
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Variables Sidebar -->
				<div class="lg:col-span-1">
					<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] overflow-hidden sticky top-8">
						<div class="p-6">
							<h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Available Variables</h3>
							<p class="text-sm text-[var(--text-secondary)] mb-4">
								These variables are replaced with character data when generating responses.
							</p>
							<div class="space-y-2">
								{#each VARIABLES as variable}
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
			</div>
		</div>
	</div>
</MainLayout>
