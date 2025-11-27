<script lang="ts">
	import type { Message } from '$lib/server/db/schema';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import MessageControls from './MessageControls.svelte';

	interface Props {
		message: Message;
		index: number;
		isLast: boolean;
		charName: string | undefined;
		userName: string | undefined;
		generating: boolean;
		onSwipe: (direction: 'left' | 'right') => void;
		onSaveEdit: (content: string) => void;
		onDelete: () => void;
	}

	let { message, index, isLast, charName, userName, generating, onSwipe, onSaveEdit, onDelete }: Props = $props();

	let isUser = $derived(message.role === 'user');
	let showSwipeControls = $derived(message.role === 'assistant' && isLast);
	let showGeneratingPlaceholder = $derived(generating && isLast && message.role === 'assistant');

	// Inline edit state
	let isEditing = $state(false);
	let editableRef: HTMLDivElement;

	function startEdit() {
		isEditing = true;
		setTimeout(() => {
			if (editableRef) {
				editableRef.focus();
				// Move cursor to end
				const range = document.createRange();
				range.selectNodeContents(editableRef);
				range.collapse(false);
				const sel = window.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		}, 0);
	}

	function cancelEdit() {
		isEditing = false;
		// Reset content
		if (editableRef) {
			editableRef.innerText = message.content;
		}
	}

	function saveEdit() {
		if (editableRef) {
			const newContent = editableRef.innerText.trim();
			if (newContent) {
				onSaveEdit(newContent);
			}
		}
		isEditing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		} else if (e.key === 'Enter' && e.ctrlKey) {
			e.preventDefault();
			saveEdit();
		}
	}
</script>

<div class="group flex {isUser ? 'justify-end' : 'justify-start'}">
	<div class="flex flex-col gap-2 max-w-[70%]">
		<div
			class="rounded-2xl px-4 py-3 {isUser
				? 'bg-gradient-to-r from-[var(--user-bubble-from)] to-[var(--user-bubble-to)] text-white'
				: 'bg-[var(--assistant-bubble)] border border-[var(--assistant-border)] text-[var(--text-primary)]'} {isEditing ? 'ring-2 ring-[var(--accent-primary)]' : ''}"
		>
			{#if showGeneratingPlaceholder}
				<div class="flex items-center gap-2">
					<div class="flex gap-1">
						<div class="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style="animation-delay: 0s"></div>
						<div class="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
						<div class="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
					</div>
				</div>
			{:else if isEditing}
				<div
					bind:this={editableRef}
					contenteditable="true"
					onkeydown={handleKeydown}
					class="outline-none whitespace-pre-wrap"
					style="min-height: 1.5em;"
				>{message.content}</div>
				<div class="flex items-center gap-2 mt-3 pt-2 border-t {isUser ? 'border-white/20' : 'border-[var(--border-primary)]'}">
					<button
						onclick={saveEdit}
						class="px-3 py-1 text-xs font-medium rounded {isUser ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white'} transition"
					>
						Save (Ctrl+Enter)
					</button>
					<button
						onclick={cancelEdit}
						class="px-3 py-1 text-xs font-medium rounded {isUser ? 'text-white/80 hover:text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'} transition"
					>
						Cancel (Esc)
					</button>
				</div>
			{:else}
				<ChatMessage
					content={message.content}
					role={message.role}
					{charName}
					{userName}
				/>
			{/if}
		</div>

		<MessageControls
			{message}
			showSwipe={showSwipeControls}
			align={isUser ? 'end' : 'start'}
			{onSwipe}
			onEdit={startEdit}
			{onDelete}
			disabled={isEditing || generating}
		/>
	</div>
</div>
