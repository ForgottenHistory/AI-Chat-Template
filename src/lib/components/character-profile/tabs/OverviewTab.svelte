<script lang="ts">
	import type { Character } from '$lib/server/db/schema';
	import CollapsibleSection from '../CollapsibleSection.svelte';

	interface Props {
		character: Character;
		data: {
			description?: string;
			scenario?: string;
			personality?: string;
			creator_notes?: string;
			creator?: string;
			character_version?: string;
		};
		onSave: (field: string, value: string) => Promise<void>;
	}

	let { character, data, onSave }: Props = $props();

	let personalityExpanded = $state(false);
	let creatorNotesExpanded = $state(false);
	let metadataExpanded = $state(false);

	// Edit states
	let editingDescription = $state(false);
	let editingScenario = $state(false);
	let editingPersonality = $state(false);
	let editingCreatorNotes = $state(false);
	let editingCreator = $state(false);
	let editingVersion = $state(false);

	// Edited values
	let editedDescription = $state('');
	let editedScenario = $state('');
	let editedPersonality = $state('');
	let editedCreatorNotes = $state('');
	let editedCreator = $state('');
	let editedVersion = $state('');

	let saving = $state(false);

	function startEditing(field: string) {
		switch (field) {
			case 'description':
				editedDescription = character.description || data.description || '';
				editingDescription = true;
				break;
			case 'scenario':
				editedScenario = data.scenario || '';
				editingScenario = true;
				break;
			case 'personality':
				editedPersonality = data.personality || '';
				editingPersonality = true;
				personalityExpanded = true;
				break;
			case 'creator_notes':
				editedCreatorNotes = data.creator_notes || '';
				editingCreatorNotes = true;
				creatorNotesExpanded = true;
				break;
			case 'creator':
				editedCreator = data.creator || '';
				editingCreator = true;
				metadataExpanded = true;
				break;
			case 'character_version':
				editedVersion = data.character_version || '';
				editingVersion = true;
				metadataExpanded = true;
				break;
		}
	}

	async function saveField(field: string) {
		saving = true;
		try {
			let value = '';
			switch (field) {
				case 'description':
					value = editedDescription;
					break;
				case 'scenario':
					value = editedScenario;
					break;
				case 'personality':
					value = editedPersonality;
					break;
				case 'creator_notes':
					value = editedCreatorNotes;
					break;
				case 'creator':
					value = editedCreator;
					break;
				case 'character_version':
					value = editedVersion;
					break;
			}
			await onSave(field, value);
			// Close edit mode
			switch (field) {
				case 'description':
					editingDescription = false;
					break;
				case 'scenario':
					editingScenario = false;
					break;
				case 'personality':
					editingPersonality = false;
					break;
				case 'creator_notes':
					editingCreatorNotes = false;
					break;
				case 'creator':
					editingCreator = false;
					break;
				case 'character_version':
					editingVersion = false;
					break;
			}
		} finally {
			saving = false;
		}
	}

	function cancelEditing(field: string) {
		switch (field) {
			case 'description':
				editingDescription = false;
				break;
			case 'scenario':
				editingScenario = false;
				break;
			case 'personality':
				editingPersonality = false;
				break;
			case 'creator_notes':
				editingCreatorNotes = false;
				break;
			case 'creator':
				editingCreator = false;
				break;
			case 'character_version':
				editingVersion = false;
				break;
		}
	}
</script>

<div class="space-y-4">
	<h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Character Overview</h3>

	<!-- Description -->
	<div>
		<div class="flex items-center justify-between mb-2 group">
			<h4 class="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
			{#if !editingDescription}
				<button
					onclick={() => startEditing('description')}
					class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition opacity-0 group-hover:opacity-100"
					aria-label="Edit description"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
				</button>
			{/if}
		</div>
		{#if editingDescription}
			<div class="space-y-2">
				<textarea
					bind:value={editedDescription}
					rows="4"
					class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					placeholder="Enter description..."
				></textarea>
				<div class="flex gap-2">
					<button
						onclick={() => saveField('description')}
						disabled={saving}
						class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<button
						onclick={() => cancelEditing('description')}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else if character.description || data.description}
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{character.description || data.description}
			</div>
		{:else}
			<p class="text-[var(--text-muted)] italic">No description available</p>
		{/if}
	</div>

	<!-- Scenario -->
	<div class="mt-6">
		<div class="flex items-center justify-between mb-2 group">
			<h4 class="text-sm font-medium text-[var(--text-secondary)]">Scenario</h4>
			{#if !editingScenario}
				<button
					onclick={() => startEditing('scenario')}
					class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition opacity-0 group-hover:opacity-100"
					aria-label="Edit scenario"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
				</button>
			{/if}
		</div>
		{#if editingScenario}
			<div class="space-y-2">
				<textarea
					bind:value={editedScenario}
					rows="4"
					class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					placeholder="Enter scenario..."
				></textarea>
				<div class="flex gap-2">
					<button
						onclick={() => saveField('scenario')}
						disabled={saving}
						class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<button
						onclick={() => cancelEditing('scenario')}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else if data.scenario}
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{data.scenario}
			</div>
		{:else}
			<p class="text-[var(--text-muted)] italic">No scenario available</p>
		{/if}
	</div>

	<!-- Collapsible: Personality -->
	<CollapsibleSection
		title="Personality"
		expanded={personalityExpanded}
		onToggle={() => (personalityExpanded = !personalityExpanded)}
	>
		{#if editingPersonality}
			<div class="space-y-2">
				<textarea
					bind:value={editedPersonality}
					rows="6"
					class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					placeholder="Enter personality..."
				></textarea>
				<div class="flex gap-2">
					<button
						onclick={() => saveField('personality')}
						disabled={saving}
						class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<button
						onclick={() => cancelEditing('personality')}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<div class="flex items-start justify-between gap-2">
				<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed flex-1">
					{data.personality || 'No personality defined'}
				</div>
				<button
					onclick={() => startEditing('personality')}
					class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition flex-shrink-0"
					aria-label="Edit personality"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
				</button>
			</div>
		{/if}
	</CollapsibleSection>

	<!-- Collapsible: Creator Notes -->
	<CollapsibleSection
		title="Creator Notes"
		expanded={creatorNotesExpanded}
		onToggle={() => (creatorNotesExpanded = !creatorNotesExpanded)}
	>
		{#if editingCreatorNotes}
			<div class="space-y-2">
				<textarea
					bind:value={editedCreatorNotes}
					rows="6"
					class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					placeholder="Enter creator notes..."
				></textarea>
				<div class="flex gap-2">
					<button
						onclick={() => saveField('creator_notes')}
						disabled={saving}
						class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<button
						onclick={() => cancelEditing('creator_notes')}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<div class="flex items-start justify-between gap-2">
				<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed flex-1">
					{data.creator_notes || 'No creator notes available'}
				</div>
				<button
					onclick={() => startEditing('creator_notes')}
					class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition flex-shrink-0"
					aria-label="Edit creator notes"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
				</button>
			</div>
		{/if}
	</CollapsibleSection>

	<!-- Collapsible: Metadata -->
	<CollapsibleSection
		title="Metadata"
		expanded={metadataExpanded}
		onToggle={() => (metadataExpanded = !metadataExpanded)}
	>
		<div class="space-y-4">
			<!-- Creator -->
			<div>
				{#if editingCreator}
					<div class="space-y-2">
						<label class="text-sm font-medium text-[var(--text-secondary)]">Creator</label>
						<input
							type="text"
							bind:value={editedCreator}
							class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
							placeholder="Enter creator name..."
						/>
						<div class="flex gap-2">
							<button
								onclick={() => saveField('creator')}
								disabled={saving}
								class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
							>
								{saving ? 'Saving...' : 'Save'}
							</button>
							<button
								onclick={() => cancelEditing('creator')}
								class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-between group">
						<div>
							<span class="text-sm font-medium text-[var(--text-secondary)]">Creator:</span>
							<span class="ml-2 text-sm text-[var(--text-primary)]">{data.creator || 'Not specified'}</span>
						</div>
						<button
							onclick={() => startEditing('creator')}
							class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition opacity-0 group-hover:opacity-100"
							aria-label="Edit creator"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
							</svg>
						</button>
					</div>
				{/if}
			</div>

			<!-- Version -->
			<div>
				{#if editingVersion}
					<div class="space-y-2">
						<label class="text-sm font-medium text-[var(--text-secondary)]">Version</label>
						<input
							type="text"
							bind:value={editedVersion}
							class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
							placeholder="Enter version..."
						/>
						<div class="flex gap-2">
							<button
								onclick={() => saveField('character_version')}
								disabled={saving}
								class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
							>
								{saving ? 'Saving...' : 'Save'}
							</button>
							<button
								onclick={() => cancelEditing('character_version')}
								class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-between group">
						<div>
							<span class="text-sm font-medium text-[var(--text-secondary)]">Version:</span>
							<span class="ml-2 text-sm text-[var(--text-primary)]">{data.character_version || 'Not specified'}</span>
						</div>
						<button
							onclick={() => startEditing('character_version')}
							class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition opacity-0 group-hover:opacity-100"
							aria-label="Edit version"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
							</svg>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</CollapsibleSection>
</div>
