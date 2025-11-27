<script lang="ts">
	import type { Character } from '$lib/server/db/schema';

	interface Props {
		character: Character | null;
		onClose: () => void;
		onUpdate?: () => void;
	}

	let { character, onClose, onUpdate }: Props = $props();

	// Reactively parse cardData whenever character changes
	const cardData = $derived(character?.cardData ? JSON.parse(character.cardData) : {});
	const data = $derived(cardData.data || {});
	const tags = $derived(character?.tags ? JSON.parse(character.tags) : []);

	let activeTab = $state<'overview' | 'messages' | 'image'>('image');
	let imagePreview = $state<string | null>(null);
	let changingImage = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	// Collapsible sections state
	let personalityExpanded = $state(false);
	let creatorNotesExpanded = $state(false);
	let metadataExpanded = $state(false);
	let mesExampleExpanded = $state(false);
	let alternateGreetingsExpanded = $state(false);

	async function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			error = 'Please select a valid image file';
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			error = 'Image must be smaller than 5MB';
			return;
		}

		try {
			changingImage = true;
			error = null;

			// Convert to base64
			const reader = new FileReader();
			reader.onload = async (e) => {
				const base64Image = e.target?.result as string;

				try {
					// Update character image
					const response = await fetch(`/api/characters/${character?.id}/image`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ imageData: base64Image })
					});

					if (!response.ok) {
						throw new Error('Failed to update image');
					}

					// Set preview
					imagePreview = base64Image;
					success = 'Character image updated successfully!';
					setTimeout(() => (success = null), 3000);

					// Notify parent to refresh
					if (onUpdate) {
						onUpdate();
					}
				} catch (err) {
					console.error('Failed to save image:', err);
					error = 'Failed to save image';
				} finally {
					changingImage = false;
				}
			};

			reader.onerror = () => {
				error = 'Failed to read image file';
				changingImage = false;
			};

			reader.readAsDataURL(file);
		} catch (err) {
			console.error('Failed to change image:', err);
			error = 'Failed to change image';
			changingImage = false;
		}
	}
</script>

{#if character}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				onClose();
			}
		}}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col"
		>
			<!-- Header with Image -->
			<div class="relative h-64 bg-gray-200 flex-shrink-0">
				{#if imagePreview || character.imageData}
					<img
						src={imagePreview || character.imageData}
						alt={character.name}
						class="w-full h-full object-cover"
					/>
				{:else}
					<div class="w-full h-full flex items-center justify-center text-gray-400">
						<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
				{/if}
				<button
					onclick={onClose}
					class="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				<!-- Title & Tags -->
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-3xl font-bold text-gray-900 mb-3">{character.name}</h2>

					{#if tags && tags.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each tags as tag}
								<span
									class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Tabs -->
				<div class="border-b border-gray-200">
					<div class="flex px-6">
						<button
							onclick={() => (activeTab = 'image')}
							class="flex-1 py-3 font-medium transition {activeTab === 'image'
								? 'text-purple-600 border-b-2 border-purple-600'
								: 'text-gray-600 hover:text-gray-900'}"
						>
							Image
						</button>
						<button
							onclick={() => (activeTab = 'overview')}
							class="flex-1 py-3 font-medium transition {activeTab === 'overview'
								? 'text-purple-600 border-b-2 border-purple-600'
								: 'text-gray-600 hover:text-gray-900'}"
						>
							Overview
						</button>
						<button
							onclick={() => (activeTab = 'messages')}
							class="flex-1 py-3 font-medium transition {activeTab === 'messages'
								? 'text-purple-600 border-b-2 border-purple-600'
								: 'text-gray-600 hover:text-gray-900'}"
						>
							Messages
						</button>
					</div>
				</div>

				<!-- Tab Content -->
				<div class="p-6">
					{#if activeTab === 'overview'}
						<!-- Overview Tab -->
						<div class="space-y-4">
							<h3 class="text-xl font-semibold text-gray-900 mb-4">Character Overview</h3>

							<!-- Description (always visible) -->
							{#if character.description}
								<div>
									<h4 class="text-sm font-medium text-gray-700 mb-2">Description</h4>
									<div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
										{character.description}
									</div>
								</div>
							{:else if data.description}
								<div>
									<h4 class="text-sm font-medium text-gray-700 mb-2">Description</h4>
									<div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
										{data.description}
									</div>
								</div>
							{:else}
								<p class="text-gray-500 italic">No description available</p>
							{/if}

							<!-- Scenario (always visible) -->
							{#if data.scenario}
								<div class="mt-6">
									<h4 class="text-sm font-medium text-gray-700 mb-2">Scenario</h4>
									<div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
										{data.scenario}
									</div>
								</div>
							{/if}

							<!-- Collapsible: Personality -->
							{#if data.personality}
								<div class="mt-6">
									<button
										onclick={() => (personalityExpanded = !personalityExpanded)}
										class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
									>
										<h4 class="text-sm font-semibold text-gray-900">Personality</h4>
										<svg
											class="w-5 h-5 text-gray-600 transition-transform {personalityExpanded
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>
									{#if personalityExpanded}
										<div class="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
											<div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
												{data.personality}
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Collapsible: Creator Notes -->
							{#if data.creator_notes}
								<div class="mt-6">
									<button
										onclick={() => (creatorNotesExpanded = !creatorNotesExpanded)}
										class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
									>
										<h4 class="text-sm font-semibold text-gray-900">Creator Notes</h4>
										<svg
											class="w-5 h-5 text-gray-600 transition-transform {creatorNotesExpanded
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>
									{#if creatorNotesExpanded}
										<div class="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
											<div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
												{data.creator_notes}
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Collapsible: Metadata -->
							{#if data.creator || data.character_version}
								<div class="mt-6">
									<button
										onclick={() => (metadataExpanded = !metadataExpanded)}
										class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
									>
										<h4 class="text-sm font-semibold text-gray-900">Metadata</h4>
										<svg
											class="w-5 h-5 text-gray-600 transition-transform {metadataExpanded
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>
									{#if metadataExpanded}
										<div class="mt-2 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
											{#if data.creator}
												<div>
													<span class="text-sm font-medium text-gray-700">Creator:</span>
													<span class="ml-2 text-sm text-gray-600">{data.creator}</span>
												</div>
											{/if}
											{#if data.character_version}
												<div>
													<span class="text-sm font-medium text-gray-700">Version:</span>
													<span class="ml-2 text-sm text-gray-600"
														>{data.character_version}</span
													>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else if activeTab === 'messages'}
						<!-- Messages Tab -->
						<div class="space-y-4">
							<h3 class="text-xl font-semibold text-gray-900 mb-4">Character Messages</h3>

							<!-- First Message (always visible) -->
							{#if data.first_mes}
								<div>
									<h4 class="text-sm font-medium text-gray-700 mb-2">First Message</h4>
									<div
										class="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200"
									>
										{data.first_mes}
									</div>
								</div>
							{:else}
								<p class="text-gray-500 italic">No first message available</p>
							{/if}

							<!-- Collapsible: Message Example -->
							{#if data.mes_example}
								<div class="mt-6">
									<button
										onclick={() => (mesExampleExpanded = !mesExampleExpanded)}
										class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
									>
										<h4 class="text-sm font-semibold text-gray-900">Message Example</h4>
										<svg
											class="w-5 h-5 text-gray-600 transition-transform {mesExampleExpanded
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>
									{#if mesExampleExpanded}
										<div class="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
											<div class="text-gray-700 whitespace-pre-wrap leading-relaxed font-mono text-sm">
												{data.mes_example}
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Collapsible: Alternate Greetings -->
							{#if data.alternate_greetings && data.alternate_greetings.length > 0}
								<div class="mt-6">
									<button
										onclick={() => (alternateGreetingsExpanded = !alternateGreetingsExpanded)}
										class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
									>
										<div class="flex items-center gap-2">
											<h4 class="text-sm font-semibold text-gray-900">Alternate Greetings</h4>
											<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
												>{data.alternate_greetings.length}</span
											>
										</div>
										<svg
											class="w-5 h-5 text-gray-600 transition-transform {alternateGreetingsExpanded
												? 'rotate-180'
												: ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>
									{#if alternateGreetingsExpanded}
										<div class="mt-2 space-y-3">
											{#each data.alternate_greetings as greeting, index}
												<div class="p-4 bg-white border border-gray-200 rounded-lg">
													<div class="flex items-center gap-2 mb-2">
														<span class="text-xs font-medium text-gray-500"
															>Greeting {index + 2}</span
														>
													</div>
													<div class="text-gray-700 whitespace-pre-wrap leading-relaxed">
														{greeting}
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else if activeTab === 'image'}
						<!-- Image Tab -->
						<div class="space-y-6">
							<!-- Character Portrait Section -->
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-semibold text-gray-900">Character Portrait</h3>
								</div>

								<div class="flex items-start gap-4">
									<!-- Current Image Preview -->
									<div class="flex-shrink-0">
										<div
											class="w-32 h-32 rounded-xl overflow-hidden bg-gray-200 border-2 border-gray-300"
										>
											<img
												src={imagePreview || character.imageData || ''}
												alt={character.name}
												class="w-full h-full object-cover"
											/>
										</div>
									</div>

									<!-- Upload Button -->
									<div class="flex-1">
										<p class="text-sm text-gray-600 mb-3">
											Change your character's portrait image by uploading a new file.
										</p>
										<label
											class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-xl cursor-pointer transition-colors"
										>
											<input
												type="file"
												accept="image/*"
												onchange={handleImageChange}
												disabled={changingImage}
												class="hidden"
											/>
											{#if changingImage}
												<div
													class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
												></div>
												Uploading...
											{:else}
												<svg
													class="w-5 h-5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
													/>
												</svg>
												Upload Image
											{/if}
										</label>
									</div>
								</div>
							</div>

							{#if error}
								<div
									class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
								>
									{error}
								</div>
							{/if}

							{#if success}
								<div
									class="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm"
								>
									{success}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
