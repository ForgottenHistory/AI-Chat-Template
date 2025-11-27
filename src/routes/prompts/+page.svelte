<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptTemplate } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let templates = $state<PromptTemplate[]>([]);
	let selectedTemplate = $state<PromptTemplate | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let containerRef: HTMLDivElement | null = null;

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formContent = $state('');
	let isCreating = $state(false);

	// Template variables
	const VARIABLES = [
		{ key: '{{char}}', description: 'Character name' },
		{ key: '{{user}}', description: 'User name' },
		{ key: '{{personality}}', description: 'Character personality' },
		{ key: '{{scenario}}', description: 'Current scenario' },
		{ key: '{{description}}', description: 'Character description' },
		{ key: '{{message}}', description: "User's message" }
	];

	onMount(async () => {
		await loadTemplates();
	});

	async function loadTemplates() {
		loading = true;
		try {
			const response = await fetch('/api/prompts');
			const result = await response.json();
			templates = result.templates || [];

			// If no templates exist, create default
			if (templates.length === 0) {
				await createDefaultTemplate();
			}
		} catch (error) {
			console.error('Failed to load templates:', error);
			showMessage('error', 'Failed to load templates');
		} finally {
			loading = false;
		}
	}

	async function createDefaultTemplate() {
		const defaultTemplate = {
			name: 'Default System Prompt',
			description: 'Basic character roleplay template',
			content: 'You are roleplaying as {{char}}, a character with the following traits:\n\nPersonality: {{personality}}\n\nDescription: {{description}}\n\nCurrent Scenario: {{scenario}}\n\nStay in character as {{char}} at all times. Respond naturally to {{user}}\'s messages while maintaining your personality and the current scenario context.'
		};

		try {
			const response = await fetch('/api/prompts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(defaultTemplate)
			});

			if (response.ok) {
				await loadTemplates();
			}
		} catch (error) {
			console.error('Failed to create default template:', error);
		}
	}

	function showMessage(type: 'success' | 'error', text: string) {
		message = { type, text };
		setTimeout(() => (message = null), 3000);
		if (containerRef) {
			containerRef.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function selectTemplate(template: PromptTemplate) {
		selectedTemplate = template;
		formName = template.name;
		formDescription = template.description || '';
		formContent = template.content;
		isCreating = false;
	}

	function startCreating() {
		selectedTemplate = null;
		formName = '';
		formDescription = '';
		formContent = '';
		isCreating = true;
	}

	function insertVariable(variable: string) {
		const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = formContent;
		formContent = text.substring(0, start) + variable + text.substring(end);

		// Restore cursor position
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + variable.length, start + variable.length);
		}, 0);
	}

	async function saveTemplate() {
		if (!formName || !formContent) {
			showMessage('error', 'Name and content are required');
			return;
		}

		saving = true;
		try {
			const payload = {
				name: formName,
				description: formDescription,
				content: formContent
			};

			let response;
			if (selectedTemplate) {
				// Update existing
				response = await fetch(`/api/prompts/${selectedTemplate.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				// Create new
				response = await fetch('/api/prompts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}

			if (response.ok) {
				showMessage('success', 'Template saved successfully!');
				await loadTemplates();
				isCreating = false;
			} else {
				const result = await response.json();
				showMessage('error', result.error || 'Failed to save template');
			}
		} catch (error) {
			console.error('Failed to save template:', error);
			showMessage('error', 'Failed to save template');
		} finally {
			saving = false;
		}
	}

	async function deleteTemplate() {
		if (!selectedTemplate) return;

		if (!confirm(`Delete template "${selectedTemplate.name}"?`)) return;

		deleting = true;
		try {
			const response = await fetch(`/api/prompts/${selectedTemplate.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				showMessage('success', 'Template deleted successfully!');
				selectedTemplate = null;
				formName = '';
				formDescription = '';
				formContent = '';
				await loadTemplates();
			} else {
				const result = await response.json();
				showMessage('error', result.error || 'Failed to delete template');
			}
		} catch (error) {
			console.error('Failed to delete template:', error);
			showMessage('error', 'Failed to delete template');
		} finally {
			deleting = false;
		}
	}

	function getCharCount(): number {
		return formContent.length;
	}

	function getTokenEstimate(): number {
		// Rough estimate: ~4 characters per token
		return Math.ceil(formContent.length / 4);
	}
</script>

<svelte:head>
	<title>Prompts | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/prompts">
	<div class="h-full overflow-y-auto bg-[var(--bg-primary)]" bind:this={containerRef}>
		<div class="max-w-7xl mx-auto px-8 py-8">
			<!-- Header -->
			<div class="mb-6">
				<h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">Prompt Templates</h1>
				<p class="text-[var(--text-secondary)]">
					Create and manage prompt templates with variable substitution for AI interactions
				</p>
			</div>

			<!-- Message -->
			{#if message}
				<div
					class="mb-6 p-4 rounded-xl border {message.type === 'success'
						? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
						: 'bg-[var(--error)]/10 border-[var(--error)]/30 text-[var(--error)]'}"
				>
					{message.text}
				</div>
			{/if}

			{#if loading}
				<!-- Loading Skeleton -->
				<div class="animate-pulse space-y-4">
					<div class="h-8 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
					<div class="h-64 bg-[var(--bg-tertiary)] rounded"></div>
				</div>
			{:else}
				<div class="grid grid-cols-12 gap-6">
					<!-- Left Sidebar: Template List -->
					<div class="col-span-3">
						<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] p-4">
							<div class="flex items-center justify-between mb-4">
								<h2 class="text-lg font-semibold text-[var(--text-primary)]">Templates</h2>
								<button
									onclick={startCreating}
									class="p-2 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition"
									title="New Template"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 4v16m8-8H4"
										/>
									</svg>
								</button>
							</div>

							<div class="space-y-2">
								{#each templates as template}
									<button
										onclick={() => selectTemplate(template)}
										class="w-full text-left p-3 rounded-lg transition {selectedTemplate?.id ===
										template.id
											? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white'
											: 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}"
									>
										<div class="flex items-center justify-between">
											<span class="font-medium truncate">{template.name}</span>
										</div>
										{#if template.description}
											<p
												class="text-xs mt-1 truncate {selectedTemplate?.id === template.id
													? 'text-white/80'
													: 'text-[var(--text-muted)]'}"
											>
												{template.description}
											</p>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- Main Content: Template Editor -->
					<div class="col-span-9">
						{#if selectedTemplate || isCreating}
							<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] p-6">
								<div class="mb-6">
									<h2 class="text-2xl font-bold text-[var(--text-primary)] mb-4">
										{isCreating ? 'New Template' : 'Edit Template'}
									</h2>

									<!-- Template Name -->
									<div class="mb-4">
										<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
											>Template Name</label
										>
										<input
											type="text"
											bind:value={formName}
											class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
											placeholder="e.g., Character Roleplay"
										/>
									</div>

									<!-- Description -->
									<div class="mb-4">
										<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
											>Description (optional)</label
										>
										<input
											type="text"
											bind:value={formDescription}
											class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
											placeholder="Brief description of this template"
										/>
									</div>

									<!-- Variable Helper -->
									<div class="mb-4 p-4 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-lg">
										<div class="flex items-start gap-2 mb-2">
											<svg
												class="w-5 h-5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											<div class="flex-1">
												<h4 class="text-sm font-semibold text-[var(--accent-primary)] mb-2">
													Available Variables
												</h4>
												<div class="flex flex-wrap gap-2">
													{#each VARIABLES as variable}
														<button
															onclick={() => insertVariable(variable.key)}
															class="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/30 rounded text-xs font-mono text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition"
															title={variable.description}
														>
															{variable.key}
														</button>
													{/each}
												</div>
												<p class="text-xs text-[var(--accent-primary)]/80 mt-2">
													Click a variable to insert it at cursor position
												</p>
											</div>
										</div>
									</div>

									<!-- Template Content -->
									<div class="mb-4">
										<div class="flex items-center justify-between mb-2">
											<label class="block text-sm font-medium text-[var(--text-secondary)]">Template Content</label
											>
											<div class="text-xs text-[var(--text-muted)]">
												{getCharCount()} characters / ~{getTokenEstimate()} tokens
											</div>
										</div>
										<textarea
											bind:value={formContent}
											rows="16"
											class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
											placeholder="Enter your prompt template here. Click variable buttons above to insert them."
										></textarea>
									</div>

									<!-- Actions -->
									<div class="flex items-center justify-between">
										<button
											onclick={saveTemplate}
											disabled={saving}
											class="px-6 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl transition"
										>
											{#if saving}
												<span class="flex items-center gap-2">
													<div
														class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
													></div>
													Saving...
												</span>
											{:else}
												Save Template
											{/if}
										</button>

										{#if selectedTemplate && !isCreating}
											<button
												onclick={deleteTemplate}
												disabled={deleting}
												class="px-4 py-2 text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-50 font-medium rounded-xl transition"
											>
												{#if deleting}
													<span class="flex items-center gap-2">
														<div
															class="w-4 h-4 border-2 border-[var(--error)] border-t-transparent rounded-full animate-spin"
														></div>
														Deleting...
													</span>
												{:else}
													Delete
												{/if}
											</button>
										{/if}
									</div>
								</div>
							</div>
						{:else}
							<!-- No Template Selected -->
							<div class="bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)] p-12 text-center">
								<svg
									class="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<h3 class="text-xl font-semibold text-[var(--text-primary)] mb-2">No Template Selected</h3>
								<p class="text-[var(--text-secondary)] mb-6">
									Select a template from the sidebar or create a new one
								</p>
								<button
									onclick={startCreating}
									class="px-6 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:opacity-90 text-white font-medium rounded-xl transition"
								>
									Create New Template
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</MainLayout>
