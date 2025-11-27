<script lang="ts">
	import type { Message } from '$lib/server/db/schema';
	import MessageBubble from './MessageBubble.svelte';

	interface Props {
		messages: Message[];
		loading: boolean;
		isTyping: boolean;
		generating: boolean;
		charName: string | undefined;
		userName: string | undefined;
		onSwipe: (messageId: number, direction: 'left' | 'right') => void;
		onSaveEdit: (messageId: number, index: number, content: string) => void;
		onDelete: (messageId: number, index: number) => void;
	}

	let { messages, loading, isTyping, generating, charName, userName, onSwipe, onSaveEdit, onDelete }: Props = $props();

	let container: HTMLDivElement | undefined = $state();

	export function scrollToBottom() {
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	}

	export function getContainer() {
		return container;
	}
</script>

<div class="flex-1 overflow-y-auto px-6 py-6" bind:this={container}>
	{#if loading}
		<div class="flex items-center justify-center h-full">
			<div class="text-[var(--text-muted)]">Loading conversation...</div>
		</div>
	{:else if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<div class="text-center">
				<p class="text-[var(--text-secondary)] mb-2">No messages yet</p>
				<p class="text-sm text-[var(--text-muted)]">Start a conversation!</p>
			</div>
		</div>
	{:else}
		<div class="max-w-4xl mx-auto space-y-4">
			{#each messages as message, index (message.id)}
				<MessageBubble
					{message}
					{index}
					isLast={index === messages.length - 1}
					{charName}
					{userName}
					{generating}
					onSwipe={(direction) => onSwipe(message.id, direction)}
					onSaveEdit={(content) => onSaveEdit(message.id, index, content)}
					onDelete={() => onDelete(message.id, index)}
				/>
			{/each}
		</div>

		<!-- Typing Indicator (only show when not regenerating an existing message) -->
		{#if isTyping && !generating}
			<div class="max-w-4xl mx-auto mt-4">
				<div class="flex justify-start">
					<div class="flex items-center gap-2 bg-[var(--assistant-bubble)] border border-[var(--assistant-border)] rounded-2xl px-4 py-3">
						<div class="flex gap-1">
							<div class="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style="animation-delay: 0s"></div>
							<div class="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
							<div class="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
