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
	}

	let { character, data }: Props = $props();

	let personalityExpanded = $state(false);
	let creatorNotesExpanded = $state(false);
	let metadataExpanded = $state(false);
</script>

<div class="space-y-4">
	<h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Character Overview</h3>

	<!-- Description (always visible) -->
	{#if character.description}
		<div>
			<h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">Description</h4>
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{character.description}
			</div>
		</div>
	{:else if data.description}
		<div>
			<h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">Description</h4>
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{data.description}
			</div>
		</div>
	{:else}
		<p class="text-[var(--text-muted)] italic">No description available</p>
	{/if}

	<!-- Scenario (always visible) -->
	{#if data.scenario}
		<div class="mt-6">
			<h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">Scenario</h4>
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{data.scenario}
			</div>
		</div>
	{/if}

	<!-- Collapsible: Personality -->
	{#if data.personality}
		<CollapsibleSection
			title="Personality"
			expanded={personalityExpanded}
			onToggle={() => (personalityExpanded = !personalityExpanded)}
		>
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{data.personality}
			</div>
		</CollapsibleSection>
	{/if}

	<!-- Collapsible: Creator Notes -->
	{#if data.creator_notes}
		<CollapsibleSection
			title="Creator Notes"
			expanded={creatorNotesExpanded}
			onToggle={() => (creatorNotesExpanded = !creatorNotesExpanded)}
		>
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{data.creator_notes}
			</div>
		</CollapsibleSection>
	{/if}

	<!-- Collapsible: Metadata -->
	{#if data.creator || data.character_version}
		<CollapsibleSection
			title="Metadata"
			expanded={metadataExpanded}
			onToggle={() => (metadataExpanded = !metadataExpanded)}
		>
			<div class="space-y-3">
				{#if data.creator}
					<div>
						<span class="text-sm font-medium text-[var(--text-secondary)]">Creator:</span>
						<span class="ml-2 text-sm text-[var(--text-primary)]">{data.creator}</span>
					</div>
				{/if}
				{#if data.character_version}
					<div>
						<span class="text-sm font-medium text-[var(--text-secondary)]">Version:</span>
						<span class="ml-2 text-sm text-[var(--text-primary)]">{data.character_version}</span>
					</div>
				{/if}
			</div>
		</CollapsibleSection>
	{/if}
</div>
