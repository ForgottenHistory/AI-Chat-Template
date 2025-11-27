<script lang="ts">
	import CollapsibleSection from '../CollapsibleSection.svelte';

	interface Props {
		data: {
			first_mes?: string;
			mes_example?: string;
			alternate_greetings?: string[];
		};
	}

	let { data }: Props = $props();

	let mesExampleExpanded = $state(false);
	let alternateGreetingsExpanded = $state(false);
</script>

<div class="space-y-4">
	<h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Character Messages</h3>

	<!-- First Message (always visible) -->
	{#if data.first_mes}
		<div>
			<h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">First Message</h4>
			<div
				class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-primary)]"
			>
				{data.first_mes}
			</div>
		</div>
	{:else}
		<p class="text-[var(--text-muted)] italic">No first message available</p>
	{/if}

	<!-- Collapsible: Message Example -->
	{#if data.mes_example}
		<CollapsibleSection
			title="Message Example"
			expanded={mesExampleExpanded}
			onToggle={() => (mesExampleExpanded = !mesExampleExpanded)}
		>
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-mono text-sm">
				{data.mes_example}
			</div>
		</CollapsibleSection>
	{/if}

	<!-- Collapsible: Alternate Greetings -->
	{#if data.alternate_greetings && data.alternate_greetings.length > 0}
		<CollapsibleSection
			title="Alternate Greetings"
			badge={data.alternate_greetings.length}
			expanded={alternateGreetingsExpanded}
			onToggle={() => (alternateGreetingsExpanded = !alternateGreetingsExpanded)}
		>
			<div class="space-y-3">
				{#each data.alternate_greetings as greeting, index}
					<div class="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg">
						<div class="flex items-center gap-2 mb-2">
							<span class="text-xs font-medium text-[var(--text-muted)]">Greeting {index + 2}</span>
						</div>
						<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
							{greeting}
						</div>
					</div>
				{/each}
			</div>
		</CollapsibleSection>
	{/if}
</div>
