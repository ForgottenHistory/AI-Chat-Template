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
		onSwipe: (direction: 'left' | 'right') => void;
		onSaveEdit: (content: string) => void;
		onDelete: () => void;
	}

	let { message, index, isLast, charName, userName, onSwipe, onSaveEdit, onDelete }: Props = $props();

	let isUser = $derived(message.role === 'user');
	let showSwipeControls = $derived(message.role === 'assistant' && isLast);

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
				? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
				: 'bg-white border border-gray-200 text-gray-900'} {isEditing ? 'ring-2 ring-purple-500' : ''}"
		>
			{#if isEditing}
				<div
					bind:this={editableRef}
					contenteditable="true"
					onkeydown={handleKeydown}
					class="outline-none whitespace-pre-wrap"
					style="min-height: 1.5em;"
				>{message.content}</div>
				<div class="flex items-center gap-2 mt-3 pt-2 border-t {isUser ? 'border-white/20' : 'border-gray-200'}">
					<button
						onclick={saveEdit}
						class="px-3 py-1 text-xs font-medium rounded {isUser ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'} transition"
					>
						Save (Ctrl+Enter)
					</button>
					<button
						onclick={cancelEdit}
						class="px-3 py-1 text-xs font-medium rounded {isUser ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition"
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
			disabled={isEditing}
		/>
	</div>
</div>
