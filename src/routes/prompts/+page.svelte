<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();

	let systemPrompt = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const DEFAULT_SYSTEM_PROMPT = `You are {{char}}.

{{description}}

Personality: {{personality}}

Scenario: {{scenario}}

Write your next reply as {{char}} in this roleplay chat with {{user}}.`;

	const VARIABLES = [
		{ name: '{{char}}', description: 'Character name' },
		{ name: '{{user}}', description: 'Your display name' },
		{ name: '{{description}}', description: 'Character description' },
		{ name: '{{personality}}', description: 'Character personality' },
		{ name: '{{scenario}}', description: 'Roleplay scenario' }
	];

	onMount(() => {
		loadSystemPrompt();
	});

	async function loadSystemPrompt() {
		loading = true;
		try {
			const response = await fetch('/api/prompts');
			const data = await response.json();
			if (data.systemPrompt) {
				systemPrompt = data.systemPrompt;
			}
		} catch (error) {
			console.error('Failed to load system prompt:', error);
		} finally {
			loading = false;
		}
	}

	async function saveSystemPrompt() {
		saving = true;
		message = null;
		try {
			const response = await fetch('/api/prompts', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ systemPrompt })
			});

			if (response.ok) {
				message = { type: 'success', text: 'System prompt saved to data/prompts/system.txt' };
				setTimeout(() => (message = null), 3000);
			} else {
				const data = await response.json();
				message = { type: 'error', text: data.error || 'Failed to save system prompt' };
			}
		} catch (error) {
			message = { type: 'error', text: 'Failed to save system prompt' };
		} finally {
			saving = false;
		}
	}

	function resetToDefault() {
		systemPrompt = DEFAULT_SYSTEM_PROMPT;
	}

	function insertVariable(variable: string) {
		systemPrompt += variable;
	}
</script>

<svelte:head>
	<title>System Prompt | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/prompts">
	<div class="h-full overflow-y-auto bg-[var(--bg-primary)]">
		<div class="max-w-5xl mx-auto px-8 py-8">
			<!-- Header -->
			<div class="mb-6">
				<h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">System Prompt</h1>
				<p class="text-[var(--text-secondary)]">
					Customize the system prompt used for all character conversations
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
				<!-- Main Editor -->
				<div class="lg:col-span-2">
					<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] overflow-hidden">
						<div class="p-6">
							{#if loading}
								<div class="space-y-4">
									<div class="h-6 bg-[var(--bg-tertiary)] rounded animate-pulse w-1/3"></div>
									<div class="h-64 bg-[var(--bg-tertiary)] rounded-xl animate-pulse"></div>
									<div class="h-10 bg-[var(--bg-tertiary)] rounded-xl animate-pulse w-1/4"></div>
								</div>
							{:else}
								<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
									System Prompt
								</label>
								<textarea
									bind:value={systemPrompt}
									rows="16"
									placeholder={DEFAULT_SYSTEM_PROMPT}
									class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] font-mono text-sm resize-y"
								></textarea>

								<div class="flex items-center gap-3 mt-4">
									<button
										onclick={saveSystemPrompt}
										disabled={saving}
										class="px-6 py-2.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
									>
										{#if saving}
											<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
											Saving...
										{:else}
											Save
										{/if}
									</button>
									<button
										onclick={resetToDefault}
										class="px-6 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-xl transition border border-[var(--border-primary)]"
									>
										Reset to Default
									</button>
								</div>

								<p class="text-xs text-[var(--text-muted)] mt-3">
									Leave empty to use the default system prompt shown in the placeholder.
								</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Variables Sidebar -->
				<div class="lg:col-span-1">
					<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] overflow-hidden">
						<div class="p-6">
							<h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Available Variables</h3>
							<p class="text-sm text-[var(--text-secondary)] mb-4">
								Click a variable to insert it at the end of your prompt.
							</p>
							<div class="space-y-2">
								{#each VARIABLES as variable}
									<button
										onclick={() => insertVariable(variable.name)}
										class="w-full text-left p-3 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)]/10 rounded-lg border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 transition group"
									>
										<code class="text-[var(--accent-primary)] font-mono text-sm group-hover:text-[var(--accent-secondary)]">
											{variable.name}
										</code>
										<p class="text-xs text-[var(--text-muted)] mt-1">{variable.description}</p>
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- Info Box -->
					<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] overflow-hidden mt-6">
						<div class="p-6">
							<h3 class="text-lg font-semibold text-[var(--text-primary)] mb-3">How it works</h3>
							<ul class="text-sm text-[var(--text-secondary)] space-y-2">
								<li class="flex items-start gap-2">
									<span class="text-[var(--accent-primary)]">1.</span>
									<span>Variables are replaced with actual values when chatting</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-[var(--accent-primary)]">2.</span>
									<span>The system prompt is sent at the start of each conversation</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-[var(--accent-primary)]">3.</span>
									<span>Character-specific data comes from the character card</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</MainLayout>
