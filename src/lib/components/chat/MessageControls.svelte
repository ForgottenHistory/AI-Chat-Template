<script lang="ts">
	import type { Message } from '$lib/server/db/schema';

	interface Props {
		message: Message;
		showSwipe: boolean;
		align: 'start' | 'end';
		onSwipe: (direction: 'left' | 'right') => void;
		onEdit: () => void;
		onDelete: () => void;
		disabled?: boolean;
		compact?: boolean; // For inline display in row layout
	}

	let { message, showSwipe, align, onSwipe, onEdit, onDelete, disabled = false, compact = false }: Props = $props();

	function getSwipes(): string[] {
		if (!message.swipes) return [message.content];
		try {
			const swipes = JSON.parse(message.swipes);
			return Array.isArray(swipes) ? swipes : [message.content];
		} catch {
			return [message.content];
		}
	}

	function getCurrentSwipeIndex(): number {
		return message.currentSwipe ?? 0;
	}

	let swipes = $derived(getSwipes());
	let currentIndex = $derived(getCurrentSwipeIndex());
</script>

{#if !disabled}
<div class="flex items-center {align === 'end' ? 'justify-end' : 'justify-start'} gap-2">
	{#if showSwipe}
		<button
			onclick={() => onSwipe('left')}
			class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
			title="Previous variant"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
			</svg>
		</button>
		<span class="text-xs text-[var(--text-muted)]">{currentIndex + 1} / {swipes.length}</span>
		<button
			onclick={() => onSwipe('right')}
			class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
			title="Next variant"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
			</svg>
		</button>
	{/if}

	<!-- Edit button (show on hover via parent group, unless compact mode) -->
	<button
		onclick={onEdit}
		class="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition {compact ? '' : 'opacity-0 group-hover:opacity-100'}"
		title="Edit message"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
		</svg>
	</button>

	<!-- Delete button (show on hover via parent group, unless compact mode) -->
	<button
		onclick={onDelete}
		class="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] transition {compact ? '' : 'opacity-0 group-hover:opacity-100'}"
		title="Delete this message and all below"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
		</svg>
	</button>
</div>
{/if}
