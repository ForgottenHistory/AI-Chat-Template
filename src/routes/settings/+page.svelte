<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';

	let { data }: { data: PageData } = $props();

	let settings = $state({
		provider: 'openrouter',
		model: 'anthropic/claude-3.5-sonnet',
		temperature: 0.7,
		maxTokens: 500,
		topP: 1.0,
		frequencyPenalty: 0.0,
		presencePenalty: 0.0,
		contextWindow: 8000
	});

	let loading = $state(true);
	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let containerRef: HTMLDivElement | null = null;

	// Preset management
	let presets = $state<any[]>([]);
	let showSavePresetDialog = $state(false);
	let presetName = $state('');
	let savingPreset = $state(false);
	let deletingPresetId = $state<number | null>(null);

	onMount(() => {
		loadSettings();
		loadPresets();
	});

	async function loadSettings() {
		loading = true;
		try {
			const response = await fetch('/api/llm/settings');
			const data = await response.json();
			if (data.settings) {
				settings = data.settings;
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
		} finally {
			loading = false;
		}
	}

	async function saveSettings() {
		saving = true;
		message = null;
		try {
			const response = await fetch('/api/llm/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});

			const data = await response.json();

			if (response.ok) {
				message = { type: 'success', text: 'Settings saved successfully!' };
				// Scroll to top
				if (containerRef) {
					containerRef.scrollTo({ top: 0, behavior: 'smooth' });
				}
				setTimeout(() => (message = null), 3000);
			} else {
				message = { type: 'error', text: data.error || 'Failed to save settings' };
			}
		} catch (error) {
			message = { type: 'error', text: 'Network error. Please try again.' };
		} finally {
			saving = false;
		}
	}

	async function loadPresets() {
		try {
			const response = await fetch('/api/llm-presets');
			const data = await response.json();
			presets = data.presets || [];
		} catch (error) {
			console.error('Failed to load presets:', error);
		}
	}

	async function savePreset() {
		if (!presetName.trim()) {
			message = { type: 'error', text: 'Please enter a preset name' };
			return;
		}

		savingPreset = true;
		try {
			const response = await fetch('/api/llm-presets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: presetName,
					...settings
				})
			});

			if (response.ok) {
				message = { type: 'success', text: 'Preset saved successfully!' };
				showSavePresetDialog = false;
				presetName = '';
				await loadPresets();
				setTimeout(() => (message = null), 3000);
			} else {
				const data = await response.json();
				message = { type: 'error', text: data.error || 'Failed to save preset' };
			}
		} catch (error) {
			message = { type: 'error', text: 'Failed to save preset' };
		} finally {
			savingPreset = false;
		}
	}

	function loadPresetSettings(preset: any) {
		settings = {
			provider: preset.provider,
			model: preset.model,
			temperature: preset.temperature,
			maxTokens: preset.maxTokens,
			topP: preset.topP,
			frequencyPenalty: preset.frequencyPenalty,
			presencePenalty: preset.presencePenalty,
			contextWindow: preset.contextWindow
		};
		message = { type: 'success', text: `Loaded preset: ${preset.name}` };
		setTimeout(() => (message = null), 3000);
		if (containerRef) {
			containerRef.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	async function deletePreset(presetId: number) {
		if (!confirm('Delete this preset?')) return;

		deletingPresetId = presetId;
		try {
			const response = await fetch(`/api/llm-presets/${presetId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				message = { type: 'success', text: 'Preset deleted successfully!' };
				await loadPresets();
				setTimeout(() => (message = null), 3000);
			} else {
				message = { type: 'error', text: 'Failed to delete preset' };
			}
		} catch (error) {
			message = { type: 'error', text: 'Failed to delete preset' };
		} finally {
			deletingPresetId = null;
		}
	}
</script>

<svelte:head>
	<title>Settings | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/settings">
	<div bind:this={containerRef} class="h-full overflow-y-auto bg-gray-50">
		<div class="max-w-5xl mx-auto px-8 py-12">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-4xl font-bold text-gray-900 mb-2">LLM Settings</h1>
				<p class="text-gray-600">
					Configure your language model preferences for character interactions
				</p>
			</div>

			<!-- Presets Section -->
			{#if presets.length > 0}
				<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
					<label for="preset-selector" class="block text-sm font-medium text-gray-700 mb-2">
						Load Preset
					</label>
					<div class="flex items-center gap-3">
						<select
							id="preset-selector"
							onchange={(e) => {
								const presetId = parseInt(e.currentTarget.value);
								if (presetId) {
									const preset = presets.find((p) => p.id === presetId);
									if (preset) loadPresetSettings(preset);
								}
							}}
							class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
						>
							<option value="">Select a preset...</option>
							{#each presets as preset}
								<option value={preset.id}>
									{preset.name} ({preset.model})
								</option>
							{/each}
						</select>
						<button
							onclick={() => {
								const select = document.getElementById('preset-selector') as HTMLSelectElement;
								const presetId = parseInt(select?.value || '');
								if (presetId) {
									deletePreset(presetId);
									select.value = '';
								}
							}}
							disabled={deletingPresetId !== null}
							class="px-4 py-3 text-red-600 hover:bg-red-50 disabled:text-red-300 rounded-lg transition border border-red-200 hover:border-red-300"
							title="Delete selected preset"
						>
							{#if deletingPresetId !== null}
								<div
									class="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
								></div>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							{/if}
						</button>
					</div>
					<p class="text-xs text-gray-500 mt-2">
						Select a preset to load its settings
					</p>
				</div>
			{/if}

			<div class="bg-white rounded-lg shadow-sm overflow-hidden">
				{#if loading}
					<!-- Loading State with Same Layout -->
					<div class="p-6">
						<div class="space-y-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Provider</label>
								<div class="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Model</label>
								<div class="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Temperature: 0.7</label>
								<div class="w-full h-2 bg-gray-200 rounded animate-pulse"></div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
								<div class="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Context Window</label>
								<div class="w-full h-10 bg-gray-200 rounded-md animate-pulse"></div>
							</div>
						</div>
						<div class="mt-6 flex items-center gap-3">
							<button
								disabled
								class="px-8 py-3 bg-gradient-to-r from-blue-300 to-purple-300 text-white font-semibold rounded-lg shadow-lg cursor-not-allowed"
							>
								Save Settings
							</button>
							<button
								disabled
								class="px-8 py-3 bg-gray-300 text-white rounded-lg font-semibold shadow-lg cursor-not-allowed"
							>
								Reload
							</button>
						</div>
					</div>
				{:else}
					<form
						class="p-6 space-y-6"
						onsubmit={(e) => {
							e.preventDefault();
							saveSettings();
						}}
					>
						<!-- Success/Error Message -->
						{#if message}
							<div
								class="mb-6 p-4 rounded-lg {message.type === 'success'
									? 'bg-green-50 border border-green-200 text-green-700'
									: 'bg-red-50 border border-red-200 text-red-700'}"
							>
								{message.text}
							</div>
						{/if}

						<!-- Provider Selection -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Provider</label>
							<select
								bind:value={settings.provider}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="openrouter">OpenRouter</option>
								<option value="featherless" disabled>Featherless (Coming Soon)</option>
							</select>
						</div>

						<!-- Model Selection -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Model</label>
							<ModelSelector
								selectedModel={settings.model}
								onSelect={(modelId) => (settings.model = modelId)}
							/>
						</div>

						<!-- Temperature -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Temperature: {settings.temperature}
							</label>
							<input
								type="range"
								bind:value={settings.temperature}
								min="0"
								max="2"
								step="0.1"
								class="w-full"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Higher values make output more random, lower values more deterministic
							</p>
						</div>

						<!-- Max Tokens -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
							<input
								type="number"
								bind:value={settings.maxTokens}
								min="50"
								max="4000"
								step="50"
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">Maximum length of generated responses</p>
						</div>

						<!-- Context Window -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Context Window</label>
							<input
								type="number"
								bind:value={settings.contextWindow}
								min="1000"
								max="200000"
								step="1000"
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">Total tokens available for context</p>
						</div>

						<!-- Advanced Settings -->
						<details class="border border-gray-200 rounded-lg">
							<summary
								class="px-4 py-3 cursor-pointer font-medium text-gray-700 hover:bg-gray-50"
							>
								Advanced Settings
							</summary>
							<div class="px-4 py-4 space-y-4 border-t border-gray-200">
								<!-- Top P -->
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">
										Top P: {settings.topP}
									</label>
									<input
										type="range"
										bind:value={settings.topP}
										min="0"
										max="1"
										step="0.05"
										class="w-full"
									/>
									<p class="text-xs text-gray-500 mt-1">Nucleus sampling threshold</p>
								</div>

								<!-- Frequency Penalty -->
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">
										Frequency Penalty: {settings.frequencyPenalty}
									</label>
									<input
										type="range"
										bind:value={settings.frequencyPenalty}
										min="0"
										max="2"
										step="0.1"
										class="w-full"
									/>
									<p class="text-xs text-gray-500 mt-1">
										Penalize repeated tokens based on frequency
									</p>
								</div>

								<!-- Presence Penalty -->
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">
										Presence Penalty: {settings.presencePenalty}
									</label>
									<input
										type="range"
										bind:value={settings.presencePenalty}
										min="0"
										max="2"
										step="0.1"
										class="w-full"
									/>
									<p class="text-xs text-gray-500 mt-1">Penalize tokens that appear at all</p>
								</div>
							</div>
						</details>

						<!-- Save Buttons -->
						<div class="flex items-center gap-3">
							<button
								type="submit"
								disabled={saving}
								class="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-2"
							>
								{#if saving}
									<div
										class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
									></div>
									Saving...
								{:else}
									Save Settings
								{/if}
							</button>
							<button
								type="button"
								onclick={() => (showSavePresetDialog = true)}
								class="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-semibold shadow-lg hover:shadow-xl"
							>
								Save as Preset
							</button>
							<button
								type="button"
								onclick={loadSettings}
								disabled={loading || saving}
								class="px-8 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition font-semibold shadow-lg hover:shadow-xl"
							>
								Reload
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>

	<!-- Save Preset Dialog -->
	{#if showSavePresetDialog}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					showSavePresetDialog = false;
					presetName = '';
				}
			}}
		>
			<div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
				<h3 class="text-xl font-bold text-gray-900 mb-4">Save Preset</h3>
				<p class="text-sm text-gray-600 mb-4">
					Save your current settings as a reusable preset
				</p>
				<input
					type="text"
					bind:value={presetName}
					placeholder="Preset name"
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							savePreset();
						}
					}}
				/>
				<div class="flex items-center gap-3 justify-end">
					<button
						onclick={() => {
							showSavePresetDialog = false;
							presetName = '';
						}}
						class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
					>
						Cancel
					</button>
					<button
						onclick={savePreset}
						disabled={savingPreset || !presetName.trim()}
						class="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition"
					>
						{#if savingPreset}
							<div
								class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"
							></div>
						{:else}
							Save
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</MainLayout>
